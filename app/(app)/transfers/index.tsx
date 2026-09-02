// Stock Transfers — the approval queue, paged.
//
// Pending requests sort above the history whatever the dates say, so the screen opens on
// the decisions rather than on the archive. Cards expand in place; approve and reject
// resolve without leaving the queue.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ArrowRight, ArrowRightLeft, ChevronDown, ChevronUp } from "lucide-react-native";
import { useSession } from "@/store/session";
import { useStock } from "@/store/stock";
import * as mockApi from "@/services/mockApi";
import type { TransferFilter, TransferSort } from "@/services/mockApi.stock";
import type { TransferOrder } from "@/mock/types";
import { formatDayMonth, timeSince } from "@/lib/format";
import { TONE, TRANSFER_STATUS } from "@/lib/stock-constants";
import { NEUTRAL } from "@/lib/theme";
import { usePagedList } from "@/lib/usePagedList";
import PagedList, { CountLine } from "@/components/PagedList";
import { ActionButton, Badge, NoAccess, Pills, ScreenHeader } from "@/components/stock";
import SearchBar from "@/components/SearchBar";
import PressScale from "@/components/PressScale";

// Collapsed height is fixed so the list can use getItemLayout. An expanded card is taller,
// so expansion turns getItemLayout off for the whole list — correctness first: a wrong
// offset shows blank rows, which is worse than losing the optimisation while one card is
// open. Collapse it and the fast path comes back.
const CARD_H = 104;
const GAP = 8;
const ITEM_H = CARD_H + GAP;

type Filter = TransferFilter | "ALL";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "PENDING", label: "To review" },
  { key: "ALL", label: "All" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
];

function routeOf(o: TransferOrder) {
  const first = o.items[0];
  return { from: first?.fromWarehouse?.name ?? "—", to: first?.toWarehouse?.name ?? "—" };
}

const TransferCard = React.memo(
  function TransferCard({
    o,
    expanded,
    onToggle,
    canApprove,
    onReview,
  }: {
    o: TransferOrder;
    expanded: boolean;
    onToggle: (id: string) => void;
    canApprove: boolean;
    onReview: (id: string, approve: boolean, note?: string) => Promise<void>;
  }) {
    const cfg = TRANSFER_STATUS[o.status];
    const { from, to } = routeOf(o);
    const units = o.items.reduce((n, i) => n + i.quantity, 0);
    const [rejecting, setRejecting] = useState(false);
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    const approve = () =>
      Alert.alert("Approve transfer?", `${units} unit${units === 1 ? "" : "s"} move from ${from} to ${to} immediately.`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            setBusy(true);
            try {
              await onReview(o.id, true);
            } finally {
              setBusy(false);
            }
          },
        },
      ]);

    const reject = async () => {
      setBusy(true);
      try {
        await onReview(o.id, false, note);
        setRejecting(false);
        setNote("");
      } finally {
        setBusy(false);
      }
    };

    return (
      <View
        className="mx-4 bg-white rounded-2xl border border-gray-100"
        style={expanded ? { marginBottom: GAP } : { height: CARD_H, marginBottom: GAP }}
      >
        <PressScale onPress={() => onToggle(o.id)} className="p-3.5 flex-row items-center gap-3" scaleTo={0.98}>
          <View className={`w-10 h-10 rounded-xl items-center justify-center ${TONE[cfg.tone].bg}`}>
            <ArrowRightLeft size={18} color={TONE[cfg.tone].hex} />
          </View>
          <View className="flex-1 min-w-0">
            <View className="flex-row items-center gap-2">
              <Text className="text-[14.5px] font-bold text-gray-900">{o.orderNo}</Text>
              <Badge label={cfg.label} tone={cfg.tone} small />
            </View>
            <View className="flex-row items-center gap-1 mt-0.5">
              <Text className="text-[11.5px] font-semibold text-gray-500" numberOfLines={1}>
                {from}
              </Text>
              <ArrowRight size={11} color={NEUTRAL[400]} />
              <Text className="text-[11.5px] font-semibold text-gray-500" numberOfLines={1}>
                {to}
              </Text>
            </View>
            <Text className="text-[11px] text-gray-400 mt-0.5" numberOfLines={1}>
              {o.items.length} line{o.items.length === 1 ? "" : "s"} · {units} units · {o.createdBy.name} · {timeSince(o.createdAt)} ago
            </Text>
          </View>
          {expanded ? <ChevronUp size={16} color={NEUTRAL[400]} /> : <ChevronDown size={16} color={NEUTRAL[400]} />}
        </PressScale>

        {expanded && (
          <View className="px-3.5 pb-3.5 border-t border-gray-100">
            {o.items.map((i) => (
              <View key={i.id} className="flex-row items-center py-2 border-b border-gray-50">
                <View className="flex-1">
                  <Text className="text-[13px] font-semibold text-gray-800" numberOfLines={1}>
                    {i.product.name}
                  </Text>
                  <Text className="text-[10px] text-gray-400">
                    {i.product.sku} · in stock {i.product.currentStock}
                  </Text>
                </View>
                <Text className="text-sm font-extrabold text-gray-900 ml-3">× {i.quantity}</Text>
              </View>
            ))}
            {o.notes ? <Text className="text-[12px] text-gray-500 italic mt-2">“{o.notes}”</Text> : null}
            {o.reviewedBy && (
              <Text className={`text-[11px] mt-2 ${o.status === "REJECTED" ? "text-red-600" : "text-green-700"}`}>
                {o.status === "REJECTED" ? "Rejected" : "Approved"} by {o.reviewedBy.name}
                {o.reviewedAt ? ` · ${formatDayMonth(o.reviewedAt)}` : ""}
                {o.rejectionNote ? ` — ${o.rejectionNote}` : ""}
              </Text>
            )}

            {canApprove && o.status === "PENDING" && (
              <View className="mt-3">
                {!rejecting ? (
                  <View className="flex-row gap-2">
                    <ActionButton label="Reject" variant="danger" onPress={() => setRejecting(true)} disabled={busy} />
                    <ActionButton label={busy ? "Moving…" : "Approve"} variant="success" onPress={approve} disabled={busy} />
                  </View>
                ) : (
                  <>
                    <TextInput
                      value={note}
                      onChangeText={setNote}
                      autoFocus
                      placeholder="Reason for rejecting"
                      placeholderTextColor={NEUTRAL[400]}
                      className="border border-gray-200 rounded-xl px-3 py-3 text-sm bg-white text-gray-800 mb-2"
                    />
                    <View className="flex-row gap-2">
                      <ActionButton label="Back" variant="secondary" onPress={() => setRejecting(false)} />
                      <ActionButton label="Confirm reject" variant="danger" onPress={reject} disabled={busy || !note.trim()} />
                    </View>
                  </>
                )}
              </View>
            )}
          </View>
        )}
      </View>
    );
  },
  (a, b) =>
    a.o.id === b.o.id &&
    a.o.status === b.o.status &&
    a.o.reviewedAt === b.o.reviewedAt &&
    a.expanded === b.expanded &&
    a.canApprove === b.canApprove
);

