// Inbound Tracking — brand shipments on their way in, paged.
// Overdue shipments sort to the top: a late delivery with a customer waiting on it is the
// only thing on this screen that needs someone today.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { AlertTriangle, ArrowDownCircle, ChevronRight } from "lucide-react-native";
import { useSession } from "@/store/session";
import { useStock } from "@/store/stock";
import * as mockApi from "@/services/mockApi";
import type { InboundFilter } from "@/services/mockApi.stock";
import type { InboundShipment } from "@/mock/types";
import { formatDayMonth, formatINR } from "@/lib/format";
import { INBOUND_STATUS, TONE } from "@/lib/stock-constants";
import { getStartOfTodayIST } from "@/lib/timezone";
import { NEUTRAL } from "@/lib/theme";
import { usePagedList } from "@/lib/usePagedList";
import PagedList, { CountLine } from "@/components/PagedList";
import { Badge, NoAccess, Pills, ScreenHeader } from "@/components/stock";
import SearchBar from "@/components/SearchBar";
import PressScale from "@/components/PressScale";

const CARD_H = 100;
const GAP = 8;
const ITEM_H = CARD_H + GAP;

type Filter = InboundFilter | "ALL";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "IN_TRANSIT", label: "In transit" },
  { key: "OVERDUE", label: "Overdue" },
  { key: "PARTIAL", label: "Partial" },
  { key: "ALL", label: "All" },
  { key: "RECEIVED", label: "Received" },
];

const isOverdue = (s: InboundShipment) =>
  s.status !== "DELIVERED" && new Date(s.expectedDeliveryDate) < getStartOfTodayIST();

const ShipmentRow = React.memo(
  function ShipmentRow({ s, onPress }: { s: InboundShipment; onPress: (id: string) => void }) {
    const cfg = INBOUND_STATUS[s.status];
    const overdue = isOverdue(s);
    const received = s.lineItems.reduce((n, l) => n + (l.deliveredQty ?? 0), 0);
    const prebooked = s.lineItems.filter((l) => l.preBookedCustomerName).length;

    return (
      <PressScale
        onPress={() => onPress(s.id)}
        className={`h-[100px] mb-2 mx-4 bg-white rounded-2xl border px-3 py-3 flex-row items-center gap-2.5 ${
          overdue ? "border-red-200" : "border-gray-100"
        }`}
      >
        <View className={`w-10 h-10 rounded-xl items-center justify-center ${TONE[cfg.tone].bg}`}>
          <ArrowDownCircle size={18} color={TONE[cfg.tone].hex} />
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-[14.5px] font-bold text-gray-900" numberOfLines={1}>
            {s.brand.name} · {s.billNo}
          </Text>
          <Text className="text-[11px] text-gray-400 mt-0.5" numberOfLines={1}>
            {s.shipmentNo} · {s.lineItems.length} line{s.lineItems.length === 1 ? "" : "s"} · {formatINR(Math.round(s.totalAmount))}
          </Text>
          <View className="flex-row items-center gap-1.5 mt-1.5">
            <Badge label={cfg.label} tone={cfg.tone} small />
            {prebooked > 0 && <Badge label={`${prebooked} pre-booked`} tone="orange" small />}
            {overdue ? (
              <View className="flex-row items-center gap-1">
                <AlertTriangle size={11} color={TONE.red.hex} />
                <Text className="text-[10.5px] font-bold text-red-600">{formatDayMonth(s.expectedDeliveryDate)}</Text>
              </View>
            ) : (
              <Text className="text-[10.5px] text-gray-400" numberOfLines={1}>
                {s.status === "DELIVERED" && s.deliveredAt ? formatDayMonth(s.deliveredAt) : formatDayMonth(s.expectedDeliveryDate)}
              </Text>
            )}
          </View>
        </View>
        <View className="items-end">
          <Text className="text-sm font-extrabold text-gray-900">
            {received}/{s.totalItems}
          </Text>
          <Text className="text-[10px] text-gray-400">units</Text>
        </View>
        <ChevronRight size={16} color={NEUTRAL[400]} />
      </PressScale>
    );
  },
  (a, b) => a.s.id === b.s.id && a.s.status === b.s.status && a.s.deliveredAt === b.s.deliveredAt
);

export default function InboundListScreen() {
  const router = useRouter();
  const can = useSession((s) => s.hasPermission);
  const revision = useStock((s) => s.revision);
  const ensureLoaded = useStock((s) => s.ensureLoaded);

  const [filter, setFilter] = useState<Filter>("IN_TRANSIT");
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
      const page = await mockApi.queryInbound({ cursor, q: debounced, filter, sort: "RECENT" });
      return { items: page.items, nextCursor: page.nextCursor, total: page.total, extra: page.facets };
    },
    [debounced, filter]
  );

  const list = usePagedList({ resetKey: `${debounced}|${filter}|${revision}`, fetchPage, idOf: (s: InboundShipment) => s.id });

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
    () => ({
      ALL: facets?.ALL, IN_TRANSIT: facets?.IN_TRANSIT, PARTIAL: facets?.PARTIAL,
      RECEIVED: facets?.RECEIVED, OVERDUE: facets?.OVERDUE,
    }),
    [facets]
  );

  if (!can("inbound", "view")) return <NoAccess module="Inbound Tracking" />;

  const header = (
    <View className="bg-gray-50">
      <ScreenHeader
        title="Inbound Tracking"
        subtitleNode={<CountLine shown={list.items.length} total={list.total} noun="shipments" />}
      />
      <View className="px-4 pb-2.5">
        <SearchBar value={search} onChangeText={setSearch} placeholder="Brand, bill no., product…" withIcon />
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
      loadingEmoji="🚚"
      loadingCaption="Loading shipments…"
      emptyEmoji="🚚"
      emptyMessage={debounced ? `No shipment matches “${debounced}”` : "No shipments in this view"}
      endLabel={`All ${list.total.toLocaleString("en-IN")} shipments loaded`}
    />
  );
}
