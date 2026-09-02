// Replaces the PWA's `active:scale-95 transition-transform`.
//
// HOW `className` REACHES THE NATIVE VIEW — and why there is exactly ONE `cssInterop` here.
//
// `cssInterop(PressScale, …)` at the bottom registers THIS component with NativeWind's JSX
// runtime. `<PressScale className="…">` is then rendered through an interop wrapper that
// resolves the classes into a plain style object and hands it to the function below as
// `style`. We pass `[animStyle, style]` to the Reanimated Pressable — the array shape
// Reanimated expects: it picks the animated handle out of the array and applies the rest
// as ordinary styles.
//
// The Reanimated component itself must NOT be registered with `cssInterop`. The interop
// wrapper folds every entry of an inline `style` array into ONE object, so the handle that
// `useAnimatedStyle` returns (it carries `viewDescriptors`) gets spread together with the
// static styles. Reanimated recognises an animated style by the presence of
// `viewDescriptors`, treats the merged object as the handle, and applies only its
// `initial.value` — the scale transform. Every static class (background, border, padding,
// height, flex-direction) is silently dropped. That is what flattened every card in the
// Stock module on device: see doc/implementation/pending/01-listing-screens-redesign.md
// §13.10. Keep the animated component un-registered.
import React from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { cssInterop } from "nativewind";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = PressableProps & {
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
  className?: string;
  children?: React.ReactNode;
};

export default function PressScale({ scaleTo = 0.95, style, children, ...rest }: Props) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      {...rest}
      style={[animStyle, style]}
      onPressIn={(e) => {
        scale.value = withTiming(scaleTo, { duration: 90 });
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withTiming(1, { duration: 120 });
        rest.onPressOut?.(e);
      }}
    >
      {children}
    </AnimatedPressable>
  );
}

// Resolves `className` → `style` BEFORE the props reach the function above. See the header
// for why this is the only registration in the file.
cssInterop(PressScale, { className: "style" });
