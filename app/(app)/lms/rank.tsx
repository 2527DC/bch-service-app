// Store-wide Leaderboard & Rank — Mobile Native Experience
import React, { useEffect } from "react";
import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Flame, Medal, Sparkles, Trophy, Zap } from "lucide-react-native";
import { useLms, LeaderboardRank } from "@/store/lms";
import { useSession } from "@/store/session";
import PressScale from "@/components/PressScale";

const MEDAL_COLORS = {
  1: { bg: "bg-amber-400", border: "border-amber-300", text: "text-amber-950", medal: "🥇" },
  2: { bg: "bg-slate-300", border: "border-slate-200", text: "text-slate-900", medal: "🥈" },
  3: { bg: "bg-amber-600", border: "border-amber-500", text: "text-amber-100", medal: "🥉" },
};

export default function LeaderboardScreen() {
  const router = useRouter();
  const user = useSession((s) => s.user);
  const leaderboard = useLms((s) => s.leaderboard);
  const fetchLeaderboard = useLms((s) => s.fetchLeaderboard);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  const myRank = leaderboard.find((r) => r.name === user?.name) || leaderboard[0];

  return (
    <View className="flex-1 bg-gray-50">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View className="bg-white px-4 pt-3 pb-3 border-b border-gray-100 flex-row items-center justify-between shadow-sm">
        <View className="flex-row items-center gap-2">
          <View className="w-8 h-8 rounded-full bg-rose-50 items-center justify-center border border-rose-100">
            <Trophy size={18} color="#e11d48" />
          </View>
          <Text className="font-bold text-gray-900 text-base">Store XP Leaderboard</Text>
        </View>
        <View className="px-2.5 py-1 rounded-full bg-brand-50 border border-brand-200">
          <Text className="text-brand-700 text-[11px] font-bold">This Week</Text>
        </View>
      </View>

      <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* ── Top 3 Podium Showcase ─────────────────────────────────────── */}
        <View className="bg-gray-900 rounded-3xl p-5 mb-5 shadow-lg">
          <Text className="text-center text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">
            Top Performing Technicians
          </Text>

          <View className="flex-row items-end justify-center gap-2.5">
            {/* Rank 2 (Left) */}
            {top3[1] && (
              <View className="items-center flex-1">
                <View className="w-12 h-12 rounded-full bg-slate-700 items-center justify-center border-2 border-slate-400 mb-1.5">
                  <Text className="text-2xl">{top3[1].emoji}</Text>
                </View>
                <Text className="text-white text-xs font-bold text-center" numberOfLines={1}>
                  {top3[1].name.split(" ")[0]}
                </Text>
                <Text className="text-gray-400 text-[10px]">{top3[1].xp} XP</Text>
                <View className="h-16 w-full bg-slate-800 rounded-t-xl mt-2 items-center justify-center border-t border-slate-600">
                  <Text className="text-xl">🥈</Text>
                  <Text className="text-slate-300 text-[10px] font-bold">#2</Text>
                </View>
              </View>
            )}

            {/* Rank 1 (Center - Tallest) */}
            {top3[0] && (
              <View className="items-center flex-1">
                <View className="w-16 h-16 rounded-full bg-amber-500/30 items-center justify-center border-2 border-amber-400 mb-1.5 shadow-lg">
                  <Text className="text-3xl">{top3[0].emoji}</Text>
                </View>
                <Text className="text-amber-300 text-sm font-extrabold text-center" numberOfLines={1}>
                  {top3[0].name.split(" ")[0]}
                </Text>
                <Text className="text-amber-400 text-xs font-semibold">{top3[0].xp} XP</Text>
                <View className="h-24 w-full bg-amber-500 rounded-t-2xl mt-2 items-center justify-center border-t-2 border-amber-400 opacity-90">
                  <Text className="text-2xl">🥇</Text>
                  <Text className="text-amber-300 text-xs font-bold">#1 Leader</Text>
                </View>
              </View>
            )}

            {/* Rank 3 (Right) */}
            {top3[2] && (
              <View className="items-center flex-1">
                <View className="w-12 h-12 rounded-full bg-amber-950 items-center justify-center border-2 border-amber-600 mb-1.5">
                  <Text className="text-2xl">{top3[2].emoji}</Text>
                </View>
                <Text className="text-white text-xs font-bold text-center" numberOfLines={1}>
                  {top3[2].name.split(" ")[0]}
                </Text>
                <Text className="text-gray-400 text-[10px]">{top3[2].xp} XP</Text>
                <View className="h-12 w-full bg-amber-950 rounded-t-xl mt-2 items-center justify-center border-t border-amber-700">
                  <Text className="text-xl">🥉</Text>
                  <Text className="text-amber-500 text-[10px] font-bold">#3</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* ── Full Roster Ranks ─────────────────────────────────────────── */}
        <Text className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 px-1">
          Store Standings
        </Text>

        <View className="gap-2.5">
          {leaderboard.map((item, idx) => {
            const isMe = item.name === user?.name;

            return (
              <View
                key={item.id}
                className={`p-4 rounded-2xl flex-row items-center justify-between border ${
                  isMe ? "bg-brand-50 border-brand-300 shadow-sm" : "bg-white border-gray-100 shadow-sm"
                }`}
              >
                <View className="flex-row items-center gap-3">
                  <Text className="text-gray-400 font-extrabold text-sm w-6 text-center">
                    #{idx + 1}
                  </Text>

                  <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center">
                    <Text className="text-lg">{item.emoji}</Text>
                  </View>

                  <View>
                    <View className="flex-row items-center gap-1.5">
                      <Text className="font-bold text-gray-900 text-sm">{item.name}</Text>
                      {isMe && (
                        <View className="px-1.5 py-0.2 rounded bg-brand-600">
                          <Text className="text-white text-[9px] font-bold">YOU</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-gray-400 text-xs">Level {item.level} · {item.role}</Text>
                  </View>
                </View>

                <View className="items-end">
                  <View className="flex-row items-center gap-1">
                    <Sparkles size={13} color="#f59e0b" />
                    <Text className="text-gray-900 font-extrabold text-sm">{item.xp} XP</Text>
                  </View>
                  <View className="flex-row items-center gap-1 mt-0.5">
                    <Flame size={12} color="#f59e0b" />
                    <Text className="text-gray-500 text-[11px]">{item.streakDays}d streak</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* ── Sticky "Your Rank" Bottom Banner ──────────────────────────────── */}
      {myRank && (
        <View className="absolute bottom-4 left-4 right-4 bg-gray-900 p-4 rounded-3xl shadow-2xl flex-row items-center justify-between border border-gray-800">
          <View className="flex-row items-center gap-3">
            <View className="w-9 h-9 rounded-full bg-brand-600 items-center justify-center">
              <Text className="text-base">{myRank.emoji}</Text>
            </View>
            <View>
              <Text className="text-white font-bold text-sm">Your Current Rank: #{myRank.rank}</Text>
              <Text className="text-gray-400 text-xs">Level {myRank.level} · {myRank.xp} XP</Text>
            </View>
          </View>

          <View className="px-3 py-1.5 rounded-xl bg-brand-500/20 border border-brand-400/30">
            <Text className="text-brand-300 font-bold text-xs">Active</Text>
          </View>
        </View>
      )}
    </View>
  );
}
