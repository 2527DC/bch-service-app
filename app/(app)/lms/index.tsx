// LMS — training courses with per-user progress. Managers/supervisors also
// see team-wide completion on each card.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { ChevronRight, GraduationCap, Users } from "lucide-react-native";
import * as mockApi from "@/services/mockApi";
import type { Course, CourseProgress } from "@/mock/types";
import { useSession } from "@/store/session";
import { BRAND, NEUTRAL } from "@/lib/theme";
import SearchBar from "@/components/SearchBar";
import EmptyState from "@/components/EmptyState";
import ErrorBanner from "@/components/ErrorBanner";
import BouncingEmoji from "@/components/BouncingEmoji";
import PressScale from "@/components/PressScale";

type TeamStats = Record<string, { completed: number; started: number }>;

const CATEGORY_LABEL: Record<Course["category"], string> = {
  SAFETY: "Safety",
  REPAIR: "Repair",
  SERVICE: "Service",
  CUSTOMER: "Customer",
};

const LEVEL_STYLE: Record<Course["level"], string> = {
  BEGINNER: "bg-green-50 text-green-700",
  INTERMEDIATE: "bg-amber-50 text-amber-700",
  ADVANCED: "bg-red-50 text-red-700",
};

const FILTERS = ["ALL", "REQUIRED", "IN_PROGRESS", "DONE"] as const;
const FILTER_LABEL: Record<(typeof FILTERS)[number], string> = {
  ALL: "All",
  REQUIRED: "Required",
  IN_PROGRESS: "In progress",
  DONE: "Completed",
};

