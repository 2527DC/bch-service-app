import React from "react";
import { TextInput, View } from "react-native";
import { Search } from "lucide-react-native";

export default function SearchBar({
  value,
  onChangeText,
  placeholder,
  withIcon = false,
  large = false,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  withIcon?: boolean; // lucide Search icon (manager) vs 🔍 in the placeholder (mechanic/history)
  large?: boolean;
}) {
  return (
    <View className="relative">
      {withIcon && (
        <View className="absolute left-3 top-0 bottom-0 justify-center z-10">
          <Search size={16} color="#9ca3af" />
        </View>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        autoCapitalize="none"
        autoCorrect={false}
        className={
          large
            ? "w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-lg bg-white text-gray-800"
            : `w-full border border-gray-200 rounded-lg ${withIcon ? "pl-9" : "px-3"} pr-3 py-2.5 text-sm bg-white text-gray-800`
        }
      />
    </View>
  );
}
