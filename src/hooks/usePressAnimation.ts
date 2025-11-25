import { useCallback } from "react";
import {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { theme } from "@/theme";
import { useReducedMotion } from "./useReducedMotion";

interface UsePressAnimationOptions {
  /**
   * Haptic feedback intensity
   * @default "light"
   */
  hapticIntensity?: "light" | "medium" | "heavy";

  /**
   * Disable haptic feedback
   * @default false
   */
  disableHaptics?: boolean;

  /**
   * Disable the animation
   * @default false
   */
  disabled?: boolean;
}

/**
 * Reusable hook for consistent press animations and haptic feedback
 *
 * ACCESSIBILITY: Respects user's reduce motion preference (WCAG 2.3.3)
 * - When reduce motion is enabled, animations are instant
 * - Haptic feedback is preserved as it's not visual motion
 *
 * @example
 * ```tsx
 * const { handlePressIn, handlePressOut, pressAnimatedStyle } = usePressAnimation();
 *
 * return (
 *   <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
 *     <Animated.View style={pressAnimatedStyle}>
 *       {children}
 *     </Animated.View>
 *   </Pressable>
 * );
 * ```
 */
export const usePressAnimation = (options: UsePressAnimationOptions = {}) => {
  const {
    hapticIntensity = "light",
    disableHaptics = false,
    disabled = false,
  } = options;

  const scale = useSharedValue(1);
  const reduceMotion = useReducedMotion();

  const handlePressIn = useCallback(() => {
    if (disabled) return;

    // ACCESSIBILITY: Use instant animation if reduce motion is enabled
    if (reduceMotion) {
      scale.value = theme.interactions.press.scale; // Instant, no animation
    } else {
      // Scale down with timing
      scale.value = withTiming(theme.interactions.press.scale, {
        duration: theme.interactions.press.timing.duration,
        easing: theme.interactions.press.timing.easing,
      });
    }

    // Trigger haptic feedback (preserved even with reduce motion - it's not visual)
    if (!disableHaptics) {
      const hapticStyle = theme.interactions.haptics[hapticIntensity];
      Haptics.impactAsync(hapticStyle).catch(() => undefined);
    }
  }, [disabled, disableHaptics, hapticIntensity, reduceMotion]);

  const handlePressOut = useCallback(() => {
    if (disabled) return;

    // ACCESSIBILITY: Use instant animation if reduce motion is enabled
    if (reduceMotion) {
      scale.value = 1.0; // Instant, no animation
    } else {
      // Return to idle scale using the standard easing
      scale.value = withTiming(1.0, {
        duration: theme.interactions.press.timing.duration,
        easing: theme.interactions.press.timing.easing,
      });
    }
  }, [disabled, reduceMotion]);

  const pressAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return {
    handlePressIn,
    handlePressOut,
    pressAnimatedStyle,
  };
};
