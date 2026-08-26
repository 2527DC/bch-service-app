// STAFF DETAIL — contact, shift, skills, live workload, training progress.
import React, { useCallback, useEffect, useState } from "react";
import { Linking, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Mail, Phone, CalendarDays, Clock } from "lucide-react-native";
import * as mockApi from "@/services/mockApi";
import type { Course, CourseProgress, StaffMember } from "@/mock/types";
import { formatDayMonth } from "@/lib/format";
import { BRAND, NEUTRAL } from "@/lib/theme";
import BouncingEmoji from "@/components/BouncingEmoji";
import EmptyState from "@/components/EmptyState";
import PressScale from "@/components/PressScale";

const SHIFT_LABEL: Record<StaffMember["shift"], string> = {
  MORNING: "Morning (9am - 2pm)",
  EVENING: "Evening (2pm - 9pm)",
  FULL: "Full day (9am - 9pm)",
};

const initials = (name: string) => name.trim().slice(0, 2).toUpperCase();

export default function StaffDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [member, setMember] = useState<StaffMember | null>(null);
  const [workload, setWorkload] = useState({ open: 0, deliveredToday: 0 });
  const [courses, setCourses] = useState<Course[]>([]);
  const [progress, setProgress] = useState<CourseProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [staff, w, c] = await Promise.all([
      mockApi.getStaff(),
      mockApi.getStaffWorkload(),
      mockApi.getCourses(),
    ]);
    const found = staff.find((s) => s.id === id) ?? null;
    setMember(found);
    setWorkload(w[id] ?? { open: 0, deliveredToday: 0 });
    setCourses(c);
    if (found) setProgress(await mockApi.getProgress(found.id));
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <BouncingEmoji emoji="👤" size={48} caption="Loading..." />
      </View>
    );
  }

  if (!member) {
    return (
      <View className="flex-1 bg-gray-50">
        <EmptyState emoji="🤷" message="Staff member not found" />
      </View>
    );
  }

  // Courses this role must complete, with how far they have got.
  const required = courses.filter((c) => c.requiredFor.includes(member.role));

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Header */}
      <View className="bg-white px-4 pt-3 pb-5 border-b border-gray-100">
        <PressScale
          scaleTo={0.94}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          className="w-11 h-11 -ml-2 items-center justify-center rounded-full"
        >
          <ArrowLeft size={22} color={NEUTRAL[800]} />
        </PressScale>

        <View className="items-center mt-1">
          <View className="w-20 h-20 rounded-full bg-brand-600 items-center justify-center">
            <Text className="text-white font-bold text-2xl">{initials(member.name)}</Text>
          </View>
          <Text className="mt-3 text-2xl font-bold text-gray-900">{member.name}</Text>
          <View className="flex-row items-center gap-2 mt-1.5">
            <View className="px-2.5 py-1 rounded-full bg-brand-50">
              <Text className="text-brand-700 text-[11px] font-semibold">{member.role}</Text>
            </View>
            <View className={`px-2.5 py-1 rounded-full ${member.active ? "bg-green-50" : "bg-gray-100"}`}>
              <Text className={`text-[11px] font-semibold ${member.active ? "text-green-700" : "text-gray-500"}`}>
                {member.active ? "Active" : "Inactive"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Workload */}
      <View className="flex-row gap-3 px-4 mt-4">
        <View className="flex-1 bg-white rounded-2xl border border-gray-100 p-4 items-center">
          <Text className="text-3xl font-bold text-brand-600">{workload.open}</Text>
          <Text className="text-gray-400 text-xs mt-1">Open jobs</Text>
        </View>
        <View className="flex-1 bg-white rounded-2xl border border-gray-100 p-4 items-center">
          <Text className="text-3xl font-bold text-green-600">{workload.deliveredToday}</Text>
          <Text className="text-gray-400 text-xs mt-1">Delivered today</Text>
        </View>
      </View>

      {/* Contact */}
      <Text className="px-5 pt-6 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        Contact
      </Text>
      <View className="bg-white border-y border-gray-100">
        <PressScale
          scaleTo={0.99}
          onPress={() => Linking.openURL(`tel:${member.phone.replace(/\s/g, "")}`)}
          className="flex-row items-center gap-3 px-4 min-h-[56px] border-b border-gray-50"
        >
          <Phone size={18} color={BRAND[600]} />
          <View className="flex-1">
            <Text className="text-[11px] text-gray-400">Phone</Text>
            <Text className="text-[15px] font-semibold text-gray-800">{member.phone}</Text>
          </View>
        </PressScale>
        <View className="flex-row items-center gap-3 px-4 min-h-[56px] border-b border-gray-50">
          <Mail size={18} color={NEUTRAL[500]} />
          <View className="flex-1">
            <Text className="text-[11px] text-gray-400">Email</Text>
            <Text className="text-[15px] font-semibold text-gray-800">{member.email}</Text>
          </View>
        </View>
        <View className="flex-row items-center gap-3 px-4 min-h-[56px] border-b border-gray-50">
          <Clock size={18} color={NEUTRAL[500]} />
          <View className="flex-1">
            <Text className="text-[11px] text-gray-400">Shift</Text>
            <Text className="text-[15px] font-semibold text-gray-800">{SHIFT_LABEL[member.shift]}</Text>
          </View>
        </View>
        <View className="flex-row items-center gap-3 px-4 min-h-[56px]">
          <CalendarDays size={18} color={NEUTRAL[500]} />
          <View className="flex-1">
            <Text className="text-[11px] text-gray-400">Joined</Text>
            <Text className="text-[15px] font-semibold text-gray-800">{formatDayMonth(member.joinedAt)}</Text>
          </View>
        </View>
      </View>

      {/* Skills */}
      <Text className="px-5 pt-6 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        Skills
      </Text>
      <View className="flex-row flex-wrap gap-2 px-4">
        {member.skills.map((s) => (
          <View key={s} className="px-3 py-1.5 rounded-full bg-white border border-gray-200">
            <Text className="text-gray-700 text-xs font-medium">{s}</Text>
          </View>
        ))}
      </View>

      {/* Training */}
      <Text className="px-5 pt-6 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        Required training
      </Text>
      <View className="bg-white border-y border-gray-100">
        {required.length === 0 ? (
          <Text className="px-4 py-5 text-gray-400 text-sm">No mandatory courses for this role.</Text>
        ) : (
          required.map((c) => {
            const done = progress.find((p) => p.courseId === c.id)?.completedLessonIds.length ?? 0;
            const pct = Math.round((done / c.lessons.length) * 100);
            return (
              <View key={c.id} className="px-4 py-3.5 border-b border-gray-50">
                <View className="flex-row items-center justify-between">
                  <Text className="text-[15px] font-semibold text-gray-800 flex-1 pr-3" numberOfLines={1}>
                    {c.title}
                  </Text>
                  <Text className={`text-xs font-bold ${pct === 100 ? "text-green-600" : "text-gray-400"}`}>
                    {pct}%
                  </Text>
                </View>
                <View className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                  <View
                    className={`h-full rounded-full ${pct === 100 ? "bg-green-500" : "bg-brand-600"}`}
                    style={{ width: `${pct}%` }}
                  />
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
