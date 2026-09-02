// Lays StatTiles out in rows of `columns` (doc/stitch/): 2-up on Deliveries, 2x2 on
// Inwards.
//
// Chunked into explicit rows rather than `flex-wrap` + a percentage basis. `flex-1` inside
// a wrapping row is unreliable in React Native — the second row's tiles size themselves
// against a different remaining space and end up a few px narrower than the first row's,
// which is very visible on a 2x2 of bordered cards.
//
// A short final row is padded with empty flex children so three tiles do not stretch into
// two-and-a-half.
import React from "react";
import { View } from "react-native";

export default function StatGrid({
  columns = 2,
  className = "",
  children,
}: {
  columns?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const items = React.Children.toArray(children).filter(Boolean);
  if (items.length === 0) return null;

  const rows: React.ReactNode[][] = [];
  for (let i = 0; i < items.length; i += columns) rows.push(items.slice(i, i + columns));

  return (
    <View className={`gap-2 ${className}`}>
      {rows.map((row, r) => (
        <View key={r} className="flex-row gap-2">
          {row}
          {Array.from({ length: columns - row.length }).map((_, i) => (
            <View key={`pad-${i}`} className="flex-1" />
          ))}
        </View>
      ))}
    </View>
  );
}
