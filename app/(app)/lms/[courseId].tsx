// COURSE DETAIL — lesson list with tap-to-complete, wired to mockApi.toggleLesson.
import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  ArrowLeft, BookOpen, CheckCircle2, Circle, PlayCircle, Wrench,
} from "lucide-react-native";
import * as mockApi from "@/services/mockApi";
import type { Course, Lesson } from "@/mock/types";
import { useSession } from "@/store/session";
import { useData } from "@/store/data";
import { fmtTat } from "@/lib/format";
import { BRAND, NEUTRAL } from "@/lib/theme";
import BouncingEmoji from "@/components/BouncingEmoji";
import EmptyState from "@/components/EmptyState";
import PressScale from "@/components/PressScale";

const KIND_ICON = {
  VIDEO: PlayCircle,
  READING: BookOpen,
  PRACTICAL: Wrench,
} as const;

const KIND_LABEL: Record<Lesson["kind"], string> = {
  VIDEO: "Video",
  READING: "Reading",
  PRACTICAL: "Practical",
};

export default function CourseDetailScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const router = useRouter();
  const user = useSession((s) => s.user);
  const showToast = useData((s) => s.showToast);

  const [course, setCourse] = useState<Course | null>(null);
  const [completed, setCompleted] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const [courses, progress] = await Promise.all([
      mockApi.getCourses(),
      mockApi.getProgress(user.id),
    ]);
    setCourse(courses.find((c) => c.id === courseId) ?? null);
    setCompleted(progress.find((p) => p.courseId === courseId)?.completedLessonIds ?? []);
    setLoading(false);
  }, [courseId, user]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (lesson: Lesson) => {
    if (!user || !course || saving) return;
    setSaving(lesson.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    const wasDone = completed.includes(lesson.id);
    try {
      const row = await mockApi.toggleLesson(user.id, course.id, lesson.id);
      setCompleted(row.completedLessonIds);
      if (!wasDone && row.completedLessonIds.length >= course.lessons.length) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        showToast(`🎓 ${course.title} completed`);
      }
    } catch {
      showToast("Could not save — try again");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <BouncingEmoji emoji="📚" size={48} caption="Loading course..." />
      </View>
    );
  }

  if (!course) {
    return (
      <View className="flex-1 bg-gray-50">
        <EmptyState emoji="🤷" message="Course not found" />
      </View>
    );
  }

  const pct = Math.round((completed.length / course.lessons.length) * 100);
  const totalMins = course.lessons.reduce((sum, l) => sum + l.durationMins, 0);
  const remainingMins = course.lessons
    .filter((l) => !completed.includes(l.id))
    .reduce((sum, l) => sum + l.durationMins, 0);

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

        <View className="flex-row items-start gap-3 mt-1">
          <Text className="text-4xl">{course.emoji}</Text>
          <View className="flex-1">
            <Text className="text-xl font-bold text-gray-900 leading-tight">{course.title}</Text>
            <Text className="text-gray-500 text-sm mt-1.5 leading-snug">{course.description}</Text>
            <Text className="text-gray-400 text-xs mt-2">
              {course.lessons.length} lessons · {fmtTat(totalMins)} total
            </Text>
          </View>
        </View>

        {/* Progress */}
        <View className="mt-4">
          <View className="flex-row items-center justify-between mb-1.5">
            <Text className="text-xs text-gray-500">
              {completed.length} of {course.lessons.length} complete
            </Text>
            <Text className={`text-xs font-bold ${pct === 100 ? "text-green-600" : "text-brand-600"}`}>
              {pct}%
            </Text>
          </View>
          <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <View
              className={`h-full rounded-full ${pct === 100 ? "bg-green-500" : "bg-brand-600"}`}
              style={{ width: `${pct}%` }}
            />
          </View>
          {pct < 100 && (
            <Text className="text-gray-400 text-[11px] mt-1.5">
              {fmtTat(remainingMins)} of training left
            </Text>
          )}
        </View>
      </View>

      {/* Lessons */}
      <Text className="px-5 pt-5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        Lessons
      </Text>
      <View className="bg-white border-y border-gray-100">
        {course.lessons.map((lesson, idx) => {
          const done = completed.includes(lesson.id);
          const KindIcon = KIND_ICON[lesson.kind];
          const busy = saving === lesson.id;

          return (
            <PressScale
              key={lesson.id}
              scaleTo={0.99}
              onPress={() => toggle(lesson)}
              disabled={busy}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: done }}
              accessibilityLabel={`${lesson.title}, ${done ? "completed" : "not completed"}`}
              className={`flex-row items-start gap-3 px-4 py-3.5 min-h-[56px] ${
                idx < course.lessons.length - 1 ? "border-b border-gray-50" : ""
              } ${busy ? "opacity-50" : ""}`}
            >
              {done ? (
                <CheckCircle2 size={22} color="#16a34a" />
              ) : (
                <Circle size={22} color={NEUTRAL[400]} />
              )}

              <View className="flex-1">
                <Text
                  className={`text-[15px] font-semibold leading-tight ${
                    done ? "text-gray-400 line-through" : "text-gray-800"
                  }`}
                >
                  {lesson.title}
                </Text>
                <Text className="text-gray-500 text-xs mt-1 leading-snug">{lesson.summary}</Text>
                <View className="flex-row items-center gap-1.5 mt-2">
                  <KindIcon size={13} color={done ? NEUTRAL[400] : BRAND[600]} />
                  <Text className="text-gray-400 text-[11px]">
                    {KIND_LABEL[lesson.kind]} · {lesson.durationMins} min
                  </Text>
                </View>
              </View>
            </PressScale>
          );
        })}
      </View>

      <Text className="px-5 pt-4 text-gray-400 text-[11px]">
        Tap a lesson to mark it complete.
      </Text>
    </ScrollView>
  );
}
