// Stock & Inventory — the catalogue, served a page at a time.
//
// Built for a real catalogue (10k+ SKUs), not for the seed data: the screen never holds
// more than the pages it has scrolled through, every row's height is PREDICTABLE from the
// item alone so FlatList can skip measurement, and the row component is memoised so
// scrolling re-renders nothing that has not changed. See src/components/PagedList.tsx for
// the windowing settings and src/lib/usePagedList.ts for the paging guards.
//
// Redesigned to doc/stitch/stock.png (Precision Logic): white RecordCard on a `surface`
// ground, a 4px tone accent on the left edge, the SKU and brand in the accent colour, and
// the health pills promoted out of the filter sheet onto the screen.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { SlidersHorizontal } from "lucide-react-native";
import { useSession } from "@/store/session";
import { useStock } from "@/store/stock";
import * as mockApi from "@/services/mockApi";
import type { ProductHealth, ProductSort } from "@/services/mockApi.stock";
import type { Product } from "@/mock/types";
import { formatINR } from "@/lib/format";
import { activeFilterCount, stockHealth, TONE } from "@/lib/stock-constants";
import { BRAND, NEUTRAL } from "@/lib/theme";
import { useDebouncedSearch } from "@/lib/useDebouncedSearch";
import { usePagedList } from "@/lib/usePagedList";
import PagedList, { CountLine } from "@/components/PagedList";
import { Badge, MetaRun, NoAccess, Pills, RecordCard, ScreenHeader } from "@/components/stock";
import FilterScreen, { type FilterGroupSpec } from "@/components/stock/FilterScreen";
import SearchBar from "@/components/SearchBar";
import PressScale from "@/components/PressScale";
import ErrorBanner from "@/components/ErrorBanner";

// ── Row height ────────────────────────────────────────────────────────────
// The card is one of TWO heights: the product name is the only thing allowed to wrap, and
// it wraps to at most two lines. That is why this list uses `getItemHeight` rather than
// `itemHeight` — offsets come from a table instead of one multiplication.
//
// Both heights are declared on the card as a LITERAL `h-[NNpx]`, so a card can never
// render taller than it claims however long its content is; the only thing a wrong guess
// costs is a cramped or an airy card, never a displaced offset. `nameLines()` below is the
// single source of that guess — the class and getItemHeight both call it, so they cannot
// disagree.
//
// Budget, in the 1-line case (RecordCard's own py-3.5 is 14 + 14):
//
//   padding                                        28
//   name    17px @ leading-22                      22
//   meta    mt-2 + 11.5px @ leading-16           8+16
//   price   mt-2 + 16px @ leading-20             8+20
//                                          total 102  of 112
//
// and in the 2-line case one more name line (22) → 124 of 140. The slack is deliberate:
// it absorbs a notch of OS font scaling before anything overflows. The right column is
// 28 (stock) + 4 + 18 (badge) = 50, comfortably inside either.
//
// NOTE: `h-[112px]` / `h-[140px]` below must be edited together with these constants.
// Tailwind extracts arbitrary values from the literal source text, so the class cannot be
// built from the constant.
const CARD_H_1 = 112;
const CARD_H_2 = 140;
const GAP = 8;

/**
 * How many lines the product name will take.
 *
 * Character count, not measurement: measuring 10k names would cost more than the blank
 * cells it prevents, and the fixed `h-[…]` class means a wrong answer is cosmetic.
 *
 * The width it is calibrated against, on a ~390pt phone:
 *   390 − mx-4 (32) − RecordCard px-4 (32) − left accent (4) = 322 inner
 *   322 − right column (84) − mr-3 (12)                      = 226 for the name
 * Product names in this catalogue are UPPERCASE ("HERO VIPER 24T SS IBC RS V/B GRY/RED"),
 * whose average advance at 17px bold is ≈ 0.6em ≈ 10.2px → ~22 characters. Wrapping then
 * happens at a WORD boundary, so the real capacity is a little under that count, never
 * over — which is why the threshold is set at the raw estimate and not padded upward.
 * Erring toward "two lines" only adds whitespace; erring toward "one" crowds the card.
 */
const NAME_CHARS_PER_LINE = 22;
function nameLines(name: string): 1 | 2 {
  return name.length > NAME_CHARS_PER_LINE ? 2 : 1;
}

const HEALTH_LABELS: Record<ProductHealth, string> = {
  ALL: "All",
  IN_STOCK: "In stock",
  LOW_STOCK: "Low stock",
  NO_STOCK: "Out of stock",
  INACTIVE: "Inactive",
};

// Pill order is the design's: the neutral option first, then best-to-worst health, with
// the archive at the end.
const HEALTH_ORDER: ProductHealth[] = ["ALL", "IN_STOCK", "LOW_STOCK", "NO_STOCK", "INACTIVE"];

const SORT_LABELS: Record<ProductSort, string> = {
  NAME: "Name (A–Z)",
  STOCK_LOW_FIRST: "Least stock first",
  STOCK_HIGH_FIRST: "Most stock first",
  RECENT: "Recently updated",
};

