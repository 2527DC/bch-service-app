import React from "react";
import { View, Text } from "react-native";

export default function EmptyState({ emoji, message }: { emoji: string; message: string }) {
  return (
    <View className="items-center py-12">
      <Text className="text-6xl mb-4">{emoji}</Text>
      <Text className="text-gray-400 text-lg">{message}</Text>
    </View>
  );
}
