// Bottom-sheet filters. One row of type segments stays on the screen; everything else
// lives here, so the list never loses two rows of chrome to chips (design plan, §Filters).
//
// It edits a DRAFT and only lifts the value on Apply. Changing a filter per tap would
// re-run the query four times while someone makes up their mind, and on a real endpoint
// that is four round trips.
import React, { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { NEUTRAL } from "@/lib/theme";
import PressScale from "@/components/PressScale";

export type Option<V extends string> = { value: V; label: string; count?: number };

export type FilterGroup<V extends string> = {
  key: string;
  title: string;
  options: Option<V>[];
};

export default function FilterSheet<H extends string, S extends string>({
  visible,
  onClose,
  health,
  sort,
  healthOptions,
  sortOptions,
  onApply,
  onReset,
}: {
  visible: boolean;
  onClose: () => void;
  health: H;
  sort: S;
  healthOptions: Option<H>[];
  sortOptions: Option<S>[];
  onApply: (next: { health: H; sort: S }) => void;
  onReset: () => void;
}) {
  const [draftHealth, setDraftHealth] = useState<H>(health);
  const [draftSort, setDraftSort] = useState<S>(sort);

  // Re-seed the draft each time it opens, so a cancelled edit never leaks into the next one.
  useEffect(() => {
    if (visible) {
      setDraftHealth(health);
      setDraftSort(sort);
    }
  }, [visible, health, sort]);

  const Row = <V extends string>({
    opt,
    selected,
    onPress,
  }: {
    opt: Option<V>;
    selected: boolean;
    onPress: () => void;
  }) => (
    <PressScale
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      scaleTo={0.98}
      className={`flex-row items-center gap-3 px-3.5 min-h-[52px] rounded-2xl mb-2 ${
        selected ? "bg-brand-50 border border-brand-200" : "bg-gray-50 border border-gray-100"
      }`}
    >
      <View
        className={`w-5 h-5 rounded-full items-center justify-center ${
          selected ? "bg-brand-600" : "border-2 border-gray-300"
        }`}
      >
        {selected ? <View className="w-1.5 h-1.5 rounded-full bg-white" /> : null}
      </View>
      <Text className={`flex-1 text-[14px] ${selected ? "text-brand-700 font-bold" : "text-gray-700 font-medium"}`}>
        {opt.label}
      </Text>
      {opt.count !== undefined && (
        <View className={`px-2 py-0.5 rounded-full ${selected ? "bg-brand-100" : "bg-gray-200"}`}>
          <Text className={`text-[11px] font-bold ${selected ? "text-brand-700" : "text-gray-600"}`}>
            {opt.count.toLocaleString("en-IN")}
          </Text>
        </View>
      )}
    </PressScale>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable className="flex-1 bg-black/45" onPress={onClose} accessibilityLabel="Close filters" />
      <View className="bg-white rounded-t-3xl px-5 pt-2.5 pb-8" style={{ maxHeight: "82%" }}>
        <View className="w-10 h-1 rounded-full bg-gray-200 self-center mb-4" />
        <Text className="text-lg font-extrabold text-gray-900 mb-3">Filter &amp; sort</Text>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Text className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 mb-2">Stock level</Text>
          {healthOptions.map((o) => (
            <Row key={o.value} opt={o} selected={draftHealth === o.value} onPress={() => setDraftHealth(o.value)} />
          ))}

          <Text className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 mt-4 mb-2">Sort by</Text>
          {sortOptions.map((o) => (
            <Row key={o.value} opt={o} selected={draftSort === o.value} onPress={() => setDraftSort(o.value)} />
          ))}
          <View className="h-2" />
        </ScrollView>

        <View className="flex-row gap-2 pt-3 border-t border-gray-100">
          <PressScale
            onPress={() => {
              onReset();
              onClose();
            }}
            className="flex-none w-28 min-h-[54px] rounded-2xl bg-gray-100 items-center justify-center"
          >
            <Text className="text-gray-700 font-bold text-[15px]">Reset</Text>
          </PressScale>
          <PressScale
            onPress={() => {
              onApply({ health: draftHealth, sort: draftSort });
              onClose();
            }}
            className="flex-1 min-h-[54px] rounded-2xl bg-gray-800 items-center justify-center"
          >
            <Text className="text-white font-bold text-[15px]">Show results</Text>
          </PressScale>
        </View>
      </View>
    </Modal>
  );
}
