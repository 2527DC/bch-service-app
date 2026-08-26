// Role-based bottom tabs. Ionicons outline→filled on active (AGENTS.md §5),
// brand-tinted, with a 2px indicator above the active tab.
import React from "react";
import { Pressable, Text, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { tabsForRole } from "../lib/nav";
import { ACTIVE_TINT, INACTIVE_TINT } from "../lib/theme";

export default function BottomTabBar({ role }: { role: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const items = tabsForRole(role);

  return (
    <View className="bg-white border-t border-gray-200" style={{ paddingBottom: insets.bottom }}>
      <View className="flex-row justify-around items-stretch h-16">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Pressable
              key={item.href}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={item.label}
              onPress={() => router.navigate(item.href as never)}
              className="flex-1 items-center justify-center min-h-[56px]"
            >
              {/* Active indicator sits flush with the top border */}
              <View
                className={`absolute top-0 h-0.5 w-10 rounded-full ${active ? "bg-brand-600" : "bg-transparent"}`}
              />
              <Ionicons
                name={active ? item.icon : item.iconOutline}
                size={23}
                color={active ? ACTIVE_TINT : INACTIVE_TINT}
              />
              <Text
                className={`text-[11px] mt-1 ${active ? "text-brand-600 font-semibold" : "text-gray-400 font-medium"}`}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
