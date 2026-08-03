import React from "react";
import { Text, View } from "react-native";

export default function ComingSoon({ emoji, title }: { emoji: string; title: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-gray-50 px-8">
      <Text className="text-6xl mb-4">{emoji}</Text>
      <Text className="text-xl font-bold text-gray-800 mb-1">{title}</Text>
      <Text className="text-gray-400 text-center">Coming soon — not part of this build</Text>
    </View>
  );
}
