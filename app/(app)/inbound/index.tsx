// Inbound Tracking — brand shipments on their way in, paged (doc/stitch/inward.png).
//
// Overdue shipments sort to the top: a late delivery with a customer waiting on it is the
// only thing on this screen that needs someone today.
//
// The header carries a 2x2 of GLOBAL counters from getStockSummary — never from the page's
// facets, which are scoped to the current search and would tick down as someone types. The
// headline figure on each tile is UNITS; the caption is the bill count.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Clock, SlidersHorizontal } from "lucide-react-native";
import { useSession } from "@/store/session";
import { useStock } from "@/store/stock";
import * as mockApi from "@/services/mockApi";
import type { InboundFilter, InboundSort } from "@/services/mockApi.stock";
import type { InboundShipment } from "@/mock/types";
import { formatDayMonth } from "@/lib/format";
import { activeFilterCount, INBOUND_STATUS, TONE, type Tone } from "@/lib/stock-constants";
import { getStartOfTodayIST } from "@/lib/timezone";
import { BRAND, NEUTRAL } from "@/lib/theme";
import { useDebouncedSearch } from "@/lib/useDebouncedSearch";
import { usePagedList } from "@/lib/usePagedList";
import PagedList, { CountLine } from "@/components/PagedList";
import { Badge, MetaRun, NoAccess, Pills, RecordCard, ScreenHeader, StatGrid, StatTile } from "@/components/stock";
import FilterScreen, { type FilterGroupSpec } from "@/components/stock/FilterScreen";
import SearchBar from "@/components/SearchBar";
import PressScale from "@/components/PressScale";

// Row height. `getItemLayout` is arithmetic on ITEM_H, so a row that renders TALLER than
// it declares puts every offset below it out and shows blank cells on a fast fling. The
// budget is therefore worked out, not eyeballed — nothing in this card wraps and every
// Text is capped:
//
//   RecordCard chrome: py-3.5 (14+14) + 1px border top/bottom          30
//   title row        : brand 17px ≈ 23, badge ≈ 19 → max              23
//   meta run         : mt-1 (4) + 11.5px ≈ 16                         20
//   divider          : my-4 (16+16) + 1px hairline                    33
//   footer row       : label 11px ≈ 15 + value 14px ≈ 19 = 34,
//                      age pill 13px + py-1.5 + border ≈ 32 → max     34
//                                                            total = 140 of 148
//
// The 8px of slack is deliberate: a card that renders SHORTER than its declared height is
// harmless (the fixed height simply holds), one that renders taller is not.
//
// NOTE: `h-[148px]` below must be edited together with CARD_H. Tailwind extracts arbitrary
// values from the literal source text, so the class cannot be built from the constant.
const CARD_H = 148;
const GAP = 8;
const ITEM_H = CARD_H + GAP;

type Filter = InboundFilter | "ALL";

// The pill row keeps only the three high-traffic views. Partial, Received and the sort
// live in the filter screen — five chips is a scrolling row nobody reaches the end of.
const FILTERS: { key: Filter; label: string }[] = [
  { key: "IN_TRANSIT", label: "In transit" },
  { key: "OVERDUE", label: "Overdue" },
  { key: "ALL", label: "All" },
];

const STATUS_OPTIONS: { value: Filter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "IN_TRANSIT", label: "In transit" },
  { value: "PARTIAL", label: "Partial" },
  { value: "RECEIVED", label: "Received" },
  { value: "OVERDUE", label: "Overdue" },
];

const SORT_OPTIONS: { value: InboundSort; label: string; description: string }[] = [
  { value: "RECENT", label: "Most recent", description: "Overdue first, then newest bills" },
  { value: "EXPECTED", label: "Expected date", description: "Soonest arrival at the top" },
  { value: "VALUE", label: "Bill value", description: "Largest bills first" },
];

const DEFAULT_FILTER: Filter = "IN_TRANSIT";
const DEFAULT_SORT: InboundSort = "RECENT";

// The screen OPENS on IN_TRANSIT — that is the working view. These defaults are separate
// and deliberately NEUTRAL, because they drive two things that both mean "unfiltered":
// Reset ("show me everything", not "put it back how it opened") and the badge count
// ("is this list narrowed?" — and IN_TRANSIT is narrowed). Counting against the opening
// value instead would light the badge when someone taps the "All" chip, i.e. when they
// BROADEN the view, which reads backwards.
const FILTER_DEFAULTS = { status: "ALL", sort: DEFAULT_SORT } as Record<string, string>;

const DAY = 86_400_000;
const daysBetween = (later: Date, earlier: Date) => Math.floor((later.getTime() - earlier.getTime()) / DAY);

