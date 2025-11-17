import { useRouter } from "expo-router";
import { InteractionManager } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";

import { useNavigationTransition } from "@/context/NavigationTransitionContext";

const NAVIGATION_LOCK_TIMEOUT = 2500;
const TRANSITION_RELEASE_DELAY = 48;
const MIN_HOLD_BEFORE_UNLOCK = 120;

/**
 * Navigation guard hook to prevent multiple rapid navigation calls when using Expo Router.
 * Keeps navigation locked until the current transition completes (or a timeout fires) and
 * optionally queues the latest intent to run after unlock.
 */
export function useNavigationGuard() {
  const router = useRouter();
  const lockedRef = useRef(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const unlockAfterTransitionRef = useRef<NodeJS.Timeout | null>(null);

  const lastFocusAtRef = useRef<number>(Date.now());
  const lastNavigationAtRef = useRef<number>(0);

  const transitionStartedRef = useRef(false);
  const pendingNavigationRef = useRef<(() => void) | null>(null);

  const { isTransitioning } = useNavigationTransition();
  const isTransitioningRef = useRef(isTransitioning);

  // Track active navigation cleanup functions
  const activeNavigationsRef = useRef<Set<() => void>>(new Set());

  const clearAllTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (unlockAfterTransitionRef.current) {
      clearTimeout(unlockAfterTransitionRef.current);
      unlockAfterTransitionRef.current = null;
    }
  }, []);

  useEffect(() => {
    isTransitioningRef.current = isTransitioning;
  }, [isTransitioning]);

  // Track when the screen becomes focused to delay navigation slightly.
  useFocusEffect(
    useCallback(() => {
      lastFocusAtRef.current = Date.now();
      return undefined;
    }, [])
  );

  // When transitions finish, bump focus time reference.
  useEffect(() => {
    if (!isTransitioning) {
      lastFocusAtRef.current = Date.now();
    }
  }, [isTransitioning]);

  const unlockNavigation = useCallback(() => {
    if (!lockedRef.current) {
      clearAllTimeouts();
      return;
    }

    clearAllTimeouts();
    lockedRef.current = false;
    transitionStartedRef.current = false;
    setIsNavigating(false);
  }, [clearAllTimeouts]);

  const executeNavigation = useCallback(
    (navigationFn: () => void) => {
      if (lockedRef.current) {
        pendingNavigationRef.current = navigationFn;
        if (__DEV__) {
          console.warn("[NavigationGuard] Navigation already in progress");
        }
        return;
      }

      clearAllTimeouts();

      lockedRef.current = true;
      transitionStartedRef.current = false;
      lastNavigationAtRef.current = Date.now();
      setIsNavigating(true);

      timeoutRef.current = setTimeout(() => {
        if (__DEV__) {
          console.warn("[NavigationGuard] Timeout reached, unlocking");
        }
        unlockNavigation();
      }, NAVIGATION_LOCK_TIMEOUT);

      try {
        navigationFn();
      } catch (err) {
        if (__DEV__) {
          console.error("[NavigationGuard] Navigation failed:", err);
        }
        unlockNavigation();
      }
    },
    [clearAllTimeouts, unlockNavigation]
  );

  const maybeSchedule = useCallback(
    (navigationFn: () => void) => {
      const minDelay = 50;
      const MAX_WAIT = 600;
      const CHECK_INTERVAL = 80;
      const startTs = Date.now();

      // Track timeouts for cleanup
      const timeoutsToClean: NodeJS.Timeout[] = [];
      let isCancelled = false;

      const waitAndNavigate = () => {
        if (isCancelled) return;

        const stillTransitioning = isTransitioningRef.current;
        const exceededWait = Date.now() - startTs > MAX_WAIT;

        if (stillTransitioning && !exceededWait) {
          InteractionManager.runAfterInteractions(() => {
            if (isCancelled) return;
            const timeout = setTimeout(waitAndNavigate, CHECK_INTERVAL);
            timeoutsToClean.push(timeout);
          });
          return;
        }

        const elapsed = Date.now() - lastFocusAtRef.current;
        const delay = elapsed < minDelay ? minDelay - elapsed + 50 : 0;

        InteractionManager.runAfterInteractions(() => {
          if (isCancelled) return;
          const timeout = setTimeout(() => {
            if (!isCancelled) {
              executeNavigation(navigationFn);
            }
          }, delay);
          timeoutsToClean.push(timeout);
        });
      };

      waitAndNavigate();

      // Store cleanup function in a ref so it can be called on unmount
      const cleanup = () => {
        isCancelled = true;
        timeoutsToClean.forEach(t => clearTimeout(t));
        activeNavigationsRef.current.delete(cleanup);
      };

      activeNavigationsRef.current.add(cleanup);
      return cleanup;
    },
    [executeNavigation]
  );

  const safeNavigate = useCallback(
    (route: string) => {
      maybeSchedule(() => router.navigate(route));
    },
    [router, maybeSchedule]
  );

  const safeReplace = useCallback(
    (route: string) => {
      maybeSchedule(() => router.replace(route));
    },
    [router, maybeSchedule]
  );

  const safePush = useCallback(
    (route: string) => {
      maybeSchedule(() => router.push(route));
    },
    [router, maybeSchedule]
  );

  const safeDismissTo = useCallback(
    (route: string) => {
      maybeSchedule(() => router.dismissTo(route));
    },
    [router, maybeSchedule]
  );

  const safeDismiss = useCallback(
    () => {
      maybeSchedule(() => router.dismiss());
    },
    [router, maybeSchedule]
  );

  const safeBack = useCallback(
    () => {
      maybeSchedule(() => router.back());
    },
    [router, maybeSchedule]
  );

  useEffect(() => {
    if (isTransitioning) {
      isTransitioningRef.current = true;
      transitionStartedRef.current = true;
      return;
    }

    isTransitioningRef.current = false;

    if (!lockedRef.current) {
      return;
    }

    const elapsed = Date.now() - lastNavigationAtRef.current;
    const holdFor = transitionStartedRef.current
      ? TRANSITION_RELEASE_DELAY
      : Math.max(MIN_HOLD_BEFORE_UNLOCK - elapsed, TRANSITION_RELEASE_DELAY);

    unlockAfterTransitionRef.current = setTimeout(() => {
      unlockNavigation();
    }, holdFor);
  }, [isTransitioning, unlockNavigation]);

  useEffect(() => {
    if (lockedRef.current || !pendingNavigationRef.current) {
      return;
    }

    const next = pendingNavigationRef.current;
    pendingNavigationRef.current = null;
    if (next) {
      maybeSchedule(next);
    }
  }, [isNavigating, maybeSchedule]);

  useEffect(() => () => {
    clearAllTimeouts();
    // Cancel all active navigations
    activeNavigationsRef.current.forEach(cleanup => cleanup());
    activeNavigationsRef.current.clear();
    lockedRef.current = false;
    transitionStartedRef.current = false;
    pendingNavigationRef.current = null;
  }, [clearAllTimeouts]);

  return {
    safeNavigate,
    safeReplace,
    safePush,
    safeDismissTo,
    safeDismiss,
    safeBack,
    isNavigating,
    unlockNavigation,
  };
}

