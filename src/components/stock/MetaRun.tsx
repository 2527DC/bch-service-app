// The dot-separated metadata line under a card's title (doc/stitch/).
//
//   0009 · HERO CYCLES · Uncategorized
//   Bill F21034023833 · IB-202609-0001
//
// Rendered as ONE <Text numberOfLines={1}> with nested <Text> for the accented tokens,
// not as a flex row of Views. A row of Views cannot ellipsize as a unit — it clips mid-
// element and leaves a dangling separator — and these lines sit inside fixed-height cards
// where a second line would break the list's offsets.
//
// DEVIATION from the mock: the design draws the separator as a 4px circle View. A View
// inside a Text is unreliable across platforms, so this uses a middot. At 11px the two
// are indistinguishable, and the truncation behaviour is worth far more than the shape.
import React from "react";
import { Text } from "react-native";

export type MetaToken = string | { text: string; accent?: boolean };

export default function MetaRun({
  items,
  className = "",
}: {
  /** Falsy entries are dropped, so callers can inline conditionals without filtering. */
  items: Array<MetaToken | null | undefined | false>;
  className?: string;
}) {
  const tokens = items.filter(Boolean) as MetaToken[];
  if (tokens.length === 0) return null;

  return (
    <Text className={`text-[11.5px] text-gray-500 ${className}`} numberOfLines={1}>
      {tokens.map((t, i) => {
        const text = typeof t === "string" ? t : t.text;
        const accent = typeof t === "string" ? false : t.accent;
        return (
          <Text key={i}>
            {i > 0 ? <Text className="text-gray-300">{"  ·  "}</Text> : null}
            {/* The accented token is the record's own identifier — SKU, brand. The design
                puts it in the accent colour so the eye finds it while scanning a column. */}
            <Text className={accent ? "text-brand-600 font-semibold" : undefined}>{text}</Text>
          </Text>
        );
      })}
    </Text>
  );
}
