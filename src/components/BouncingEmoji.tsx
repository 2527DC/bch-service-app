// Replaces animate-bounce / animate-pulse loaders (🔧 🚲 📚 💰)
import React, { useEffect } from "react";
import { View, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";

export default function BouncingEmoji({
  emoji,
  size = 40,
  mode = "bounce",
  caption,
}: {
  emoji: string;
  size?: number;
  mode?: "bounce" | "pulse";
  caption?: string;
}) {
  const v = useSharedValue(0);

  useEffect(() => {
    v.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 400, easing: Easing.in(Easing.quad) })
      ),
      -1
    );
  }, [v]);

  const style = useAnimatedStyle(() =>
    mode === "bounce"
      ? { transform: [{ translateY: -14 * v.value }] }
      : { opacity: 1 - 0.6 * v.value }
  );

  return (
    <View className="items-center justify-center">
      <Animated.View style={style}>
        <Text style={{ fontSize: size }}>{emoji}</Text>
      </Animated.View>
      {caption ? <Text className="text-gray-400 mt-4 text-lg">{caption}</Text> : null}
    </View>
  );
}
