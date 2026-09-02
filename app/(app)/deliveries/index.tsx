// Deliveries & Dispatch — the run board, paged.
//
// GROUPED *AND* PAGED. The obvious way to group is to fetch everything and bucket it in
// the screen, which stops working at a few thousand invoices. Instead the endpoint sorts
// the collection and the screen inserts a header whenever the group key changes as the
// stream goes by. The grouping is therefore a property of the ORDER, which pages
// correctly: page 3 continues the group page 2 ended in.
//
// The group key FOLLOWS THE SORT, because those are the same decision made once:
//   RUN    — the run order (on the road, promised, stuck, then the tail) → group by status
//   AREA   — sorted by customer area                                    → group by area
//   RECENT — newest invoice first                                       → Today / Yesterday / Earlier
// A sort that did not agree with the grouping would scatter one group across the whole
// list, so `grouperFor(sort)` is the single place the pairing is declared.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { SlidersHorizontal } from "lucide-react-native";
import { useSession } from "@/store/session";
import { useStock } from "@/store/stock";
import * as mockApi from "@/services/mockApi";
import type { DeliveryFilter, DeliverySort } from "@/services/mockApi.stock";
import type { GroupFacets, GroupSelection } from "@/services/paged";
import type { Delivery, DeliveryStatus } from "@/mock/types";
import { activeFilterCount, DELIVERY_STATUS, TONE, type Tone } from "@/lib/stock-constants";
import { getStartOfTodayIST, isToday } from "@/lib/timezone";
import { BRAND } from "@/lib/theme";
import { useDebouncedSearch } from "@/lib/useDebouncedSearch";
import { usePagedList } from "@/lib/usePagedList";
import PagedList, { CountLine } from "@/components/PagedList";
import {
  DataLabel,
  NoAccess,
  Pills,
  RecordCard,
  ScreenHeader,
  StatGrid,
  StatTile,
  StatusBadge,
} from "@/components/stock";
import FilterScreen, { type FilterGroupSpec } from "@/components/stock/FilterScreen";
import SearchBar from "@/components/SearchBar";
import PressScale from "@/components/PressScale";

// HEIGHT BUDGET — the card is FIXED height, so every line below is accounted for and
// every Text carries an explicit leading + numberOfLines. ITEMS is the only two-line
// field and it truncates rather than growing, which is what keeps this a constant.
//
//   py-3.5 top .......................... 14
//   INVOICE label (leading-[14px]) ...... 14
//   + mt-1 / invoice value (24px line) ... 4 + 24
//   + mt-3 / CUSTOMER label ............. 12 + 14
//   + mt-1 / customer value (20px line) .. 4 + 20
//   + mt-3 / ITEMS label ................ 12 + 14
//   + mt-1 / items, 2 x 19px ............ 4 + 38
//   py-3.5 bottom ....................... 14
//                                        ─────
//                                         188
// Keep this in step with the literal `h-[188px]` on the card — Tailwind extracts
// arbitrary values from source text, so the class cannot be built from the constant.
const CARD_H = 188;
const HEADER_H = 40;
const GAP = 8;

type Filter = DeliveryFilter | "ALL";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "TODAY", label: "Today" },
  { key: "OPEN", label: "Open" },
  { key: "ON_ROAD", label: "On road" },
  { key: "FLAGGED", label: "Flagged" },
  { key: "ALL", label: "All" },
  { key: "DONE", label: "Done" },
];

// ── Filter screen ─────────────────────────────────────────────────────────
// Option keys mirror DELIVERY_FILTER_GROUPS in mockApi.stock.ts exactly; "ALL" is the
// engine's unconstrained value, so a group sitting on it costs nothing.
const DEFAULT_FILTERS: GroupSelection = { status: "ALL", timeline: "ALL", dispatch: "ALL", sort: "RUN" };

const STATUS_ORDER: DeliveryStatus[] = [
  "PENDING",
  "VERIFIED",
  "SCHEDULED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "WALK_OUT",
  "FLAGGED",
  "PREBOOKED",
];

const TIMELINE_OPTIONS = [
  { value: "ALL", label: "Any" },
  { value: "TODAY", label: "Today" },
  { value: "DAYS_3", label: "3 Days" },
  { value: "THIS_WEEK", label: "This Week" },
  { value: "THIS_MONTH", label: "This Month" },
];