export default function TransfersListScreen() {
  const router = useRouter();
  const can = useSession((s) => s.hasPermission);
  const revision = useStock((s) => s.revision);
  const reviewTransfer = useStock((s) => s.reviewTransfer);
  const ensureLoaded = useStock((s) => s.ensureLoaded);

  const [filter, setFilter] = useState<Filter>("PENDING");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPage = useCallback(
    async (cursor: string | null) => {
      const page = await mockApi.queryTransfers({ cursor, q: debounced, filter, sort: "RECENT" as TransferSort });
      return { items: page.items, nextCursor: page.nextCursor, total: page.total, extra: page.facets };
    },
    [debounced, filter]
  );

  // `revision` in the key: approving a transfer must re-run the query it was approved from.
  const list = usePagedList({ resetKey: `${debounced}|${filter}|${revision}`, fetchPage, idOf: (o: TransferOrder) => o.id });

  const onReview = useCallback(
    async (id: string, approve: boolean, note?: string) => {
      try {
        await reviewTransfer({ id, approve, note });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setExpandedId(null);
      } catch {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      }
    },
    [reviewTransfer]
  );

  const onToggle = useCallback((id: string) => {
    Haptics.selectionAsync().catch(() => {});
    setExpandedId((v) => (v === id ? null : id));
  }, []);

  const canApprove = can("transfers", "approve");

  const renderItem = useCallback(
    ({ item }: { item: TransferOrder }) => (
      <TransferCard o={item} expanded={expandedId === item.id} onToggle={onToggle} canApprove={canApprove} onReview={onReview} />
    ),
    [expandedId, onToggle, canApprove, onReview]
  );

  const keyExtractor = useCallback((o: TransferOrder) => o.id, []);

  const facets = list.extra;
  const pillCounts = useMemo(
    () => ({ ALL: facets?.ALL, PENDING: facets?.PENDING, APPROVED: facets?.APPROVED, REJECTED: facets?.REJECTED }),
    [facets]
  );

  if (!can("transfers", "view")) return <NoAccess module="Stock Transfers" />;

  const header = (
    <View className="bg-gray-50">
      <ScreenHeader
        title="Stock Transfers"
        subtitleNode={<CountLine shown={list.items.length} total={list.total} noun="transfers" />}
        right={
          can("transfers", "create") ? (
            <PressScale onPress={() => router.push("/transfers/new" as never)} className="bg-gray-800 px-4 min-h-[44px] justify-center rounded-xl">
              <Text className="text-white font-bold text-sm">+ New</Text>
            </PressScale>
          ) : undefined
        }
      />
      <View className="px-4 pb-2.5">
        <SearchBar value={search} onChangeText={setSearch} placeholder="Order no., product, who raised it…" withIcon />
      </View>
      <Pills options={FILTERS} value={filter} onChange={setFilter} counts={pillCounts} />
    </View>
  );

  return (
    <PagedList
      data={list.items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      // Off while a card is open — an expanded card breaks the fixed-height assumption.
      itemHeight={expandedId === null ? ITEM_H : undefined}
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
      loadingEmoji="🔁"
      loadingCaption="Loading transfers…"
      emptyEmoji="🔁"
      emptyMessage={filter === "PENDING" ? "Nothing waiting on you" : "No transfers in this view"}
      endLabel={`All ${list.total.toLocaleString("en-IN")} transfers loaded`}
    />
  );
}
