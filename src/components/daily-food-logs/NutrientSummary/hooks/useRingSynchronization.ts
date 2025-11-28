import { useEffect, useMemo, useRef, useState } from "react";
import { useSegments } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { useAppStore } from "@/store/useAppStore";

/**
 * Hook to manage ring synchronization and remounting logic.
 * Handles two specific cases:
 * 1. Instant sync when switching tabs to prevent animation replay
 * 2. Fresh mount when date changes while screen is blurred (e.g. via Trends tooltip)
 */
export const useRingSynchronization = () => {
  const { selectedDate } = useAppStore();
  const displayedDateRef = useRef(selectedDate);

  // --- Logic 1: Handle instant sync when switching tabs ---
  const segments = useSegments();
  const isInsideTabs = useMemo(
    () => Boolean(segments?.includes("(tabs)")),
    [segments]
  );
  const activeTab = useMemo(() => {
    if (!segments?.length || !isInsideTabs) {
      return null;
    }
    const tabsEntryIndex = segments.indexOf("(tabs)");
    return segments[tabsEntryIndex + 1] ?? null;
  }, [segments, isInsideTabs]);

  const tabStateRef = useRef({
    initialized: false,
    previousTab: null as string | null,
  });
  const [shouldInstantlySyncRings, setShouldInstantlySyncRings] = useState(false);

  useEffect(() => {
    if (!activeTab) {
      return;
    }

    if (!tabStateRef.current.initialized) {
      tabStateRef.current.initialized = true;
      tabStateRef.current.previousTab = activeTab;
      return;
    }

    if (tabStateRef.current.previousTab !== activeTab) {
      const isReturningToLoggingTab = activeTab === "index";
      tabStateRef.current.previousTab = activeTab;

      if (isReturningToLoggingTab) {
        // Only sync instantly if the date hasn't changed.
        // If the date changed (e.g. via Trends tooltip), we want the animation to play.
        if (displayedDateRef.current === selectedDate) {
          setShouldInstantlySyncRings(true);
        }
      }
    }
  }, [activeTab, selectedDate]);

  useEffect(() => {
    if (!shouldInstantlySyncRings) {
      return;
    }

    const timeout = setTimeout(() => {
      setShouldInstantlySyncRings(false);
    }, 0);

    return () => clearTimeout(timeout);
  }, [shouldInstantlySyncRings]);

  // --- Logic 2: Handle fresh mount when date changes while blurred ---
  const isFocused = useIsFocused();
  const [mountKey, setMountKey] = useState(0);
  const prevIsFocused = useRef(isFocused);

  useEffect(() => {
    const justGainedFocus = isFocused && !prevIsFocused.current;

    if (justGainedFocus) {
      // We just returned to the screen.
      // Check if the date changed while we were away.
      if (displayedDateRef.current !== selectedDate) {
        setMountKey((k) => k + 1);
      }
    }

    // Keep track of the date currently being displayed while focused
    if (isFocused) {
      displayedDateRef.current = selectedDate;
    }

    prevIsFocused.current = isFocused;
  }, [isFocused, selectedDate]);

  return {
    shouldInstantlySyncRings,
    mountKey,
  };
};
