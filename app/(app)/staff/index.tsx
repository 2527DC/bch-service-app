// STAFF — roster with live workload, searchable, filterable by role.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Phone, Users, ChevronRight } from "lucide-react-native";
import * as mockApi from "@/services/mockApi";
import type { StaffMember } from "@/mock/types";
import { BRAND, NEUTRAL } from "@/lib/theme";
import SearchBar from "@/components/SearchBar";
import EmptyState from "@/components/EmptyState";
import ErrorBanner from "@/components/ErrorBanner";
import BouncingEmoji from "@/components/BouncingEmoji";
import PressScale from "@/components/PressScale";

type Workload = Record<string, { open: number; deliveredToday: number }>;

const ROLE_TABS = ["ALL", "MECHANIC", "SUPERVISOR", "MANAGER"] as const;
const ROLE_LABEL: Record<string, string> = {
  ALL: "All",
  MECHANIC: "Mechanics",
  SUPERVISOR: "Supervisors",
  MANAGER: "Managers",
};

const SHIFT_LABEL: Record<StaffMember["shift"], string> = {
  MORNING: "Morning",
  EVENING: "Evening",
  FULL: "Full day",
};

const initials = (name: string) => name.trim().slice(0, 2).toUpperCase();

export default function StaffScreen() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [workload, setWorkload] = useState<Workload>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleTab, setRoleTab] = useState<(typeof ROLE_TABS)[number]>("ALL");

  const load = useCallback(async () => {
    try {
      const [s, w] = await Promise.all([mockApi.getStaff(), mockApi.getStaffWorkload()]);
      setStaff(s);
      setWorkload(w);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load staff");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter((s) => {
      if (roleTab !== "ALL" && s.role !== roleTab) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        s.skills.some((sk) => sk.toLowerCase().includes(q))
      );
    });
  }, [staff, search, roleTab]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <BouncingEmoji emoji="👥" size={48} caption="Loading staff..." />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <View className="bg-white px-4 pt-3 pb-2 border-b border-gray-100">
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search name, skill, phone" withIcon />
        <View className="flex-row gap-2 mt-3">
          {ROLE_TABS.map((t) => {
            const active = roleTab === t;
            return (
              <PressScale
                key={t}
                scaleTo={0.96}
                onPress={() => setRoleTab(t)}
                className={`px-3 py-1.5 rounded-full ${active ? "bg-brand-600" : "bg-gray-100"}`}
              >
                <Text className={`text-xs font-semibold ${active ? "text-white" : "text-gray-600"}`}>
                  {ROLE_LABEL[t]}
                </Text>
              </PressScale>
            );
          })}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 24, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND[600]} />}
        ListEmptyComponent={
          <EmptyState emoji="🔍" message="No staff found" />
        }
        renderItem={({ item }) => {
          const w = workload[item.id] ?? { open: 0, deliveredToday: 0 };
          return (
            <PressScale
              scaleTo={0.98}
              onPress={() => router.push(`/staff/${item.id}` as never)}
              className="bg-white rounded-lg border border-gray-100 p-3.5 min-h-[56px]"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-11 h-11 rounded-full bg-brand-50 items-center justify-center">
                  <Text className="text-brand-700 font-bold text-sm">{initials(item.name)}</Text>
                </View>

                <View className="flex-1">
                  <Text className="font-bold text-gray-900 text-base leading-tight">{item.name}</Text>
                  <Text className="text-gray-400 text-xs mt-0.5">
                    {item.role} · {SHIFT_LABEL[item.shift]}
                  </Text>
                </View>

                <View className="items-end mr-1">
                  <Text className="text-brand-600 font-bold text-base leading-tight">{w.open}</Text>
                  <Text className="text-gray-400 text-[10px]">open</Text>
                </View>
                <ChevronRight size={18} color={NEUTRAL[400]} />
              </View>

              <View className="flex-row items-center gap-3 mt-3 pt-3 border-t border-gray-50">
                <View className="flex-row items-center gap-1.5">
                  <Phone size={13} color={NEUTRAL[400]} />
                  <Text className="text-gray-500 text-xs">{item.phone}</Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <Users size={13} color={NEUTRAL[400]} />
                  <Text className="text-gray-500 text-xs">{w.deliveredToday} delivered today</Text>
                </View>
              </View>
            </PressScale>
          );
        }}
      />
    </View>
  );
}