const DEFAULT_HEALTH: ProductHealth = "ALL";
const DEFAULT_SORT: ProductSort = "NAME";
const DEFAULT_TYPE = "ALL";

/** Drives the Filter badge and FilterScreen's "Apply N Filters" — one shared shape. */
const FILTER_DEFAULTS = { health: DEFAULT_HEALTH, sort: DEFAULT_SORT, typeId: DEFAULT_TYPE };

// ── Row ───────────────────────────────────────────────────────────────────
// memo with an explicit comparator: while scrolling, FlatList re-renders rows whose props
// are referentially new but identical in value. Only these fields change what is drawn.
const ProductRow = React.memo(
  function ProductRow({ p, onPress }: { p: Product; onPress: (id: string) => void }) {
    const h = stockHealth(p);
    const lines = nameLines(p.name);

    return (
      <RecordCard
        accent={h.tone}
        onPress={() => onPress(p.id)}
        dimmed={h.key === "INACTIVE"}
        accessibilityLabel={`${p.name}, ${p.currentStock} in stock, ${h.label}`}
        // Height literal — see the budget above. Kept in sync with CARD_H_1 / CARD_H_2.
        className={`${lines === 2 ? "h-[140px]" : "h-[112px]"} mb-2 mx-4 flex-row items-center`}
      >
        {/* LEFT — what it is, how it is filed, what it sells for.
            `flex-1 min-w-0` is what makes the name wrap and truncate instead of pushing
            the numbers off the right edge. */}
        <View className="flex-1 min-w-0 mr-3">
          <Text className="text-[17px] font-bold text-gray-900 leading-[22px]" numberOfLines={2}>
            {p.name}
          </Text>

          {/* SKU and brand carry the accent colour — they are what the eye scans a column
              for. One truncating line, so a long brand name cannot add a row. */}
          <MetaRun
            className="mt-2 leading-[16px]"
            items={[
              { text: p.sku, accent: true },
              p.brand?.name ? { text: p.brand.name, accent: true } : null,
              p.category?.name ?? "Uncategorized",
            ]}
          />

          <View className="flex-row items-baseline mt-2">
            <Text className="text-[16px] font-semibold text-gray-900 leading-[20px]" numberOfLines={1}>
              {formatINR(p.sellingPrice)}
            </Text>
            {/* Cost is struck through: it is the number this price is measured against,
                not a second price on offer. Absent when the API omits it (no
                `cost_price.view` grant), and it never adds a line. */}
            {p.costPrice ? (
              <Text className="text-[12px] text-gray-400 line-through ml-2" numberOfLines={1}>
                cost {formatINR(p.costPrice)}
              </Text>
            ) : null}
          </View>
        </View>

        {/* RIGHT — how many, and how that reads. Fixed width so every name in the list
            breaks at the same place instead of shifting row to row. */}
        <View className="w-[84px] items-end">
          <Text className={`text-[24px] font-bold leading-[28px] ${TONE[h.tone].text}`} numberOfLines={1}>
            {p.currentStock}
          </Text>
          <View className="mt-1">
            <Badge label={h.label} tone={h.tone} />
          </View>
        </View>
      </RecordCard>
    );
  },
  (a, b) =>
    a.p.id === b.p.id &&
    a.p.currentStock === b.p.currentStock &&
    a.p.status === b.p.status &&
    a.p.sellingPrice === b.p.sellingPrice &&
    a.p.costPrice === b.p.costPrice &&
    a.p.name === b.p.name &&
    a.p.sku === b.p.sku &&
    a.p.brand?.name === b.p.brand?.name &&
    a.p.category?.name === b.p.category?.name &&
    a.onPress === b.onPress
);

