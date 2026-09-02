// The app's virtualized list. Wraps FlatList with the four states, an end-of-list loader,
// pull-to-refresh and the windowing settings tuned for this hardware — so a screen showing
// 10,000 rows is the same amount of code as one showing ten.
//
// Why FlatList and not a ScrollView with `.map()`: a ScrollView mounts every row. At 10k
// rows that is 10k view trees on the shadow thread and the screen simply never appears.
// FlatList mounts a window around the viewport and recycles as you scroll.
//
// Three settings do most of the work, and the first is the important one:
//
//   * `getItemLayout` — pass `itemHeight` and the list can compute any row's offset with
//     arithmetic instead of measuring it. That removes the blank-cell flashes during fast
//     flings and makes `scrollToIndex` exact. It is only valid when every row really is
//     that tall, which is why rows here are fixed-height by design rather than by accident.
//     For lists whose rows differ but are still each PREDICTABLE — group headers among
//     rows, a card that is one height or another depending on its content — pass
//     `getItemHeight` instead and the offsets come from a table. What neither prop can
//     serve is a row whose height depends on state the item does not carry; there, pass
//     neither and let the list measure.
//   * `windowSize` / `maxToRenderPerBatch` — how much is kept mounted around the viewport
//     and how much is added per frame. Raised past the defaults for smoother flings,
//     kept low enough that memory stays flat over a long scroll.
//   * `removeClippedSubviews` — Android only. It detaches off-screen rows from the native
//     hierarchy; on iOS it has historically blanked cells, so it stays off there.
import React from "react";
import { ActivityIndicator, FlatList, Platform, RefreshControl, Text, View, type ListRenderItem } from "react-native";
import type { PagedStatus } from "../lib/usePagedList";
import { BRAND, NEUTRAL } from "../lib/theme";
import BouncingEmoji from "./BouncingEmoji";
import EmptyState from "./EmptyState";
import PressScale from "./PressScale";

