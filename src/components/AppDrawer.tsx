// Sidebar content: identity block, role-gated module sections, sign out.
import React from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "../store/session";
import { useUi } from "../store/ui";
import { drawerSectionsForRole, type NavItem } from "../lib/nav";
import { ACTIVE_TINT, NEUTRAL } from "../lib/theme";
import PressScale from "./PressScale";

const ROLE_LABEL: Record<string, string> = {
  MECHANIC: "Mechanic",
  SUPERVISOR: "Supervisor",
  MANAGER: "Manager",
};

function initials(name: string) {
  return name.trim().slice(0, 2).toUpperCase();
}

function Row({ item, active, onPress }: { item: NavItem; active: boolean; onPress: () => void }) {
  return (
    <PressScale
      scaleTo={0.97}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={`flex-row items-center gap-3 mx-2 px-3 rounded-xl min-h-[52px] ${active ? "bg-brand-50" : ""}`}
    >
      <Ionicons
        name={active ? item.icon : item.iconOutline}
        size={21}
        color={active ? ACTIVE_TINT : NEUTRAL[500]}
      />
      <Text className={`text-[15px] ${active ? "text-brand-700 font-semibold" : "text-gray-700 font-medium"}`}>
        {item.label}
      </Text>
    </PressScale>
  );
}

export default function AppDrawer() {
  const user = useSession((s) => s.user);
  const logout = useSession((s) => s.logout);
  const closeDrawer = useUi((s) => s.closeDrawer);
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (!user) return null;

  const go = (href: string) => {
    closeDrawer();
    router.navigate(href as never);
  };

  const handleLogout = () => {
    Alert.alert("Sign out?", "You will need your PIN to sign back in.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          closeDrawer();
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-white">
      {/* Identity */}
      <View
        className="px-4 pb-4 border-b border-gray-100"
        style={{ paddingTop: insets.top + 16 }}
      >
        <View className="flex-row items-center gap-3">
          <View className="w-12 h-12 rounded-full bg-brand-600 items-center justify-center">
            <Text className="text-white font-bold text-base">{initials(user.name)}</Text>
          </View>
          <View className="flex-1">
            <Text className="font-bold text-gray-900 text-lg leading-tight" numberOfLines={1}>
              {user.name}
            </Text>
            <Text className="text-gray-400 text-xs" numberOfLines={1}>
              {user.email}
            </Text>
          </View>
        </View>
        <View className="self-start mt-3 px-2.5 py-1 rounded-full bg-brand-50">
          <Text className="text-brand-700 text-[11px] font-semibold">
            {ROLE_LABEL[user.role] ?? user.role}
          </Text>
        </View>
      </View>

      {/* Modules */}
      <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
        {drawerSectionsForRole(user.role).map((section) => (
          <View key={section.title} className="mb-2">
            <Text className="px-5 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              {section.title}
            </Text>
            {section.items.map((item) => (
              <Row
                key={`${section.title}-${item.href}`}
                item={item}
                active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                onPress={() => go(item.href)}
              />
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Footer */}
      <View className="border-t border-gray-100 px-2 py-2" style={{ paddingBottom: insets.bottom + 8 }}>
        <PressScale
          scaleTo={0.97}
          onPress={handleLogout}
          accessibilityRole="button"
          className="flex-row items-center gap-3 px-3 rounded-xl min-h-[52px]"
        >
          <Ionicons name="log-out-outline" size={21} color="#dc2626" />
          <Text className="text-[15px] font-medium text-red-600">Sign out</Text>
        </PressScale>
        <Text className="px-3 pt-1 text-[11px] text-gray-300">BCH Service · v1.0.0</Text>
      </View>
    </View>
  );
}
