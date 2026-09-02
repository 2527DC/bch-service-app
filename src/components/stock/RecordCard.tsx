// The card every listing row sits in (doc/stitch/).
//
// "Level 1: flat white surfaces with a 1px solid border" — no shadow. Shadows on a list
// of 10k rows cost real frames on Android and blur the edges the design deliberately
// keeps crisp.
//
// The four listing screens share THIS, not a row component: the three Stitch cards have
// three different interiors (Stock is two-column, Inbound has a divider and a KV footer,
// Deliveries is stacked label-over-value), so the shared piece is the container and the
// language inside it, not the anatomy. See §13.3 of the plan.
import React from "react";
import { View, type ViewProps } from "react-native";
import { TONE, type Tone } from "@/lib/stock-constants";
import PressScale from "@/components/PressScale";

/** Left accent bar, per tone. `border-l-4` rather than an absolutely-positioned bar: the
 *  card's own radius then clips the bar's ends, which is what the design shows, and it
 *  costs no extra view. */
const ACCENT: Record<Tone, string> = {
  gray: "border-l-gray-300",
  green: "border-l-green-500",
  amber: "border-l-amber-500",
  red: "border-l-red-500",
  blue: "border-l-blue-500",
  purple: "border-l-purple-500",
  orange: "border-l-orange-500",
};

export default function RecordCard({
  accent,
  onPress,
  dimmed = false,
  className = "",
  children,
  ...rest
}: {
  /** Omit for no accent bar. The design uses one only when a row wants attention. */
  accent?: Tone;
  onPress?: () => void;
  /** Inactive products render at reduced opacity, as they do today. */
  dimmed?: boolean;
  /**
   * The caller's own layout: the fixed height, the list margins, any flex-row.
   *
   * The HEIGHT LIVES HERE, as a literal `h-[NNpx]`, and must be edited together with the
   * screen's `CARD_H` constant — Tailwind extracts arbitrary values from literal source
   * text, so the class cannot be built from the constant (AGENTS.md, and the same note
   * already sits on every row in this module). It is not a numeric prop on purpose:
   * `PressScale` maps `className` onto `style` through cssInterop, so passing both here
   * would put two writers on one prop.
   */
  className?: string;
  children?: React.ReactNode;
} & Pick<ViewProps, "accessibilityLabel">) {
  const cls =
    `bg-white rounded-lg border border-gray-200 px-4 py-3.5 ` +
    (accent ? `border-l-4 ${ACCENT[accent]} ` : "") +
    (dimmed ? "opacity-60 " : "") +
    className;

  // A non-tappable card must not be a Pressable — an inert Pressable still swallows
  // touches from anything underneath it.
  if (!onPress) {
    return (
      <View className={cls} {...rest}>
        {children}
      </View>
    );
  }

  return (
    <PressScale onPress={onPress} className={cls} accessibilityRole="button" {...rest}>
      {children}
    </PressScale>
  );
}

export { ACCENT as CARD_ACCENT };