export default function StockListScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string }>();
  const can = useSession((s) => s.hasPermission);

  // Product types are a small, shared collection, so they stay in the store. The catalogue
  // itself does not — a 10k array in a global store re-renders every subscriber on a write.
  const productTypes = useStock((s) => s.productTypes);
  const ensureLoaded = useStock((s) => s.ensureLoaded);

  // The raw value never reaches the query; `debounced` is what goes in resetKey.
  const { value: search, setValue: setSearch, debounced } = useDebouncedSearch();
  const [typeId, setTypeId] = useState<string>(DEFAULT_TYPE);
  const [health, setHealth] = useState<ProductHealth>(
    (params.filter && params.filter in HEALTH_LABELS ? params.filter : DEFAULT_HEALTH) as ProductHealth
  );
  const [sort, setSort] = useState<ProductSort>(DEFAULT_SORT);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);

  // Everything the query depends on, and nothing else. A change here resets to page one.
  const resetKey = `${debounced}|${typeId}|${health}|${sort}`;

  const fetchPage = useCallback(
    async (cursor: string | null) => {
      const page = await mockApi.queryProducts({ cursor, q: debounced, typeId, health, sort });
      return {
        items: page.items,
        nextCursor: page.nextCursor,
        total: page.total,
        extra: { healthCounts: page.healthCounts },
      };
    },
    [debounced, typeId, health, sort]
  );

  const list = usePagedList({ resetKey, fetchPage, idOf: (p: Product) => p.id });

  const open = useCallback(
    (id: string) => {
      Haptics.selectionAsync().catch(() => {});
      router.push(`/stock/${id}` as never);
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item }: { item: Product }) => <ProductRow p={item} onPress={open} />,
    [open]
  );

  const keyExtractor = useCallback((p: Product) => p.id, []);

  // Stable identity is load-bearing: PagedList rebuilds its whole offset table whenever
  // this function changes. It reads nothing but the item, so it never needs to.
  const getItemHeight = useCallback((p: Product) => (nameLines(p.name) === 2 ? CARD_H_2 : CARD_H_1) + GAP, []);

  const counts = list.extra?.healthCounts;
  const filterValue = useMemo(() => ({ health, sort, typeId }), [health, sort, typeId]);
  const activeFilters = activeFilterCount(filterValue, FILTER_DEFAULTS);

  // Faceted counts come from the endpoint BEFORE the health filter is applied, so a pill
  // always says how many rows it would give you (see src/services/paged.ts).
  const healthPills = useMemo(
    () => HEALTH_ORDER.map((k) => ({ key: k, label: HEALTH_LABELS[k] })),
    []
  );

  const filterGroups = useMemo<FilterGroupSpec[]>(
    () => [
      {
        key: "health",
        title: "Stock health",
        render: "grid",
        options: HEALTH_ORDER.map((v) => ({
          value: v,
          label: HEALTH_LABELS[v],
          count: counts ? counts[v] : undefined,
        })),
      },
      {
        key: "sort",
        title: "Sort by",
        render: "cards",
        options: (Object.keys(SORT_LABELS) as ProductSort[]).map((v) => ({ value: v, label: SORT_LABELS[v] })),
      },
      {
        key: "typeId",
        title: "Product type",
        render: "pills",
        options: [
          { value: DEFAULT_TYPE, label: "All types" },
          ...productTypes.filter((t) => t.isActive).map((t) => ({ value: t.id, label: t.name })),
        ],
      },
    ],
    [counts, productTypes]
  );

  const applyFilters = useCallback((next: Record<string, string>) => {
    setHealth(next.health as ProductHealth);
    setSort(next.sort as ProductSort);
    setTypeId(next.typeId);
  }, []);

  if (!can("stock", "view")) return <NoAccess module="Stock & Inventory" />;

  // Passed as an ELEMENT, not a function component: a new component type each render would
  // remount the header and drop the keyboard on every keystroke.
  const header = (
    <View className="bg-surface">
      <ScreenHeader
        title="Stock & Inventory"
        subtitleNode={<CountLine shown={list.items.length} total={list.total} noun="products" />}
        right={
          <PressScale
            onPress={() => setFiltersOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Filter and sort"
            className={`flex-row items-center gap-1.5 px-3.5 min-h-[44px] rounded-lg border ${
              activeFilters > 0 ? "bg-brand-50 border-brand-200" : "bg-white border-gray-200"
            }`}
          >
            <SlidersHorizontal size={16} color={activeFilters > 0 ? BRAND[700] : NEUTRAL[500]} />
            <Text className={`text-[13px] font-bold ${activeFilters > 0 ? "text-brand-700" : "text-gray-700"}`}>
              Filter
            </Text>
            {activeFilters > 0 && (
              <View className="bg-brand-600 rounded-full min-w-[16px] h-4 px-1 items-center justify-center">
                <Text className="text-white text-[10px] font-extrabold">{activeFilters}</Text>
              </View>
            )}
          </PressScale>
        }
      />

      <View className="px-4 pb-2.5">
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search name, SKU, brand, size…" withIcon />
      </View>

      {/* The five health facets, horizontally scrolling. This replaced a three-type
          segmented row that silently dropped every type past the third; product TYPE now
          lives in the filter screen, where all of them fit. */}
      <Pills options={healthPills} value={health} onChange={setHealth} counts={counts} />

      {list.error && list.items.length > 0 ? <ErrorBanner message={list.error} onDismiss={() => {}} /> : null}
    </View>
  );

  return (
    <View className="flex-1 bg-surface">
      <PagedList
        data={list.items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemHeight={getItemHeight}
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
        loadingEmoji="📦"
        loadingCaption="Loading catalogue…"
        emptyEmoji="🔍"
        emptyMessage={debounced ? `No products match “${debounced}”` : "No products in this view"}
        endLabel={`All ${list.total.toLocaleString("en-IN")} products loaded`}
      />

      <FilterScreen
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        groups={filterGroups}
        value={filterValue}
        defaults={FILTER_DEFAULTS}
        onApply={applyFilters}
      />
    </View>
  );
}
