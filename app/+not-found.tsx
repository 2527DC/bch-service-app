import { Link } from "expo-router";
import { Text, View } from "react-native";

export default function NotFoundScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-gray-50 p-5">
      <Text className="text-6xl mb-4">🚲</Text>
      <Text className="text-xl font-bold text-gray-800">This screen doesn't exist.</Text>
      <Link href="/" className="mt-4 py-4">
        <Text className="text-blue-500 font-semibold">Go to home screen!</Text>
      </Link>
    </View>
  );
}
