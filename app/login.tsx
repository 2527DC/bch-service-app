// Login — Professional Access Code Authentication
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import {
  AlertCircle,
  ArrowRight,
  Bike,
  KeyRound,
  LogIn,
  ShieldCheck,
  XCircle,
} from "lucide-react-native";
import { useSession } from "@/store/session";

const ROLE_REDIRECT: Record<string, string> = {
  MECHANIC: "/mechanic",
  SUPERVISOR: "/supervisor",
  MANAGER: "/manager",
};

const SUGGESTED_CODES = [
  { code: "ADMIN123", label: "Admin" },
  { code: "BCH-MECH-01", label: "Mechanic" },
  { code: "BCH-SUP-01", label: "Supervisor" },
];

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sessionUser = useSession((s) => s.user);
  const rememberedUser = useSession((s) => s.rememberedUser);
  const loginWithCode = useSession((s) => s.loginWithCode);

  const [accessCode, setAccessCode] = useState(rememberedUser || "ADMIN123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Existing session → navigate straight to dashboard
  useEffect(() => {
    if (sessionUser) {
      router.replace((ROLE_REDIRECT[sessionUser.role] || "/mechanic") as never);
    }
  }, [sessionUser, router]);

  const handleLogin = async (codeToUse?: string) => {
    const code = (codeToUse || accessCode).trim().toUpperCase();
    if (!code) {
      setError("Please enter your staff access code");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }

    setLoading(true);
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    try {
      console.log(`[Login] Sending mobile-login request for code: ${code}`);
      const user = await loginWithCode(code);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace((ROLE_REDIRECT[user.role] || "/mechanic") as never);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setError(e?.message || "Invalid Access Code or server unreachable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-slate-50"
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: 24,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Brand Header ────────────────────────────────────────────────── */}
        <View className="items-center mb-7">
          <View className="w-18 h-18 rounded-3xl bg-brand-600 items-center justify-center mb-3.5 shadow-lg shadow-brand-500/25 p-4 border-2 border-brand-400/30">
            <Bike size={36} color="#ffffff" strokeWidth={2.2} />
          </View>

          <Text className="text-2xl font-black text-slate-900 tracking-tight text-center">
            Bharath Cycle Hub
          </Text>
          <View className="flex-row items-center gap-1.5 mt-1">
            <View className="w-2 h-2 rounded-full bg-emerald-500" />
            <Text className="text-slate-500 text-xs font-semibold tracking-wide">
              Service Operations & Staff Academy
            </Text>
          </View>
        </View>

        {/* ── Main Login Card ─────────────────────────────────────────────── */}
        <View className="bg-white rounded-3xl p-7 w-full max-w-sm self-center shadow-xl border border-slate-100">
          <View className="mb-5">
            <Text className="text-lg font-bold text-slate-900">Sign In to Workspace</Text>
            <Text className="text-slate-500 text-xs mt-0.5">
              Enter your access code and tap Sign In to authenticate.
            </Text>
          </View>

          {/* Access Code Input */}
          <View className="mb-4">
            <Text className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
              Staff Access Code
            </Text>

            <View className="relative justify-center">
              <View className="absolute left-4 z-10">
                <KeyRound size={20} color="#64748b" />
              </View>

              <TextInput
                value={accessCode}
                onChangeText={(v) => {
                  setAccessCode(v);
                  setError("");
                }}
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder="e.g. ADMIN123"
                placeholderTextColor="#94a3b8"
                returnKeyType="go"
                onSubmitEditing={() => handleLogin()}
                className="bg-slate-50 border-2 border-slate-200 focus:border-brand-600 rounded-2xl pl-12 pr-11 py-4 text-base font-bold text-slate-900 tracking-wider"
              />

              {accessCode.length > 0 && (
                <Pressable
                  onPress={() => {
                    setAccessCode("");
                    setError("");
                  }}
                  className="absolute right-3.5 p-1"
                  hitSlop={8}
                >
                  <XCircle size={18} color="#94a3b8" />
                </Pressable>
              )}
            </View>
          </View>

          {/* Error Message */}
          {error ? (
            <View className="bg-red-50 border border-red-200 rounded-2xl p-3.5 flex-row items-center gap-2.5 mb-4">
              <AlertCircle size={18} color="#dc2626" />
              <Text className="text-red-700 text-xs font-semibold flex-1 leading-snug">
                {error}
              </Text>
            </View>
          ) : null}

          {/* ── Primary Sign In Button (Makes API Call) ────────────────────── */}
          <Pressable
            disabled={loading}
            onPress={() => handleLogin()}
            accessibilityRole="button"
            accessibilityLabel="Sign In"
            className={`w-full py-4 rounded-2xl items-center flex-row justify-center gap-2 shadow-md ${
              loading
                ? "bg-brand-400"
                : "bg-brand-600 active:bg-brand-700 active:opacity-90 shadow-brand-500/25"
            }`}
          >
            {loading ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator color="#ffffff" size="small" />
                <Text className="text-white font-bold text-base">Authenticating...</Text>
              </View>
            ) : (
              <>
                <LogIn size={20} color="#ffffff" strokeWidth={2.2} />
                <Text className="text-white font-bold text-base">Sign In with Code</Text>
                <ArrowRight size={18} color="#ffffff" strokeWidth={2.2} />
              </>
            )}
          </Pressable>

          {/* Quick Access Code Chips for Convenience */}
          <View className="mt-6 pt-5 border-t border-slate-100">
            <Text className="text-[11px] font-bold text-slate-400 mb-2.5 text-center">
              Quick Select Access Code
            </Text>
            <View className="flex-row justify-center gap-2">
              {SUGGESTED_CODES.map((item) => (
                <Pressable
                  key={item.code}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setAccessCode(item.code);
                    setError("");
                  }}
                  className={`px-3 py-1.5 rounded-xl border ${
                    accessCode === item.code
                      ? "bg-brand-50 border-brand-300"
                      : "bg-slate-50 border-slate-200 active:bg-slate-100"
                  }`}
                >
                  <Text
                    className={`text-[11px] font-bold ${
                      accessCode === item.code ? "text-brand-700" : "text-slate-600"
                    }`}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <View className="items-center mt-7">
          <View className="flex-row items-center gap-1.5 mb-1">
            <ShieldCheck size={14} color="#64748b" />
            <Text className="text-slate-400 text-xs font-medium">
              Encrypted Session · BCH Backend & RBAC
            </Text>
          </View>
          <Text className="text-slate-300 text-[11px]">
            Bharath Cycle Hub · Bengaluru Store #1
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