const isOverdue = (s: InboundShipment) =>
  s.status !== "DELIVERED" && new Date(s.expectedDeliveryDate) < getStartOfTodayIST();

/**
 * The card's right-hand pill: how long this bill has been open, or how late it is.
 * Red once it is past its expected date, green once it has landed, amber while it runs.
 */
function agePill(s: InboundShipment): { label: string; tone: Tone } {
  const today = getStartOfTodayIST();
  if (s.status === "DELIVERED") {
    const end = s.deliveredAt ? new Date(s.deliveredAt) : today;
    const n = Math.max(0, daysBetween(end, new Date(s.billDate)));
    return { label: n === 0 ? "Same day" : `${n} day${n === 1 ? "" : "s"}`, tone: "green" };
  }
  if (isOverdue(s)) {
    const n = Math.max(1, daysBetween(today, new Date(s.expectedDeliveryDate)));
    return { label: `${n} day${n === 1 ? "" : "s"} late`, tone: "red" };
  }
  const n = Math.max(0, daysBetween(today, new Date(s.billDate)));
  return { label: n === 0 ? "Today" : `${n} day${n === 1 ? "" : "s"}`, tone: "amber" };
}

// ── Row ───────────────────────────────────────────────────────────────────
// memo with an explicit comparator: while scrolling, FlatList re-renders rows whose props
// are referentially new but identical in value. Only these fields change what is drawn.
const ShipmentRow = React.memo(
  function ShipmentRow({ s, onPress }: { s: InboundShipment; onPress: (id: string) => void }) {
    const cfg = INBOUND_STATUS[s.status];
    const overdue = isOverdue(s);
    const age = agePill(s);
    // The BADGE keeps the status tone — it names the status, not the urgency. Lateness is
    // carried by the left accent and by the red age pill, so the two never disagree.
    const accent: Tone = overdue ? "red" : cfg.tone;

    return (
      <RecordCard
        accent={accent}
        onPress={() => onPress(s.id)}
        className="h-[148px] mb-2 mx-4"
        accessibilityLabel={`${s.brand.name}, bill ${s.billNo}, ${cfg.label}`}
      >
        <View className="flex-row items-center gap-2">
          <Text className="flex-1 text-[17px] font-bold text-gray-900" numberOfLines={1}>
            {s.brand.name}
          </Text>
          <Badge label={cfg.label} tone={cfg.tone} />
        </View>

        <MetaRun className="mt-1" items={[`Bill ${s.billNo}`, s.shipmentNo]} />

        <View className="h-px bg-gray-200 my-4" />

        <View className="flex-row items-center">
          <View className="mr-6">
            <Text className="text-[11px] text-gray-400" numberOfLines={1}>
              Billed
            </Text>
            <Text className="text-[14px] font-semibold text-gray-900" numberOfLines={1}>
              {formatDayMonth(s.billDate)}
            </Text>
          </View>
          <View>
            <Text className="text-[11px] text-gray-400" numberOfLines={1}>
              Items
            </Text>
            <Text className="text-[14px] font-semibold text-gray-900" numberOfLines={1}>
              {s.totalItems} items
            </Text>
          </View>
          <View
            className={`ml-auto flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-full border ${TONE[age.tone].border}`}
          >
            <Clock size={13} color={TONE[age.tone].hex} />
            <Text className={`text-[12.5px] font-semibold ${TONE[age.tone].text}`} numberOfLines={1}>
              {age.label}
            </Text>
          </View>
        </View>
      </RecordCard>
    );
  },
  (a, b) =>
    a.s.id === b.s.id &&
    a.s.status === b.s.status &&
    a.s.deliveredAt === b.s.deliveredAt &&
    a.s.expectedDeliveryDate === b.s.expectedDeliveryDate &&
    a.onPress === b.onPress
);

