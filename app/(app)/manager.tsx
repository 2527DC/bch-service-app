// HOME (MANAGER) — Dashboard: port of src/app/(app)/manager/page.tsx
// Home | Jobs | More(Mech Status / TAT / Incentives / Assembly / Audit / Team stub)
import React, { useEffect, useState } from "react";
import { Alert, RefreshControl, ScrollView, Text, View } from "react-native";
import {
  AlertTriangle, PauseCircle, Clock3, ArrowRight, Timer, Star, Trophy,
  Home as HomeIcon, ClipboardList, MoreHorizontal, Wrench, Package,
  ScrollText, Users, TrendingUp, IndianRupee,
} from "lucide-react-native";
import { useData } from "@/store/data";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import * as mockApi from "@/services/mockApi";
import { JOB_STATUS, JOB_TYPE } from "@/lib/constants";
import { formatIST, getStartOfTodayIST, shiftTodayIST } from "@/lib/timezone";
import { fmtTat, timeSince } from "@/lib/format";
import type { Job } from "@/mock/types";
import JobCard from "@/components/job/JobCard";
import SearchBar from "@/components/SearchBar";
import BouncingEmoji from "@/components/BouncingEmoji";
import DatePickerField from "@/components/DatePickerField";
import MonthPickerField from "@/components/MonthPickerField";
import PressScale from "@/components/PressScale";

type NowKey = "overdue" | "hold" | "ready";

