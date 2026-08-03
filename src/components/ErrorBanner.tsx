import React from "react";
import { View, Text, Pressable } from "react-native";

export default function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <View className="mx-4 mb-3 bg-red-600 rounded-xl p-3 flex-row items-start shadow-lg">
      <Text className="text-white text-sm font-bold flex-1">⚠️ {message}</Text>
      <Pressable onPress={onDismiss} hitSlop={12}>
        <Text className="text-white/70 font-bold text-sm">✕</Text>
      </Pressable>
    </View>
  );
}