export default function PagedList<T>({
  data,
  renderItem,
  keyExtractor,
  itemHeight,
  getItemHeight,
  status,
  error,
  initialLoad,
  hasMore,
  loadingMore,
  refreshing,
  onEndReached,
  onRefresh,
  onRetry,
  total,
  ListHeaderComponent,
  stickyHeaderIndices,
  loadingEmoji = "📦",
  loadingCaption = "Loading…",
  emptyEmoji = "🔍",
  emptyMessage = "Nothing here",
  endLabel,
  contentBottomPadding = 32,
}: {
  data: T[];
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T, index: number) => string;
  /**
   * Exact row height INCLUDING its bottom margin, when every row is the same.
   * Mutually exclusive with `getItemHeight` — pass one or neither, never both.
   * `itemHeight` wins if both arrive, because it is the cheaper path.
   */
  itemHeight?: number;
  /**
   * Per-row height INCLUDING its bottom margin, for lists whose rows differ but are each
   * predictable from the item — group headers among rows, a card that is 112 or 140px
   * depending on whether its title wraps.
   *
   * Two requirements, both load-bearing:
   *   * **Stable identity.** Wrap it in `useCallback`, or the offset table below rebuilds
   *     on every render and the work this exists to avoid comes straight back.
   *   * **Exact, not approximate.** Every offset is a running sum, so one row that renders
   *     taller than it declares displaces every row beneath it — blank cells on a fling,
   *     which is the precise failure `getItemLayout` exists to prevent. If a row's height
   *     depends on state the item does not carry (a card that grows when someone taps
   *     Reject), it is not predictable: pass neither prop and let the list measure.
   */
  getItemHeight?: (item: T, index: number) => number;
  status: PagedStatus;
  error: string | null;
  /** From `usePagedList`. Only the very first load may replace the whole screen. */
  initialLoad: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  refreshing: boolean;
  onEndReached: () => void;
  onRefresh: () => void;
  onRetry: () => void;
  total: number;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
  stickyHeaderIndices?: number[];
  loadingEmoji?: string;
  loadingCaption?: string;
  emptyEmoji?: string;
  emptyMessage?: string;
  /** Shown once every row has been loaded, e.g. "All 1,284 products". */
  endLabel?: string;
  contentBottomPadding?: number;
}) {
  // Cumulative offset table for `getItemHeight`. `offsets[i]` is where row i starts and
  // `offsets[i + 1]` where it ends, so a lookup is O(1).
  //
  // Built here rather than summed inside getItemLayout because getItemLayout is called
  // once per row per pass — summing on each call would make a fling O(n²) and reintroduce
  // the jank as a CPU cost instead of a blank cell.
  //
  // This hook MUST stay above the early returns below: hooks cannot be called after a
  // conditional return, and this component returns early for the first-load states.
  const offsets = React.useMemo(() => {
    if (!getItemHeight || itemHeight) return null;
    const out = new Array<number>(data.length + 1);
    out[0] = 0;
    for (let i = 0; i < data.length; i++) out[i + 1] = out[i] + getItemHeight(data[i], i);
    return out;
  }, [data, getItemHeight, itemHeight]);

  // ONLY the very first load is allowed to replace the screen.
  //
  // After that the FlatList stays mounted through every reset, and loading/empty/error all
  // render inside it. That is not cosmetic: the search box lives in the header, and
  // swapping the header between two different trees unmounts the TextInput and closes the
  // keyboard. It happens exactly when a query returns nothing and the person types the
  // next character — the worst possible moment.
  if (initialLoad && status === "loading") {
    return (
      <View className="flex-1 bg-surface">
        {ListHeaderComponent ? <>{ListHeaderComponent as React.ReactElement}</> : null}
        <View className="py-16 items-center">
          <BouncingEmoji emoji={loadingEmoji} size={40} caption={loadingCaption} />
        </View>
      </View>
    );
  }

  if (initialLoad && status === "error") {
    return (
      <View className="flex-1 bg-surface">
        {ListHeaderComponent ? <>{ListHeaderComponent as React.ReactElement}</> : null}
        <View className="items-center px-8 py-14">
          <Text className="text-5xl mb-3">⚠️</Text>
          <Text className="text-base font-bold text-gray-800 mb-1">Could not load</Text>
          <Text className="text-gray-400 text-center text-sm mb-5">{error ?? "Something went wrong."}</Text>
          <PressScale onPress={onRetry} className="bg-gray-800 px-6 min-h-[48px] justify-center rounded-lg">
            <Text className="text-white font-bold text-sm">Try again</Text>
          </PressScale>
        </View>
      </View>
    );
  }

  // The in-list stand-in for those same three states, used for every load after the first.
  const empty = () => {
    if (status === "loading") {
      return (
        <View className="py-14 items-center">
          <ActivityIndicator size="small" color={BRAND[600]} />
          <Text className="text-[12px] text-gray-400 mt-3 font-medium">Searching…</Text>
        </View>
      );
    }
    if (status === "error") {
      return (
        <View className="py-12 items-center px-8">
          <Text className="text-3xl mb-2">⚠️</Text>
          <Text className="text-gray-400 text-center text-sm mb-4">{error ?? "Something went wrong."}</Text>
          <PressScale onPress={onRetry} className="bg-gray-800 px-5 min-h-[44px] justify-center rounded-lg">
            <Text className="text-white font-bold text-xs">Try again</Text>
          </PressScale>
        </View>
      );
    }
    return <EmptyState emoji={emptyEmoji} message={emptyMessage} />;
  };

  const footer = () => {
    if (loadingMore) {
      return (
        <View className="py-6 items-center">
          <ActivityIndicator size="small" color={BRAND[600]} />
          <Text className="text-[11px] text-gray-400 mt-2 font-medium">Loading more…</Text>
        </View>
      );
    }
    // A failed NEXT page: the rows already fetched stay, and retry is offered inline
    // rather than throwing the whole screen away.
    if (error && data.length > 0) {
      return (
        <View className="py-5 items-center">
          <Text className="text-[12px] text-red-600 font-semibold mb-2">{error}</Text>
          <PressScale onPress={onRetry} className="bg-gray-100 px-5 min-h-[44px] justify-center rounded-lg">
            <Text className="text-gray-700 font-bold text-xs">Retry</Text>
          </PressScale>
        </View>
      );
    }
    if (!hasMore && data.length > 0 && endLabel) {
      return (
        <View className="py-6 items-center">
          <Text className="text-[11px] text-gray-300 font-semibold">{endLabel}</Text>
        </View>
      );
    }
    return <View className="h-2" />;
  };

  return (
    <FlatList
      className="flex-1 bg-surface"
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeaderComponent}
      stickyHeaderIndices={stickyHeaderIndices}
      ListEmptyComponent={empty}
      ListFooterComponent={footer}
      contentContainerStyle={{ paddingBottom: contentBottomPadding }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND[600]} colors={[BRAND[600]]} />}
      onEndReached={onEndReached}
      // Fires when the last row is within ~half a screen of the viewport, so the next page
      // has usually landed before the person reaches the bottom.
      onEndReachedThreshold={0.6}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      // ── Windowing ──────────────────────────────────────────────────────────
      getItemLayout={
        itemHeight
          ? (_, index) => ({ length: itemHeight, offset: itemHeight * index, index })
          : offsets
          ? (_, index) => {
              // VirtualizedList asks about indices past the end while it settles; clamp
              // rather than return NaN, which would poison every offset after it.
              const start = offsets[index] ?? offsets[offsets.length - 1] ?? 0;
              const end = offsets[index + 1] ?? start;
              return { length: end - start, offset: start, index };
            }
          : undefined
      }
      initialNumToRender={12}
      maxToRenderPerBatch={12}
      updateCellsBatchingPeriod={50}
      windowSize={11}
      removeClippedSubviews={Platform.OS === "android"}
    />
  );
}

/** Row-count line for a screen header — "24 of 1,284" reads better than a bare total. */
export function CountLine({ shown, total, noun }: { shown: number; total: number; noun: string }) {
  return (
    <Text className="text-[11.5px] text-gray-400 mt-0.5" numberOfLines={1}>
      {total === 0
        ? `No ${noun}`
        : `${shown.toLocaleString("en-IN")} of ${total.toLocaleString("en-IN")} ${noun}`}
    </Text>
  );
}
