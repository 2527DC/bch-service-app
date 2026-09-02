// The paging engine every collection in the app is served through.
//
// WHY THIS EXISTS
// ---------------
// Products needed search, filter chips with counts, sort and cursor paging. So does
// Deliveries. So does Inbound, Transfers, Stock Counts, and the count sheet inside one of
// them. Writing that six times means six places to get the facet counts subtly wrong and
// six places that forget to drop the memo after a write.
//
// A collection now declares WHAT it is (how to search it, what its chips mean, how it
// sorts) and gets the HOW for free. Adding the next one is a config object, not a file.
//
// WHAT IT GUARANTEES
// ------------------
//  * Facet counts are taken BEFORE the chip filter, so a chip always says how many rows it
//    would give you — not how many survived the chip that is already on.
//  * The filtered, sorted result is memoised on the query signature. Paging through 40
//    pages re-scans nothing; without this, `loadMore` re-sorts the whole collection per
//    page and the jank looks like a list-virtualisation problem when it is a data one.
//  * A write calls `invalidate()` and the next read rebuilds. Nothing serves a stale page.
//  * `rows()` is a getter, not an array, so the engine always sees the live collection
//    after a mutation replaces or reorders it.
//
// A real endpoint does all of this in SQL. The shape of the request and the response is
// the same either way, which is the point — screens do not learn where the work happened.

export type PageQuery<F extends string, S extends string> = {
  /** Opaque. Echo back `nextCursor`; never build one. */
  cursor?: string | null;
  limit?: number;
  q?: string;
  /** A chip. "ALL" always matches and needs no predicate. */
  filter?: F | "ALL";
  sort?: S;
  /** A second, independent narrowing — a product type, a shipment id, a warehouse. */
  scopeId?: string | null;
  /**
   * The filter SCREEN's selection: one chosen option per group, AND-ed together.
   * `{ status: "FLAGGED", dispatch: "OUTSTATION" }` means both must hold.
   *
   * A group that is absent, or set to "ALL", imposes no constraint — so an empty object
   * behaves exactly like no filter at all. Independent of `filter`, which stays the chip
   * row on the list itself; the two AND together.
   */
  filters?: GroupSelection;
};

/** groupKey -> optionKey -> predicate. */
export type FilterGroups<T> = Record<string, Record<string, (row: T) => boolean>>;

/** groupKey -> the chosen optionKey. "ALL" or absent means the group is unconstrained. */
export type GroupSelection = Record<string, string>;

/**
 * groupKey -> optionKey -> count, plus an "ALL" per group.
 *
 * Read one of these as: "if I changed ONLY this control to this option, how many rows
 * would I get." Every other group, the chip and the search stay applied — see `resolve`.
 */
export type GroupFacets = Record<string, Record<string, number>>;

export type PageResult<T, F extends string> = {
  items: T[];
  nextCursor: string | null;
  /** Rows matching the query, not rows returned. */
  total: number;
  /** Per-chip totals for the current search + scope + filter groups. */
  facets: Record<F | "ALL", number>;
  /** Per-group, per-option totals. Absent when the collection declares no groups. */
  groupFacets?: GroupFacets;
};

export type ResourceConfig<T, F extends string, S extends string> = {
  /** Getter, not a value — mutations replace these arrays. */
  rows: () => T[];
  idOf: (row: T) => string;
  /** Everything the search box should match, in one string. Lowercased for you. */
  searchText: (row: T) => string;
  /** One predicate per chip. "ALL" is implicit. */
  filters: Record<F, (row: T) => boolean>;
  /**
   * The filter screen's groups — Status, Timeline, Dispatch type. AND-ed across groups,
   * one selected option within each. Optional: a collection that declares none behaves
   * exactly as it did before groups existed, and pays nothing for them.
   */
  filterGroups?: FilterGroups<T>;
  /** One comparator per sort option. */
  sorts: Record<S, (a: T, b: T) => number>;
  defaultSort: S;
  /** Optional second axis, applied with the search and counted in the facets. */
  scope?: (row: T, scopeId: string) => boolean;
  pageSize?: number;
};

export type PagedResource<T, F extends string, S extends string> = {
  query: (params?: PageQuery<F, S>) => PageResult<T, F>;
  /** Call from every mutation that touches this collection. */
  invalidate: () => void;
};

/** Keeps a few recent result sets so flipping between two chips does not re-scan. */
const MEMO_DEPTH = 4;

