// Promised delivery / pickup status banner — overdue / due-today / ready / N days left
import React, { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { formatDayMonth } from "../../lib/format";
import type { Job } from "../../mock/types";

function PulseView({ className, children }: { className?: string; children: React.ReactNode }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0, { duration: 700 })), -1);
  }, [v]);
  const style = useAnimatedStyle(() => ({ opacity: 1 - 0.4 * v.value }));
  return (
    <Animated.View style={style} className={className}>
      {children}
    </Animated.View>
  );
}

export default function DueBadge({ job }: { job: Job }) {
  if (!job.promisedAt || job.status === "DELIVERED") return null;

  const promised = new Date(job.promisedAt);
  const now = new Date();
  const todayStart = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  todayStart.setHours(0, 0, 0, 0);
  const promisedDay = new Date(promised.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  promisedDay.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((promisedDay.getTime() - todayStart.getTime()) / 86400000);
  const isOverdue = diffDays < 0;
  const isDueToday = diffDays === 0;
  const dateStr = formatDayMonth(promised);
  const absDays = Math.abs(diffDays);

  // READY + overdue = client hasn't picked up
  if (job.status === "READY" && isOverdue) {
    return (
      <View className="bg-purple-600 rounded-lg px-3 py-2 mb-2 flex-row items-center justify-between">
        <Text className="text-sm font-black text-white flex-1">
          📞 Not picked up — {absDays} day{absDays > 1 ? "s" : ""} past due
        </Text>
        <Text className="text-sm font-bold text-white">Due: {dateStr}</Text>
      </View>
    );
  }

  // READY + due today = ready for pickup today
  if (job.status === "READY" && isDueToday) {
    return (
      <View className="bg-green-600 rounded-lg px-3 py-2 mb-2 flex-row items-center justify-between">
        <Text className="text-sm font-black text-white">✅ Ready — pickup due today</Text>
        <Text className="text-sm font-bold text-white">{dateStr}</Text>
      </View>
    );
  }

  // Pending/Hold + overdue = work not done, past deadline
  if (isOverdue) {
    return (
      <PulseView className="bg-red-600 rounded-lg px-3 py-2 mb-2 flex-row items-center justify-between">
        <Text className="text-sm font-black text-white">
          🚨 OVERDUE by {absDays} day{absDays > 1 ? "s" : ""}
        </Text>
        <Text className="text-sm font-bold text-white">Due: {dateStr}</Text>
      </PulseView>
    );
  }

  if (isDueToday) {
    return (
      <View className="bg-orange-500 rounded-lg px-3 py-2 mb-2 flex-row items-center justify-between">
        <Text className="text-sm font-black text-white">⚠️ DUE TODAY</Text>
        <Text className="text-sm font-bold text-white">{dateStr}</Text>
      </View>
    );
  }

  return (
    <View className="bg-blue-50 rounded-lg px-3 py-2 mb-2 flex-row items-center justify-between">
      <Text className="text-sm font-bold text-blue-700">📅 Due: {dateStr}</Text>
      <Text className="text-xs text-blue-500">{diffDays} day{diffDays > 1 ? "s" : ""} left</Text>
    </View>
  );
}
