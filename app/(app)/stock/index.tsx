// Stock & Inventory — the catalogue, served a page at a time.
//
// Built for a real catalogue (10k+ SKUs), not for the seed data: the screen never holds
// more than the pages it has scrolled through, rows are fixed-height so FlatList can skip
// measurement, and the row component is memoised so scrolling re-renders nothing that has
// not changed. See src/components/PagedList.tsx for the windowing settings and
// src/lib/usePagedList.ts for the paging guards.
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
import { HEALTH_ACCENT, stockHealth } from "@/lib/stock-constants";
import { NEUTRAL } from "@/lib/theme";
import { usePagedList } from "@/lib/usePagedList";
import PagedList, { CountLine } from "@/components/PagedList";
import { Badge, NoAccess, ScreenHeader } from "@/components/stock";
import FilterSheet from "@/components/stock/FilterSheet";
import SearchBar from "@/components/SearchBar";
import PressScale from "@/components/PressScale";
import ErrorBanner from "@/components/ErrorBanner";

// Row height. `getItemLayout` is arithmetic on ITEM_H, so a row that renders TALLER than
// it declares puts every offset below it out and shows blank cells on a fast fling. The
// budget is therefore worked out, not eyeballed, and both columns are capped:
//
//   padding 12 + 12                                        24
//   left  : name 2x18=36, meta 2+14, sku 2+13              67
//   right : stock 22, badge 4+18, price 4+17               65
//                                    max(67, 65) + 24  =   91  of 96
//
// Every Text has numberOfLines. Nothing in this row is free to wrap, and nothing is
// conditional in a way that adds a line — that is why cost price is not here; it lives on
// the detail screen, where the cost_price grant already gates it.
//
// NOTE: `h-[96px]` below must be edited together with CARD_H. Tailwind extracts arbitrary
// values from the literal source text, so the class cannot be built from the constant.
const CARD_H = 96;
const GAP = 8;
const ITEM_H = CARD_H + GAP;

const HEALTH_LABELS: Record<ProductHealth, string> = {
  ALL: "All products",
  IN_STOCK: "In stock",
  LOW_STOCK: "Low stock",
  NO_STOCK: "Out of stock",
  INACTIVE: "Inactive",
};

const SORT_LABELS: Record<ProductSort, string> = {
  NAME: "Name (A–Z)",
  STOCK_LOW_FIRST: "Least stock first",
  STOCK_HIGH_FIRST: "Most stock first",
  RECENT: "Recently updated",
};

const DEFAULT_HEALTH: ProductHealth = "ALL";
const DEFAULT_SORT: ProductSort = "NAME";

// ── Row ───────────────────────────────────────────────────────────────────
// memo with an explicit comparator: while scrolling, FlatList re-renders rows whose props
// are referentially new but identical in value. Only these five fields change what is drawn.
const ProductRow = React.memo(
  function ProductRow({ p, onPress }: { p: Product; onPress: (id: string) => void }) {
    const h = stockHealth(p);
    const stockColor =
      h.key === "OUT" ? "text-red-600" : h.key === "LOW" ? "text-amber-600" : h.key === "INACTIVE" ? "text-gray-500" : "text-green-600";

    // Brand and category on one line rather than as chips. Chips wrap when a brand name is
    // long, which breaks the height budget above and squeezes the row.
    const filedUnder = [p.brand?.name, p.category?.name, p.size ? (p.size === "ECYCLE" ? "E-Cycle" : `${p.size}″`) : null]
      .filter(Boolean)
      .join("  ·  ");

    return (
      <PressScale
        onPress={() => onPress(p.id)}
        className={`h-[96px] mb-2 mx-4 bg-white rounded-2xl border border-gray-100 border-l-4 ${HEALTH_ACCENT[h.key]} px-3.5 py-3 flex-row items-center ${
          h.key === "INACTIVE" ? "opacity-60" : ""
        }`}
      >
        {/* LEFT — what it is, and how it is filed.
            `flex-1 min-w-0` is what makes the name truncate instead of pushing the numbers
            off the right edge; `mr-3` gives the gap without relying on the parent. */}
        <View className="flex-1 min-w-0 mr-3">
          <Text className="text-[15px] font-bold text-gray-900 leading-[18px]" numberOfLines={2}>
            {p.name}
          </Text>
          <Text className="text-[11px] font-semibold text-gray-500 mt-0.5" numberOfLines={1}>
            {filedUnder || "Unfiled"}
          </Text>
          <Text className="text-[10px] text-gray-400 mt-0.5" numberOfLines={1}>
            {p.sku}
          </Text>
        </View>

        {/* RIGHT — how many, and what it sells for. Fixed width so every name in the list
            breaks at the same place instead of shifting row to row. */}
        <View className="w-[88px] items-end justify-center">
          <View className="flex-row items-baseline">
            <Text className={`text-[22px] font-extrabold leading-none ${stockColor}`}>{p.currentStock}</Text>
            <Text className="text-[9.5px] font-semibold text-gray-400 ml-1">
              {p.currentStock === 1 ? "unit" : "units"}
            </Text>
          </View>
          <View className="mt-1">
            <Badge label={h.label} tone={h.tone} small />
          </View>
          <Text className="text-[13px] font-bold text-gray-800 mt-1">{formatINR(p.sellingPrice)}</Text>
        </View>
      </PressScale>
    );
  },
  (a, b) =>
    a.p.id === b.p.id &&
    a.p.currentStock === b.p.currentStock &&
    a.p.status === b.p.status &&
    a.p.sellingPrice === b.p.sellingPrice &&
    a.p.name === b.p.name
);

