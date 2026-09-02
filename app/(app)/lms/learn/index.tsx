// Staff Academy — Learning Pathway & Course Tree
import React, { useEffect, useState } from "react";
import { FlatList, RefreshControl, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  HelpCircle,
  Lock,
  Play,
  Sparkles,
} from "lucide-react-native";
import { useLms, CourseLevel } from "@/store/lms";
import PressScale from "@/components/PressScale";
import SearchBar from "@/components/SearchBar";

export default function LearningPathwayScreen() {
  const router = useRouter();
  const courses = useLms((s) => s.courses);
  const fetchCourses = useLms((s) => s.fetchCourses);
  const quizzes = useLms((s) => s.quizzes);
  const fetchQuizzes = useLms((s) => s.fetchQuizzes);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"COURSES" | "QUIZZES">("COURSES");

  const load = async () => {
    await Promise.all([fetchCourses(), fetchQuizzes()]);
  };

  useEffect(() => {
    load();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await load();
    setRefreshing(false);
  };

  const openCourse = (courseId: string) => {
    Haptics.selectionAsync().catch(() => {});
    router.push(`/lms/learn/${courseId}` as never);
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* ── Top Header / Tabs ────────────────────────────────────────────── */}
      <View className="bg-white px-4 pt-3 pb-3 border-b border-gray-100 shadow-sm">
        <View className="flex-row bg-gray-100 p-1 rounded-lg mb-3">
          <PressScale
            scaleTo={0.97}
            onPress={() => { setActiveTab("COURSES"); Haptics.selectionAsync().catch(() => {}); }}
            className={`flex-1 py-2 items-center rounded-lg ${activeTab === "COURSES" ? "bg-white shadow-sm" : ""}`}
          >
            <Text className={`text-xs font-bold ${activeTab === "COURSES" ? "text-brand-700" : "text-gray-500"}`}>
              Course Pathway
            </Text>
          </PressScale>
          <PressScale
            scaleTo={0.97}
            onPress={() => { setActiveTab("QUIZZES"); Haptics.selectionAsync().catch(() => {}); }}
            className={`flex-1 py-2 items-center rounded-lg ${activeTab === "QUIZZES" ? "bg-white shadow-sm" : ""}`}
          >
            <Text className={`text-xs font-bold ${activeTab === "QUIZZES" ? "text-brand-700" : "text-gray-500"}`}>
              Skill Quizzes ({quizzes.length})
            </Text>
          </PressScale>
        </View>

        <SearchBar value={search} onChangeText={setSearch} placeholder="Search lessons, gears, brakes..." />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === "COURSES" ? (
          /* ── Pathway Tree View ────────────────────────────────────────── */
          <View>
            {courses.map((level, lvlIdx) => (
              <View key={level.id} className="mb-6">
                {/* Level Title Node */}
                <View className="flex-row items-center gap-2.5 mb-3">
                  <View className="w-8 h-8 rounded-full bg-brand-600 items-center justify-center shadow-sm">
                    <Text className="text-white font-bold text-xs">{level.levelNumber}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-bold text-base">{level.name}</Text>
                    {level.description ? (
                      <Text className="text-gray-500 text-xs">{level.description}</Text>
                    ) : null}
                  </View>
                </View>

                {/* Course Nodes within this Level */}
                <View className="ml-4 pl-4 border-l-2 border-brand-100 gap-3">
                  {level.courses
                    .filter((c) => !search || c.title.toLowerCase().includes(search.toLowerCase()))
                    .map((course) => (
                      <PressScale
                        key={course.id}
                        scaleTo={0.98}
                        onPress={() => openCourse(course.id)}
                        className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm"
                      >
                        <View className="flex-row items-start justify-between">
                          <View className="flex-1 pr-2">
                            <View className="flex-row items-center gap-2 mb-1">
                              {course.completed ? (
                                <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                                  <CheckCircle2 size={12} color="#059669" />
                                  <Text className="text-emerald-700 text-[10px] font-bold">Completed</Text>
                                </View>
                              ) : (
                                <View className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200">
                                  <Text className="text-brand-700 text-[10px] font-bold">{course.category}</Text>
                                </View>
                              )}
                              <Text className="text-gray-400 text-xs">· {course.level}</Text>
                            </View>

                            <Text className="text-gray-900 font-bold text-sm leading-snug">{course.title}</Text>
                            <Text className="text-gray-500 text-xs mt-1" numberOfLines={2}>{course.description}</Text>

                            <View className="flex-row items-center gap-3 mt-3">
                              <View className="flex-row items-center gap-1">
                                <Clock size={13} color="#6b7280" />
                                <Text className="text-gray-500 text-[11px]">{course.durationMinutes} mins</Text>
                              </View>
                              <View className="flex-row items-center gap-1">
                                <Sparkles size={13} color="#f59e0b" />
                                <Text className="text-amber-600 font-semibold text-[11px]">+{course.xpReward || 50} XP</Text>
                              </View>
                            </View>
                          </View>

                          <View className="w-8 h-8 rounded-full bg-gray-50 items-center justify-center border border-gray-100">
                            <ChevronRight size={18} color="#9ca3af" />
                          </View>
                        </View>
                      </PressScale>
                    ))}
                </View>
              </View>
            ))}
          </View>
        ) : (
          /* ── Skill Quizzes List ───────────────────────────────────────── */
          <View className="gap-3">
            {quizzes
              .filter((q) => !search || q.title.toLowerCase().includes(search.toLowerCase()))
              .map((quiz) => (
                <PressScale
                  key={quiz.id}
                  scaleTo={0.98}
                  onPress={() => openCourse(quiz.id)}
                  className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm"
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-3">
                      <View className="flex-row items-center gap-2 mb-1">
                        <View className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200">
                          <Text className="text-amber-700 text-[10px] font-bold">Quiz · {quiz.questions.length} Questions</Text>
                        </View>
                        <Text className="text-gray-400 text-xs">Pass: {quiz.passPercentage}%</Text>
                      </View>

                      <Text className="text-gray-900 font-bold text-base leading-snug">{quiz.title}</Text>
                      <Text className="text-gray-500 text-xs mt-1 leading-relaxed">{quiz.description}</Text>

                      <View className="flex-row items-center gap-1.5 mt-3">
                        <Sparkles size={14} color="#f59e0b" />
                        <Text className="text-amber-600 font-bold text-xs">Reward: +{quiz.xpReward} XP</Text>
                      </View>
                    </View>

                    <View className="w-10 h-10 rounded-lg bg-brand-50 items-center justify-center border border-brand-100">
                      <Play size={18} color="#2563eb" fill="#2563eb" />
                    </View>
                  </View>
                </PressScale>
              ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
