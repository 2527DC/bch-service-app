// App shell — auth gate + drawer + sticky header + role-driven bottom tabs.
//
// Uses the standalone `react-native-drawer-layout` Drawer (the same component
// @react-navigation/drawer is built on) rather than expo-router's <Drawer>
// navigator: the navigator owns its screens, which would force AppHeader and
// BottomTabBar into every route or a nested group. Wrapping the existing
// <Slot /> shell keeps all routing in expo-router and leaves the 11 existing
// screens untouched.
import React, { useEffect } from "react";
import { View } from "react-native";
import { Redirect, Slot } from "expo-router";
import { Drawer } from "react-native-drawer-layout";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "@/store/session";
import { useData } from "@/store/data";
import { useUi } from "@/store/ui";
import AppHeader from "@/components/AppHeader";
import AppDrawer from "@/components/AppDrawer";
import BottomTabBar from "@/components/BottomTabBar";
import Toast from "@/components/Toast";
import BouncingEmoji from "@/components/BouncingEmoji";

export default function AppLayout() {
  const user = useSession((s) => s.user);
  const hydrated = useSession((s) => s.hydrated);
  const loading = useData((s) => s.loading);
  const refresh = useData((s) => s.refresh);
  const drawerOpen = useUi((s) => s.drawerOpen);
  const openDrawer = useUi((s) => s.openDrawer);
  const closeDrawer = useUi((s) => s.closeDrawer);
  const insets = useSafeAreaInsets();

  // Initial data load once we have a session
  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  if (!hydrated) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <BouncingEmoji emoji="🚲" size={56} caption="Starting up..." />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <BouncingEmoji emoji="🚲" size={56} caption="Loading..." />
      </View>
    );
  }

  return (
    <Drawer
      open={drawerOpen}
      onOpen={openDrawer}
      onClose={closeDrawer}
      drawerType="front"
      drawerPosition="left"
      drawerStyle={{ width: 288 }}
      renderDrawerContent={() => <AppDrawer />}
    >
      <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
        <AppHeader />
        <View className="flex-1">
          <Slot />
        </View>
        <BottomTabBar role={user.role} />
        <Toast />
      </View>
    </Drawer>
  );
}