export default function ManagerScreen() {
  const allJobs = useData((s) => s.jobs);
  const incentives = useData((s) => s.incentives);
  const assemblies = useData((s) => s.assemblies);
  const auditLogs = useData((s) => s.auditLogs);
  const loading = useData((s) => s.loading);
  const refreshing = useData((s) => s.refreshing);
  const refresh = useData((s) => s.refresh);
  const updateJobStatus = useData((s) => s.updateJobStatus);
  const deleteJob = useData((s) => s.deleteJob);
  const showToast = useData((s) => s.showToast);

  const [openNow, setOpenNow] = useState<NowKey | null>(null);
  const [tab, setTab] = useState<"home" | "jobs" | "more">("home");
  const [moreView, setMoreView] = useState<"mechstatus" | "incentives" | "assembly" | "tat" | "audit" | "team">("mechstatus");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [mechFilter, setMechFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Job[] | null>(null);
  const [dashDateRange, setDashDateRange] = useState<"today" | "3days" | "7days" | "all">("today");
  const [dashMonth, setDashMonth] = useState(""); // "YYYY-MM"
  const [dashFrom, setDashFrom] = useState("");
  const [dashTo, setDashTo] = useState("");

  useAutoRefresh();

  // Debounced search — finds delivered jobs too
  useEffect(() => {
    if (search.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setSearchResults(await mockApi.getJobs({ includeDelivered: true, search: search.trim() }));
      } catch { /* ignore */ }
    }, 400);
    return () => clearTimeout(timer);
  }, [search, allJobs]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <BouncingEmoji emoji="📊" size={40} />
      </View>
    );
  }

  // ── Date window (client-side over the store) ──────────────────────────
  const window = (() => {
    if (dashMonth) {
      const [y, mo] = dashMonth.split("-").map(Number);
      const lastDay = new Date(y, mo, 0).getDate();
      return { from: `${dashMonth}-01`, to: `${dashMonth}-${String(lastDay).padStart(2, "0")}` };
    }
    if (dashFrom && dashTo) return { from: dashFrom, to: dashTo };
    if (dashDateRange === "today") return { from: shiftTodayIST(0), to: shiftTodayIST(0) };
    if (dashDateRange === "3days") return { from: shiftTodayIST(-2), to: shiftTodayIST(0) };
    if (dashDateRange === "7days") return { from: shiftTodayIST(-6), to: shiftTodayIST(0) };
    return { from: null as string | null, to: null as string | null };
  })();

  const jobs = allJobs.filter((j) => {
    if (!window.from) return true;
    const t = new Date(j.status === "DELIVERED" && j.deliveredAt ? j.deliveredAt : j.receivedAt).getTime();
    const fromMs = new Date(`${window.from}T00:00:00+05:30`).getTime();
    const toMs = window.to ? new Date(`${window.to}T23:59:59.999+05:30`).getTime() : Infinity;
    return t >= fromMs && t <= toMs;
  });
  const liveJobs = allJobs.filter((j) => j.status !== "DELIVERED"); // live backlog, ignores date filter
  const filteredJobs = search.trim().length >= 2 && searchResults ? searchResults : jobs;

  // ── Derived stats (as in the PWA) ─────────────────────────────────────
  const mechStats: Record<string, { name: string; emoji: string; total: number; delivered: number }> = {};
  jobs.forEach((j) => {
    if (!j.mechanic) return;
    if (!mechStats[j.mechanic.name]) {
      mechStats[j.mechanic.name] = { name: j.mechanic.name, emoji: j.mechanic.emoji, total: 0, delivered: 0 };
    }
    mechStats[j.mechanic.name].total++;
    if (j.status === "DELIVERED") mechStats[j.mechanic.name].delivered++;
  });

  const deliveredJobs = jobs.filter((j) => j.status === "DELIVERED" && j.deliveredAt);
  const tatMinutes = deliveredJobs.map(
    (j) => (new Date(j.deliveredAt!).getTime() - new Date(j.receivedAt).getTime()) / 60000
  );
  const avgTatMins = tatMinutes.length > 0 ? tatMinutes.reduce((a, b) => a + b, 0) / tatMinutes.length : 0;
  const avgTatStr = fmtTat(avgTatMins);

  const googleReviews = jobs.filter((j) => j.review?.googleReview).map((j) => j.review!.rating);
  const inAppRatings = jobs.filter((j) => j.review).map((j) => j.review!.rating);
  const avgGoogleRating =
    googleReviews.length > 0 ? (googleReviews.reduce((a, b) => a + b, 0) / googleReviews.length).toFixed(1) : "—";

  const startTodayMs = getStartOfTodayIST().getTime();
  const nowOverdue = liveJobs.filter((j) => j.promisedAt && new Date(j.promisedAt).getTime() < startTodayMs);
  const nowHold = liveJobs.filter((j) => j.status === "PARTS_NEEDED");
  const nowReady = liveJobs.filter((j) => j.status === "READY");
  const nowMap: Record<NowKey, Job[]> = { overdue: nowOverdue, hold: nowHold, ready: nowReady };

  const periodIntake = jobs.length;
  const periodDelivered = deliveredJobs.length;
  const promisedDelivered = deliveredJobs.filter((j) => j.promisedAt);
  const onTimeCount = promisedDelivered.filter(
    (j) => new Date(j.deliveredAt!) <= new Date(new Date(j.promisedAt!).getTime() + 86400000)
  ).length;
  const onTimePct = promisedDelivered.length > 0 ? Math.round((onTimeCount / promisedDelivered.length) * 100) : null;

  const totalTodayIncentive = incentives.reduce((sum, i) => sum + i.todayIncentive, 0);

  const dashScopeLabel = (() => {
    if (dashMonth) {
      const [y, mo] = dashMonth.split("-");
      return `${new Date(Number(y), Number(mo) - 1, 1).toLocaleString("en-US", { month: "short" })} ${y}`;
    }
    if (dashFrom && dashTo) return `${dashFrom} → ${dashTo}`;
    if (dashDateRange === "all") return "all time";
    if (dashDateRange === "today") return "today";
    return `last ${dashDateRange.replace("days", " days")}`;
  })();

  const handleDelete = (jobId: string) => {
    Alert.alert("Delete this job?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleting(jobId);
          try {
            const token = await deleteJob(jobId);
            setSearchResults((prev) => (prev ? prev.filter((j) => j.id !== jobId) : prev));
            showToast(`🗑️ Deleted ${token}`);
          } catch {
            Alert.alert("Delete failed");
          }
          setDeleting(null);
        },
      },
    ]);
  };

  const view = tab === "home" ? "overview" : tab === "jobs" ? "jobs" : moreView;

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#1f2937" />}
    >
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-xl font-bold text-gray-900">Dashboard</Text>
      </View>

      {/* Search */}
      <View className="mb-4">
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search token or mechanic…" withIcon />
      </View>

      {/* Date filter */}
      <View className="mb-4" style={{ gap: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {(
            [
              ["today", "Today"],
              ["3days", "3 Days"],
              ["7days", "7 Days"],
              ["all", "All"],
            ] as const
          ).map(([key, label]) => {
            const active = !dashMonth && !(dashFrom && dashTo) && dashDateRange === key;
            return (
              <PressScale
                key={key}
                onPress={() => { setDashDateRange(key); setDashMonth(""); setDashFrom(""); setDashTo(""); }}
                className={`px-3 py-1.5 rounded-full ${active ? "bg-gray-800" : "bg-gray-100"}`}
              >
                <Text className={`text-xs font-bold ${active ? "text-white" : "text-gray-600"}`}>{label}</Text>
              </PressScale>
            );
          })}
        </ScrollView>
        {/* Month picker */}
        <View className="flex-row items-center gap-2">
          <Text className="text-xs font-bold text-gray-500 w-12">Month</Text>
          <MonthPickerField value={dashMonth} onChange={(v) => { setDashMonth(v); setDashFrom(""); setDashTo(""); }} />
        </View>
        {/* Custom range */}
        <View className="flex-row items-end gap-2">
          <DatePickerField label="From" value={dashFrom} onChange={(v) => { setDashFrom(v); setDashMonth(""); }} maxToday />
          <DatePickerField label="To" value={dashTo} onChange={(v) => { setDashTo(v); setDashMonth(""); }} maxToday />
          {(dashFrom || dashTo) && (
            <PressScale onPress={() => { setDashFrom(""); setDashTo(""); }} className="pb-2">
              <Text className="text-xs text-gray-400 font-medium">clear</Text>
            </PressScale>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row gap-1.5 mb-4">
        {(
          [
            ["home", "Home", HomeIcon],
            ["jobs", "Jobs", ClipboardList],
            ["more", "More", MoreHorizontal],
          ] as const
        ).map(([key, label, Icon]) => (
          <PressScale
            key={key}
            onPress={() => setTab(key)}
            className={`flex-1 flex-row items-center justify-center gap-1.5 px-3 py-2 rounded-lg ${
              tab === key ? "bg-gray-900" : "bg-gray-100"
            }`}
          >
            <Icon size={15} color={tab === key ? "#ffffff" : "#4b5563"} />
            <Text className={`font-bold text-xs ${tab === key ? "text-white" : "text-gray-600"}`}>{label}</Text>
          </PressScale>
        ))}
      </View>

      {/* More — section picker */}
      {tab === "more" && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4" contentContainerStyle={{ gap: 6 }}>
          {(
            [
              ["mechstatus", "Mech Status", Wrench],
              ["tat", "TAT", Timer],
              ["incentives", "Incentives", IndianRupee],
              ["assembly", "Assembly", Package],
              ["audit", "Audit", ScrollText],
              ["team", "Team", Users],
            ] as const
          ).map(([key, label, Icon]) => (
            <PressScale
              key={key}
              onPress={() => setMoreView(key)}
              className={`flex-row items-center gap-1.5 px-3 py-2 rounded-lg ${
                moreView === key ? "bg-blue-700" : "bg-gray-100"
              }`}
            >
              <Icon size={14} color={moreView === key ? "#ffffff" : "#4b5563"} />
              <Text className={`font-bold text-xs ${moreView === key ? "text-white" : "text-gray-600"}`}>{label}</Text>
            </PressScale>
          ))}
        </ScrollView>
      )}

      {/* ════════ HOME (overview) ════════ */}
      {view === "overview" && (
        <>
          {/* NOW: live backlog needing action */}
          <View className="flex-row items-center gap-2 mb-2">
            <AlertTriangle size={16} color="#dc2626" />
            <Text className="font-bold text-gray-800 text-sm">Needs action now</Text>
            <Text className="text-[11px] text-gray-400 font-medium">live · all open jobs</Text>
          </View>
          <View className="flex-row gap-2">
            {(
              [
                ["overdue", "Overdue", nowOverdue.length, AlertTriangle, nowOverdue.length > 0 ? "bg-red-600" : "bg-gray-100"],
                ["hold", "On hold", nowHold.length, PauseCircle, nowHold.length > 0 ? "bg-amber-500" : "bg-gray-100"],
                ["ready", "Ready · waiting", nowReady.length, Clock3, nowReady.length > 0 ? "bg-blue-700" : "bg-gray-100"],
              ] as const
            ).map(([key, label, count, Icon, bg]) => {
              const active = count > 0;
              return (
                <PressScale
                  key={key}
                  onPress={() => setOpenNow(openNow === key ? null : key)}
                  className={`flex-1 rounded-lg p-3 ${bg} ${openNow === key ? "border-2 border-gray-900" : ""}`}
                >
                  <Icon size={18} color={active ? "rgba(255,255,255,0.8)" : "#9ca3af"} />
                  <Text className={`text-2xl font-black mt-1 ${active ? "text-white" : "text-gray-400"}`}>{count}</Text>
                  <Text className={`text-[11px] font-semibold mt-1 ${active ? "text-white/90" : "text-gray-400"}`}>
                    {label}
                  </Text>
                </PressScale>
              );
            })}
          </View>
          {/* Inline drill-down */}
          {openNow ? (
            <View className="bg-white rounded-lg p-3 shadow-sm mt-2 mb-6 border border-gray-100">
              {nowMap[openNow].length === 0 ? (
                <Text className="text-gray-400 text-sm text-center py-2">All clear — nothing here</Text>
              ) : (
                [...nowMap[openNow]]
                  .sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime())
                  .map((j) => {
                    const days = Math.floor((Date.now() - new Date(j.receivedAt).getTime()) / 86400000);
                    return (
                      <View key={j.id} className="flex-row items-center gap-2 py-2 border-b border-gray-50">
                        <Text className="font-bold text-sm text-gray-900">{j.tokenNumber}</Text>
                        <Text className="text-gray-400 text-xs flex-1" numberOfLines={1}>
                          {j.mechanic ? `${j.mechanic.emoji} ${j.mechanic.name}` : "Unassigned"}
                        </Text>
                        <Text className="text-xs text-gray-400">{days}d old</Text>
                      </View>
                    );
                  })
              )}
            </View>
          ) : (
            <View className="mb-6" />
          )}

          {/* PERIOD: throughput */}
          <View className="flex-row items-center gap-2 mb-2">
            <TrendingUp size={16} color="#1d4ed8" />
            <Text className="font-bold text-gray-800 text-sm">This period</Text>
            <Text className="text-[11px] text-gray-400 font-medium">{dashScopeLabel}</Text>
          </View>
          <View className="bg-white rounded-lg p-4 shadow-sm mb-6">
            <View className="flex-row items-center justify-around">
              <View className="items-center">
                <Text className="text-3xl font-black text-gray-800">{periodIntake}</Text>
                <Text className="text-xs text-gray-500 font-medium mt-0.5">Intake</Text>
              </View>
              <ArrowRight size={20} color="#d1d5db" />
              <View className="items-center">
                <Text className="text-3xl font-black text-blue-700">{periodDelivered}</Text>
                <Text className="text-xs text-gray-500 font-medium mt-0.5">Delivered</Text>
              </View>
            </View>
            <View className="flex-row gap-3 mt-4 pt-4 border-t border-gray-100">
              <View className="flex-1 flex-row items-center gap-2">
                <Timer size={20} color="#9ca3af" />
                <View>
                  <Text className="font-black text-gray-800">{avgTatStr}</Text>
                  <Text className="text-[11px] text-gray-500">avg check-in → delivered</Text>
                </View>
              </View>
              <View className="flex-1 flex-row items-center gap-2">
                <Text
                  className={`text-xl font-black ${
                    onTimePct === null
                      ? "text-gray-400"
                      : onTimePct >= 80
                        ? "text-green-600"
                        : onTimePct >= 50
                          ? "text-amber-600"
                          : "text-red-600"
                  }`}
                >
                  {onTimePct === null ? "—" : `${onTimePct}%`}
                </Text>
                <Text className="text-[11px] text-gray-500 flex-1">
                  on-time{"\n"}{promisedDelivered.length} with promise date
                </Text>
              </View>
            </View>
          </View>

          {/* QUALITY + PEOPLE */}
          <View className="flex-row items-center gap-2 mb-2">
            <Star size={16} color="#f59e0b" />
            <Text className="font-bold text-gray-800 text-sm">Quality & team</Text>
            <Text className="text-[11px] text-gray-400 font-medium">{dashScopeLabel}</Text>
          </View>
          <View className="bg-white rounded-lg p-4 shadow-sm mb-3 flex-row items-center gap-4">
            <View className="flex-row items-center gap-1">
              <Star size={22} color="#fbbf24" fill="#fbbf24" />
              <Text className="text-2xl font-black text-gray-800">{avgGoogleRating}</Text>
            </View>
            <View className="w-px self-stretch bg-gray-100" />
            <Text className="text-xs text-gray-500 flex-1">
              <Text className="font-bold text-gray-700">{googleReviews.length}</Text> verified Google reviews{"\n"}
              {inAppRatings.length} in-app ratings total
            </Text>
          </View>
          <View className="bg-white rounded-lg p-4 shadow-sm">
            <View className="flex-row items-center gap-2 mb-1">
              <Trophy size={16} color="#f59e0b" />
              <Text className="font-bold text-gray-700 text-sm">Top mechanics</Text>
            </View>
            {Object.values(mechStats)
              .sort((a, b) => b.total - a.total)
              .slice(0, 5)
              .map((m, i) => (
                <View key={m.name} className="flex-row items-center gap-3 py-2.5 border-b border-gray-50">
                  <Text className="text-sm font-bold text-gray-400 w-5">{i + 1}</Text>
                  <Text className="text-xl">{m.emoji}</Text>
                  <View className="flex-1">
                    <Text className="font-bold text-sm text-gray-900">{m.name}</Text>
                    <Text className="text-[11px] text-gray-500">{m.delivered} delivered</Text>
                  </View>
                  <Text className="text-lg font-black text-blue-700">{m.total}</Text>
                </View>
              ))}
            {Object.keys(mechStats).length === 0 && (
              <Text className="text-gray-400 text-center py-3 text-sm">No data for this period</Text>
            )}
          </View>
        </>
      )}

      {/* ════════ JOBS ════════ */}
      {view === "jobs" && (
        <>
          <Text className="text-gray-500 text-sm mb-3">{filteredJobs.length} jobs — full details below</Text>
          {[...filteredJobs]
            .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
            .map((job) => (
              <View key={job.id}>
                <JobCard
                  job={job}
                  onStatusChange={(jobId, newStatus) => updateJobStatus({ jobId, newStatus })}
                  largePhotos
                  showUndo
                  readyBikeCount={nowReady.length}
                />
                <PressScale
                  onPress={() => handleDelete(job.id)}
                  disabled={deleting === job.id}
                  className={`w-full -mt-1 mb-3 py-2 bg-red-50 rounded-b-lg items-center ${deleting === job.id ? "opacity-50" : ""}`}
                >
                  <Text className="text-red-600 font-bold text-sm">
                    {deleting === job.id ? "Deleting..." : "🗑️ Delete Job"}
                  </Text>
                </PressScale>
              </View>
            ))}
        </>
      )}

      {/* ════════ MECH STATUS ════════ */}
      {view === "mechstatus" && (() => {
        const now = Date.now();
        const rangeJobs = filteredJobs;
        const mechMap: Record<string, { name: string; emoji: string; pending: Job[]; hold: Job[]; ready: Job[]; delivered: Job[] }> = {};
        rangeJobs.forEach((j) => {
          const key = j.mechanic ? j.mechanic.name : "Unassigned";
          if (!mechMap[key]) mechMap[key] = { name: key, emoji: j.mechanic?.emoji || "❓", pending: [], hold: [], ready: [], delivered: [] };
          if (j.status === "RECEIVED") mechMap[key].pending.push(j);
          else if (j.status === "PARTS_NEEDED") mechMap[key].hold.push(j);
          else if (j.status === "READY") mechMap[key].ready.push(j);
          else if (j.status === "DELIVERED") mechMap[key].delivered.push(j);
        });
        const mechList = Object.values(mechMap).sort(
          (a, b) => b.pending.length + b.hold.length - (a.pending.length + a.hold.length)
        );

        const summaryTiles = [
          ["Pending", rangeJobs.filter((j) => j.status === "RECEIVED").length, "bg-blue-50", "text-blue-700", "text-blue-600"],
          ["Hold", rangeJobs.filter((j) => j.status === "PARTS_NEEDED").length, "bg-orange-50", "text-orange-700", "text-orange-600"],
          ["Ready", rangeJobs.filter((j) => j.status === "READY").length, "bg-green-50", "text-green-700", "text-green-600"],
          ["Done", rangeJobs.filter((j) => j.status === "DELIVERED").length, "bg-gray-50", "text-gray-700", "text-gray-600"],
        ] as const;

        return (
          <>
            <View className="flex-row gap-2 mb-4">
              {summaryTiles.map(([label, count, bg, numColor, labelColor]) => (
                <View key={label} className={`flex-1 ${bg} rounded-lg p-2 items-center`}>
                  <Text className={`text-lg font-black ${numColor}`}>{count}</Text>
                  <Text className={`text-xs ${labelColor}`}>{label}</Text>
                </View>
              ))}
            </View>

            {mechList.length === 0 ? (
              <View className="items-center py-12">
                <Text className="text-gray-400">No jobs in this period</Text>
              </View>
            ) : (
              mechList.map((m) => {
                const total = m.pending.length + m.hold.length + m.ready.length + m.delivered.length;
                const isExpanded = mechFilter === m.name;
                const activeJobs = [...m.pending, ...m.hold];
                return (
                  <View key={m.name} className="bg-white rounded-lg p-4 mb-3 shadow-sm">
                    <PressScale scaleTo={0.98} onPress={() => setMechFilter(isExpanded ? null : m.name)}>
                      <View className="flex-row items-center gap-3 mb-2">
                        <Text className="text-2xl">{m.emoji}</Text>
                        <View className="flex-1">
                          <Text className="font-bold text-base text-gray-900">{m.name}</Text>
                          <Text className="text-xs text-gray-500">{total} jobs · {activeJobs.length} active</Text>
                        </View>
                        <Text className="text-gray-400 text-sm">{isExpanded ? "▲" : "▼"}</Text>
                      </View>
                      <View className="flex-row gap-1.5">
                        {(
                          [
                            [m.pending.length, "Pending", "bg-blue-50", "text-blue-700", "text-blue-500"],
                            [m.hold.length, "Hold", "bg-orange-50", "text-orange-700", "text-orange-500"],
                            [m.ready.length, "Ready", "bg-green-50", "text-green-700", "text-green-500"],
                            [m.delivered.length, "Done", "bg-gray-50", "text-gray-600", "text-gray-500"],
                          ] as const
                        ).map(([count, label, bg, numColor, labelColor]) => (
                          <View key={label} className={`flex-1 ${bg} rounded-lg p-1.5 items-center`}>
                            <Text className={`text-sm font-black ${numColor}`}>{count}</Text>
                            <Text className={`text-[10px] ${labelColor}`}>{label}</Text>
                          </View>
                        ))}
                      </View>
                    </PressScale>

                    {isExpanded && activeJobs.length > 0 && (
                      <View className="mt-3 pt-3 border-t border-gray-100" style={{ gap: 8 }}>
                        {activeJobs.map((j) => {
                          const sc = JOB_STATUS[j.status as keyof typeof JOB_STATUS];
                          const tc = JOB_TYPE[j.jobType as keyof typeof JOB_TYPE];
                          const mins = Math.floor((now - new Date(j.receivedAt).getTime()) / 60000);
                          const age = mins < 60 ? `${mins}m` : mins < 1440 ? `${Math.floor(mins / 60)}h` : `${Math.floor(mins / 1440)}d`;
                          return (
                            <View key={j.id} className="flex-row items-center gap-2">
                              <View className={`${sc?.color} px-2 py-0.5 rounded-full`}>
                                <Text className="text-white text-[10px] font-bold">{sc?.label}</Text>
                              </View>
                              <Text className="font-bold text-sm text-gray-900">{j.tokenNumber}</Text>
                              <Text className="text-gray-400 text-xs flex-1" numberOfLines={1}>
                                {tc?.emoji} {tc?.label}
                              </Text>
                              <Text className="text-xs text-gray-400">{age}</Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </>
        );
      })()}

      {/* ════════ TAT ════════ */}
      {view === "tat" && (() => {
        const tatJobs = deliveredJobs;
        const promisedJobs = tatJobs.filter((j) => j.promisedAt && j.deliveredAt);
        const onTime = promisedJobs.filter(
          (j) => new Date(j.deliveredAt!) <= new Date(new Date(j.promisedAt!).getTime() + 86400000)
        );
        const overdue = promisedJobs.filter(
          (j) => new Date(j.deliveredAt!) > new Date(new Date(j.promisedAt!).getTime() + 86400000)
        );
        const pct = promisedJobs.length > 0 ? Math.round((onTime.length / promisedJobs.length) * 100) : 0;

        const mechTat: Record<string, { name: string; emoji: string; tats: number[] }> = {};
        tatJobs.forEach((j) => {
          if (!j.mechanic || !j.deliveredAt) return;
          if (!mechTat[j.mechanic.name]) mechTat[j.mechanic.name] = { name: j.mechanic.name, emoji: j.mechanic.emoji, tats: [] };
          mechTat[j.mechanic.name].tats.push(
            (new Date(j.deliveredAt).getTime() - new Date(j.receivedAt).getTime()) / 3600000
          );
        });
        const mechEntries = Object.values(mechTat).sort(
          (a, b) =>
            a.tats.reduce((x, y) => x + y, 0) / a.tats.length - b.tats.reduce((x, y) => x + y, 0) / b.tats.length
        );

        return (
          <>
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1 bg-blue-50 rounded-lg p-4 items-center">
                <Text className="text-2xl font-black text-blue-700">{avgTatStr}</Text>
                <Text className="text-sm text-blue-600 font-medium text-center">⏱️ Avg time: check-in → delivered</Text>
              </View>
              <View className="flex-1 bg-green-50 rounded-lg p-4 items-center">
                <Text className="text-2xl font-black text-green-700">{tatJobs.length}</Text>
                <Text className="text-sm text-green-600 font-medium">✅ Delivered</Text>
              </View>
            </View>

            {promisedJobs.length > 0 && (
              <>
                <Text className="font-bold text-gray-700 mb-2">📅 Delivery Commitment</Text>
                <View className="bg-white rounded-lg p-4 shadow-sm mb-4">
                  <View className="flex-row mb-3">
                    <View className="flex-1 items-center">
                      <Text className={`text-2xl font-black ${pct >= 80 ? "text-green-700" : pct >= 50 ? "text-orange-600" : "text-red-600"}`}>
                        {pct}%
                      </Text>
                      <Text className="text-xs text-gray-500">On-Time</Text>
                    </View>
                    <View className="flex-1 items-center">
                      <Text className="text-2xl font-black text-green-700">{onTime.length}</Text>
                      <Text className="text-xs text-gray-500">On Time</Text>
                    </View>
                    <View className="flex-1 items-center">
                      <Text className="text-2xl font-black text-red-600">{overdue.length}</Text>
                      <Text className="text-xs text-gray-500">Overdue</Text>
                    </View>
                  </View>
                  <View className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <View
                      className={`h-3 rounded-full ${pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-orange-500" : "bg-red-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </View>
                </View>
              </>
            )}

            <Text className="font-bold text-gray-700 mb-2">TAT by Job Type</Text>
            <View className="bg-white rounded-lg p-4 shadow-sm mb-4">
              {Object.entries(JOB_TYPE).map(([key, config]) => {
                const typeJobs = tatJobs.filter((j) => j.jobType === key && j.deliveredAt);
                if (typeJobs.length === 0) return null;
                const typeTat = typeJobs.map(
                  (j) => (new Date(j.deliveredAt!).getTime() - new Date(j.receivedAt).getTime()) / 3600000
                );
                const avg = typeTat.reduce((a, b) => a + b, 0) / typeTat.length;
                return (
                  <View key={key} className="flex-row items-center gap-3 py-2 border-b border-gray-50">
                    <Text className="text-lg">{config.emoji}</Text>
                    <Text className="text-sm font-medium flex-1 text-gray-800">{config.label}</Text>
                    <Text className="text-sm font-bold text-gray-700">{fmtTat(avg * 60)}</Text>
                    <Text className="text-xs text-gray-400">({typeJobs.length})</Text>
                  </View>
                );
              })}
              {tatJobs.length === 0 && (
                <Text className="text-gray-400 text-center py-4">No deliveries in this period</Text>
              )}
            </View>

            <Text className="font-bold text-gray-700 mb-2">TAT by Mechanic</Text>
            <View className="bg-white rounded-lg p-4 shadow-sm mb-4">
              {mechEntries.length === 0 ? (
                <Text className="text-gray-400 text-center py-4">No data</Text>
              ) : (
                mechEntries.map((m) => {
                  const avg = m.tats.reduce((a, b) => a + b, 0) / m.tats.length;
                  return (
                    <View key={m.name} className="flex-row items-center gap-3 py-2 border-b border-gray-50">
                      <Text className="text-xl">{m.emoji}</Text>
                      <View className="flex-1">
                        <Text className="font-bold text-sm text-gray-900">{m.name}</Text>
                        <Text className="text-xs text-gray-400">{m.tats.length} delivered</Text>
                      </View>
                      <View className="items-end">
                        <Text className="font-bold text-sm text-gray-900">{fmtTat(avg * 60)}</Text>
                        <Text className="text-xs text-gray-400">avg TAT</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </>
        );
      })()}

      {/* ════════ INCENTIVES ════════ */}
      {view === "incentives" && (
        <>
          <View className="bg-green-50 rounded-lg p-4 mb-4 items-center">
            <Text className="text-sm text-green-600 font-medium mb-1">Today's Payout</Text>
            <Text className="text-3xl font-black text-green-700">₹{totalTodayIncentive}</Text>
            <Text className="text-xs text-green-500 mt-1">₹100 per 10 paid jobs with Google review</Text>
          </View>

          {[...incentives]
            .sort((a, b) => b.todayDelivered - a.todayDelivered)
            .map((m) => (
              <View key={m.id} className="bg-white rounded-lg p-4 mb-3 shadow-sm">
                <View className="flex-row items-center gap-3 mb-3">
                  <Text className="text-3xl">{m.emoji}</Text>
                  <View className="flex-1">
                    <Text className="font-bold text-lg text-gray-900">{m.name}</Text>
                    <Text className="text-xs text-gray-500">{m.todayDelivered} delivered today</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-xl font-black text-green-600">₹{m.todayIncentive}</Text>
                    <Text className="text-xs text-gray-400">today</Text>
                  </View>
                </View>

                <View className="mb-2">
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-xs text-gray-500">Next ₹100</Text>
                    <Text className="text-xs text-gray-500">{m.todayProgress}/10 jobs</Text>
                  </View>
                  <View className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <View className="h-3 rounded-full bg-green-500" style={{ width: `${(m.todayProgress / 10) * 100}%` }} />
                  </View>
                </View>

                <View className="flex-row justify-between pt-2 border-t border-gray-100">
                  <Text className="text-sm text-gray-500">📅 This month: {m.monthDelivered} jobs</Text>
                  <Text className="text-sm font-bold text-green-600">₹{m.monthIncentive}</Text>
                </View>
              </View>
            ))}
        </>
      )}

      {/* ════════ ASSEMBLY ════════ */}
      {view === "assembly" && (
        <>
          <View className="bg-blue-50 rounded-lg p-4 mb-4 items-center">
            <Text className="text-sm text-blue-600 font-medium mb-1">Today's Assemblies</Text>
            <Text className="text-3xl font-black text-blue-700">{assemblies.length}</Text>
          </View>

          {(() => {
            const byMech: Record<string, { name: string; emoji: string; logs: typeof assemblies }> = {};
            assemblies.forEach((a) => {
              if (!byMech[a.mechanic.name]) byMech[a.mechanic.name] = { name: a.mechanic.name, emoji: a.mechanic.emoji, logs: [] };
              byMech[a.mechanic.name].logs.push(a);
            });
            const entries = Object.values(byMech).sort((a, b) => b.logs.length - a.logs.length);

            if (entries.length === 0) {
              return (
                <View className="items-center py-12">
                  <Text className="text-6xl mb-4">📦</Text>
                  <Text className="text-gray-400 text-lg">No assemblies logged today</Text>
                </View>
              );
            }

            return entries.map((m) => {
              const a50 = m.logs.filter((l) => l.assemblyType === "A50").length;
              const a85 = m.logs.filter((l) => l.assemblyType === "A85").length;
              const full = m.logs.filter((l) => l.assemblyType === "FULL").length;
              return (
                <View key={m.name} className="bg-white rounded-lg p-4 mb-3 shadow-sm">
                  <View className="flex-row items-center gap-3 mb-3">
                    <Text className="text-3xl">{m.emoji}</Text>
                    <View className="flex-1">
                      <Text className="font-bold text-lg text-gray-900">{m.name}</Text>
                      <Text className="text-xs text-gray-500">{m.logs.length} assemblies today</Text>
                    </View>
                  </View>
                  <View className="flex-row gap-2 mb-3">
                    {(
                      [
                        [a50, "50%", "bg-blue-50", "text-blue-700", "text-blue-600"],
                        [a85, "85%", "bg-purple-50", "text-purple-700", "text-purple-600"],
                        [full, "Full", "bg-green-50", "text-green-700", "text-green-600"],
                      ] as const
                    ).map(([count, label, bg, numColor, labelColor]) => (
                      <View key={label} className={`flex-1 ${bg} rounded-lg p-2 items-center`}>
                        <Text className={`text-xl font-black ${numColor}`}>{count}</Text>
                        <Text className={`text-xs ${labelColor}`}>{label}</Text>
                      </View>
                    ))}
                  </View>
                  <View>
                    {m.logs.map((log) => {
                      const time = formatIST(log.createdAt, { hour: "2-digit", minute: "2-digit" });
                      const typeLabel = log.assemblyType === "A50" ? "50%" : log.assemblyType === "A85" ? "85%" : "Full";
                      return (
                        <View key={log.id} className="flex-row items-center gap-2 py-1.5 border-b border-gray-50">
                          <Text className="flex-1 text-gray-700">📦 {typeLabel}{log.bikeModel ? ` · ${log.bikeModel}` : ""}</Text>
                          <Text className="text-xs text-gray-400">{time}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            });
          })()}
        </>
      )}

      {/* ════════ AUDIT ════════ */}
      {view === "audit" && (
        <>
          <Text className="font-bold text-gray-700 mb-3">📝 Recent Activity</Text>
          <View style={{ gap: 8 }}>
            {auditLogs.length === 0 ? (
              <Text className="text-gray-400 text-center py-8">No audit logs yet</Text>
            ) : (
              auditLogs.map((log) => {
                const time = formatIST(log.createdAt, { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" });
                const actionLabel =
                  log.action === "STATUS_CHANGE"
                    ? `${log.fromStatus} → ${log.toStatus}`
                    : log.action === "JOB_CREATE"
                      ? "Created"
                      : log.action === "JOB_DELETE"
                        ? "Deleted"
                        : log.action === "PHOTO_DELETE"
                          ? "Photo removed"
                          : log.action === "BILL_UPDATE"
                            ? "Bill updated"
                            : log.action;
                return (
                  <View key={log.id} className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="font-bold text-sm text-gray-900">{actionLabel}</Text>
                      <Text className="text-xs text-gray-400">{time}</Text>
                    </View>
                    <Text className="text-xs text-gray-500">
                      by {log.userName} ({log.userRole}) {log.details ? `• ${log.details}` : ""}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </>
      )}

      {/* ════════ TEAM (stub) ════════ */}
      {view === "team" && (
        <View className="items-center py-12">
          <Text className="text-6xl mb-4">👥</Text>
          <Text className="text-xl font-bold text-gray-800 mb-1">Team Manager</Text>
          <Text className="text-gray-400 text-center">Coming soon — not part of this build</Text>
        </View>
      )}
    </ScrollView>
  );
}
