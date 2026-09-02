// Stock Transfers — the approval queue, paged.
//
// Pending requests sort above the history whatever the dates say, so the screen opens on
// the decisions rather than on the archive. Cards expand in place; approve and reject
// resolve without leaving the queue.
//
// THERE IS NO STITCH DESIGN FOR TRANSFERS (doc/stitch/README.md). The card is derived from
// the Inwards card, which is the closest shape in the set: one column, a horizontal rule,
// and a labelled footer. Title + status badge, a dot-separated meta run, the rule, then the
// route (`from → to`) as the footer's single datum with the expand chevron beside it.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ArrowRight, ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react-native";
import { useSession } from "@/store/session";
import { useStock } from "@/store/stock";
import * as mockApi from "@/services/mockApi";
import type { TransferFilter, TransferSort } from "@/services/mockApi.stock";
import type { TransferOrder } from "@/mock/types";
import { formatDayMonth, timeSince } from "@/lib/format";
import { activeFilterCount, TONE, TRANSFER_STATUS } from "@/lib/stock-constants";
import { NEUTRAL } from "@/lib/theme";
import { usePagedList } from "@/lib/usePagedList";
import { useDebouncedSearch } from "@/lib/useDebouncedSearch";
import PagedList, { CountLine } from "@/components/PagedList";
import {
  ActionButton,
  Badge,
  DataLabel,
  MetaRun,
  NoAccess,
  Pills,
  RecordCard,
  ScreenHeader,
} from "@/components/stock";
import FilterScreen, { type FilterGroupSpec } from "@/components/stock/FilterScreen";
import SearchBar from "@/components/SearchBar";
import PressScale from "@/components/PressScale";

// Collapsed height is fixed so the list can use getItemLayout. An expanded card is taller,
// so expansion turns getItemLayout off for the whole list — correctness first: a wrong
// offset shows blank rows, which is worse than losing the optimisation while one card is
// open. Collapse it and the fast path comes back.
//
// `PagedList.getItemHeight` (added in W3) does NOT help here, and this is the case that
// defines its limit. It is a pure function of the ITEM, but an expanded card's height also
// depends on state the item does not carry: `rejecting` is local useState inside the card,
// and tapping Reject grows it by a TextInput and a second button row. A height function
// could not see that, so it would report the card short and displace every row beneath it.
// Measuring is the correct behaviour here; the fast path is not available and should not
// be faked.
//
// THE BUDGET, against the new anatomy (RecordCard is px-4 py-3.5):
//     14  top padding
//     24  title row — 17px/700; the badge is shorter and rides inside it
//     22  meta run (11.5px) + its mt-1.5
//     25  the rule — my-3 (12+12) + 1px
//     40  footer — DataLabel (12px) + mt-1 + the route line (13px)
//     14  bottom padding
//   ≈139, taken up to 150 so a taller Android line height cannot clip the rule. The
//   slack is absorbed by an explicit flex-1 spacer above the rule, which pins the footer
//   to the foot of the card the way the Inwards card draws it.
// CARD_H and the literal `h-[150px]` below must be edited together — Tailwind extracts
// arbitrary values from literal source text, so the class cannot be built from the
// constant. GAP must equal the card's `mb-2.5`.
const CARD_H = 150;
const GAP = 10;
const ITEM_H = CARD_H + GAP;

type Filter = TransferFilter | "ALL";
type TransferFilters = { status: Filter; sort: TransferSort };

// The chip row keeps only the two high-traffic views. Approved, Rejected and the sort
// live in the filter screen — a chip row long enough to scroll is a filter screen that
// lost an argument.
const PILLS: { key: Filter; label: string }[] = [
  { key: "PENDING", label: "To review" },
  { key: "ALL", label: "All" },
];

