// Fixed top pill toast — mirrors the PWA's manager toast, driven by the data store.
import React from "react";
import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useData } from "../store/data";

export default function Toast() {
  const toast = useData((s) => s.toast);
  const insets = useSafeAreaInsets();
  if (!toast) return null;
  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", top: insets.top + 8, left: 0, right: 0, zIndex: 50, alignItems: "center" }}
    >
      <View className="bg-gray-900 px-4 py-2 rounded-full shadow-lg">
        <Text className="text-white text-sm font-bold">{toast}</Text>
      </View>
    </View>
  );
}