export default function InboundListScreen() {
  const router = useRouter();
  const can = useSession((s) => s.hasPermission);
  const revision = useStock((s) => s.revision);
  const summary = useStock((s) => s.summary);
  const ensureLoaded = useStock((s) => s.ensureLoaded);

  const [filter, setFilter] = useState<Filter>(DEFAULT_FILTER);
  const [sort, setSort] = useState<InboundSort>(DEFAULT_SORT);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { value: search, setValue: setSearch, debounced } = useDebouncedSearch();

  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);

  const fetchPage = useCallback(
    async (cursor: string | null) => {
      const page = await mockApi.queryInbound({ cursor, q: debounced, filter, sort });
      return { items: page.items, nextCursor: page.nextCursor, total: page.total, extra: page.facets };
    },
    [debounced, filter, sort]
  );

  const list = usePagedList({
    resetKey: `${debounced}|${filter}|${sort}|${revision}`,
    fetchPage,
    idOf: (s: InboundShipment) => s.id,
  });

  const open = useCallback(
    (id: string) => {
      Haptics.selectionAsync().catch(() => {});
      router.push(`/inbound/${id}` as never);
    },
    [router]
  );

  const renderItem = useCallback(({ item }: { item: InboundShipment }) => <ShipmentRow s={item} onPress={open} />, [open]);
  const keyExtractor = useCallback((s: InboundShipment) => s.id, []);

  const facets = list.extra;
  const pillCounts = useMemo(
    () => ({ ALL: facets?.ALL, IN_TRANSIT: facets?.IN_TRANSIT, OVERDUE: facets?.OVERDUE }),
    [facets]
  );

  const filterValue = useMemo(() => ({ status: filter, sort }) as Record<string, string>, [filter, sort]);
  const activeFilters = activeFilterCount(filterValue, FILTER_DEFAULTS);

  const groups: FilterGroupSpec[] = useMemo(
    () => [
      {
        key: "status",
        title: "Status",
        render: "grid",
        options: STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label, count: facets?.[o.value] })),
      },
      { key: "sort", title: "Sort by", render: "cards", options: SORT_OPTIONS },
    ],
    [facets]
  );

  const applyFilters = useCallback((next: Record<string, string>) => {
    setFilter((next.status as Filter) ?? DEFAULT_FILTER);
    setSort((next.sort as InboundSort) ?? DEFAULT_SORT);
  }, []);

  if (!can("inbound", "view")) return <NoAccess module="Inbound Tracking" />;

  const header = (
    <View className="bg-surface">
      <ScreenHeader
        title="Inbound Tracking"
        subtitleNode={<CountLine shown={list.items.length} total={list.total} noun="shipments" />}
      />

      <View className="px-4 pb-2.5 flex-row items-center gap-2">
        <View className="flex-1">
          <SearchBar value={search} onChangeText={setSearch} placeholder="Brand, bill no., product…" withIcon />
        </View>
        <PressScale
          onPress={() => setFiltersOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Filter and sort"
          className={`flex-row items-center gap-1.5 px-3 min-h-[40px] rounded-full ${
            activeFilters > 0 ? "bg-brand-50 border border-brand-200" : "bg-white border border-gray-200"
          }`}
        >
          <SlidersHorizontal size={14} color={activeFilters > 0 ? BRAND[700] : NEUTRAL[500]} />
          <Text className={`text-[12.5px] font-bold ${activeFilters > 0 ? "text-brand-700" : "text-gray-600"}`}>
            Filter
          </Text>
          {activeFilters > 0 && (
            <View className="bg-brand-600 rounded-full min-w-[16px] h-4 px-1 items-center justify-center">
              <Text className="text-white text-[10px] font-extrabold">{activeFilters}</Text>
            </View>
          )}
        </PressScale>
      </View>

      {/* Global counters — units headline, bill count caption. `inboundInTransit` IS the
          bill count on StockSummary; the units sit on the ...Units fields. */}
      <StatGrid columns={2} className="px-4 pb-3">
        <StatTile
          value={summary?.inboundInTransitUnits ?? 0}
          label="In Transit"
          caption={`${summary?.inboundInTransit ?? 0} bills`}
          tone="amber"
        />
        <StatTile
          value={summary?.inboundThisWeekUnits ?? 0}
          label="This Week"
          caption={`${summary?.inboundThisWeekBills ?? 0} bills`}
          tone="blue"
        />
        <StatTile value={summary?.inboundPrebookedUnits ?? 0} label="Pre-booked" caption="Waiting" tone="blue" />
        <StatTile
          value={summary?.inboundDeliveredThisMonthUnits ?? 0}
          label="Delivered"
          caption="This Month"
          tone="green"
        />
      </StatGrid>

      <Pills options={FILTERS} value={filter} onChange={setFilter} counts={pillCounts} />
    </View>
  );

  return (
    <View className="flex-1 bg-surface">
      <PagedList
        data={list.items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        itemHeight={ITEM_H}
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
        loadingEmoji="🚚"
        loadingCaption="Loading shipments…"
        emptyEmoji="🚚"
        emptyMessage={debounced ? `No shipment matches “${debounced}”` : "No shipments in this view"}
        endLabel={`All ${list.total.toLocaleString("en-IN")} shipments loaded`}
      />

      <FilterScreen
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        groups={groups}
        value={filterValue}
        defaults={FILTER_DEFAULTS}
        onApply={applyFilters}
      />
    </View>
  );
}
