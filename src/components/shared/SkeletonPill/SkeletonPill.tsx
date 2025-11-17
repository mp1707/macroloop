import React, { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useTheme } from "@/theme";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { createStyles } from "./SkeletonPill.styles";

interface SkeletonPillProps {
  width?: number | string;
  height?: number;
  style?: any;
}

/**
 * SkeletonPill - Animated loading placeholder with pulsing effect
 *
 * ACCESSIBILITY:
 * - Respects reduced motion preferences (WCAG 2.3.3)
 * - Marked as decorative/hidden from screen readers (loading placeholders should be hidden)
 * - Parent component should provide loading state announcement
 */
export const SkeletonPill: React.FC<SkeletonPillProps> = ({
  width = "80%",
  height = 20,
  style,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const reduceMotion = useReducedMotion();

  const pulseOpacity = useSharedValue(reduceMotion ? 0.5 : 0.3);

  useEffect(() => {
    if (reduceMotion) {
      // ACCESSIBILITY: Disable animation for reduced motion (WCAG 2.3.3)
      pulseOpacity.value = 0.5;
    } else {
      pulseOpacity.value = withRepeat(
        withTiming(0.6, {
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );
    }
  }, [pulseOpacity, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.pill,
        { width, height },
        animatedStyle,
        style,
      ]}
      // ACCESSIBILITY: Hide from screen readers (WCAG 1.3.1)
      // Loading state should be announced by parent component
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
    />
  );
};