export function createPagedResource<T, F extends string, S extends string>(
  cfg: ResourceConfig<T, F, S>
): PagedResource<T, F, S> {
  const pageSize = cfg.pageSize ?? 24;
  const filterKeys = Object.keys(cfg.filters) as F[];

  // id -> lowercased haystack. Building this per keystroke over a large collection is the
  // single biggest cost in a naive search, so it is built once and dropped on invalidate.
  const groupKeys = cfg.filterGroups ? Object.keys(cfg.filterGroups) : [];
  const hasGroups = groupKeys.length > 0;

  let searchCache = new Map<string, string>();
  let memo: Array<{
    key: string;
    rows: T[];
    facets: Record<F | "ALL", number>;
    groupFacets?: GroupFacets;
  }> = [];

  const haystack = (row: T): string => {
    const id = cfg.idOf(row);
    let s = searchCache.get(id);
    if (s === undefined) {
      s = cfg.searchText(row).toLowerCase();
      searchCache.set(id, s);
    }
    return s;
  };

  const emptyFacets = (): Record<F | "ALL", number> => {
    const f = { ALL: 0 } as Record<F | "ALL", number>;
    for (const k of filterKeys) f[k] = 0;
    return f;
  };

  const emptyGroupFacets = (): GroupFacets => {
    const out: GroupFacets = {};
    for (const g of groupKeys) {
      const bucket: Record<string, number> = { ALL: 0 };
      for (const o of Object.keys(cfg.filterGroups![g])) bucket[o] = 0;
      out[g] = bucket;
    }
    return out;
  };

  /** A group with no selection, or "ALL", constrains nothing. An unknown option key is
   *  ignored rather than matching nothing — a stale key should not silently empty a list. */
  const groupMatch = (row: T, g: string, opt: string | undefined): boolean => {
    if (!opt || opt === "ALL") return true;
    const pred = cfg.filterGroups?.[g]?.[opt];
    return pred ? pred(row) : true;
  };

  function resolve(params: PageQuery<F, S>) {
    const q = (params.q ?? "").trim().toLowerCase();
    const filter = params.filter ?? "ALL";
    const sort = params.sort ?? cfg.defaultSort;
    const scopeId = params.scopeId ?? "";
    const selection = params.filters ?? {};
    // The group selection MUST be in the memo key. Without it, changing only a group
    // would hit the entry built for the previous selection and serve its page.
    // Built from `groupKeys` (a fixed order), not from the caller's object, so two equal
    // selections cannot produce two keys.
    const selKey = hasGroups ? groupKeys.map((g) => `${g}=${selection[g] ?? "ALL"}`).join(",") : "";
    const key = `${q}|${filter}|${sort}|${scopeId}|${selKey}`;

    const hit = memo.find((m) => m.key === key);
    if (hit) {
      // Most-recently-used, so the two chips someone is flipping between both stay warm.
      memo = [hit, ...memo.filter((m) => m !== hit)];
      return hit;
    }

    const terms = q ? q.split(/\s+/).filter(Boolean) : [];
    const all = cfg.rows();

    // Pass 1 — search + scope + filter groups. Facets are counted here, before the chip.
    const base: T[] = [];
    const facets = emptyFacets();
    const groupFacets = emptyGroupFacets();

    for (const row of all) {
      if (scopeId && cfg.scope && !cfg.scope(row, scopeId)) continue;
      if (terms.length) {
        const hay = haystack(row);
        let ok = true;
        for (const t of terms) {
          if (!hay.includes(t)) { ok = false; break; }
        }
        if (!ok) continue;
      }

      if (hasGroups) {
        // How many groups does this row FAIL, and which one if exactly one?
        //
        // That is all the information the group facets need. A group's counts must be
        // taken with every OTHER group applied but itself free, so:
        //   0 failures -> the row is countable in every group
        //   1 failure  -> countable only in the group it fails (the others all hold)
        //   2+         -> countable nowhere; stop looking
        // This keeps one pass over the rows instead of one pass per group.
        let failCount = 0;
        let failIdx = -1;
        for (let i = 0; i < groupKeys.length; i++) {
          if (!groupMatch(row, groupKeys[i], selection[groupKeys[i]])) {
            failCount++;
            if (failCount === 1) failIdx = i;
            else break;
          }
        }

        // The chip narrows the group facets too — every facet on screen answers
        // "if I changed only this one control", so everything else stays applied.
        if (failCount <= 1 && (filter === "ALL" || cfg.filters[filter as F](row))) {
          for (let i = 0; i < groupKeys.length; i++) {
            if (failCount === 1 && i !== failIdx) continue;
            const bucket = groupFacets[groupKeys[i]];
            const opts = cfg.filterGroups![groupKeys[i]];
            bucket.ALL++;
            for (const o of Object.keys(opts)) if (opts[o](row)) bucket[o]++;
          }
        }

        if (failCount > 0) continue;
      }

      base.push(row);
      facets.ALL++;
      for (const k of filterKeys) if (cfg.filters[k](row)) facets[k]++;
    }

    // Pass 2 — the chip.
    const rows = filter === "ALL" ? base : base.filter(cfg.filters[filter as F]);

    // Sorted on a copy: `base` may alias the live array on an unfiltered query, and
    // sorting that in place would reorder the collection itself.
    const sorted = rows === base ? [...rows] : rows;
    sorted.sort(cfg.sorts[sort]);

    const entry = { key, rows: sorted, facets, groupFacets: hasGroups ? groupFacets : undefined };
    memo = [entry, ...memo].slice(0, MEMO_DEPTH);
    return entry;
  }

  return {
    query(params = {}) {
      const limit = Math.max(1, Math.min(100, params.limit ?? pageSize));
      const offset = params.cursor ? Number(params.cursor) || 0 : 0;
      const { rows, facets, groupFacets } = resolve(params);
      const items = rows.slice(offset, offset + limit);
      const next = offset + items.length;
      return {
        items,
        nextCursor: next < rows.length ? String(next) : null,
        total: rows.length,
        facets,
        groupFacets,
      };
    },
    invalidate() {
      memo = [];
      searchCache = new Map();
    },
  };
}

/** Ordering helper: rank rows by a fixed list of statuses, then by a tiebreaker. */
export function byRank<T>(rank: (row: T) => number, then: (a: T, b: T) => number) {
  return (a: T, b: T) => rank(a) - rank(b) || then(a, b);
}

/** Newest first. */
export function byDateDesc<T>(get: (row: T) => string | null) {
  return (a: T, b: T) => (get(b) ?? "").localeCompare(get(a) ?? "");
}
