// Deliveries & Dispatch — the run board, paged.
//
// GROUPED *AND* PAGED. The obvious way to group is to fetch everything and bucket it in
// the screen, which stops working at a few thousand invoices. Instead the endpoint sorts
// by run order (on the road, promised, stuck, then the tail) and the screen inserts a
// header whenever the status changes as the stream goes by. The grouping is therefore a
// property of the ORDER, which pages correctly: page 3 continues the group page 2 ended in.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ChevronRight, MapPin, Plane, Truck } from "lucide-react-native";
import { useSession } from "@/store/session";
import { useStock } from "@/store/stock";
import * as mockApi from "@/services/mockApi";
import type { DeliveryFilter } from "@/services/mockApi.stock";
import type { Delivery, DeliveryStatus } from "@/mock/types";
import { formatDayMonth, formatINR } from "@/lib/format";
import { DELIVERY_STATUS, TONE } from "@/lib/stock-constants";
import { isToday } from "@/lib/timezone";
import { NEUTRAL } from "@/lib/theme";
import { usePagedList } from "@/lib/usePagedList";
import PagedList, { CountLine } from "@/components/PagedList";
import { NoAccess, Pills, ScreenHeader } from "@/components/stock";
import SearchBar from "@/components/SearchBar";
import PressScale from "@/components/PressScale";

const ROW_H = 92;
const HEADER_H = 40;
const GAP = 8;

type Filter = DeliveryFilter | "ALL";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "TODAY", label: "Today" },
  { key: "OPEN", label: "Open" },
  { key: "FLAGGED", label: "Flagged" },
  { key: "ALL", label: "All" },
  { key: "DONE", label: "Done" },
];

// A row is either a group header derived from the stream, or a delivery.
type Entry = { kind: "header"; id: string; status: DeliveryStatus } | { kind: "row"; id: string; d: Delivery };

const GROUP_TITLE: Partial<Record<DeliveryStatus, string>> = {
  OUT_FOR_DELIVERY: "On the road",
  SCHEDULED: "Scheduled",
  FLAGGED: "Needs a decision",
  PREBOOKED: "Pre-booked",
  VERIFIED: "Verified",
  PENDING: "Awaiting verification",
  DELIVERED: "Delivered",
  WALK_OUT: "Walked out",
};

/** Insert a header each time the status changes as the sorted stream goes past. */
function withGroupHeaders(items: Delivery[]): Entry[] {
  const out: Entry[] = [];
  let last: DeliveryStatus | null = null;
  for (const d of items) {
    if (d.status !== last) {
      out.push({ kind: "header", id: `h-${d.status}-${d.id}`, status: d.status });
      last = d.status;
    }
    out.push({ kind: "row", id: d.id, d });
  }
  return out;
}

const GroupHeader = React.memo(function GroupHeader({ status }: { status: DeliveryStatus }) {
  const cfg = DELIVERY_STATUS[status];
  return (
    <View className="flex-row items-center gap-2 px-6" style={{ height: HEADER_H }}>
      <View className={`w-2 h-2 rounded-full ${TONE[cfg.tone].dot}`} />
      <Text className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
        {GROUP_TITLE[status] ?? cfg.label}
      </Text>
    </View>
  );
});

const DeliveryRow = React.memo(
  function DeliveryRow({ d, onPress }: { d: Delivery; onPress: (id: string) => void }) {
    const cfg = DELIVERY_STATUS[d.status];
    const items = d.lineItems.reduce((n, l) => n + l.qty, 0);
    return (
      <PressScale
        onPress={() => onPress(d.id)}
        className={`h-[92px] mb-2 mx-4 bg-white rounded-2xl border px-3 py-3 flex-row items-center gap-2.5 ${
          d.status === "FLAGGED" ? "border-red-200" : "border-gray-100"
        }`}
      >
        <View className={`w-10 h-10 rounded-xl items-center justify-center ${TONE[cfg.tone].bg}`}>
          {d.isOutstation ? <Plane size={18} color={TONE[cfg.tone].hex} /> : <Truck size={18} color={TONE[cfg.tone].hex} />}
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-[14.5px] font-bold text-gray-900" numberOfLines={1}>
            {d.customerName}
          </Text>
          <Text className="text-[11px] text-gray-400 mt-0.5" numberOfLines={1}>
            {d.invoiceNo} · {items} item{items === 1 ? "" : "s"} · {formatINR(Math.round(d.invoiceAmount))}
          </Text>
          {d.flagReason ? (
            <Text className="text-[11px] font-semibold text-red-600 mt-1" numberOfLines={1}>
              {d.flagReason}
            </Text>
          ) : (
            <View className="flex-row items-center gap-1 mt-1">
              <MapPin size={11} color={NEUTRAL[400]} />
              <Text className="text-[11px] text-gray-400" numberOfLines={1}>
                {d.customerArea ?? "No area"}
                {d.isOutstation ? " · outstation" : ""}
              </Text>
            </View>
          )}
        </View>
        <View className="items-end">
          <Text className="text-[11px] font-semibold text-gray-600">
            {d.deliveredAt
              ? formatDayMonth(d.deliveredAt)
              : d.scheduledDate
              ? isToday(d.scheduledDate)
                ? "Today"
                : formatDayMonth(d.scheduledDate)
              : formatDayMonth(d.invoiceDate)}
          </Text>
        </View>
        <ChevronRight size={16} color={NEUTRAL[400]} />
      </PressScale>
    );
  },
  (a, b) => a.d.id === b.d.id && a.d.status === b.d.status && a.d.flagReason === b.d.flagReason && a.d.scheduledDate === b.d.scheduledDate
);

export default function DeliveriesListScreen() {
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
      const page = await mockApi.queryDeliveries({ cursor, q: debounced, filter, sort: "RUN" });
      return { items: page.items, nextCursor: page.nextCursor, total: page.total, extra: page.facets };
    },
    [debounced, filter]
  );

  const list = usePagedList({ resetKey: `${debounced}|${filter}|${revision}`, fetchPage, idOf: (d: Delivery) => d.id });

  const entries = useMemo(() => withGroupHeaders(list.items), [list.items]);

  const open = useCallback(
    (id: string) => {
      Haptics.selectionAsync().catch(() => {});
      router.push(`/deliveries/${id}` as never);
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item }: { item: Entry }) =>
      item.kind === "header" ? <GroupHeader status={item.status} /> : <DeliveryRow d={item.d} onPress={open} />,
    [open]
  );

  const keyExtractor = useCallback((e: Entry) => e.id, []);

  const facets = list.extra;
  const pillCounts = useMemo(
    () => ({ ALL: facets?.ALL, TODAY: facets?.TODAY, OPEN: facets?.OPEN, FLAGGED: facets?.FLAGGED, DONE: facets?.DONE }),
    [facets]
  );

  if (!can("deliveries", "view")) return <NoAccess module="Deliveries & Dispatch" />;

  const header = (
    <View className="bg-gray-50">
      <ScreenHeader
        title="Delivery Run"
        subtitleNode={<CountLine shown={list.items.length} total={list.total} noun="deliveries" />}
      />
      <View className="px-4 pb-2.5">
        <SearchBar value={search} onChangeText={setSearch} placeholder="Customer, invoice, phone, area…" withIcon />
      </View>
      <Pills options={FILTERS} value={filter} onChange={setFilter} counts={pillCounts} />
    </View>
  );

  return (
    <PagedList
      data={entries}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      // Rows and headers are different heights, so getItemLayout is not applicable here.
      // Both are still fixed, which keeps the estimate stable and scrolling smooth.
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
  );
}