const DISPATCH_OPTIONS = [
  { value: "ALL", label: "Any", description: "Local and outstation" },
  { value: "LOCAL", label: "Local", description: "Local city limits delivery" },
  { value: "OUTSTATION", label: "Outstation", description: "Long-distance transit" },
];

// Sort carries no "ALL": it is not a narrowing, it is a choice of order, and its default
// (RUN) is what "unconstrained" means here.
const SORT_OPTIONS = [
  { value: "RUN", label: "Run order", description: "Grouped by dispatch status" },
  { value: "RECENT", label: "Most recent", description: "Newest invoice first" },
  { value: "AREA", label: "By area", description: "Grouped by customer area" },
];

// ── Grouping ──────────────────────────────────────────────────────────────
// A row is either a group header derived from the stream, or a delivery.
type Entry =
  | { kind: "header"; id: string; title: string; tone: Tone }
  | { kind: "row"; id: string; d: Delivery };

const GROUP_TITLE: Record<DeliveryStatus, string> = {
  OUT_FOR_DELIVERY: "On the road",
  SCHEDULED: "Scheduled",
  FLAGGED: "Needs a decision",
  PREBOOKED: "Pre-booked",
  VERIFIED: "Verified",
  PENDING: "Awaiting verification",
  DELIVERED: "Delivered",
  WALK_OUT: "Walked out",
};

/**
 * The resolver. `keyOf` is asked for every row — a header goes in whenever it changes —
 * and `titleOf` / `toneOf` only at a boundary.
 *
 * Built fresh alongside the entries rather than memoised on `sort` alone: the RECENT
 * buckets close over today's IST midnight, and a board left open past midnight would
 * otherwise keep labelling yesterday's invoices "Today".
 */
type Grouper = {
  keyOf: (d: Delivery) => string;
  titleOf: (d: Delivery) => string;
  toneOf: (d: Delivery) => Tone;
};

function grouperFor(sort: DeliverySort): Grouper {
  if (sort === "AREA") {
    return {
      keyOf: (d) => d.customerArea ?? "",
      titleOf: (d) => d.customerArea ?? "No area",
      toneOf: () => "gray",
    };
  }

  if (sort === "RECENT") {
    // RECENT orders by invoiceDate descending, so the buckets come out in this order and
    // never repeat — which is exactly what makes them page.
    const start = getStartOfTodayIST().getTime();
    const bucket = (d: Delivery): "TODAY" | "YESTERDAY" | "EARLIER" => {
      if (isToday(d.invoiceDate)) return "TODAY";
      const t = new Date(d.invoiceDate).getTime();
      return t >= start - 86400000 && t < start ? "YESTERDAY" : "EARLIER";
    };
    const TITLE = { TODAY: "Today", YESTERDAY: "Yesterday", EARLIER: "Earlier" };
    return {
      keyOf: bucket,
      titleOf: (d) => TITLE[bucket(d)],
      toneOf: (d) => (bucket(d) === "TODAY" ? "blue" : "gray"),
    };
  }

  return {
    keyOf: (d) => d.status,
    titleOf: (d) => GROUP_TITLE[d.status] ?? DELIVERY_STATUS[d.status].label,
    toneOf: (d) => DELIVERY_STATUS[d.status].tone,
  };
}

/** Insert a header each time the group key changes as the sorted stream goes past. */
function withGroupHeaders(items: Delivery[], g: Grouper): Entry[] {
  const out: Entry[] = [];
  let last: string | null = null;
  for (const d of items) {
    const key = g.keyOf(d);
    if (key !== last) {
      out.push({ kind: "header", id: `h-${key}-${d.id}`, title: g.titleOf(d), tone: g.toneOf(d) });
      last = key;
    }
    out.push({ kind: "row", id: d.id, d });
  }
  return out;
}

const GroupHeader = React.memo(
  function GroupHeader({ title, tone }: { title: string; tone: Tone }) {
    return (
      <View className="flex-row items-center gap-2 px-5" style={{ height: HEADER_H }}>
        <View className={`w-2 h-2 rounded-full ${TONE[tone].dot}`} />
        <Text className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500" numberOfLines={1}>
          {title}
        </Text>
      </View>
    );
  },
  (a, b) => a.title === b.title && a.tone === b.tone
);

