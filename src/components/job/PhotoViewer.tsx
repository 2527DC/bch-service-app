// Full-screen photo viewer with pinch-to-zoom + double-tap, via Gesture Handler + Reanimated.
import React from "react";
import { Modal, Pressable, Text, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PhotoViewer({
  source,
  onClose,
}: {
  source: number; // require()'d asset
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(5, Math.max(1, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const next = scale.value > 1 ? 1 : 3;
      scale.value = withTiming(next, { duration: 150 });
      savedScale.value = next;
    });

  const gesture = Gesture.Simultaneous(pinch, doubleTap);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Modal visible transparent={false} animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black">
        <GestureDetector gesture={gesture}>
          <Animated.View style={[{ flex: 1, alignItems: "center", justifyContent: "center" }, animStyle]}>
            <Image source={source} style={{ width, height: height * 0.8 }} contentFit="contain" />
          </Animated.View>
        </GestureDetector>

        <View
          style={{ position: "absolute", top: insets.top + 8, left: 0, right: 0 }}
          className="flex-row items-center justify-between px-3"
        >
          <Text className="text-white/50 text-xs">Pinch to zoom · Double-tap</Text>
          <Pressable
            onPress={onClose}
            className="bg-white/30 w-12 h-12 rounded-full items-center justify-center"
          >
            <Text className="text-white text-xl font-bold">✕</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
