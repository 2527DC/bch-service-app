// A KPI tile for the listing screens' headers (doc/stitch/).
//
// Inwards gets a 2x2 of these ("50 / In Transit / 1 bills"), Deliveries a 2-up
// ("45 / Pending"). The two designs differ in more than size, so `compact` switches both:
// the full tile has a neutral label and a sub-caption, the compact one tints its label to
// match the number and carries no caption.
//
// These are GLOBAL counters and must be fed from getStockSummary, never from a page's
// facets — facets are scoped to the current search, so the tiles would tick down as
// someone types, which reads as a bug.
import React from "react";
import { Text, View } from "react-native";
import { TONE, type Tone } from "@/lib/stock-constants";
import PressScale from "@/components/PressScale";

export type StatTileProps = {
  value: number | string;
  label: string;
  /** Full tile only. The design's second line: "1 bills", "This Month". */
  caption?: string;
  tone?: Tone;
  compact?: boolean;
  /** Optional — a tile that filters the list below it. Omit for a read-only counter. */
  onPress?: () => void;
};

export default function StatTile({
  value,
  label,
  caption,
  tone = "gray",
  compact = false,
  onPress,
}: StatTileProps) {
  const t = TONE[tone];
  const body = (
    <>
      <Text
        className={`${compact ? "text-[20px] font-semibold" : "text-[24px] font-bold"} ${t.text}`}
        numberOfLines={1}
      >
        {typeof value === "number" ? value.toLocaleString("en-IN") : value}
      </Text>
      <Text
        className={compact ? `text-[12px] mt-0.5 ${t.text}` : "text-[14px] text-gray-900 mt-1"}
        numberOfLines={1}
      >
        {label}
      </Text>
      {!compact && caption ? (
        <Text className="text-[12px] text-gray-400 mt-0.5" numberOfLines={1}>
          {caption}
        </Text>
      ) : null}
    </>
  );

  const cls = `flex-1 bg-white rounded-lg border border-gray-200 items-center justify-center ${
    compact ? "p-3" : "p-4"
  }`;

  if (!onPress) return <View className={cls}>{body}</View>;
  return (
    <PressScale onPress={onPress} scaleTo={0.97} className={cls} accessibilityRole="button">
      {body}
    </PressScale>
  );
}
