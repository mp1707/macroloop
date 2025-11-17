import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Hook to detect and respect user's reduced motion preference
 *
 * Implements WCAG 2.3.3 (Animation from Interactions - Level AAA)
 *
 * When reduce motion is enabled:
 * - All animations should be disabled or significantly reduced
 * - Essential motion (e.g., indicating progress) can remain but be simplified
 * - Transforms and position changes should be instant
 *
 * Usage:
 * ```tsx
 * const reduceMotion = useReducedMotion();
 *
 * // In animations
 * const config = reduceMotion
 *   ? { duration: 0 }
 *   : { duration: 300, easing: Easing.out(Easing.cubic) };
 *
 * // In spring animations
 * const springConfig = reduceMotion
 *   ? { stiffness: 1000, damping: 500 } // Instant
 *   : { stiffness: 350, damping: 25 }; // Bouncy
 * ```
 *
 * Platform behavior:
 * - iOS: Settings > Accessibility > Motion > Reduce Motion
 * - Android: Settings > Accessibility > Remove animations
 *
 * @returns {boolean} True if user prefers reduced motion
 */
export const useReducedMotion = (): boolean => {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    // Check initial state
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setReduceMotion(enabled ?? false);
    });

    // Listen for changes
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        setReduceMotion(enabled);
      }
    );

    // Cleanup
    return () => {
      subscription.remove();
    };
  }, []);

  return reduceMotion;
};

/**
 * Returns animation duration that respects reduced motion preference
 *
 * @param normalDuration - Duration in ms when motion is enabled
 * @param reducedDuration - Duration in ms when motion is reduced (default: 0 for instant)
 * @returns Appropriate duration based on user preference
 *
 * Usage:
 * ```tsx
 * const reduceMotion = useReducedMotion();
 * const duration = getAnimationDuration(300, 0, reduceMotion);
 * ```
 */
export const getAnimationDuration = (
  normalDuration: number,
  reducedDuration: number = 0,
  reduceMotion: boolean
): number => {
  return reduceMotion ? reducedDuration : normalDuration;
};

/**
 * Returns spring config that respects reduced motion preference
 *
 * @param normalConfig - Spring config when motion is enabled
 * @param reduceMotion - Whether to reduce motion
 * @returns Appropriate spring config (instant when reduced)
 *
 * Usage:
 * ```tsx
 * const reduceMotion = useReducedMotion();
 * const config = getSpringConfig(SPRING_CONFIG, reduceMotion);
 * ```
 */
export const getSpringConfig = (
  normalConfig: { stiffness: number; damping: number; mass?: number },
  reduceMotion: boolean
): { stiffness: number; damping: number; mass?: number } => {
  if (reduceMotion) {
    // Very stiff spring with high damping = instant movement
    return {
      stiffness: 1000,
      damping: 500,
      mass: normalConfig.mass,
    };
  }
  return normalConfig;
};
