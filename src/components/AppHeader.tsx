// Sticky header: user emoji/name/role + "🚲 BCH". Long-press the identity to switch user.
import React from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSession } from "../store/session";

export default function AppHeader() {
  const user = useSession((s) => s.user);
  const logout = useSession((s) => s.logout);
  const router = useRouter();

  if (!user) return null;

  const handleSwitchUser = () => {
    Alert.alert("Switch user?", "You will be logged out.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Switch",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <View className="bg-white border-b border-gray-100 px-4 py-3 flex-row items-center justify-between">
      <Pressable onLongPress={handleSwitchUser} delayLongPress={1500} className="flex-row items-center gap-2">
        <Text className="text-2xl">{user.emoji}</Text>
        <View>
          <Text className="font-bold text-gray-800 text-lg leading-tight">{user.name}</Text>
          <Text className="text-gray-400 text-xs">{user.role}</Text>
        </View>
      </Pressable>
      <Text className="text-lg font-bold text-gray-700">🚲 BCH</Text>
    </View>
  );
}