// ── The card ──────────────────────────────────────────────────────────────
// Stacked label-over-value (doc/stitch/delivery.png): the field name in `data-label`
// style above the value, three fields deep, with the status badge floated against the
// first one. Different anatomy from Stock and Inbound — which is why RecordCard is the
// shared piece and this interior is not.
const DeliveryRow = React.memo(
  function DeliveryRow({ d, onPress }: { d: Delivery; onPress: (id: string) => void }) {
    const cfg = DELIVERY_STATUS[d.status];
    // FLAGGED is already `red` in DELIVERY_STATUS, so the accent needs no special case.
    const items = d.lineItems.length
      ? d.lineItems.map((l) => (l.qty > 1 ? `${l.name} x${l.qty}` : l.name)).join(", ")
      : "—";

    return (
      <RecordCard
        accent={cfg.tone}
        onPress={() => onPress(d.id)}
        className="h-[188px] mb-2 mx-4"
        accessibilityLabel={`${d.invoiceNo}, ${d.customerName}, ${cfg.label}`}
      >
        <View className="flex-row items-start">
          <View className="flex-1 min-w-0 pr-2">
            <DataLabel className="leading-[14px]">INVOICE</DataLabel>
            <Text className="text-[18px] leading-[24px] font-bold text-gray-900 mt-1" numberOfLines={1}>
              {d.invoiceNo}
            </Text>
          </View>
          <StatusBadge label={cfg.label} tone={cfg.tone} />
        </View>

        <View className="mt-3">
          <DataLabel className="leading-[14px]">CUSTOMER</DataLabel>
          <Text className="text-[15px] leading-[20px] text-gray-900 mt-1" numberOfLines={1}>
            {d.customerName}
          </Text>
        </View>

        {/* A flagged invoice trades its ITEMS block for the reason — same two-line budget,
            so the card height does not move. The items are on the detail screen anyway;
            why it is stuck is what the board needs to show. */}
        <View className="mt-3">
          <DataLabel className="leading-[14px]">{d.flagReason ? "FLAGGED" : "ITEMS"}</DataLabel>
          {d.flagReason ? (
            <Text className="text-[14px] leading-[19px] font-semibold text-red-600 mt-1" numberOfLines={2}>
              {d.flagReason}
            </Text>
          ) : (
            <Text className="text-[14px] leading-[19px] text-gray-600 mt-1" numberOfLines={2}>
              {items}
            </Text>
          )}
        </View>
      </RecordCard>
    );
  },
  (a, b) =>
    a.d.id === b.d.id &&
    a.d.status === b.d.status &&
    a.d.flagReason === b.d.flagReason &&
    a.d.customerName === b.d.customerName &&
    a.d.scheduledDate === b.d.scheduledDate &&
    a.onPress === b.onPress
);

