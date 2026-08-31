// Sticky header: hamburger → drawer, identity, brand mark.
import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "../store/session";
import { useUi } from "../store/ui";
import { NEUTRAL } from "../lib/theme";

export default function AppHeader() {
  const user = useSession((s) => s.user);
  const openDrawer = useUi((s) => s.openDrawer);

  if (!user) return null;

  return (
    <View className="bg-white border-b border-gray-100 px-2 py-2 flex-row items-center justify-between">
      <View className="flex-row items-center gap-1 flex-1">
        <Pressable
          onPress={openDrawer}
          accessibilityRole="button"
          accessibilityLabel="Open menu"
          hitSlop={8}
          className="w-11 h-11 items-center justify-center rounded-full active:bg-gray-100"
        >
          <Ionicons name="menu" size={24} color={NEUTRAL[800]} />
        </Pressable>
        <View className="flex-1">
          <Text className="font-bold text-gray-800 text-base leading-tight" numberOfLines={1}>
            {user.name}
          </Text>
          <Text className="text-gray-400 text-xs">{user.role}</Text>
        </View>
      </View>
      <Text className="text-sm font-bold text-gray-700 pr-2 shrink-0">🚲 Bharath Cycle Hub</Text>
    </View>
  );
}
