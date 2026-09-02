// Staff Academy LMS Dashboard — Mobile Native Experience
import React, { useEffect, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import {
  Award,
  BookOpen,
  ChevronRight,
  Flame,
  Lightbulb,
  MessageSquare,
  Play,
  Sparkles,
  Trophy,
  Wrench,
  Zap,
} from "lucide-react-native";
import { useSession } from "@/store/session";
import { useLms } from "@/store/lms";
import PressScale from "@/components/PressScale";
import { BRAND } from "@/lib/theme";

export default function LmsDashboardScreen() {
  const router = useRouter();
  const user = useSession((s) => s.user);
  const profile = useLms((s) => s.profile);
  const dashboard = useLms((s) => s.dashboard);
  const fetchProfile = useLms((s) => s.fetchProfile);
  const fetchDashboard = useLms((s) => s.fetchDashboard);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    await Promise.all([fetchProfile(), fetchDashboard()]);
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await loadData();
    setRefreshing(false);
  };

  const navTo = (path: string) => {
    Haptics.selectionAsync().catch(() => {});
    router.push(path as never);
  };

  const xp = profile?.progress.xp ?? dashboard?.metrics.totalXp ?? 240;
  const streak = profile?.progress.streakDays ?? dashboard?.metrics.streakDays ?? 5;
  const level = profile?.progress.level ?? 2;
  const levelTitle = profile?.progress.title ?? "Technician Apprentice";
  const fraction = profile?.progress.fraction ?? 0.75;
  const needed = profile?.progress.needed ?? 60;

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* ── 1. Learner XP & Streak Hero Card ──────────────────────────────── */}
      <View className="rounded-3xl overflow-hidden mb-5 shadow-lg bg-gray-900">
        <LinearGradient
          colors={["#1e293b", "#0f172a"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="p-5"
        >
          {/* Top Row: User Level & Streak */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2.5">
              <View className="w-10 h-10 rounded-full bg-brand-600/30 border border-brand-500/40 items-center justify-center">
                <Text className="text-xl">🎓</Text>
              </View>
              <View>
                <Text className="text-white font-bold text-base">{user?.name ?? "Staff Member"}</Text>
                <View className="flex-row items-center gap-1.5 mt-0.5">
                  <View className="px-2 py-0.5 rounded-full bg-brand-500/20 border border-brand-400/30">
                    <Text className="text-brand-300 text-[11px] font-semibold">Level {level} · {levelTitle}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Streak Badge */}
            <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30">
              <Flame size={18} color="#f59e0b" />
              <Text className="text-amber-400 font-bold text-sm">{streak} Day Streak</Text>
            </View>
          </View>

          {/* XP Progress Bar */}
          <View className="bg-white/10 p-3.5 rounded-lg border border-white/10">
            <View className="flex-row justify-between items-center mb-2">
              <View className="flex-row items-center gap-1.5">
                <Zap size={15} color="#3b82f6" />
                <Text className="text-gray-300 text-xs font-semibold">XP Progress</Text>
              </View>
              <Text className="text-white text-xs font-bold">{xp} XP <Text className="text-gray-400 font-normal">({needed} to Lv {level + 1})</Text></Text>
            </View>

            <View className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
              <View
                className="h-full bg-brand-500 rounded-full"
                style={{ width: `${Math.min(Math.max(fraction * 100, 8), 100)}%` }}
              />
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* ── 2. Jump Back In / Quick Hero Action ───────────────────────────── */}
      <PressScale
        scaleTo={0.98}
        onPress={() => navTo("/lms/learn")}
        className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm mb-5 flex-row items-center justify-between"
      >
        <View className="flex-row items-center gap-3.5 flex-1">
          <View className="w-12 h-12 rounded-lg bg-emerald-50 items-center justify-center border border-emerald-100">
            <Play size={22} color="#059669" fill="#059669" />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Resume Lesson</Text>
              <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </View>
            <Text className="text-gray-900 font-bold text-base mt-0.5" numberOfLines={1}>
              Hydraulic Brake Bleed & Indexing
            </Text>
            <Text className="text-gray-500 text-xs mt-0.5">Level 2 · 8 mins left</Text>
          </View>
        </View>
        <ChevronRight size={20} color="#9ca3af" />
      </PressScale>

      {/* ── 3. Four Core Feature Grid (2x2) ──────────────────────────────── */}
      <Text className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 px-1">
        Academy Modules
      </Text>

      <View className="flex-row flex-wrap -mx-1.5 mb-5">
        {/* Tile 1: Learning Pathway */}
        <View className="w-1/2 p-1.5">
          <PressScale
            scaleTo={0.96}
            onPress={() => navTo("/lms/learn")}
            className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm min-h-[140px] justify-between"
          >
            <View className="w-11 h-11 rounded-lg bg-blue-50 items-center justify-center border border-blue-100">
              <BookOpen size={22} color="#2563eb" />
            </View>
            <View>
              <Text className="text-gray-900 font-bold text-base">Learning Tree</Text>
              <Text className="text-gray-500 text-xs mt-0.5">Courses & Quizzes</Text>
            </View>
          </PressScale>
        </View>

        {/* Tile 2: Roleplay Practice */}
        <View className="w-1/2 p-1.5">
          <PressScale
            scaleTo={0.96}
            onPress={() => navTo("/lms/practice")}
            className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm min-h-[140px] justify-between"
          >
            <View className="w-11 h-11 rounded-lg bg-purple-50 items-center justify-center border border-purple-100">
              <MessageSquare size={22} color="#9333ea" />
            </View>
            <View>
              <Text className="text-gray-900 font-bold text-base">Roleplay Chat</Text>
              <Text className="text-gray-500 text-xs mt-0.5">Customer Scenarios</Text>
            </View>
          </PressScale>
        </View>

        {/* Tile 3: Bike Specs Pocket Guide */}
        <View className="w-1/2 p-1.5">
          <PressScale
            scaleTo={0.96}
            onPress={() => navTo("/lms/products")}
            className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm min-h-[140px] justify-between"
          >
            <View className="w-11 h-11 rounded-lg bg-amber-50 items-center justify-center border border-amber-100">
              <Wrench size={22} color="#d97706" />
            </View>
            <View>
              <Text className="text-gray-900 font-bold text-base">Bike Specs</Text>
              <Text className="text-gray-500 text-xs mt-0.5">Models & Objections</Text>
            </View>
          </PressScale>
        </View>

        {/* Tile 4: Store Leaderboard */}
        <View className="w-1/2 p-1.5">
          <PressScale
            scaleTo={0.96}
            onPress={() => navTo("/lms/rank")}
            className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm min-h-[140px] justify-between"
          >
            <View className="w-11 h-11 rounded-lg bg-rose-50 items-center justify-center border border-rose-100">
              <Trophy size={22} color="#e11d48" />
            </View>
            <View>
              <Text className="text-gray-900 font-bold text-base">Leaderboard</Text>
              <Text className="text-gray-500 text-xs mt-0.5">Shop Ranks & XP</Text>
            </View>
          </PressScale>
        </View>
      </View>

      {/* ── 4. Daily Workshop Tip ────────────────────────────────────────── */}
      {dashboard?.dailyTip && (
        <View className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-5">
          <View className="flex-row items-center gap-2 mb-1.5">
            <Lightbulb size={18} color="#d97706" />
            <Text className="text-amber-800 font-bold text-sm">{dashboard.dailyTip.title}</Text>
          </View>
          <Text className="text-amber-900 text-xs leading-relaxed">
            {dashboard.dailyTip.content}
          </Text>
        </View>
      )}

      {/* ── 5. Announcements Feed ───────────────────────────────────────── */}
      {dashboard?.announcements && dashboard.announcements.length > 0 && (
        <View className="mb-2">
          <Text className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 px-1">
            Store Bulletins
          </Text>
          {dashboard.announcements.map((ann) => (
            <View key={ann.id} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm mb-2.5">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-gray-900 font-bold text-sm">{ann.title}</Text>
                {ann.priority === "HIGH" || ann.priority === "URGENT" ? (
                  <View className="px-2 py-0.5 rounded-md bg-red-100">
                    <Text className="text-red-700 text-[10px] font-bold">URGENT</Text>
                  </View>
                ) : null}
              </View>
              <Text className="text-gray-600 text-xs leading-relaxed">{ann.content}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
