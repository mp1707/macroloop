import { useCallback, useEffect, useRef, useState } from "react";
import {
  useSharedValue,
  useDerivedValue,
  withDelay,
  withTiming,
  runOnJS,
  useAnimatedReaction,
  Easing,
  withSpring,
} from "react-native-reanimated";
import { useReducedMotion } from "./useReducedMotion";

/**
 * Centralized animation configuration matching the DashboardRing spring animation
 * Used for consistent feel across all animated components
 *
 * ACCESSIBILITY: When reduce motion is enabled, animations use instant or minimal duration
 * to comply with WCAG 2.3.3 (Animation from Interactions)
 */
export const SPRING_CONFIG = {
  mass: 1.2,
  damping: 25,
  stiffness: 80,
} as const;

/**
 * Reduced motion spring config for accessibility
 * Very stiff and heavily damped = instant movement with no bounce
 */
export const SPRING_CONFIG_REDUCED = {
  mass: 0.5,
  damping: 500,
  stiffness: 1000,
} as const;

/**
 * Easing function for smooth count-up animations
 * Ease-out cubic with no oscillation or bounce
 */
export const easeOutCubic = (t: number): number => {
  return 1 - Math.pow(1 - t, 3);
};

/**
 * Optimized hook for animating number reveals using reanimated (UI thread)
 *
 * Performance improvements:
 * - Runs on UI thread instead of JS thread
 * - Updates React state only when rounded value changes (not on every frame)
 * - Eliminates setInterval/requestAnimationFrame overhead
 *
 * Features:
 * - Instant updates for tiny changes (≤2 units)
 * - Smooth ease-out animation (1500ms, reduced from 2000ms for snappier feel)
 * - Minimal JS thread impact via batched updates
 *
 * ACCESSIBILITY: Respects reduce motion preference (WCAG 2.3.3)
 * - When reduce motion enabled: instant updates (duration: 0)
 * - When reduce motion disabled: smooth animations (duration: 1500ms)
 */
