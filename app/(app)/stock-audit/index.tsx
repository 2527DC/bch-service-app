// Stock Audit — the count list, paged.
// Rows carry only a progress fraction, never their lines: a full-store count is 1,200+
// lines and the list shows none of them (see `StockCountSummaryRow`).
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { AlertTriangle, ChevronRight, ClipboardCheck } from "lucide-react-native";
import { useSession } from "@/store/session";
import { useStock } from "@/store/stock";
import * as mockApi from "@/services/mockApi";
import type { CountFilter, StockCountSummaryRow } from "@/services/mockApi.stock";
import { formatDayMonth } from "@/lib/format";
import { COUNT_STATUS, TONE } from "@/lib/stock-constants";
import { getStartOfTodayIST } from "@/lib/timezone";
import { NEUTRAL } from "@/lib/theme";
import { usePagedList } from "@/lib/usePagedList";
import PagedList, { CountLine } from "@/components/PagedList";
import { Badge, NoAccess, Pills, ScreenHeader } from "@/components/stock";
import SearchBar from "@/components/SearchBar";
import PressScale from "@/components/PressScale";

const CARD_H = 116;
const GAP = 8;
const ITEM_H = CARD_H + GAP;

type Filter = CountFilter | "ALL";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "OPEN", label: "Open" },
  { key: "OVERDUE", label: "Overdue" },
  { key: "TO_APPROVE", label: "To approve" },
  { key: "ALL", label: "All" },
  { key: "DONE", label: "Done" },
];

const isOpen = (c: StockCountSummaryRow) => c.status === "PENDING" || c.status === "IN_PROGRESS";
const isOverdue = (c: StockCountSummaryRow) => isOpen(c) && new Date(c.dueDate) < getStartOfTodayIST();

const CountRow = React.memo(
  function CountRow({ c, onPress }: { c: StockCountSummaryRow; onPress: (id: string) => void }) {
    const cfg = COUNT_STATUS[c.status];
    const overdue = isOverdue(c);
    const pct = c.totalItems ? Math.round((c.countedItems / c.totalItems) * 100) : 0;

    return (
      <PressScale
        onPress={() => onPress(c.id)}
        className={`h-[116px] mb-2 mx-4 bg-white rounded-lg border px-3 py-3 ${overdue ? "border-red-200" : "border-gray-100"}`}
      >
        <View className="flex-row items-start gap-2.5 flex-1">
          <View className={`w-10 h-10 rounded-lg items-center justify-center ${TONE[cfg.tone].bg}`}>
            <ClipboardCheck size={18} color={TONE[cfg.tone].hex} />
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-[14.5px] font-bold text-gray-900" numberOfLines={1}>
              {c.title}
            </Text>
            <Text className="text-[11px] text-gray-400 mt-0.5" numberOfLines={1}>
              {c.countNo ?? "—"} · {c.assignedTo.name}
              {c.productType ? ` · ${c.productType}` : ""}
            </Text>
            <View className="flex-row items-center gap-2 mt-1.5">
              <Badge label={cfg.label} tone={cfg.tone} small />
              {overdue ? (
                <View className="flex-row items-center gap-1">
                  <AlertTriangle size={11} color={TONE.red.hex} />
                  <Text className="text-[10.5px] font-bold text-red-600">Due {formatDayMonth(c.dueDate)}</Text>
                </View>
              ) : (
                <Text className="text-[10.5px] text-gray-400">
                  {isOpen(c) ? `Due ${formatDayMonth(c.dueDate)}` : c.completedAt ? `Done ${formatDayMonth(c.completedAt)}` : ""}
                </Text>
              )}
            </View>
          </View>
          <View className="items-end">
            <Text className="text-sm font-extrabold text-gray-900">
              {c.countedItems}/{c.totalItems}
            </Text>
            <Text className="text-[10px] text-gray-400">counted</Text>
          </View>
          <ChevronRight size={16} color={NEUTRAL[400]} />
        </View>
        <View className="h-1.5 rounded-full bg-gray-100 mt-2 overflow-hidden">
          <View className={`h-full rounded-full ${TONE[cfg.tone].dot}`} style={{ width: `${Math.max(pct, 1)}%` }} />
        </View>
      </PressScale>
    );
  },
  (a, b) => a.c.id === b.c.id && a.c.status === b.c.status && a.c.countedItems === b.c.countedItems
);

export default function StockAuditListScreen() {
  const router = useRouter();
  const can = useSession((s) => s.hasPermission);
  const revision = useStock((s) => s.revision);
  const ensureLoaded = useStock((s) => s.ensureLoaded);

  const [filter, setFilter] = useState<Filter>("OPEN");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPage = useCallback(
    async (cursor: string | null) => {
      const page = await mockApi.queryStockCounts({ cursor, q: debounced, filter, sort: "RECENT" });
      return { items: page.items, nextCursor: page.nextCursor, total: page.total, extra: page.facets };
    },
    [debounced, filter]
  );

  const list = usePagedList({ resetKey: `${debounced}|${filter}|${revision}`, fetchPage, idOf: (c: StockCountSummaryRow) => c.id });

  const open = useCallback(
    (id: string) => {
      Haptics.selectionAsync().catch(() => {});
      router.push(`/stock-audit/${id}` as never);
    },
    [router]
  );

  const renderItem = useCallback(({ item }: { item: StockCountSummaryRow }) => <CountRow c={item} onPress={open} />, [open]);
  const keyExtractor = useCallback((c: StockCountSummaryRow) => c.id, []);

  const facets = list.extra;
  const pillCounts = useMemo(
    () => ({ ALL: facets?.ALL, OPEN: facets?.OPEN, OVERDUE: facets?.OVERDUE, TO_APPROVE: facets?.TO_APPROVE, DONE: facets?.DONE }),
    [facets]
  );

  if (!can("stock_audit", "view")) return <NoAccess module="Stock Audit" />;

  const header = (
    <View className="bg-gray-50">
      <ScreenHeader
        title="Stock Audit"
        subtitleNode={<CountLine shown={list.items.length} total={list.total} noun="counts" />}
      />
      <View className="px-4 pb-2.5">
        <SearchBar value={search} onChangeText={setSearch} placeholder="Title, count no., who it is on…" withIcon />
      </View>
      <Pills options={FILTERS} value={filter} onChange={setFilter} counts={pillCounts} />
    </View>
  );

  return (
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
      loadingEmoji="📋"
      loadingCaption="Loading counts…"
      emptyEmoji="📋"
      emptyMessage={debounced ? `No count matches “${debounced}”` : "No counts in this view"}
      endLabel={`All ${list.total.toLocaleString("en-IN")} counts loaded`}
    />
  );
}
