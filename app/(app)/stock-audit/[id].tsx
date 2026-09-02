// Stock count sheet — the lines, paged.
//
// This screen used to map every line into a ScrollView. A full-store count is 1,200-2,400
// lines, so that mounted a couple of thousand view trees and the screen never appeared.
// Lines are now paged like any other collection, with a filter for the part of the sheet
// someone is actually working: what is left, what has been done, what disagrees.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSession } from "@/store/session";
import { useStock } from "@/store/stock";
import * as mockApi from "@/services/mockApi";
import type { CountItemFilter, StockCountSummaryRow } from "@/services/mockApi.stock";
import type { StockCountItem } from "@/mock/types";
import { formatDayMonth } from "@/lib/format";
import { COUNT_STATUS, TONE, type Tone } from "@/lib/stock-constants";
import { NEUTRAL } from "@/lib/theme";
import { usePagedList } from "@/lib/usePagedList";
import PagedList, { CountLine } from "@/components/PagedList";
import { ActionButton, Badge, Card, KV, NoAccess, Pills, RecordCard, ScreenHeader, Stepper } from "@/components/stock";
import SearchBar from "@/components/SearchBar";
import PressScale from "@/components/PressScale";
import BouncingEmoji from "@/components/BouncingEmoji";
import EmptyState from "@/components/EmptyState";

// Row height. RecordCard is px-4 py-3.5 (28 of padding). The left column is the name line
// (13.5px ≈ 18) over the SKU line (mt-0.5 + 10.5px ≈ 16) → 62 of 76; each figure column is
// a 9px label (≈ 12) over a 15px value (≈ 20). Nothing wraps: every Text is capped at one
// line. `h-[76px]` on the card must be edited together with ROW_H — Tailwind extracts
// arbitrary values from literal source text, so the class cannot be built from the constant.
const ROW_H = 76;
const GAP = 8;
const ITEM_H = ROW_H + GAP;

type Filter = CountItemFilter | "ALL";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "UNCOUNTED", label: "Left to count" },
  { key: "ALL", label: "All lines" },
  { key: "VARIANCE", label: "Variance" },
  { key: "COUNTED", label: "Counted" },
];

/** The card's accent says what the line says — red = short, amber = over, green = agrees,
 *  none = not counted yet. The variance figure uses the same tone, so they never disagree. */
function lineTone(item: StockCountItem): Tone | undefined {
  if (item.variance === null) return undefined;
  return item.variance < 0 ? "red" : item.variance > 0 ? "amber" : "green";
}

/** One of the three figures on a line. Fixed width so the columns line up down the sheet.
 *  The label is capped to one line: "COUNTED" at the old 9.5px was a hair wider than the
 *  old 48px column and wrapped to "COUNTE / D" on device. */
