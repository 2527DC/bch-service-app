// Jobs History — port of src/app/(app)/history/page.tsx
import React, { useState } from "react";
import { FlatList, RefreshControl, ScrollView, Text, View } from "react-native";
import { useData } from "@/store/data";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import { shiftTodayIST } from "@/lib/timezone";
import JobCard from "@/components/job/JobCard";
import SearchBar from "@/components/SearchBar";
import EmptyState from "@/components/EmptyState";
import BouncingEmoji from "@/components/BouncingEmoji";
import DatePickerField from "@/components/DatePickerField";
import PressScale from "@/components/PressScale";

type Range = "today" | "yesterday" | "3days" | "month" | "custom" | "all";

export default function HistoryScreen() {
  const jobs = useData((s) => s.jobs);
  const loading = useData((s) => s.loading);
  const refreshing = useData((s) => s.refreshing);
  const refresh = useData((s) => s.refresh);

  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<Range>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  useAutoRefresh();

  const getWindow = (): { from: string | null; to: string | null } => {
    if (dateRange === "today") return { from: shiftTodayIST(0), to: shiftTodayIST(0) };
    if (dateRange === "yesterday") return { from: shiftTodayIST(-1), to: shiftTodayIST(-1) };
    if (dateRange === "3days") return { from: shiftTodayIST(-2), to: shiftTodayIST(0) };
    if (dateRange === "month") return { from: shiftTodayIST(-29), to: shiftTodayIST(0) };
    if (dateRange === "custom" && customFrom) return { from: customFrom, to: customTo || null };
    return { from: null, to: null };
  };

  const { from, to } = getWindow();
  const delivered = jobs.filter((j) => {
    if (j.status !== "DELIVERED" || !j.deliveredAt) return false;
    if (!from) return true;
    const t = new Date(j.deliveredAt).getTime();
    const fromMs = new Date(`${from}T00:00:00+05:30`).getTime();
    const toMs = to ? new Date(`${to}T23:59:59.999+05:30`).getTime() : Infinity;
    return t >= fromMs && t <= toMs;
  });

  const filtered = search.trim()
    ? delivered.filter(
        (j) =>
          j.tokenNumber.toLowerCase().includes(search.toLowerCase()) ||
          j.customer.name.toLowerCase().includes(search.toLowerCase()) ||
          j.customer.phone.includes(search) ||
          j.bikeType.toLowerCase().includes(search.toLowerCase())
      )
    : delivered;

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <BouncingEmoji emoji="📚" size={40} />
      </View>
    );
  }

  const header = (
    <View className="pt-4">
      <View className="px-4 mb-4">
        <Text className="text-2xl font-bold mb-3 text-gray-900">📚 Job History</Text>
        <SearchBar value={search} onChangeText={setSearch} placeholder="🔍 Search token, name, phone, bike..." large />
      </View>

      {/* Date filter */}
      <View className="px-4 mb-3">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {(
            [
              ["today", "Today"],
              ["yesterday", "Yesterday"],
              ["3days", "3 Days"],
              ["month", "1 Month"],
              ["custom", "Custom"],
              ["all", "All"],
            ] as const
          ).map(([key, label]) => (
            <PressScale
              key={key}
              onPress={() => setDateRange(key)}
              className={`px-3 py-1.5 rounded-full ${dateRange === key ? "bg-gray-800" : "bg-gray-100"}`}
            >
              <Text className={`text-xs font-bold ${dateRange === key ? "text-white" : "text-gray-600"}`}>{label}</Text>
            </PressScale>
          ))}
        </ScrollView>
        {dateRange === "custom" && (
          <View className="flex-row gap-2 mt-2">
            <DatePickerField value={customFrom} onChange={setCustomFrom} placeholder="From" maxToday />
            <DatePickerField value={customTo} onChange={setCustomTo} placeholder="To" maxToday />
          </View>
        )}
      </View>

      <View className="px-4 py-2">
        <Text className="text-gray-500 font-medium">
          {filtered.length} delivered job{filtered.length !== 1 ? "s" : ""}
        </Text>
      </View>
    </View>
  );

  return (
    <FlatList
      data={filtered}
      keyExtractor={(j) => j.id}
      ListHeaderComponent={header}
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#1f2937" />}
      ListEmptyComponent={
        <EmptyState emoji="📭" message={search ? "No matching jobs" : "No delivered jobs in this period"} />
      }
      renderItem={({ item }) => (
        <View className="px-4">
          <JobCard job={item} showActions={false} largePhotos />
        </View>
      )}
    />
  );
}
