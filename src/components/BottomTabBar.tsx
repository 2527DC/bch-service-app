// Role-based bottom nav + the 5th hard-refresh 🔄 tab — port of BottomNav.tsx.
// The 🔄 tab never navigates: it fires store.refresh() + haptic + toast.
import React from "react";
import { Pressable, Text, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useData } from "../store/data";

type NavItem = { href: string; emoji: string; label: string };

const NAV_ITEMS: Record<string, NavItem[]> = {
  MECHANIC: [
    { href: "/mechanic", emoji: "📋", label: "My Jobs" },
    { href: "/assembly", emoji: "📦", label: "Assembly" },
    { href: "/counter", emoji: "📥", label: "New" },
  ],
  SUPERVISOR: [
    { href: "/supervisor", emoji: "📋", label: "Jobs" },
    { href: "/supervisor", emoji: "👥", label: "Assign" },
    { href: "/counter", emoji: "📥", label: "New" },
  ],
  MANAGER: [
    { href: "/manager", emoji: "📊", label: "Home" },
    { href: "/supervisor", emoji: "📋", label: "Jobs" },
    { href: "/history", emoji: "📚", label: "History" },
    { href: "/prices", emoji: "💰", label: "Prices" },
  ],
};

export default function BottomTabBar({ role }: { role: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const refresh = useData((s) => s.refresh);
  const showToast = useData((s) => s.showToast);
  const insets = useSafeAreaInsets();

  const items = NAV_ITEMS[role] || NAV_ITEMS.MECHANIC;

  const handleRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await refresh();
    showToast("🔄 Refreshed");
  };

  return (
    <View
      className="bg-white border-t border-gray-200"
      style={{ paddingBottom: insets.bottom }}
    >
      <View className="flex-row justify-around items-center h-16">
        {items.map((item, idx) => {
          const active = pathname === item.href;
          return (
            <Pressable
              key={`${item.href}-${idx}`}
              onPress={() => router.navigate(item.href as never)}
              className="flex-1 items-center justify-center py-2 min-h-[56px]"
            >
              <Text className="text-2xl">{item.emoji}</Text>
              <Text className={`text-xs font-medium mt-0.5 ${active ? "text-gray-800" : "text-gray-400"}`}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
        {/* Hard refresh — never navigates */}
        <Pressable onPress={handleRefresh} className="flex-1 items-center justify-center py-2 min-h-[56px]">
          <Text className="text-2xl">🔄</Text>
          <Text className="text-xs font-medium mt-0.5 text-gray-400">Refresh</Text>
        </Pressable>
      </View>
    </View>
  );
}
