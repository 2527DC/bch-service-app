// Sidebar Drawer — Identity card, categorized menu with icon badges, and logout.
import React from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSession } from "../store/session";
import { useUi } from "../store/ui";
import { drawerSectionsForRole, type NavItem } from "../lib/nav";
import { ACTIVE_TINT, NEUTRAL } from "../lib/theme";

const ROLE_LABEL: Record<string, string> = {
  MECHANIC: "Workshop Mechanic",
  SUPERVISOR: "Workshop Supervisor",
  MANAGER: "Store Manager",
};

function initials(name: string) {
  return name.trim().slice(0, 2).toUpperCase();
}

function DrawerRow({
  item,
  active,
  onPress,
}: {
  item: NavItem;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={`flex-row items-center justify-between mx-2.5 px-3 py-2.5 rounded-2xl mb-1 ${
        active ? "bg-brand-50 border border-brand-200" : "bg-transparent"
      }`}
    >
      <View className="flex-row items-center gap-3 flex-1 mr-2">
        <View
          className={`w-9 h-9 rounded-xl items-center justify-center ${
            active ? "bg-brand-600" : "bg-gray-100"
          }`}
        >
          <Ionicons
            name={active ? item.icon : item.iconOutline}
            size={19}
            color={active ? "#ffffff" : NEUTRAL[500]}
          />
        </View>

        <Text
          numberOfLines={1}
          className={`text-[14px] flex-1 ${
            active ? "text-brand-700 font-bold" : "text-gray-700 font-medium"
          }`}
        >
          {item.label}
        </Text>
      </View>

      {item.badge ? (
        <View
          className={`px-2 py-0.5 rounded-full ${
            active ? "bg-brand-600" : "bg-gray-200"
          }`}
        >
          <Text
            className={`text-[10px] font-bold ${
              active ? "text-white" : "text-gray-600"
            }`}
          >
            {item.badge}
          </Text>
        </View>
      ) : active ? (
        <View className="w-2 h-2 rounded-full bg-brand-600" />
      ) : null}
    </Pressable>
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
    Alert.alert("Sign Out", "Are you sure you want to sign out from this device?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
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
      {/* ── User Header Card (White Theme) ─────────────────────────────── */}
      <View
        className="px-5 pb-4 bg-white border-b border-gray-100 shadow-sm"
        style={{ paddingTop: insets.top + 16 }}
      >
        <View className="flex-row items-center gap-3.5 mb-3">
          <View className="w-12 h-12 rounded-2xl bg-brand-600 items-center justify-center shadow-sm">
            <Text className="text-white font-extrabold text-base tracking-wider">
              {initials(user.name)}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="font-bold text-gray-900 text-base leading-snug" numberOfLines={1}>
              {user.name}
            </Text>
            <Text className="text-gray-400 text-xs mt-0.5" numberOfLines={1}>
              {user.email || "staff@bharathcyclehub.com"}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between pt-2 border-t border-gray-100">
          <View className="px-2.5 py-1 rounded-lg bg-brand-50 border border-brand-200">
            <Text className="text-brand-700 text-[11px] font-bold">
              {ROLE_LABEL[user.role] ?? user.role}
            </Text>
          </View>
          <Text className="text-gray-400 text-[11px] font-semibold">BCH Store #1</Text>
        </View>
      </View>

      {/* ── Scrollable Menu Sections ──────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 12 }}
      >
        {drawerSectionsForRole(user.role).map((section, sIdx) => (
          <View key={section.title} className={sIdx > 0 ? "mt-4 pt-3 border-t border-gray-100" : ""}>
            <Text className="px-5 pb-2 text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
              {section.title}
            </Text>
            {section.items.map((item) => (
              <DrawerRow
                key={`${section.title}-${item.href}`}
                item={item}
                active={
                  pathname === item.href ||
                  (item.href !== "/mechanic" &&
                    item.href !== "/supervisor" &&
                    item.href !== "/manager" &&
                    pathname.startsWith(`${item.href}/`))
                }
                onPress={() => go(item.href)}
              />
            ))}
          </View>
        ))}
      </ScrollView>

      {/* ── Footer / Logout ───────────────────────────────────────────────── */}
      <View
        className="border-t border-gray-100 px-3 py-3 bg-gray-50"
        style={{ paddingBottom: insets.bottom + 8 }}
      >
        <Pressable
          onPress={handleLogout}
          accessibilityRole="button"
          className="flex-row items-center gap-3 px-3 py-2.5 rounded-xl active:bg-red-50"
        >
          <View className="w-9 h-9 rounded-xl bg-red-100 items-center justify-center">
            <Ionicons name="log-out-outline" size={19} color="#dc2626" />
          </View>
          <View className="flex-1">
            <Text className="text-[14px] font-bold text-red-600">Sign Out</Text>
            <Text className="text-[10px] text-gray-400">Switch account / session</Text>
          </View>
        </Pressable>

        <Text className="text-center pt-2 text-[10px] text-gray-400">
          Bharath Cycle Hub · Service & LMS v1.0
        </Text>
      </View>
    </View>
  );
}
