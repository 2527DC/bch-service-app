// The full-screen filter (doc/stitch/filter.png). Replaces the old bottom-sheet
// FilterSheet on all four listing screens.
//
// WHY A MODAL AND NOT A ROUTE. The plan (R5) called for `app/(app)/filters.tsx` presented
// modally. The authed shell renders `<Slot />`, not a Stack, so no route under `(app)` can
// be presented modally — it would draw inside AppHeader and BottomTabBar, which is the one
// thing this screen must cover. Converting the shell to a Stack to gain modal presentation
// is precisely the navigation redesign R8 puts out of scope. A full-screen Modal gives the
// same UI, keeps Android back via `onRequestClose`, and changes no routing.
//
// It edits a DRAFT and only lifts the value on Apply — four filters would otherwise be
// four round trips while someone makes up their mind. ✕ and Android back DISCARD the
// draft; only "Apply" commits.
import React, { useEffect, useState } from "react";
import { Modal, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SlidersHorizontal, X } from "lucide-react-native";
import { activeFilterCount } from "@/lib/stock-constants";
import { NEUTRAL, ON_BRAND } from "@/lib/theme";
import PressScale from "@/components/PressScale";
import DataLabel from "./DataLabel";

export type FilterOption = {
  value: string;
  label: string;
  /** `cards` only — the second line under the title. */
  description?: string;
  count?: number;
};

export type FilterGroupSpec = {
  key: string;
  title: string;
  /**
   * How the group draws, per the design:
   *   grid  — two columns of bordered buttons with counts. Status.
   *   pills — a wrapping row of rounded-full chips. Timeline.
   *   cards — full-width radio rows with a description. Dispatch type, Sort.
   */
  render: "grid" | "pills" | "cards";
  options: FilterOption[];
};

export default function FilterScreen({
  visible,
  onClose,
  groups,
  value,
  defaults,
  onApply,
}: {
  visible: boolean;
  onClose: () => void;
  groups: FilterGroupSpec[];
  value: Record<string, string>;
  /** Drives Reset and the active count. A control sitting on its default is not a filter. */
  defaults: Record<string, string>;
  onApply: (next: Record<string, string>) => void;
}) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<Record<string, string>>(value);

  // Re-seed each time it opens, so a discarded edit never leaks into the next open.
  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  const n = activeFilterCount(draft, defaults);
  const set = (k: string, v: string) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 bg-surface" style={{ paddingTop: insets.top }}>
        {/* Header — ✕ left, title centred, RESET right. */}
        <View className="flex-row items-center px-2 border-b border-gray-200 bg-white">
          <PressScale
            onPress={onClose}
            scaleTo={0.9}
            accessibilityRole="button"
            accessibilityLabel="Close filters"
            className="min-h-[56px] min-w-[56px] items-center justify-center rounded-lg"
          >
            <X size={20} color={NEUTRAL[500]} />
          </PressScale>

          <Text className="flex-1 text-center text-[20px] font-bold text-gray-900" numberOfLines={1}>
            Filters
          </Text>

          {/* Reset sets the draft back to defaults and does NOT close — otherwise you never
              see what you reset to. */}
          <PressScale
            onPress={() => setDraft({ ...defaults })}
            scaleTo={0.95}
            accessibilityRole="button"
            className="min-h-[56px] min-w-[56px] px-2 items-center justify-center rounded-lg"
          >
            <Text className="text-[12px] font-bold uppercase tracking-wider text-brand-600">Reset</Text>
          </PressScale>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {groups.map((g) => (
            <View key={g.key} className="mb-6">
              <DataLabel className="mb-2">{g.title}</DataLabel>
              {g.render === "grid" ? (
                <Grid group={g} selected={draft[g.key] ?? defaults[g.key]} onSelect={(v) => set(g.key, v)} />
              ) : g.render === "pills" ? (
                <Pills group={g} selected={draft[g.key] ?? defaults[g.key]} onSelect={(v) => set(g.key, v)} />
              ) : (
                <Cards group={g} selected={draft[g.key] ?? defaults[g.key]} onSelect={(v) => set(g.key, v)} />
              )}
            </View>
          ))}
        </ScrollView>

        {/* Footer — one full-width primary button. The design counts ACTIVE FILTERS here,
            not results, which is why no result count is threaded through this component. */}
        <View
          className="px-4 pt-3 border-t border-gray-200 bg-white"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          <PressScale
            onPress={() => {
              onApply(draft);
              onClose();
            }}
            className="flex-row items-center justify-center gap-2 min-h-[56px] rounded-lg bg-brand-600"
            accessibilityRole="button"
          >
            <SlidersHorizontal size={18} color={ON_BRAND} />
            <Text className="text-white font-bold text-[15px]">
              {n === 0 ? "Apply" : `Apply ${n} Filter${n === 1 ? "" : "s"}`}
            </Text>
          </PressScale>
        </View>
      </View>
    </Modal>
  );
}

