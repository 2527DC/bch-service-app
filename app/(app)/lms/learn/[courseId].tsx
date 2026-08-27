// Interactive Lesson & Quiz Player with Haptic Feedback
import React, { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Trophy,
  XCircle,
} from "lucide-react-native";
import { useLms, QuizQuestion } from "@/store/lms";
import PressScale from "@/components/PressScale";

export default function CoursePlayerScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const router = useRouter();
  const quizzes = useLms((s) => s.quizzes);
  const courses = useLms((s) => s.courses);
  const submitQuizAttempt = useLms((s) => s.submitQuizAttempt);
  const submitLessonComplete = useLms((s) => s.submitLessonComplete);

  // Find quiz or course
  const quiz = quizzes.find((q) => q.id === courseId) ?? quizzes[0];
  const allCourses = courses.flatMap((l) => l.courses);
  const course = allCourses.find((c) => c.id === courseId);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [answers, setAnswers] = useState<Array<{ questionId: string; selectedOption: number }>>([]);
  const [quizFinished, setQuizFinished] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean; earnedXp: number } | null>(null);

  const questions = quiz?.questions || [];
  const currentQuestion: QuizQuestion | undefined = questions[currentIndex];

  const handleSelectOption = (idx: number) => {
    if (isAnswerSubmitted) return;
    Haptics.selectionAsync().catch(() => {});
    setSelectedOption(idx);
  };

  const handleCheckAnswer = () => {
    if (selectedOption === null || !currentQuestion) return;
    setIsAnswerSubmitted(true);

    const isCorrect = selectedOption === currentQuestion.correctOption;
    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }

    const newAnswers = [...answers, { questionId: currentQuestion.id, selectedOption }];
    setAnswers(newAnswers);
  };

  const handleNext = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
    } else {
      // Finished all questions
      const res = await submitQuizAttempt(quiz.id, answers);
      setResult(res);
      setQuizFinished(true);
      if (res.passed) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    }
  };

  const handleRestart = () => {
    Haptics.selectionAsync().catch(() => {});
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setAnswers([]);
    setQuizFinished(false);
    setResult(null);
  };

  if (quizFinished && result) {
    return (
      <View className="flex-1 bg-gray-50 p-6 justify-center items-center">
        <View className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl w-full max-w-sm items-center">
          <View
            className={`w-20 h-20 rounded-full items-center justify-center mb-4 ${
              result.passed ? "bg-emerald-50 border-2 border-emerald-200" : "bg-red-50 border-2 border-red-200"
            }`}
          >
            {result.passed ? (
              <Trophy size={40} color="#059669" />
            ) : (
              <XCircle size={40} color="#dc2626" />
            )}
          </View>

          <Text className="text-xl font-bold text-gray-900 text-center">
            {result.passed ? "Congratulations!" : "Keep Practicing!"}
          </Text>
          <Text className="text-gray-500 text-xs text-center mt-1">
            {result.passed
              ? "You demonstrated strong mastery of this workshop procedure."
              : "Review the answers below and try again to earn XP."}
          </Text>

          {/* Score Badge */}
          <View className="flex-row items-center gap-4 my-5 py-3 px-6 rounded-2xl bg-gray-50 border border-gray-100">
            <View className="items-center">
              <Text className="text-xs text-gray-400 font-semibold">Your Score</Text>
              <Text className="text-2xl font-bold text-gray-900">{result.score}%</Text>
            </View>
            <View className="w-px h-8 bg-gray-200" />
            <View className="items-center">
              <Text className="text-xs text-gray-400 font-semibold">XP Earned</Text>
              <View className="flex-row items-center gap-1">
                <Sparkles size={16} color="#f59e0b" />
                <Text className="text-2xl font-bold text-amber-600">+{result.earnedXp}</Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View className="w-full gap-2.5">
            <PressScale
              scaleTo={0.97}
              onPress={() => router.back()}
              className="w-full py-3.5 bg-brand-600 rounded-xl items-center shadow-sm"
            >
              <Text className="text-white font-bold text-sm">Return to Pathway</Text>
            </PressScale>

            <PressScale
              scaleTo={0.97}
              onPress={handleRestart}
              className="w-full py-3.5 bg-gray-100 rounded-xl items-center flex-row justify-center gap-2"
            >
              <RotateCcw size={16} color="#4b5563" />
              <Text className="text-gray-700 font-bold text-sm">Retake Quiz</Text>
            </PressScale>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View className="bg-white px-4 pt-3 pb-3 border-b border-gray-100 flex-row items-center justify-between">
        <PressScale scaleTo={0.95} onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={22} color="#1f2937" />
        </PressScale>
        <Text className="font-bold text-gray-800 text-sm" numberOfLines={1}>
          {quiz?.title || course?.title || "Skill Checkpoint"}
        </Text>
        <View className="w-8" />
      </View>

      {/* Progress Bar */}
      <View className="h-1.5 bg-gray-200">
        <View
          className="h-full bg-brand-600 transition-all"
          style={{ width: `${((currentIndex + 1) / (questions.length || 1)) * 100}%` }}
        />
      </View>

      <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 40 }}>
        {currentQuestion ? (
          <View>
            {/* Question Counter */}
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs font-bold uppercase tracking-wider text-brand-600">
                Question {currentIndex + 1} of {questions.length}
              </Text>
              <View className="flex-row items-center gap-1">
                <Sparkles size={14} color="#f59e0b" />
                <Text className="text-amber-600 font-bold text-xs">+{quiz?.xpReward || 40} XP</Text>
              </View>
            </View>

            {/* Question Text */}
            <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-4">
              <Text className="text-gray-900 font-bold text-base leading-relaxed">
                {currentQuestion.question}
              </Text>
            </View>

            {/* Option Pills */}
            <View className="gap-2.5 mb-5">
              {currentQuestion.options.map((optionText, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === currentQuestion.correctOption;

                let borderClass = "border-gray-200 bg-white";
                let textClass = "text-gray-800";

                if (isAnswerSubmitted) {
                  if (isCorrect) {
                    borderClass = "border-emerald-500 bg-emerald-50";
                    textClass = "text-emerald-900 font-bold";
                  } else if (isSelected && !isCorrect) {
                    borderClass = "border-red-500 bg-red-50";
                    textClass = "text-red-900 font-bold";
                  }
                } else if (isSelected) {
                  borderClass = "border-brand-600 bg-brand-50";
                  textClass = "text-brand-900 font-bold";
                }

                return (
                  <PressScale
                    key={idx}
                    scaleTo={0.98}
                    disabled={isAnswerSubmitted}
                    onPress={() => handleSelectOption(idx)}
                    className={`p-4 rounded-2xl border-2 flex-row items-center gap-3 ${borderClass}`}
                  >
                    <View
                      className={`w-7 h-7 rounded-full items-center justify-center border ${
                        isSelected || (isAnswerSubmitted && isCorrect)
                          ? "bg-brand-600 border-brand-600"
                          : "border-gray-300 bg-gray-50"
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          isSelected || (isAnswerSubmitted && isCorrect) ? "text-white" : "text-gray-600"
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </Text>
                    </View>

                    <Text className={`flex-1 text-sm ${textClass}`}>{optionText}</Text>
                  </PressScale>
                );
              })}
            </View>

            {/* Explanation Bottom Box (shown after answer submit) */}
            {isAnswerSubmitted && currentQuestion.explanation && (
              <View className="bg-blue-50 border border-blue-200 p-4 rounded-2xl mb-5">
                <View className="flex-row items-center gap-1.5 mb-1">
                  <HelpCircle size={16} color="#2563eb" />
                  <Text className="text-blue-900 font-bold text-xs">Technical Explanation</Text>
                </View>
                <Text className="text-blue-950 text-xs leading-relaxed">
                  {currentQuestion.explanation}
                </Text>
              </View>
            )}

            {/* Next / Submit Button */}
            {!isAnswerSubmitted ? (
              <PressScale
                scaleTo={0.97}
                disabled={selectedOption === null}
                onPress={handleCheckAnswer}
                className={`py-4 rounded-2xl items-center shadow-sm ${
                  selectedOption !== null ? "bg-brand-600" : "bg-gray-200"
                }`}
              >
                <Text
                  className={`font-bold text-base ${
                    selectedOption !== null ? "text-white" : "text-gray-400"
                  }`}
                >
                  Check Answer
                </Text>
              </PressScale>
            ) : (
              <PressScale
                scaleTo={0.97}
                onPress={handleNext}
                className="py-4 bg-brand-600 rounded-2xl items-center shadow-sm"
              >
                <Text className="text-white font-bold text-base">
                  {currentIndex + 1 < questions.length ? "Next Question" : "Complete Quiz"}
                </Text>
              </PressScale>
            )}
          </View>
        ) : (
          <Text className="text-center text-gray-500 py-10">No questions found for this module.</Text>
        )}
      </ScrollView>
    </View>
  );
}
