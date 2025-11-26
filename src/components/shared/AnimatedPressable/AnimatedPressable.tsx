import { usePressAnimation } from "@/hooks/usePressAnimation";
import type { ReactNode } from "react";
import type { PressableProps, StyleProp, ViewStyle } from "react-native";
import { Pressable } from "react-native";
import Animated from "react-native-reanimated";

export interface AnimatedPressableProps extends Omit<PressableProps, "style"> {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  hapticIntensity?: "light" | "medium" | "heavy";
  disableHaptics?: boolean;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityRole?: "button" | "link" | "none";
  accessibilityHint?: string;
  testID?: string;
}

/**
 * AnimatedPressable - A generic pressable wrapper with consistent scaling animation and haptic feedback
 *
 * Features:
 * - Smooth scale-down animation on press (0.97)
 * - Spring-back animation on release
 * - Configurable haptic feedback (light/medium/heavy)
 * - Uses theme values for consistent interaction feel
 * - Full accessibility support
 *
 * @example
 * ```tsx
 * <AnimatedPressable
 *   onPress={handlePress}
 *   hapticIntensity="light"
 *   accessibilityLabel="Edit item"
 * >
 *   <Text>Press me</Text>
 * </AnimatedPressable>
 * ```
 */
export const AnimatedPressable = ({
  children,
  onPress,
  disabled = false,
  hapticIntensity = "light",
  disableHaptics = false,
  style,
  containerStyle,
  accessibilityLabel,
  accessibilityRole = "button",
  accessibilityHint,
  testID,
  ...pressableProps
}: AnimatedPressableProps) => {
  const { handlePressIn, handlePressOut, pressAnimatedStyle } =
    usePressAnimation({
      hapticIntensity,
      disableHaptics,
      disabled,
    });

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={containerStyle}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      testID={testID}
      hitSlop={22} // Larger touch target for accessibility (WCAG 2.5.8)
      {...pressableProps}
    >
      <Animated.View style={[style, pressAnimatedStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};
