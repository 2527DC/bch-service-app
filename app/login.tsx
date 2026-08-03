// Login — port of src/app/login/page.tsx: user picker → 4-digit PIN pad → role redirect.
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { ChevronRight, Delete } from "lucide-react-native";
import { useSession } from "@/store/session";
import * as mockApi from "@/services/mockApi";
import { LOGIN_BG } from "@/mock/photos";
import BouncingEmoji from "@/components/BouncingEmoji";
import type { User } from "@/mock/types";

const ROLE_REDIRECT: Record<string, string> = {
  MECHANIC: "/mechanic",
  SUPERVISOR: "/supervisor",
  MANAGER: "/manager",
};

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sessionUser = useSession((s) => s.user);
  const rememberedUser = useSession((s) => s.rememberedUser);
  const doStoreLogin = useSession((s) => s.login);

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Existing session → straight to home
  useEffect(() => {
    if (sessionUser) {
      router.replace((ROLE_REDIRECT[sessionUser.role] || "/mechanic") as never);
    }
  }, [sessionUser, router]);

  // Remembered user pre-selected
  useEffect(() => {
    if (rememberedUser && !selectedUser) setSelectedUser(rememberedUser);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rememberedUser]);

  useEffect(() => {
    mockApi.listUsers().then(setUsers).catch(() => {});
  }, []);

  const doLogin = async (name: string, pinCode: string) => {
    setLoading(true);
    setError("");
    try {
      const user = await doStoreLogin(name, pinCode);
      router.replace((ROLE_REDIRECT[user.role] || "/mechanic") as never);
    } catch (e: any) {
      setError(e?.message === "Wrong PIN" ? "Wrong PIN" : e?.message || "Connection error");
      setPin("");
    }
    setLoading(false);
  };

  const handleKey = (key: string) => {
    if (loading) return;
    Haptics.selectionAsync().catch(() => {});
    setError("");
    if (key === "del") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    setPin((p) => {
      if (p.length >= 4) return p;
      const next = p + key;
      if (next.length === 4 && selectedUser) {
        // Submit once the 4th digit lands
        setTimeout(() => doLogin(selectedUser, next), 120);
      }
      return next;
    });
  };

  const pickUser = (name: string) => {
    setSelectedUser(name);
    setShowUserPicker(false);
    setPin("");
    setError("");
  };

  const currentUser = users.find((u) => u.name === selectedUser);

  const userRow = (u: User, showCurrent: boolean) => (
    <Pressable
      key={u.name}
      onPress={() => pickUser(u.name)}
      className={`w-full flex-row items-center gap-3 p-3 rounded-xl active:bg-gray-100 ${
        showCurrent && u.name === selectedUser ? "bg-gray-100" : ""
      }`}
    >
      <View className="w-10 h-10 rounded-full bg-gray-800 items-center justify-center">
        <Text className="text-lg">{u.emoji}</Text>
      </View>
      <View className="flex-1">
        <Text className="font-semibold text-gray-800">{u.name}</Text>
        <Text className="text-xs text-gray-400">{u.role.charAt(0) + u.role.slice(1).toLowerCase()}</Text>
      </View>
      {showCurrent && u.name === selectedUser ? (
        <Text className="text-green-500 text-sm font-bold">Current</Text>
      ) : (
        <ChevronRight size={20} color="#d1d5db" />
      )}
    </Pressable>
  );

  return (
    <View className="flex-1 bg-gray-900">
      {/* Background image + dark gradient overlay */}
      <Image source={LOGIN_BG} style={{ position: "absolute", width: "100%", height: "100%" }} contentFit="cover" />
      <LinearGradient
        colors={["rgba(0,0,0,0.6)", "rgba(0,0,0,0.4)", "rgba(0,0,0,0.8)"]}
        style={{ position: "absolute", width: "100%", height: "100%" }}
      />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: 24,
          paddingTop: insets.top + 32,
          paddingBottom: 16,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand */}
        <View className="mb-6 items-center">
          <View className="w-16 h-16 bg-white/20 rounded-2xl items-center justify-center mb-3 border border-white/25">
            <Text className="text-3xl">🚲</Text>
          </View>
          <Text className="text-3xl font-bold text-white tracking-tight">Bharath Cycle Hub</Text>
          <Text className="text-white/60 text-sm mt-1">Service Management System</Text>
        </View>

        {/* Login card */}
        <View className="bg-white rounded-3xl p-6 w-full max-w-sm self-center shadow-2xl">
          {!selectedUser ? (
            <>
              <Text className="text-lg font-bold text-gray-800 mb-4 text-center">Select your name</Text>
              <View style={{ maxHeight: 380 }}>
                <ScrollView>{users.map((u) => userRow(u, false))}</ScrollView>
              </View>
            </>
          ) : showUserPicker ? (
            <>
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-lg font-bold text-gray-800">Switch account</Text>
                <Pressable onPress={() => setShowUserPicker(false)} hitSlop={8}>
                  <Text className="text-gray-400 text-sm font-medium">Cancel</Text>
                </Pressable>
              </View>
              <View style={{ maxHeight: 380 }}>
                <ScrollView>{users.map((u) => userRow(u, true))}</ScrollView>
              </View>
            </>
          ) : (
            <>
              {/* Welcome back / PIN entry */}
              <View className="items-center mb-6">
                <View className="w-16 h-16 rounded-full bg-gray-800 items-center justify-center mb-3">
                  <Text className="text-2xl">{currentUser?.emoji || "👤"}</Text>
                </View>
                <Text className="text-xl font-bold text-gray-800">
                  {rememberedUser === selectedUser ? "Welcome back" : "Hello"}, {selectedUser?.split(" ")[0]}
                </Text>
                <Pressable onPress={() => { setShowUserPicker(true); setPin(""); setError(""); }} hitSlop={8}>
                  <Text className="text-blue-500 text-sm font-medium mt-1">Not you? Switch account</Text>
                </Pressable>
              </View>

              {/* PIN dots */}
              <Text className="text-sm font-medium text-gray-500 mb-2 text-center">Enter your 4-digit PIN</Text>
              <View className="flex-row justify-center gap-3 mb-4">
                {[0, 1, 2, 3].map((i) => (
                  <View
                    key={i}
                    className={`w-4 h-4 rounded-full ${i < pin.length ? "bg-gray-800 scale-125" : "bg-gray-200"}`}
                  />
                ))}
              </View>

              {error ? (
                <View className="bg-red-50 py-2 px-4 rounded-xl mb-4">
                  <Text className="text-red-600 text-sm font-medium text-center">{error}</Text>
                </View>
              ) : null}

              {/* Number pad */}
              <View className="flex-row flex-wrap" style={{ margin: -4 }}>
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((key, i) => (
                  <View key={i} style={{ width: "33.33%", padding: 4 }}>
                    {key === "" ? (
                      <View />
                    ) : (
                      <Pressable
                        onPress={() => handleKey(key)}
                        disabled={loading || (key !== "del" && pin.length >= 4)}
                        className={`rounded-xl py-4 items-center justify-center min-h-[56px] ${
                          key === "del" ? "bg-gray-100" : "bg-gray-50 active:bg-gray-200"
                        } ${loading || (key !== "del" && pin.length >= 4) ? "opacity-40" : ""}`}
                      >
                        {key === "del" ? (
                          <Delete size={22} color="#6b7280" />
                        ) : (
                          <Text className="text-gray-800 text-xl font-semibold">{key}</Text>
                        )}
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>

              <Text className="text-center text-xs text-gray-300 mt-3">Demo build — any 4 digits work</Text>

              {loading && (
                <View className="mt-4 items-center">
                  <BouncingEmoji emoji="🚲" size={26} mode="pulse" />
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={{ paddingBottom: insets.bottom + 24 }} className="items-center pt-2">
        <Text className="text-white/40 text-xs">Bengaluru · Since 2010</Text>
      </View>
    </View>
  );
}