// The screen OPENS on PENDING (see useState below) because the decisions are the point.
//
// But these defaults — which drive both Reset and the badge count — are the NEUTRAL values,
// not the opening ones. The badge answers "is this list narrowed?", and PENDING is narrowed.
// Counting against the opening value instead would light the badge when someone taps the
// "All" chip, i.e. when they BROADEN the view, which reads backwards. Reset likewise means
// "show me everything", not "put it back the way it opened".
const FILTER_DEFAULTS: Record<string, string> = { status: "ALL", sort: "RECENT" };

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
      <RecordCard
        accent={cfg.tone}
        // Expanded: no height class at all — the list measures it (see the budget above).
        className={expanded ? "mx-4 mb-2.5" : "mx-4 mb-2.5 h-[150px]"}
        accessibilityLabel={`Transfer ${o.orderNo}, ${cfg.label}`}
      >
        {/* The press target sits INSIDE the card rather than on it: the expanded body holds
            a TextInput and two buttons, and nesting those inside a Pressable makes the card
            fight its own children for the touch. `flex-1` lets the collapsed header fill
            the fixed height so its footer can sit at the foot. */}
        <PressScale
          onPress={() => onToggle(o.id)}
          scaleTo={0.98}
          accessibilityRole="button"
          className={expanded ? undefined : "flex-1"}
        >
          <View className="flex-row items-center gap-2">
            <Text className="flex-1 text-[17px] font-bold text-gray-900" numberOfLines={1}>
              {o.orderNo}
            </Text>
            <Badge label={cfg.label} tone={cfg.tone} />
          </View>

          <MetaRun
            className="mt-1.5"
            items={[
              o.createdBy.name,
              `${o.items.length} item${o.items.length === 1 ? "" : "s"}`,
              `${timeSince(o.createdAt)} ago`,
            ]}
          />

          {/* Absorbs the height budget's slack. Collapsed it grows into the spare pixels;
              expanded there is no free space, so it measures zero and costs nothing. */}
          <View className="flex-1" />

          <View className="h-px bg-gray-200 my-3" />

          <View className="flex-row items-end gap-3">
            <View className="flex-1 min-w-0">
              <DataLabel>Route</DataLabel>
              <View className="flex-row items-center gap-1.5 mt-1">
                <Text className="flex-1 text-[13px] font-semibold text-gray-800" numberOfLines={1}>
                  {from}
                </Text>
                <ArrowRight size={14} color={NEUTRAL[400]} />
                <Text className="flex-1 text-[13px] font-semibold text-gray-800" numberOfLines={1}>
                  {to}
                </Text>
              </View>
            </View>
            {expanded ? <ChevronUp size={18} color={NEUTRAL[500]} /> : <ChevronDown size={18} color={NEUTRAL[500]} />}
          </View>
        </PressScale>

        {expanded && (
          <View className="mt-3 pt-3 border-t border-gray-200">
            {o.items.map((i) => (
              <View key={i.id} className="flex-row items-center py-2 border-b border-gray-100">
                <View className="flex-1 min-w-0">
                  <Text className="text-[13px] font-semibold text-gray-800" numberOfLines={1}>
                    {i.product.name}
                  </Text>
                  <Text className="text-[11px] text-gray-400" numberOfLines={1}>
                    {i.product.sku} · in stock {i.product.currentStock}
                  </Text>
                </View>
                <Text className="text-sm font-extrabold text-gray-900 ml-3">× {i.quantity}</Text>
              </View>
            ))}
            {/* The unit total lives here now — the collapsed meta run carries the line
                count, which is what tells you how much card there is to open. */}
            <Text className="text-[12px] text-gray-500 mt-2" numberOfLines={1}>
              {units} unit{units === 1 ? "" : "s"} in total
            </Text>
            {o.notes ? (
              <Text className="text-[12px] text-gray-500 italic mt-2">“{o.notes}”</Text>
            ) : null}
            {o.reviewedBy && (
              <Text className={`text-[12px] mt-2 ${TONE[o.status === "REJECTED" ? "red" : "green"].text}`}>
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
                      className="border border-gray-200 rounded-lg px-3 py-3 text-sm bg-white text-gray-800 mb-2"
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
      </RecordCard>
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

  // One state object, not two: `FilterScreen` re-seeds its draft from `value` while it is
  // open, so `value` must keep a stable identity between commits.
  const [filters, setFilters] = useState<TransferFilters>({ status: "PENDING", sort: "RECENT" });
  const [filterOpen, setFilterOpen] = useState(false);
  const { value: search, setValue: setSearch, debounced } = useDebouncedSearch();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);

  const fetchPage = useCallback(
    async (cursor: string | null) => {
      const page = await mockApi.queryTransfers({ cursor, q: debounced, filter: filters.status, sort: filters.sort });
      return { items: page.items, nextCursor: page.nextCursor, total: page.total, extra: page.facets };
    },
    [debounced, filters]
  );

  // `revision` in the key: approving a transfer must re-run the query it was approved from.
  const list = usePagedList({
    resetKey: `${debounced}|${filters.status}|${filters.sort}|${revision}`,
    fetchPage,
    idOf: (o: TransferOrder) => o.id,
  });

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

  const onPill = useCallback((status: Filter) => setFilters((f) => ({ ...f, status })), []);

  const onApplyFilters = useCallback((next: Record<string, string>) => {
    setFilters({
      status: (next.status as Filter | undefined) ?? "PENDING",
      sort: (next.sort as TransferSort | undefined) ?? "RECENT",
    });
  }, []);

  const facets = list.extra;
  const pillCounts = useMemo(() => ({ ALL: facets?.ALL, PENDING: facets?.PENDING }), [facets]);

  // Facets are counted before the chip filter, so every option says how many rows it
  // would give you — which is the whole point of putting them on the buttons.
  const groups = useMemo<FilterGroupSpec[]>(
    () => [
      {
        key: "status",
        title: "Status",
        render: "grid",
        options: [
          { value: "ALL", label: "All", count: facets?.ALL },
          { value: "PENDING", label: "Pending", count: facets?.PENDING },
          { value: "APPROVED", label: "Approved", count: facets?.APPROVED },
          // The resource's REJECTED predicate matches CANCELLED too, so the count covers
          // both. Labelled for what it actually returns rather than for its key.
          { value: "REJECTED", label: "Rejected / cancelled", count: facets?.REJECTED },
        ],
      },
      {
        key: "sort",
        title: "Sort by",
        render: "cards",
        options: [
          { value: "RECENT", label: "Most recent", description: "Anything pending first, then newest" },
          { value: "SIZE", label: "Largest first", description: "Most units moved" },
        ],
      },
    ],
    [facets]
  );

  const activeFilters = activeFilterCount(filters, FILTER_DEFAULTS);

  if (!can("transfers", "view")) return <NoAccess module="Stock Transfers" />;

  const header = (
    <View className="bg-surface">
      <ScreenHeader
        title="Stock Transfers"
        subtitleNode={<CountLine shown={list.items.length} total={list.total} noun="transfers" />}
        right={
          can("transfers", "create") ? (
            <PressScale onPress={() => router.push("/transfers/new" as never)} className="bg-ink px-4 min-h-[44px] justify-center rounded-lg">
              <Text className="text-white font-bold text-sm">+ New</Text>
            </PressScale>
          ) : undefined
        }
      />
      <View className="px-4 pb-2.5 flex-row items-center gap-2">
        <View className="flex-1">
          <SearchBar value={search} onChangeText={setSearch} placeholder="Order no., product, who raised it…" withIcon />
        </View>
        <PressScale
          onPress={() => setFilterOpen(true)}
          scaleTo={0.94}
          accessibilityRole="button"
          accessibilityLabel={activeFilters === 0 ? "Filters" : `Filters, ${activeFilters} active`}
          className="w-10 h-10 rounded-lg border border-gray-200 bg-white items-center justify-center"
        >
          <SlidersHorizontal size={18} color={NEUTRAL[500]} />
          {activeFilters > 0 && (
            <View className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-600 items-center justify-center">
              <Text className="text-[10px] font-bold text-white" numberOfLines={1}>
                {activeFilters}
              </Text>
            </View>
          )}
        </PressScale>
      </View>
      <Pills options={PILLS} value={filters.status} onChange={onPill} counts={pillCounts} />
    </View>
  );

  return (
    <>
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
        emptyMessage={filters.status === "PENDING" ? "Nothing waiting on you" : "No transfers in this view"}
        endLabel={`All ${list.total.toLocaleString("en-IN")} transfers loaded`}
      />
      <FilterScreen
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        groups={groups}
        value={filters}
        defaults={FILTER_DEFAULTS}
        onApply={onApplyFilters}
      />
    </>
  );
}
