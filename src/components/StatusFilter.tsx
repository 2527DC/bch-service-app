// Horizontal status pills with counts (+ Overdue) — port of src/components/StatusFilter.tsx
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { JOB_STATUS } from "../lib/constants";
import PressScale from "./PressScale";

export default function StatusFilter({
  selected,
  onChange,
  counts,
  hideEmpty = false,
}: {
  selected: string | null;
  onChange: (status: string | null) => void;
  counts: Record<string, number>;
  hideEmpty?: boolean;
}) {
  const statuses = Object.entries(JOB_STATUS)
    .map(([key, val]) => ({ key, emoji: val.emoji, label: val.label }))
    .filter((s) => !hideEmpty || (counts[s.key] || 0) > 0 || selected === s.key);

  const overdueCount = counts["OVERDUE"] || 0;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="pb-2"
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
    >
      {statuses.map((s) => {
        const count = counts[s.key] || 0;
        const active = selected === s.key;
        return (
          <PressScale
            key={s.key}
            onPress={() => onChange(s.key)}
            className={`flex-row items-center gap-1 px-4 py-2 rounded-full min-h-[44px] ${
              active ? "bg-gray-800" : "bg-white border border-gray-200"
            }`}
          >
            <Text className="text-lg">{s.emoji}</Text>
            <Text className={`font-semibold text-sm ${active ? "text-white" : "text-gray-600"}`}>{s.label}</Text>
            <View className={`ml-1 px-1.5 py-0.5 rounded-full ${active ? "bg-gray-600" : "bg-gray-100"}`}>
              <Text className={`text-xs ${active ? "text-white" : "text-gray-600"}`}>{count}</Text>
            </View>
          </PressScale>
        );
      })}
      {overdueCount > 0 && (
        <PressScale
          onPress={() => onChange("OVERDUE")}
          className={`flex-row items-center gap-1 px-4 py-2 rounded-full min-h-[44px] ${
            selected === "OVERDUE" ? "bg-red-600" : "bg-red-50 border border-red-200"
          }`}
        >
          <Text className="text-lg">🚨</Text>
          <Text className={`font-semibold text-sm ${selected === "OVERDUE" ? "text-white" : "text-red-600"}`}>
            Overdue
          </Text>
          <View className={`ml-1 px-1.5 py-0.5 rounded-full ${selected === "OVERDUE" ? "bg-red-500" : "bg-red-100"}`}>
            <Text className={`text-xs ${selected === "OVERDUE" ? "text-white" : "text-red-600"}`}>{overdueCount}</Text>
          </View>
        </PressScale>
      )}
    </ScrollView>
  );
}