export const useNumberReveal = (initial: number) => {
  const prevRef = useRef(initial);
  const [display, setDisplay] = useState(initial);
  const reduceMotion = useReducedMotion();

  // Animated value that runs on UI thread
  const animatedValue = useSharedValue(initial);
  const targetValue = useSharedValue(initial);

  // Track the last displayed integer to minimize state updates
  const lastDisplayedValue = useSharedValue(initial);
  // Track last update time for throttling
  const lastUpdateTime = useSharedValue(0);
  const THROTTLE_MS = 50; // Update at most every 50ms (~20fps)

  // Aggressively throttled: Only update React state every 50ms
  // This reduces 2000+ updates to ~30 updates during a 1500ms animation
  useAnimatedReaction(
    () => ({
      rounded: Math.round(animatedValue.value),
      now: Date.now(),
    }),
    ({ rounded, now }, previous) => {
      const prevRounded = previous?.rounded ?? initial;
      const timeSinceLastUpdate = now - lastUpdateTime.value;

      // Update if: value changed AND (enough time passed OR animation complete)
      const shouldUpdate =
        rounded !== prevRounded &&
        (timeSinceLastUpdate >= THROTTLE_MS || rounded === targetValue.value);

      if (shouldUpdate && rounded !== lastDisplayedValue.value) {
        lastDisplayedValue.value = rounded;
        lastUpdateTime.value = now;
        runOnJS(setDisplay)(rounded);
      }
    },
    [animatedValue, lastDisplayedValue, targetValue, lastUpdateTime]
  );

  const animateTo = useCallback((target: number, delay: number = 0) => {
    const from = prevRef.current;
    prevRef.current = target;
    targetValue.value = target;

    const difference = Math.abs(target - from);

    // ACCESSIBILITY: Skip animation if reduce motion is enabled (WCAG 2.3.3)
    if (reduceMotion) {
      if (delay > 0) {
        animatedValue.value = withDelay(delay, withTiming(target, { duration: 0 }));
      } else {
        animatedValue.value = target;
      }
      return;
    }

    // Skip animation entirely for very small changes (≤2 units)
    if (difference <= 2) {
      if (delay > 0) {
        animatedValue.value = withDelay(delay, withTiming(target, { duration: 0 }));
      } else {
        animatedValue.value = target;
      }
      return;
    }

    // For small target values (< 20), skip animation - just set instantly after delay
    // These small numbers don't benefit from count-up animation
    if (target < 20) {
      if (delay > 0) {
        animatedValue.value = withDelay(delay, withTiming(target, { duration: 0 }));
      } else {
        animatedValue.value = target;
      }
      return;
    }

    // Smooth count-up/down on UI thread with ease-out (1500ms for snappier feel)
    const duration = 1500;

    if (delay > 0) {
      animatedValue.value = withDelay(
        delay,
        withTiming(target, {
          duration,
          easing: Easing.out(Easing.cubic),
        })
      );
    } else {
      animatedValue.value = withTiming(target, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [animatedValue, targetValue, reduceMotion]);

  const setValue = useCallback((value: number) => {
    // Set value instantly without animation
    prevRef.current = value;
    targetValue.value = value;
    animatedValue.value = value;
    lastDisplayedValue.value = value;
    setDisplay(value);
  }, [animatedValue, targetValue, lastDisplayedValue]);

  // Initialize on mount
  useEffect(() => {
    animatedValue.value = initial;
    targetValue.value = initial;
    lastDisplayedValue.value = initial;
  }, []);

  return { display, animateTo, setValue } as const;
};

/**
 * Optimized hook for animating numbers using reanimated (UI thread only)
 *
 * Returns a SharedValue that can be consumed by AnimatedText component.
 * ZERO JS thread impact - all animations happen on UI thread.
 *
 * Performance: Perfect for high-frequency updates (no JS bridging)
 *
 * ACCESSIBILITY: Respects reduce motion preference (WCAG 2.3.3)
 *
 * Usage:
 * ```tsx
 * const animatedValue = useAnimatedNumber(0);
 * animatedValue.animateTo(100, 350);
 * return <AnimatedText value={animatedValue.value} role="Headline" />;
 * ```
 */
export const useAnimatedNumber = (initial: number) => {
  const animatedValue = useSharedValue(initial);
  const targetValue = useSharedValue(initial);
  const prevRef = useRef(initial);
  const reduceMotion = useReducedMotion();

  const animateTo = useCallback((target: number, delay: number = 0) => {
    const from = prevRef.current;
    prevRef.current = target;
    targetValue.value = target;

    const difference = Math.abs(target - from);

    // ACCESSIBILITY: Skip animation if reduce motion is enabled (WCAG 2.3.3)
    if (reduceMotion) {
      if (delay > 0) {
        animatedValue.value = withDelay(delay, withTiming(target, { duration: 0 }));
      } else {
        animatedValue.value = target;
      }
      return;
    }

    // Skip animation entirely for very small changes (≤2 units)
    if (difference <= 2) {
      if (delay > 0) {
        animatedValue.value = withDelay(delay, withTiming(target, { duration: 0 }));
      } else {
        animatedValue.value = target;
      }
      return;
    }

    // For small target values (< 20), skip animation - just set instantly after delay
    if (target < 20) {
      if (delay > 0) {
        animatedValue.value = withDelay(delay, withTiming(target, { duration: 0 }));
      } else {
        animatedValue.value = target;
      }
      return;
    }

    // Smooth count-up/down on UI thread with ease-out (1500ms)
    const duration = 1500;

    if (delay > 0) {
      animatedValue.value = withDelay(
        delay,
        withTiming(target, {
          duration,
          easing: Easing.out(Easing.cubic),
        })
      );
    } else {
      animatedValue.value = withTiming(target, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [animatedValue, targetValue, reduceMotion]);

  const setValue = useCallback((value: number) => {
    prevRef.current = value;
    targetValue.value = value;
    animatedValue.value = value;
  }, [animatedValue, targetValue]);

  // Initialize on mount
  useEffect(() => {
    animatedValue.value = initial;
    targetValue.value = initial;
  }, []);

  return { value: animatedValue, animateTo, setValue } as const;
};