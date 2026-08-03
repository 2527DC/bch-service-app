// App shell — auth gate + sticky header + role-driven bottom tabs (+ 🔄 tab).
// Port of src/app/(app)/layout.tsx (STAFF check-off gate is out of scope).
import React, { useEffect } from "react";
import { View } from "react-native";
import { Redirect, Slot } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "@/store/session";
import { useData } from "@/store/data";
import AppHeader from "@/components/AppHeader";
import BottomTabBar from "@/components/BottomTabBar";
import Toast from "@/components/Toast";
import BouncingEmoji from "@/components/BouncingEmoji";

export default function AppLayout() {
  const user = useSession((s) => s.user);
  const hydrated = useSession((s) => s.hydrated);
  const loading = useData((s) => s.loading);
  const refresh = useData((s) => s.refresh);
  const insets = useSafeAreaInsets();

  // Initial data load once we have a session
  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  if (!hydrated) return null;
  if (!user) return <Redirect href="/login" />;

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <BouncingEmoji emoji="🚲" size={56} caption="Loading..." />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      <AppHeader />
      <View className="flex-1">
        <Slot />
      </View>
      <BottomTabBar role={user.role} />
      <Toast />
    </View>
  );
}