export default function StockListScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string }>();
  const can = useSession((s) => s.hasPermission);

  // Product types are a small, shared collection, so they stay in the store. The catalogue
  // itself does not — a 10k array in a global store re-renders every subscriber on a write.
  const productTypes = useStock((s) => s.productTypes);
  const ensureLoaded = useStock((s) => s.ensureLoaded);

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [typeId, setTypeId] = useState<string>("ALL");
  const [health, setHealth] = useState<ProductHealth>(
    (params.filter && params.filter in HEALTH_LABELS ? params.filter : DEFAULT_HEALTH) as ProductHealth
  );
  const [sort, setSort] = useState<ProductSort>(DEFAULT_SORT);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);

  // One request per pause in typing, not one per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

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

  const typeSegments = useMemo(
    () => [{ id: "ALL", name: "All" }, ...productTypes.filter((t) => t.isActive).map((t) => ({ id: t.id, name: t.name }))],
    [productTypes]
  );

  const counts = list.extra?.healthCounts;
  const activeFilters = (health !== DEFAULT_HEALTH ? 1 : 0) + (sort !== DEFAULT_SORT ? 1 : 0);

  const healthOptions = useMemo(
    () =>
      (Object.keys(HEALTH_LABELS) as ProductHealth[]).map((v) => ({
        value: v,
        label: HEALTH_LABELS[v],
        count: counts ? counts[v] : undefined,
      })),
    [counts]
  );

  const sortOptions = useMemo(
    () => (Object.keys(SORT_LABELS) as ProductSort[]).map((v) => ({ value: v, label: SORT_LABELS[v] })),
    []
  );

  if (!can("stock", "view")) return <NoAccess module="Stock & Inventory" />;

  // Passed as an ELEMENT, not a function component: a new component type each render would
  // remount the header and drop the keyboard on every keystroke.
  const header = (
    <View className="bg-gray-50">
      <ScreenHeader
        title="Stock & Inventory"
        subtitleNode={<CountLine shown={list.items.length} total={list.total} noun="products" />}
      />

      <View className="px-4 pb-2.5">
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search name, SKU, brand, size…" withIcon />
      </View>

      <View className="flex-row items-center gap-2 px-4 pb-2.5">
        <View className="flex-row gap-2 flex-1">
          {typeSegments.slice(0, 3).map((t) => {
            const on = typeId === t.id;
            return (
              <PressScale
                key={t.id}
                onPress={() => setTypeId(t.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                className={`px-3.5 min-h-[40px] justify-center rounded-full ${on ? "bg-gray-800" : "bg-white border border-gray-200"}`}
              >
                <Text className={`text-[13px] font-semibold ${on ? "text-white" : "text-gray-600"}`} numberOfLines={1}>
                  {t.name}
                </Text>
              </PressScale>
            );
          })}
        </View>

        <PressScale
          onPress={() => setSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Filter and sort"
          className={`flex-row items-center gap-1.5 px-3 min-h-[40px] rounded-full ${
            activeFilters > 0 ? "bg-brand-50 border border-brand-200" : "bg-white border border-gray-200"
          }`}
        >
          <SlidersHorizontal size={14} color={activeFilters > 0 ? "#1d4ed8" : NEUTRAL[500]} />
          <Text className={`text-[12.5px] font-bold ${activeFilters > 0 ? "text-brand-700" : "text-gray-600"}`}>Filter</Text>
          {activeFilters > 0 && (
            <View className="bg-brand-600 rounded-full min-w-[16px] h-4 px-1 items-center justify-center">
              <Text className="text-white text-[10px] font-extrabold">{activeFilters}</Text>
            </View>
          )}
        </PressScale>
      </View>

      {health !== DEFAULT_HEALTH && (
        <View className="px-4 pb-2">
          <PressScale
            onPress={() => setHealth(DEFAULT_HEALTH)}
            className="self-start flex-row items-center gap-2 bg-white border border-gray-200 rounded-full pl-3 pr-2 py-1.5"
          >
            <Text className="text-[11.5px] font-bold text-gray-700">{HEALTH_LABELS[health]}</Text>
            <Text className="text-gray-400 text-[13px] font-bold">✕</Text>
          </PressScale>
        </View>
      )}

      {list.error && list.items.length > 0 ? (
        <ErrorBanner message={list.error} onDismiss={() => {}} />
      ) : null}
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
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
        loadingEmoji="📦"
        loadingCaption="Loading catalogue…"
        emptyEmoji="🔍"
        emptyMessage={debounced ? `No products match “${debounced}”` : "No products in this view"}
        endLabel={`All ${list.total.toLocaleString("en-IN")} products loaded`}
      />

      <FilterSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        health={health}
        sort={sort}
        healthOptions={healthOptions}
        sortOptions={sortOptions}
        onApply={({ health: h, sort: s }) => {
          setHealth(h);
          setSort(s);
        }}
        onReset={() => {
          setHealth(DEFAULT_HEALTH);
          setSort(DEFAULT_SORT);
        }}
      />
    </View>
  );
}
