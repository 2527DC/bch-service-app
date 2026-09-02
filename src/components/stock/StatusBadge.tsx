// The status badge, in the Precision Logic soft-fill pattern (doc/stitch/).
//
// "A light background version of the status color paired with a high-contrast bold text
// of the same color" — so: tone background, tone text, NO border. The previous badge was
// a bordered pill; the border is what made a row of them read as chrome rather than as
// data, which is most of why the old rows looked busy.
//
// This is re-exported from ./index as `Badge`, which is the name every stock screen
// already imports. One implementation, one file, no import churn — do not add a second
// badge component.
import React from "react";
import { Text, View } from "react-native";
import { TONE, type Tone } from "@/lib/stock-constants";

export default function StatusBadge({
  label,
  tone = "gray",
  small = false,
}: {
  label: string;
  tone?: Tone;
  /**
   * For the dense rows that exist TODAY (inbound, transfers, the count sheets), which are
   * budgeted against the old 9px badge. Uppercasing a label widens it — "Partially
   * received" becomes noticeably longer — and those rows sit in fixed-width columns that
   * have not been rebuilt yet. `small` keeps them close to their old width.
   *
   * The new listing cards (W4 onward) do NOT pass this: they get the design's 10px.
   */
  small?: boolean;
}) {
  const t = TONE[tone];
  return (
    <View className={`rounded ${t.bg} ${small ? "px-1.5 py-px" : "px-2 py-0.5"}`}>
      {/* uppercase + tracking-wider is what makes a small label legible at arm's length in
          a workshop. numberOfLines guards the fixed row heights downstream. */}
      <Text
        className={`${small ? "text-[9.5px]" : "text-[10px]"} font-bold uppercase tracking-wider ${t.text}`}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}
