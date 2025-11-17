import React, { useEffect, useRef, useMemo } from "react";
import { View, StyleProp, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
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
 */

const BAR_COUNT = 32;
const MIN_BAR_HEIGHT = 3;
const MAX_BAR_HEIGHT = 100;

export const Waveform: React.FC<WaveformProps> = ({
  volumeLevel,
  isActive,
  containerStyle,
  barStyle,
  accessibilityLabel,
}) => {
  const reduceMotion = useReducedMotion();
  const bars = useRef(
    Array.from({ length: BAR_COUNT }, () => useSharedValue(MIN_BAR_HEIGHT))
  ).current;
  const smoothedVolume = useSharedValue(0);

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
    // ACCESSIBILITY: Respect reduce motion preference (WCAG 2.3.3)
    const animationDuration = reduceMotion ? 0 : isActive ? 50 : 400;

    if (isActive) {
      smoothedVolume.value = withTiming(volumeLevel, {
        duration: animationDuration,
        easing: Easing.out(Easing.quad),
      });
    } else {
      smoothedVolume.value = withTiming(0, { duration: animationDuration });
      bars.forEach((bar) => {
        bar.value = reduceMotion
          ? MIN_BAR_HEIGHT
          : withDelay(
              100,
              withTiming(MIN_BAR_HEIGHT, {
                duration: 400,
                easing: Easing.out(Easing.cubic),
              })
            );
      });
    }
  }, [volumeLevel, isActive, smoothedVolume, bars, reduceMotion]);

  useAnimatedReaction(
    () => smoothedVolume.value,
    (currentVolume) => {
      if (!isActive) return;

      const center = Math.floor(BAR_COUNT / 2);
      const enhancedVolume = Math.pow(currentVolume / 100, 0.75) * 100;

      bars.forEach((bar, idx) => {
        const distance = Math.abs(idx - center);
        const falloff = Math.pow(1 - distance / center, 2);

        const targetHeight = Math.max(
          MIN_BAR_HEIGHT,
          Math.min(
            MAX_BAR_HEIGHT,
            (enhancedVolume / 100) * MAX_BAR_HEIGHT * falloff * 1.5
          )
        );

        // ACCESSIBILITY: Instant updates when reduce motion is enabled (WCAG 2.3.3)
        if (reduceMotion) {
          bar.value = targetHeight;
        } else if (targetHeight > bar.value) {
          bar.value = withTiming(targetHeight, {
            duration: 120,
            easing: Easing.out(Easing.quad),
          });
        } else {
          bar.value = withTiming(targetHeight, {
            duration: 500,
            easing: Easing.out(Easing.cubic),
          });
        }
      });
    },
    [isActive, reduceMotion]
  );

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
        const animatedStyle = useAnimatedStyle(() => ({ height: bar.value }));
        return <Animated.View key={index} style={[barStyle, animatedStyle]} />;
      })}
    </View>
  );
};
