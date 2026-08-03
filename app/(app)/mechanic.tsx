// HOME (MECHANIC) — "My Jobs": port of src/app/(app)/mechanic/page.tsx
import React, { useEffect, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { useSession } from "@/store/session";
import { useData } from "@/store/data";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import * as mockApi from "@/services/mockApi";
import type { Job } from "@/mock/types";
import JobCard from "@/components/job/JobCard";
import StatusFilter from "@/components/StatusFilter";
import PartsSelector from "@/components/PartsSelector";
import SearchBar from "@/components/SearchBar";
import ErrorBanner from "@/components/ErrorBanner";
import EmptyState from "@/components/EmptyState";
import BouncingEmoji from "@/components/BouncingEmoji";
import PressScale from "@/components/PressScale";

export default function MechanicScreen() {
  const user = useSession((s) => s.user);
  const allJobs = useData((s) => s.jobs);
  const loading = useData((s) => s.loading);
  const refreshing = useData((s) => s.refreshing);
  const error = useData((s) => s.error);
  const setError = useData((s) => s.setError);
  const refresh = useData((s) => s.refresh);
  const updateJobStatus = useData((s) => s.updateJobStatus);

  const [filter, setFilter] = useState<string | null>("RECEIVED");
  const [partsJobId, setPartsJobId] = useState<string | null>(null);
  const [partsInitialAmount, setPartsInitialAmount] = useState<number | null>(null);
  const [isHoldAction, setIsHoldAction] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Job[] | null>(null);

  useAutoRefresh();

  // My active jobs (delivered excluded, like includeDelivered=false)
  const jobs = allJobs.filter((j) => j.status !== "DELIVERED" && j.mechanic?.id === user?.id);

  // Debounced "server-side" search — finds delivered jobs too
  useEffect(() => {
    if (search.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await mockApi.getJobs({ includeDelivered: true, search: search.trim() });
        setSearchResults(res);
      } catch {
        /* ignore */
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [search, allJobs]);

  const handleStatusChange = async (jobId: string, newStatus: string) => {
    if (newStatus === "PARTS_NEEDED") {
      const job = jobs.find((j) => j.id === jobId);
      setPartsJobId(jobId);
      setPartsInitialAmount(job?.amount ?? null);
      setIsHoldAction(true);
      return;
    }
    await updateJobStatus({ jobId, newStatus });
  };

  const handlePartsConfirm = async (partsText: string, totalAmount: number, holdReason?: string) => {
    if (!partsJobId) return;
    const params = isHoldAction
      ? { jobId: partsJobId, newStatus: "PARTS_NEEDED", partsNeeded: partsText, amount: totalAmount, holdReason }
      : { jobId: partsJobId, billUpdateOnly: true, partsNeeded: partsText, amount: totalAmount };
    setPartsJobId(null);
    setIsHoldAction(false);
    await updateJobStatus(params);
  };

  const counts: Record<string, number> = {};
  jobs.forEach((j) => {
    counts[j.status] = (counts[j.status] || 0) + 1;
  });

  // When searching, use search results (includes delivered)
  const filtered =
    search.trim().length >= 2 && searchResults
      ? searchResults
      : filter
        ? jobs.filter((j) => j.status === filter)
        : jobs;

  const readyCount = jobs.filter((j) => j.status === "READY").length;

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <BouncingEmoji emoji="🔧" size={40} />
      </View>
    );
  }

  const header = (
    <View className="pt-4">
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Ready bikes not picked up — alert */}
      {readyCount > 0 && (
        <PressScale onPress={() => setFilter("READY")} className="mx-4 mb-3 bg-purple-600 rounded-xl p-3 shadow-lg">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="font-black text-sm text-white">
                📞 {readyCount} bike{readyCount > 1 ? "s" : ""} ready — not picked up
              </Text>
              <Text className="text-xs text-purple-200 mt-0.5">Tap to view · Inform staff to clear deliveries</Text>
            </View>
            <Text className="text-2xl">👉</Text>
          </View>
        </PressScale>
      )}

      {/* Search */}
      <View className="px-4 mb-3">
        <SearchBar value={search} onChangeText={setSearch} placeholder="🔍 Search token, name, or phone..." />
      </View>

      <StatusFilter selected={filter} onChange={setFilter} counts={counts} hideEmpty />

      <View className="px-4 py-2 flex-row items-center justify-between">
        <Text className="text-gray-500 font-medium">
          {filtered.length} job{filtered.length !== 1 ? "s" : ""}
        </Text>
        <PressScale onPress={refresh} className="min-h-[44px] justify-center">
          <Text className="text-gray-700 font-semibold text-sm">🔄 Refresh</Text>
        </PressScale>
      </View>
    </View>
  );

  return (
    <View className="flex-1">
      <FlatList
        data={filtered}
        keyExtractor={(j) => j.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#1f2937" />}
        ListEmptyComponent={<EmptyState emoji="✨" message="No jobs here!" />}
        renderItem={({ item }) => (
          <View className="px-4">
            <JobCard
              job={item}
              onStatusChange={handleStatusChange}
              onAddParts={(id, amt) => {
                setPartsJobId(id);
                setPartsInitialAmount(amt);
                setIsHoldAction(false);
              }}
              largePhotos
              hideDeliverFlow
            />
          </View>
        )}
      />

      {partsJobId && (
        <PartsSelector
          initialAmount={partsInitialAmount}
          onConfirm={handlePartsConfirm}
          onCancel={() => {
            setPartsJobId(null);
            setIsHoldAction(false);
          }}
          isHold={isHoldAction}
        />
      )}
    </View>
  );
}