// ── Renderers ─────────────────────────────────────────────────────────────

/** Two columns of bordered buttons. Selected = ink fill, white text. */
function Grid({
  group,
  selected,
  onSelect,
}: {
  group: FilterGroupSpec;
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {group.options.map((o) => {
        const on = o.value === selected;
        return (
          <PressScale
            key={o.value}
            onPress={() => onSelect(o.value)}
            scaleTo={0.97}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            // w-[48%] rather than flex-1: flex-1 inside a wrapping row sizes the last row
            // against different remaining space and its buttons come out narrower.
            className={`w-[48%] min-h-[52px] px-3 items-center justify-center rounded-lg border ${
              on ? "bg-ink border-ink" : "bg-white border-gray-200"
            }`}
          >
            <Text
              className={`text-[14px] font-semibold ${on ? "text-white" : "text-gray-800"}`}
              numberOfLines={1}
            >
              {o.label}
              {o.count !== undefined ? ` (${o.count.toLocaleString("en-IN")})` : ""}
            </Text>
          </PressScale>
        );
      })}
    </View>
  );
}

/** A wrapping row of pills. */
function Pills({
  group,
  selected,
  onSelect,
}: {
  group: FilterGroupSpec;
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {group.options.map((o) => {
        const on = o.value === selected;
        return (
          <PressScale
            key={o.value}
            onPress={() => onSelect(o.value)}
            scaleTo={0.95}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            className={`px-5 min-h-[44px] justify-center rounded-full border ${
              on ? "bg-ink border-ink" : "bg-white border-gray-200"
            }`}
          >
            <Text className={`text-[14px] font-semibold ${on ? "text-white" : "text-gray-800"}`} numberOfLines={1}>
              {o.label}
            </Text>
          </PressScale>
        );
      })}
    </View>
  );
}

/** Full-width radio rows with a description. Selected = brand border + tint. */
function Cards({
  group,
  selected,
  onSelect,
}: {
  group: FilterGroupSpec;
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <View className="gap-2">
      {group.options.map((o) => {
        const on = o.value === selected;
        return (
          <PressScale
            key={o.value}
            onPress={() => onSelect(o.value)}
            scaleTo={0.98}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            className={`flex-row items-center gap-3 px-4 min-h-[64px] rounded-lg border ${
              on ? "bg-brand-50 border-2 border-brand-600" : "bg-white border-gray-200"
            }`}
          >
            <View
              className={`w-5 h-5 rounded-full items-center justify-center border-2 ${
                on ? "border-brand-600" : "border-gray-300"
              }`}
            >
              {on ? <View className="w-2.5 h-2.5 rounded-full bg-brand-600" /> : null}
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-[15px] font-semibold text-gray-900" numberOfLines={1}>
                {o.label}
              </Text>
              {o.description ? (
                <Text className="text-[12px] text-gray-500 mt-0.5" numberOfLines={1}>
                  {o.description}
                </Text>
              ) : null}
            </View>
            {o.count !== undefined ? (
              <Text className="text-[12px] font-bold text-gray-400">{o.count.toLocaleString("en-IN")}</Text>
            ) : null}
          </PressScale>
        );
      })}
    </View>
  );
}
