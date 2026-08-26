// PROFILE — signed-in user's details (name / email / role) + sign out.
import React from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Mail, User as UserIcon, Shield, Hash, LogOut } from "lucide-react-native";
import { NEUTRAL } from "@/lib/theme";
import { useSession } from "@/store/session";
import PressScale from "@/components/PressScale";

const ROLE_LABEL: Record<string, string> = {
  MECHANIC: "Mechanic",
  SUPERVISOR: "Supervisor",
  MANAGER: "Manager",
};

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center gap-3 px-4 py-3 border-b border-gray-100">
      <View className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center">{icon}</View>
      <View className="flex-1">
        <Text className="text-xs text-gray-400">{label}</Text>
        <Text className="text-base font-semibold text-gray-800">{value}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const user = useSession((s) => s.user);
  const logout = useSession((s) => s.logout);
  const router = useRouter();

  if (!user) return null;

  const handleLogout = () => {
    Alert.alert("Sign out?", "You will need your PIN to sign back in.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Identity card */}
      <View className="bg-white items-center px-4 pt-8 pb-6 border-b border-gray-100">
        <View className="w-24 h-24 rounded-full bg-brand-600 items-center justify-center">
          <Text className="text-white font-bold text-3xl">{user.name.trim().slice(0, 2).toUpperCase()}</Text>
        </View>
        <Text className="mt-3 text-2xl font-bold text-gray-800">{user.name}</Text>
        <Text className="text-gray-400 text-sm">{user.email}</Text>
        <View className="mt-2 px-3 py-1 rounded-full bg-brand-50">
          <Text className="text-brand-700 text-xs font-semibold">
            {ROLE_LABEL[user.role] ?? user.role}
          </Text>
        </View>
      </View>

      {/* Details */}
      <View className="mt-4 bg-white border-y border-gray-100">
        <Row icon={<UserIcon size={18} color={NEUTRAL[500]} />} label="Name" value={user.name} />
        <Row icon={<Mail size={18} color={NEUTRAL[500]} />} label="Email" value={user.email} />
        <Row
          icon={<Shield size={18} color={NEUTRAL[500]} />}
          label="Role"
          value={ROLE_LABEL[user.role] ?? user.role}
        />
        <Row icon={<Hash size={18} color={NEUTRAL[500]} />} label="User ID" value={user.id} />
      </View>

      {/* Sign out */}
      <View className="px-4 mt-6">
        <PressScale
          onPress={handleLogout}
          className="flex-row items-center justify-center gap-2 bg-red-50 border border-red-200 rounded-2xl py-4"
        >
          <LogOut size={18} color="#dc2626" />
          <Text className="text-red-600 font-semibold text-base">Sign out</Text>
        </PressScale>
      </View>
    </ScrollView>
  );
}
