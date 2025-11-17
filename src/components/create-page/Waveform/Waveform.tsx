import React, { useEffect, useRef, useMemo } from "react";
import { View, StyleProp, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface WaveformProps {
  volumeLevel: number;
  isActive: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  barStyle?: StyleProp<ViewStyle>;
  /**
   * Accessibility label for screen readers (WCAG 1.1.1)
   * Describes the purpose of this waveform visualization
   * Default: "Audio recording volume indicator"
   */
  accessibilityLabel?: string;
}

/**
 * Waveform - Visual audio volume indicator with animated bars
 *
 * ACCESSIBILITY:
 * - Respects reduced motion preferences (WCAG 2.3.3)
 * - Provides text alternative for visual representation (WCAG 1.1.1)
 * - Volume level announced to screen readers
 *
 * PERFORMANCE OPTIMIZED:
 * - Reduced from 32 to 6 bars (83% reduction)
 * - Simplified animation calculations
 * - Removed complex math operations (power, distance, falloff)
 * - Uses spring animations for natural movement
 */

const BAR_COUNT = 6;
const MIN_BAR_HEIGHT = 4;
const MAX_BAR_HEIGHT = 100;
// Each bar has a slightly different multiplier for visual variation
const BAR_MULTIPLIERS = [0.6, 0.85, 1.0, 1.0, 0.85, 0.6];

export const Waveform: React.FC<WaveformProps> = ({
  volumeLevel,
  isActive,
  containerStyle,
  barStyle,
  accessibilityLabel,
}) => {
  const reduceMotion = useReducedMotion();

  // Create shared values for each bar
  const bars = useRef(
    Array.from({ length: BAR_COUNT }, () => useSharedValue(MIN_BAR_HEIGHT))
  ).current;

  // ACCESSIBILITY: Create text alternative for volume level (WCAG 1.1.1)
  const volumePercentage = Math.round(volumeLevel);
  const volumeDescription = useMemo(() => {
    if (!isActive) return "inactive";
    if (volumePercentage < 10) return "very quiet";
    if (volumePercentage < 30) return "quiet";
    if (volumePercentage < 60) return "moderate";
    if (volumePercentage < 85) return "loud";
    return "very loud";
  }, [isActive, volumePercentage]);

  const a11yLabel = accessibilityLabel || "Audio recording volume indicator";
  const a11yValue = isActive
    ? `${volumeDescription}, ${volumePercentage} percent`
    : "inactive";

  useEffect(() => {
    if (!isActive) {
      // Reset all bars to minimum height when not active
      bars.forEach((bar) => {
        bar.value = reduceMotion
          ? MIN_BAR_HEIGHT
          : withTiming(MIN_BAR_HEIGHT, {
              duration: 300,
              easing: Easing.out(Easing.ease),
            });
      });
      return;
    }

    // Simplified calculation: direct mapping from volume to height
    // No complex math operations like power functions or distance calculations
    bars.forEach((bar, idx) => {
      const multiplier = BAR_MULTIPLIERS[idx];

      // Simple linear mapping with multiplier for visual variation
      const targetHeight = Math.max(
        MIN_BAR_HEIGHT,
        Math.min(MAX_BAR_HEIGHT, (volumeLevel / 100) * MAX_BAR_HEIGHT * multiplier)
      );

      // ACCESSIBILITY: Instant updates when reduce motion is enabled (WCAG 2.3.3)
      if (reduceMotion) {
        bar.value = targetHeight;
      } else {
        // Use spring animation for natural, organic movement
        // Spring is efficient and provides smooth motion with less computation
        bar.value = withSpring(targetHeight, {
          damping: 15,
          stiffness: 150,
          mass: 0.5,
          overshootClamping: true,
          restDisplacementThreshold: 0.01,
          restSpeedThreshold: 0.01,
        });
      }
    });
  }, [volumeLevel, isActive, bars, reduceMotion]);

  return (
    <View
      style={containerStyle}
      // ACCESSIBILITY: Provide text alternative for visual waveform (WCAG 1.1.1)
      accessible={true}
      accessibilityRole="progressbar"
      accessibilityLabel={a11yLabel}
      accessibilityValue={{
        text: a11yValue,
        now: volumePercentage,
        min: 0,
        max: 100,
      }}
    >
      {bars.map((bar, index) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const animatedStyle = useAnimatedStyle(() => ({
          height: bar.value,
        }));
        return <Animated.View key={index} style={[barStyle, animatedStyle]} />;
      })}
    </View>
  );
};