// ── Screen ────────────────────────────────────────────────────────────────
export default function DeliveriesListScreen() {
  const router = useRouter();
  const can = useSession((s) => s.hasPermission);
  const revision = useStock((s) => s.revision);
  const ensureLoaded = useStock((s) => s.ensureLoaded);
  // Global counters, not page facets — a tile that ticked down while someone typed in the
  // search box would read as a bug (see StatTile).
  const summary = useStock((s) => s.summary);

  const [filter, setFilter] = useState<Filter>("OPEN");
  const [groups, setGroups] = useState<GroupSelection>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { value: search, setValue: setSearch, debounced } = useDebouncedSearch();

  const sort = (groups.sort as DeliverySort) ?? "RUN";

  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);

  const fetchPage = useCallback(
    async (cursor: string | null) => {
      const page = await mockApi.queryDeliveries({ cursor, q: debounced, filter, sort, filters: groups });
      return {
        items: page.items,
        nextCursor: page.nextCursor,
        total: page.total,
        extra: { facets: page.facets, groupFacets: page.groupFacets },
      };
    },
    [debounced, filter, sort, groups]
  );

  // Everything the query depends on, or a write leaves the list showing the old rows.
  const list = usePagedList({
    resetKey: `${debounced}|${filter}|${JSON.stringify(groups)}|${revision}`,
    fetchPage,
    idOf: (d: Delivery) => d.id,
  });

  const entries = useMemo(() => withGroupHeaders(list.items, grouperFor(sort)), [list.items, sort]);

  const open = useCallback(
    (id: string) => {
      Haptics.selectionAsync().catch(() => {});
      router.push(`/deliveries/${id}` as never);
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item }: { item: Entry }) =>
      item.kind === "header" ? (
        <GroupHeader title={item.title} tone={item.tone} />
      ) : (
        <DeliveryRow d={item.d} onPress={open} />
      ),
    [open]
  );

  const keyExtractor = useCallback((e: Entry) => e.id, []);

  // Both heights are exact constants, so this list gets getItemLayout back despite being
  // mixed — headers are HEADER_H with no margin, cards are CARD_H plus their mb-2. Keep
  // the two numbers in step with `h-[188px]`/`mb-2` on the card and the `style` height on
  // the header: the sum is what every offset below a row is built from.
  // useCallback because PagedList memoises its offset table on this function's identity.
  const getEntryHeight = useCallback((e: Entry) => (e.kind === "header" ? HEADER_H : CARD_H + GAP), []);

  const facets = list.extra?.facets;
  const groupFacets: GroupFacets | undefined = list.extra?.groupFacets;

  const pillCounts = useMemo(
    () => ({
      ALL: facets?.ALL,
      TODAY: facets?.TODAY,
      OPEN: facets?.OPEN,
      ON_ROAD: facets?.ON_ROAD,
      FLAGGED: facets?.FLAGGED,
      DONE: facets?.DONE,
    }),
    [facets]
  );

  const filterGroups = useMemo<FilterGroupSpec[]>(
    () => [
      {
        key: "status",
        title: "Status",
        render: "grid",
        options: [
          { value: "ALL", label: "All", count: groupFacets?.status?.ALL },
          ...STATUS_ORDER.map((s) => ({
            value: s,
            label: DELIVERY_STATUS[s].label,
            count: groupFacets?.status?.[s],
          })),
        ],
      },
      { key: "timeline", title: "Timeline", render: "pills", options: TIMELINE_OPTIONS },
      {
        key: "dispatch",
        title: "Dispatch Type",
        render: "cards",
        options: DISPATCH_OPTIONS.map((o) => ({ ...o, count: groupFacets?.dispatch?.[o.value] })),
      },
      { key: "sort", title: "Sort By", render: "cards", options: SORT_OPTIONS },
    ],
    [groupFacets]
  );

  const activeFilters = activeFilterCount(groups, DEFAULT_FILTERS);

  if (!can("deliveries", "view")) return <NoAccess module="Deliveries & Dispatch" />;

  // An ELEMENT, not a component type — a new type each render remounts the header and
  // closes the keyboard on every keystroke.
  const header = (
    <View className="bg-surface">
      <ScreenHeader
        title="Delivery Run"
        subtitleNode={<CountLine shown={list.items.length} total={list.total} noun="deliveries" />}
        right={
          <PressScale
            onPress={() => setFiltersOpen(true)}
            scaleTo={0.95}
            accessibilityRole="button"
            accessibilityLabel="Filters"
            className="flex-row items-center gap-1.5 min-h-[44px] px-2 rounded-lg"
          >
            <SlidersHorizontal size={18} color={BRAND[600]} />
            <Text className="text-[15px] font-bold text-brand-600" numberOfLines={1}>
              {activeFilters === 0 ? "Filter" : `Filter (${activeFilters})`}
            </Text>
          </PressScale>
        }
      />
      <View className="px-4 pb-2.5">
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search invoice, customer…" withIcon />
      </View>
      <View className="px-4 pb-3">
        <StatGrid columns={2}>
          <StatTile compact value={summary?.deliveriesPending ?? "—"} label="Pending" tone="amber" />
          <StatTile compact value={summary?.deliveriesScheduled ?? "—"} label="Scheduled" tone="blue" />
        </StatGrid>
      </View>
      <Pills options={FILTERS} value={filter} onChange={setFilter} counts={pillCounts} />
    </View>
  );

  return (
    <View className="flex-1 bg-surface">
      <PagedList
        data={entries}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemHeight={getEntryHeight}
        status={list.status}
        error={list.error}
        initialLoad={list.initialLoad}
        hasMore={list.hasMore}
        loadingMore={list.loadingMore}
        refreshing={list.refreshing}
        onEndReached={list.loadMore}
        onRefresh={list.refresh}
        onRetry={list.retry}
        total={list.total}
        ListHeaderComponent={header}
        loadingEmoji="🛵"
        loadingCaption="Loading the run…"
        emptyEmoji="🛵"
        emptyMessage={debounced ? `No delivery matches “${debounced}”` : "Nothing in this view"}
        endLabel={`All ${list.total.toLocaleString("en-IN")} deliveries loaded`}
      />

      <FilterScreen
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        groups={filterGroups}
        value={groups}
        defaults={DEFAULT_FILTERS}
        onApply={setGroups}
      />
    </View>
  );
}