function Figure({ label, value, valueClass }: { label: string; value: string | number; valueClass: string }) {
  return (
    <View className="w-[52px] items-center">
      <Text className="text-[9px] font-bold uppercase text-gray-400" numberOfLines={1}>
        {label}
      </Text>
      <Text className={`text-[15px] font-extrabold mt-px ${valueClass}`} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const LineRow = React.memo(
  function LineRow({
    item,
    editable,
    onOpen,
  }: {
    item: StockCountItem;
    editable: boolean;
    onOpen: (item: StockCountItem) => void;
  }) {
    const v = item.variance;
    const tone = lineTone(item);

    return (
      <RecordCard
        accent={tone}
        // A locked sheet renders a plain View, not an inert Pressable that swallows touches.
        onPress={editable ? () => onOpen(item) : undefined}
        className="h-[76px] mb-2 mx-4 flex-row items-center gap-1.5"
        accessibilityLabel={`${item.product.name}, system ${item.systemQty}, counted ${item.countedQty ?? "not yet"}`}
      >
        <View className="flex-1 min-w-0 mr-1">
          <Text className="text-[13.5px] font-bold text-gray-900" numberOfLines={1}>
            {item.product.name}
          </Text>
          <Text className="text-[10.5px] text-gray-400 mt-0.5" numberOfLines={1}>
            {item.product.sku}
            {item.notes ? ` · ${item.notes}` : ""}
          </Text>
        </View>
        <Figure label="System" value={item.systemQty} valueClass="text-gray-600" />
        <Figure
          label="Counted"
          value={item.countedQty ?? "—"}
          valueClass={item.countedQty === null ? "text-gray-300" : "text-gray-900"}
        />
        <Figure
          label="Var"
          value={v === null ? "—" : v > 0 ? `+${v}` : v}
          valueClass={tone ? TONE[tone].text : "text-gray-300"}
        />
      </RecordCard>
    );
  },
  (a, b) =>
    a.item.id === b.item.id &&
    a.item.countedQty === b.item.countedQty &&
    a.item.systemQty === b.item.systemQty &&
    a.item.notes === b.item.notes &&
    a.editable === b.editable &&
    a.onOpen === b.onOpen
);

export default function StockCountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const can = useSession((s) => s.hasPermission);
  const revision = useStock((s) => s.revision);
  const recordCountItem = useStock((s) => s.recordCountItem);
  const submitStockCount = useStock((s) => s.submitStockCount);
  const reviewStockCount = useStock((s) => s.reviewStockCount);

  const [count, setCount] = useState<StockCountSummaryRow | null>(null);
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("UNCOUNTED");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [editing, setEditing] = useState<StockCountItem | null>(null);
  const [qty, setQty] = useState(0);
  const [note, setNote] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  // Header is its own fetch: it carries a fraction, never the lines.
  useEffect(() => {
    let cancelled = false;
    if (!id) return;
    mockApi
      .getStockCount(id)
      .then((c) => !cancelled && setCount(c))
      .catch((e) => !cancelled && setHeaderError(e?.message ?? "Could not load this count"));
    return () => {
      cancelled = true;
    };
  }, [id, revision]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPage = useCallback(
    async (cursor: string | null) => {
      const page = await mockApi.queryCountItems(id!, { cursor, q: debounced, filter, limit: 30 });
      return { items: page.items, nextCursor: page.nextCursor, total: page.total, extra: page.facets };
    },
    [id, debounced, filter]
  );

  const list = usePagedList({
    resetKey: `${id}|${debounced}|${filter}|${revision}`,
    fetchPage,
    idOf: (i: StockCountItem) => i.id,
  });

  const isOpenCount = count ? count.status === "PENDING" || count.status === "IN_PROGRESS" : false;
  const canEdit = can("stock_audit", "edit") && isOpenCount;
  const canApprove = can("stock_audit", "approve") && count?.status === "COMPLETED";
  const remaining = count ? count.totalItems - count.countedItems : 0;

  const openEditor = useCallback((item: StockCountItem) => {
    Haptics.selectionAsync().catch(() => {});
    setEditing(item);
    setQty(item.countedQty ?? item.systemQty);
    setNote(item.notes ?? "");
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: StockCountItem }) => <LineRow item={item} editable={canEdit} onOpen={openEditor} />,
    [canEdit, openEditor]
  );
  const keyExtractor = useCallback((i: StockCountItem) => i.id, []);

  const facets = list.extra;
  const pillCounts = useMemo(
    () => ({ ALL: facets?.ALL, UNCOUNTED: facets?.UNCOUNTED, COUNTED: facets?.COUNTED, VARIANCE: facets?.VARIANCE }),
    [facets]
  );

  const saveLine = async () => {
    if (!editing || !id) return;
    setBusy(true);
    try {
      await recordCountItem({ countId: id, itemId: editing.id, countedQty: qty, notes: note.trim() || null });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setEditing(null);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    if (!id) return;
    Alert.alert("Submit count?", "It goes to a supervisor for approval; lines lock after this.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Submit",
        onPress: async () => {
          setBusy(true);
          try {
            await submitStockCount(id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          } catch {
            /* banner */
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const approve = () => {
    if (!id) return;
    Alert.alert("Approve and apply?", "Every non-zero variance is posted as a stock adjustment.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Approve",
        onPress: async () => {
          setBusy(true);
          try {
            await reviewStockCount({ countId: id, approve: true });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          } catch {
            /* banner */
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const reject = async () => {
    if (!id) return;
    setBusy(true);
    try {
      await reviewStockCount({ countId: id, approve: false, reason });
      setRejecting(false);
      setReason("");
    } catch {
      /* banner */
    } finally {
      setBusy(false);
    }
  };

  if (!can("stock_audit", "view")) return <NoAccess module="Stock Audit" />;

  if (!count) {
    return (
      <View className="flex-1 bg-surface">
        <ScreenHeader title="Stock count" />
        {headerError ? <EmptyState emoji="🤷" message={headerError} /> : (
          <View className="py-16 items-center">
            <BouncingEmoji emoji="📋" size={40} caption="Loading the sheet…" />
          </View>
        )}
      </View>
    );
  }

  const cfg = COUNT_STATUS[count.status];
  const pct = count.totalItems ? Math.round((count.countedItems / count.totalItems) * 100) : 0;

  const header = (
    <View className="bg-surface">
      <ScreenHeader title={count.title} subtitle={count.countNo ?? undefined} right={<Badge label={cfg.label} tone={cfg.tone} />} />

      <View className="px-4">
        <Card>
          <KV label="Assigned to" value={count.assignedTo.name} />
          <KV label="Due" value={formatDayMonth(count.dueDate)} />
          <KV label="Scope" value={[count.productType ?? "All types", count.location?.replace("_", " ") ?? "All locations"].join(" · ")} />
          <KV label="Progress" value={`${count.countedItems.toLocaleString("en-IN")} / ${count.totalItems.toLocaleString("en-IN")} counted`} />
          {count.approvedAt && <KV label="Approved" value={`${formatDayMonth(count.approvedAt)} · ${count.approvedBy?.name ?? ""}`} tone="green" />}
          {count.rejectionReason && <KV label="Rejected" value={count.rejectionReason} tone="red" />}
          <View className="h-2 rounded-full bg-gray-100 mt-2 overflow-hidden">
            <View className={`h-full rounded-full ${TONE[cfg.tone].dot}`} style={{ width: `${Math.max(pct, 1)}%` }} />
          </View>
        </Card>

        {canEdit && (
          <View className="mt-3">
            <ActionButton
              label={remaining > 0 ? `${remaining.toLocaleString("en-IN")} left to count` : busy ? "Submitting…" : "Submit for approval"}
              onPress={submit}
              disabled={remaining > 0 || busy}
            />
          </View>
        )}

        {canApprove && (
          <View className="mt-3">
            {!rejecting ? (
              <View className="flex-row gap-2">
                <ActionButton label="Reject" variant="danger" onPress={() => setRejecting(true)} disabled={busy} />
                <ActionButton label={busy ? "Applying…" : "Approve & apply"} variant="success" onPress={approve} disabled={busy} />
              </View>
            ) : (
              <Card className="border-red-200">
                <Text className="text-sm font-bold text-gray-900 mb-2">Why is it rejected?</Text>
                <TextInput
                  value={reason}
                  onChangeText={setReason}
                  autoFocus
                  placeholder="e.g. Recount aisle A"
                  placeholderTextColor={NEUTRAL[400]}
                  className="border border-gray-200 rounded-lg px-3 py-3 text-sm bg-white text-gray-800 mb-3"
                />
                <View className="flex-row gap-2">
                  <ActionButton label="Back" variant="secondary" onPress={() => setRejecting(false)} />
                  <ActionButton label="Confirm reject" variant="danger" onPress={reject} disabled={busy || !reason.trim()} />
                </View>
              </Card>
            )}
          </View>
        )}
      </View>

      <View className="px-4 pt-4 pb-2.5">
        <SearchBar value={search} onChangeText={setSearch} placeholder="Find a line by name or SKU…" withIcon />
      </View>
      <Pills options={FILTERS} value={filter} onChange={setFilter} counts={pillCounts} />
      <View className="px-5 pb-1">
        <CountLine shown={list.items.length} total={list.total} noun="lines" />
      </View>
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
        loadingEmoji="📋"
        loadingCaption="Loading the sheet…"
        emptyEmoji="✅"
        emptyMessage={filter === "UNCOUNTED" ? "Every line is counted" : "No lines in this view"}
        endLabel={`All ${list.total.toLocaleString("en-IN")} lines loaded`}
      />

      {/* Inline line editor — a sheet over the list, so the person keeps their place. */}
      {editing && (
        <View className="absolute inset-0 bg-black/45 justify-end">
          <PressScale onPress={() => setEditing(null)} className="flex-1" scaleTo={1} accessibilityLabel="Close" />
          <View className="bg-white rounded-t-3xl px-5 pt-2.5 pb-8">
            <View className="w-10 h-1 rounded-full bg-gray-200 self-center mb-4" />
            <Text className="text-[17px] font-extrabold text-gray-900" numberOfLines={2}>
              {editing.product.name}
            </Text>
            <Text className="text-[11px] text-gray-400 mt-1 mb-4">
              {editing.product.sku} · system says {editing.systemQty}
            </Text>

            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400">Counted on the shelf</Text>
              <Stepper value={qty} onChange={setQty} min={0} />
            </View>

            {qty !== editing.systemQty && (
              <View className={`rounded-lg px-3 py-2 mb-3 ${qty < editing.systemQty ? "bg-red-50" : "bg-amber-50"}`}>
                <Text className={`text-[12px] font-bold ${qty < editing.systemQty ? "text-red-700" : "text-amber-700"}`}>
                  {qty < editing.systemQty ? `Short by ${editing.systemQty - qty}` : `Over by ${qty - editing.systemQty}`}
                </Text>
              </View>
            )}

            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Note (optional) — e.g. one on a demo bike"
              placeholderTextColor={NEUTRAL[400]}
              className="border border-gray-200 rounded-lg px-3 py-3 text-sm bg-white text-gray-800 mb-3"
            />

            <View className="flex-row gap-2">
              <ActionButton label="Cancel" variant="secondary" onPress={() => setEditing(null)} />
              <ActionButton label={busy ? "Saving…" : `Save ${qty}`} onPress={saveLine} disabled={busy} />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
