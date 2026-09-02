// Cursor pagination for any list screen. One hook, so every "infinite" list in the app
// behaves identically — same reset rules, same guards, same states.
//
// Why a hook and not a zustand slice: a 10k catalogue must never live in a global store.
// Pages belong to the screen that is showing them and should be released when it unmounts.
// The stores keep the small collections (types, counts, transfers) that screens share.
//
// Four correctness problems this solves, all of which produce bugs that only appear on a
// slow connection and are painful to reproduce by hand:
//
//   1. STALE RESPONSES. Type "chain", then "chai" — two requests are in flight and the
//      slower one can land last. Every run carries an id and a late run is dropped.
//   2. DOUBLE FETCH. `onEndReached` fires repeatedly while a page is loading. A ref guard
//      (not state — state updates land a frame too late) makes loadMore idempotent.
//   3. THE END OF THE LIST. Appending a page with no `nextCursor` must stop further calls,
//      or the footer spinner never goes away.
//   4. DUPLICATE ROWS. A row inserted server-side shifts every offset. Ids are de-duped on
//      append so React never sees two rows with the same key.
import { useCallback, useEffect, useRef, useState } from "react";

export type Page<T, X = undefined> = {
  items: T[];
  nextCursor: string | null;
  total: number;
  /** Anything else the endpoint returns alongside the page (facet counts, totals). */
  extra?: X;
};

export type PagedStatus = "loading" | "ready" | "error";

export type PagedList<T, X> = {
  items: T[];
  total: number;
  extra: X | undefined;
  status: PagedStatus;
  error: string | null;
  /**
   * True until the first page has ever landed. After that the list keeps its chrome
   * mounted through every reset, which is what stops a search box losing focus when a
   * query returns nothing and the next keystroke re-runs it.
   */
  initialLoad: boolean;
  hasMore: boolean;
  /** True only while a NEXT page is loading — drives the footer, never the whole screen. */
  loadingMore: boolean;
  /** True only for pull-to-refresh — keeps the current rows on screen while it runs. */
  refreshing: boolean;
  loadMore: () => void;
  refresh: () => void;
  retry: () => void;
};

export function usePagedList<T, X = undefined>({
  resetKey,
  fetchPage,
  idOf,
}: {
  /**
   * Serialised query. When it changes the list resets to page one — so search text,
   * filter chips and sort all belong in here, and nothing else does.
   */
  resetKey: string;
  fetchPage: (cursor: string | null) => Promise<Page<T, X>>;
  idOf: (item: T) => string;
}): PagedList<T, X> {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [extra, setExtra] = useState<X | undefined>(undefined);
  const [status, setStatus] = useState<PagedStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  // Kept in refs, not state: `onEndReached` reads them in the same tick it fires.
  const cursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(true);
  const inFlightRef = useRef(false);
  const runIdRef = useRef(0);
  const [hasMore, setHasMore] = useState(true);

  // The caller re-creates `fetchPage` every render; parking it in a ref keeps the effect
  // keyed on `resetKey` alone rather than re-firing on each parent render.
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;
  const idRef = useRef(idOf);
  idRef.current = idOf;

  const load = useCallback(
    async (mode: "reset" | "more" | "refresh") => {
      if (inFlightRef.current) return;
      if (mode === "more" && !hasMoreRef.current) return;

      const runId = ++runIdRef.current;
      inFlightRef.current = true;
      if (mode === "reset") setStatus("loading");
      if (mode === "more") setLoadingMore(true);
      if (mode === "refresh") setRefreshing(true);

      try {
        const cursor = mode === "more" ? cursorRef.current : null;
        const page = await fetchRef.current(cursor);
        if (runId !== runIdRef.current) return; // a newer query won

        cursorRef.current = page.nextCursor;
        hasMoreRef.current = page.nextCursor !== null;
        setHasMore(page.nextCursor !== null);
        setTotal(page.total);
        setExtra(page.extra);
        setError(null);
        setStatus("ready");
        setInitialLoad(false);

        if (mode === "more") {
          setItems((prev) => {
            const seen = new Set(prev.map(idRef.current));
            const fresh = page.items.filter((it) => !seen.has(idRef.current(it)));
            return fresh.length ? [...prev, ...fresh] : prev;
          });
        } else {
          setItems(page.items);
        }
      } catch (e: any) {
        if (runId !== runIdRef.current) return;
        setError(e?.message ?? "Could not load");
        // A failed NEXT page keeps the rows already on screen; only a failed first page
        // takes the screen to its error state.
        if (mode !== "more") setStatus("error");
      } finally {
        if (runId === runIdRef.current) {
          inFlightRef.current = false;
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    []
  );

  // Reset whenever the query changes.
  useEffect(() => {
    cursorRef.current = null;
    hasMoreRef.current = true;
    inFlightRef.current = false;
    setHasMore(true);
    load("reset");
  }, [resetKey, load]);

  const loadMore = useCallback(() => {
    if (!hasMoreRef.current || inFlightRef.current) return;
    load("more");
  }, [load]);

  const refresh = useCallback(() => {
    cursorRef.current = null;
    hasMoreRef.current = true;
    load("refresh");
  }, [load]);

  const retry = useCallback(() => {
    cursorRef.current = null;
    hasMoreRef.current = true;
    load("reset");
  }, [load]);

  return { items, total, extra, status, error, initialLoad, hasMore, loadingMore, refreshing, loadMore, refresh, retry };
}
