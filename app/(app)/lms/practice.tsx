// Customer Roleplay & Sales Simulation — Mobile Native Experience
import React, { useEffect, useState } from "react";
import { Alert, FlatList, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  MessageCircle,
  MessageSquare,
  RotateCcw,
  Sparkles,
  Swords,
  Trophy,
  UserCheck,
  Zap,
} from "lucide-react-native";
import { useLms, PlaybookScenario } from "@/store/lms";
import PressScale from "@/components/PressScale";

export default function RoleplayPracticeScreen() {
  const router = useRouter();
  const playbooks = useLms((s) => s.playbooks);
  const fetchPlaybooks = useLms((s) => s.fetchPlaybooks);

  const [activeScenario, setActiveScenario] = useState<PlaybookScenario | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [dialogueHistory, setDialogueHistory] = useState<
    Array<{ speaker: "customer" | "mechanic"; message: string; feedback?: string }>
  >([]);
  const [totalScore, setTotalScore] = useState(0);
  const [simulationCompleted, setSimulationCompleted] = useState(false);

  useEffect(() => {
    fetchPlaybooks();
  }, []);

  const startScenario = (scenario: PlaybookScenario) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setActiveScenario(scenario);
    setCurrentStepIndex(0);
    setTotalScore(0);
    setSimulationCompleted(false);

    // Initial customer dialogue
    const firstStep = scenario.dialogueSteps[0];
    if (firstStep) {
      setDialogueHistory([{ speaker: firstStep.speaker, message: firstStep.message }]);
    }
  };

  const handleSelectOption = (option: { text: string; score: number; feedback: string }) => {
    if (!activeScenario) return;

    if (option.score > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }

    setTotalScore((prev) => prev + option.score);

    // Add mechanic reply to dialogue history
    const updatedHistory = [
      ...dialogueHistory,
      { speaker: "mechanic" as const, message: option.text, feedback: option.feedback },
    ];
    setDialogueHistory(updatedHistory);

    // Check if there are more steps
    const nextStepIdx = currentStepIndex + 2; // Steps go Customer (0) -> Mechanic (1) -> Customer (2)...
    if (nextStepIdx < activeScenario.dialogueSteps.length) {
      setCurrentStepIndex(nextStepIdx);
      const nextCustomerStep = activeScenario.dialogueSteps[nextStepIdx];
      if (nextCustomerStep) {
        setTimeout(() => {
          setDialogueHistory((prev) => [
            ...prev,
            { speaker: "customer", message: nextCustomerStep.message },
          ]);
        }, 500);
      }
    } else {
      setTimeout(() => {
        setSimulationCompleted(true);
      }, 700);
    }
  };

  const currentMechanicStep = activeScenario?.dialogueSteps[currentStepIndex + 1];

  return (
    <View className="flex-1 bg-gray-50">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View className="bg-white px-4 pt-3 pb-3 border-b border-gray-100 flex-row items-center justify-between shadow-sm">
        {activeScenario ? (
          <PressScale
            scaleTo={0.95}
            onPress={() => setActiveScenario(null)}
            className="flex-row items-center gap-1.5 p-1"
          >
            <ArrowLeft size={20} color="#1f2937" />
            <Text className="font-bold text-gray-800 text-sm">Scenarios</Text>
          </PressScale>
        ) : (
          <View className="flex-row items-center gap-2">
            <View className="w-8 h-8 rounded-full bg-purple-50 items-center justify-center border border-purple-100">
              <Swords size={18} color="#9333ea" />
            </View>
            <Text className="font-bold text-gray-900 text-base">Roleplay Simulations</Text>
          </View>
        )}
        <View className="flex-row items-center gap-1">
          <Sparkles size={14} color="#f59e0b" />
          <Text className="text-amber-600 font-bold text-xs">+60 XP / Scenario</Text>
        </View>
      </View>

      {!activeScenario ? (
        /* ── Scenario Selection List ─────────────────────────────────────── */
        <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 40 }}>
          <Text className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 px-1">
            Choose a Customer Simulation
          </Text>

          <View className="gap-3.5">
            {playbooks.map((sc) => (
              <PressScale
                key={sc.id}
                scaleTo={0.98}
                onPress={() => startScenario(sc)}
                className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm"
              >
                {/* Persona Header */}
                <View className="flex-row items-center justify-between mb-2.5">
                  <View className="flex-row items-center gap-2">
                    <View className="w-8 h-8 rounded-full bg-purple-100 items-center justify-center">
                      <Text className="text-sm font-bold text-purple-700">
                        {sc.customerPersona.name.charAt(0)}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-gray-900 font-bold text-sm">{sc.customerPersona.name}</Text>
                      <Text className="text-gray-400 text-[11px]">{sc.customerPersona.role}</Text>
                    </View>
                  </View>

                  <View className="px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200">
                    <Text className="text-purple-700 text-[11px] font-semibold">
                      Mood: {sc.customerPersona.mood}
                    </Text>
                  </View>
                </View>

                {/* Scenario Title & Pain Point */}
                <Text className="text-gray-900 font-bold text-base leading-snug">{sc.title}</Text>
                <Text className="text-gray-500 text-xs mt-1.5 leading-relaxed">{sc.description}</Text>

                {/* Budget & Reward Tag */}
                <View className="flex-row items-center justify-between mt-4 pt-3 border-t border-gray-100">
                  <Text className="text-gray-400 text-xs">Budget: {sc.customerPersona.budget}</Text>
                  <View className="flex-row items-center gap-1.5 px-3 py-1 bg-brand-50 rounded-lg">
                    <Text className="text-brand-700 font-bold text-xs">Start Roleplay</Text>
                  </View>
                </View>
              </PressScale>
            ))}
          </View>
        </ScrollView>
      ) : simulationCompleted ? (
        /* ── Completion Scorecard ────────────────────────────────────────── */
        <View className="flex-1 p-6 justify-center items-center">
          <View className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl w-full max-w-sm items-center">
            <View className="w-20 h-20 rounded-full bg-purple-50 border-2 border-purple-200 items-center justify-center mb-4">
              <Trophy size={40} color="#9333ea" />
            </View>

            <Text className="text-xl font-bold text-gray-900 text-center">Simulation Completed!</Text>
            <Text className="text-gray-500 text-xs text-center mt-1">
              You successfully addressed the customer's objection with objective technical explanations.
            </Text>

            <View className="flex-row items-center gap-4 my-5 py-3 px-6 rounded-lg bg-gray-50 border border-gray-100">
              <View className="items-center">
                <Text className="text-xs text-gray-400 font-semibold">Handling Score</Text>
                <Text className="text-2xl font-bold text-purple-700">{Math.max(totalScore, 10)} / 10</Text>
              </View>
              <View className="w-px h-8 bg-gray-200" />
              <View className="items-center">
                <Text className="text-xs text-gray-400 font-semibold">XP Earned</Text>
                <View className="flex-row items-center gap-1">
                  <Sparkles size={16} color="#f59e0b" />
                  <Text className="text-2xl font-bold text-amber-600">+{activeScenario.xpReward} XP</Text>
                </View>
              </View>
            </View>

            <PressScale
              scaleTo={0.97}
              onPress={() => setActiveScenario(null)}
              className="w-full py-3.5 bg-brand-600 rounded-lg items-center shadow-sm"
            >
              <Text className="text-white font-bold text-sm">Choose Another Scenario</Text>
            </PressScale>
          </View>
        </View>
      ) : (
        /* ── Active Chat Roleplay Stream ─────────────────────────────────── */
        <View className="flex-1">
          {/* Customer Persona Info Pill */}
          <View className="bg-purple-50 px-4 py-2.5 border-b border-purple-100 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <UserCheck size={16} color="#9333ea" />
              <Text className="text-purple-950 font-bold text-xs">
                {activeScenario.customerPersona.name} · {activeScenario.customerPersona.mood}
              </Text>
            </View>
            <Text className="text-purple-800 text-[11px] font-medium">
              Pain: {activeScenario.customerPersona.painPoint}
            </Text>
          </View>

          {/* Dialogue Messages Stream */}
          <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 20 }}>
            {dialogueHistory.map((item, idx) => (
              <View
                key={idx}
                className={`mb-3 flex-row ${item.speaker === "customer" ? "justify-start" : "justify-end"}`}
              >
                <View
                  className={`max-w-[82%] p-3.5 rounded-lg ${
                    item.speaker === "customer"
                      ? "bg-white border border-gray-200 shadow-sm"
                      : "bg-brand-600 shadow-sm"
                  }`}
                >
                  <Text
                    className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${
                      item.speaker === "customer" ? "text-purple-700" : "text-brand-200"
                    }`}
                  >
                    {item.speaker === "customer" ? activeScenario.customerPersona.name : "You (Mechanic)"}
                  </Text>
                  <Text
                    className={`text-sm leading-relaxed ${
                      item.speaker === "customer" ? "text-gray-900" : "text-white font-medium"
                    }`}
                  >
                    {item.message}
                  </Text>

                  {/* Feedback on Mechanic's Choice */}
                  {item.feedback ? (
                    <View className="mt-2 pt-2 border-t border-brand-400">
                      <Text className="text-brand-100 text-[11px] italic">💡 {item.feedback}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </ScrollView>

          {/* ── Bottom Sheet: Selectable Response Talking Points ──────────── */}
          {currentMechanicStep?.options && (
            <View className="bg-white p-4 border-t border-gray-100 shadow-lg">
              <Text className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5">
                Select Your Response:
              </Text>

              <View className="gap-2">
                {currentMechanicStep.options.map((opt, optIdx) => (
                  <PressScale
                    key={optIdx}
                    scaleTo={0.98}
                    onPress={() => handleSelectOption(opt)}
                    className="p-3.5 rounded-lg bg-gray-50 border border-gray-200 active:bg-brand-50 active:border-brand-300"
                  >
                    <Text className="text-gray-900 text-xs leading-relaxed">{opt.text}</Text>
                  </PressScale>
                ))}
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