export default function LmsScreen() {
  const user = useSession((s) => s.user);
  const router = useRouter();

  const [courses, setCourses] = useState<Course[]>([]);
  const [progress, setProgress] = useState<CourseProgress[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");

  const isLead = user?.role === "MANAGER" || user?.role === "SUPERVISOR";

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [c, p, t] = await Promise.all([
        mockApi.getCourses(),
        mockApi.getProgress(user.id),
        isLead ? mockApi.getTeamCourseStats() : Promise.resolve({} as TeamStats),
      ]);
      setCourses(c);
      setProgress(p);
      setTeamStats(t);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load courses");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, isLead]);

  useEffect(() => {
    load();
  }, [load]);

  // Progress changes on the detail screen — re-pull when we come back.
  useFocusEffect(
    useCallback(() => {
      if (!loading && user) mockApi.getProgress(user.id).then(setProgress).catch(() => {});
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const doneCount = useCallback(
    (c: Course) => progress.find((p) => p.courseId === c.id)?.completedLessonIds.length ?? 0,
    [progress]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((c) => {
      const done = doneCount(c);
      if (filter === "REQUIRED" && !(user && c.requiredFor.includes(user.role))) return false;
      if (filter === "IN_PROGRESS" && !(done > 0 && done < c.lessons.length)) return false;
      if (filter === "DONE" && done < c.lessons.length) return false;
      if (!q) return true;
      return c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
    });
  }, [courses, search, filter, doneCount, user]);

  // Headline: how much of your required training is finished.
  const requiredSummary = useMemo(() => {
    if (!user) return { done: 0, total: 0 };
    const req = courses.filter((c) => c.requiredFor.includes(user.role));
    return {
      done: req.filter((c) => doneCount(c) >= c.lessons.length).length,
      total: req.length,
    };
  }, [courses, user, doneCount]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <BouncingEmoji emoji="🎓" size={48} caption="Loading courses..." />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <View className="bg-white px-4 pt-3 pb-2 border-b border-gray-100">
        {/* Required-training summary */}
        <View className="flex-row items-center gap-3 bg-brand-50 rounded-2xl p-3.5 mb-3">
          <GraduationCap size={22} color={BRAND[600]} />
          <View className="flex-1">
            <Text className="text-brand-700 font-bold text-[15px]">
              {requiredSummary.done} of {requiredSummary.total} required courses done
            </Text>
            <Text className="text-brand-600/70 text-xs mt-0.5">
              {requiredSummary.done === requiredSummary.total
                ? "You are fully certified."
                : "Finish these to stay certified."}
            </Text>
          </View>
        </View>

        <SearchBar value={search} onChangeText={setSearch} placeholder="Search courses" withIcon />

        <View className="flex-row gap-2 mt-3">
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <PressScale
                key={f}
                scaleTo={0.96}
                onPress={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full ${active ? "bg-brand-600" : "bg-gray-100"}`}
              >
                <Text className={`text-xs font-semibold ${active ? "text-white" : "text-gray-600"}`}>
                  {FILTER_LABEL[f]}
                </Text>
              </PressScale>
            );
          })}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 24, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND[600]} />}
        ListEmptyComponent={<EmptyState emoji="📭" message="No courses match" />}
        renderItem={({ item }) => {
          const done = doneCount(item);
          const pct = Math.round((done / item.lessons.length) * 100);
          const isRequired = !!user && item.requiredFor.includes(user.role);
          const stats = teamStats[item.id];

          return (
            <PressScale
              scaleTo={0.98}
              onPress={() => router.push(`/lms/${item.id}` as never)}
              className="bg-white rounded-2xl border border-gray-100 p-4 min-h-[56px]"
            >
              <View className="flex-row items-start gap-3">
                <Text className="text-3xl">{item.emoji}</Text>

                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="font-bold text-gray-900 text-base flex-1 leading-tight" numberOfLines={2}>
                      {item.title}
                    </Text>
                    {pct === 100 && (
                      <View className="px-2 py-0.5 rounded-full bg-green-50">
                        <Text className="text-green-700 text-[10px] font-bold">DONE</Text>
                      </View>
                    )}
                  </View>

                  <Text className="text-gray-500 text-xs mt-1 leading-snug" numberOfLines={2}>
                    {item.description}
                  </Text>

                  <View className="flex-row items-center gap-1.5 mt-2">
                    <View className="px-2 py-0.5 rounded-full bg-gray-100">
                      <Text className="text-gray-600 text-[10px] font-semibold">
                        {CATEGORY_LABEL[item.category]}
                      </Text>
                    </View>
                    <View className={`px-2 py-0.5 rounded-full ${LEVEL_STYLE[item.level].split(" ")[0]}`}>
                      <Text className={`text-[10px] font-semibold ${LEVEL_STYLE[item.level].split(" ")[1]}`}>
                        {item.level}
                      </Text>
                    </View>
                    {isRequired && (
                      <View className="px-2 py-0.5 rounded-full bg-brand-50">
                        <Text className="text-brand-700 text-[10px] font-semibold">REQUIRED</Text>
                      </View>
                    )}
                  </View>
                </View>

                <ChevronRight size={18} color={NEUTRAL[400]} />
              </View>

              {/* Progress */}
              <View className="mt-3">
                <View className="flex-row items-center justify-between mb-1.5">
                  <Text className="text-[11px] text-gray-400">
                    {done} / {item.lessons.length} lessons
                  </Text>
                  <Text className={`text-[11px] font-bold ${pct === 100 ? "text-green-600" : "text-gray-500"}`}>
                    {pct}%
                  </Text>
                </View>
                <View className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <View
                    className={`h-full rounded-full ${pct === 100 ? "bg-green-500" : "bg-brand-600"}`}
                    style={{ width: `${pct}%` }}
                  />
                </View>
              </View>

              {isLead && stats && (
                <View className="flex-row items-center gap-1.5 mt-2.5 pt-2.5 border-t border-gray-50">
                  <Users size={13} color={NEUTRAL[400]} />
                  <Text className="text-gray-500 text-xs">
                    Team: {stats.completed} completed · {stats.started} started
                  </Text>
                </View>
              )}
            </PressScale>
          );
        }}
      />
    </View>
  );
}
