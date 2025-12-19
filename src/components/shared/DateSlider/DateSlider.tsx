import React, {
  useMemo,
  useRef,
  useCallback,
  useEffect,
  useState,
} from "react";
import { View, FlatList, Dimensions } from "react-native";
import * as Haptics from "expo-haptics";

import { DayData, DayItem } from "./components/DayItem";
import { DateSliderHeader } from "./components/DateSliderHeader";
import { useTheme } from "@/theme";
import { useAppStore } from "@/store/useAppStore";
import { createStyles } from "./DateSlider.styles";
import {
  formatDateToLocalString,
  parseDateKey,
  getTodayKey,
} from "@/utils/dateHelpers";
import { aggregateConsumedNutrientsByDate } from "@/utils/nutrientCalculations";

const WEEKDAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const WEEKS_TO_LOAD_AT_ONCE = 2;

// Calculate dynamic item width to fit exactly 7 days on screen
const SCREEN_WIDTH = Dimensions.get("window").width;
const HORIZONTAL_PADDING = 24; // 3×8pt - strict 8pt grid compliance
const ITEM_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING) / 7;

export const DateSlider = () => {
  const { colors, theme } = useTheme();
  const styles = useMemo(
    () => createStyles(colors, theme, ITEM_WIDTH),
    [colors, theme]
  );
  const flatListRef = useRef<FlatList>(null);
  const scrollDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const loadMoreTimersRef = useRef<Set<NodeJS.Timeout>>(new Set());

  const { foodLogs, selectedDate, setSelectedDate, dailyTargets } =
    useAppStore();

  const [pastWeeksLoaded, setPastWeeksLoaded] = useState(2);
  const [futureWeeksLoaded, setFutureWeeksLoaded] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const getMondayOfWeek = useCallback((date: Date): Date => {
    const dayOfWeek = (date.getDay() + 6) % 7;
    const monday = new Date(date);
    monday.setDate(date.getDate() - dayOfWeek);
    return monday;
  }, []);

  // Pre-index food logs by date for O(1) lookups with percentageEaten applied
  const foodLogsByDate = useMemo(
    () => aggregateConsumedNutrientsByDate(foodLogs),
    [foodLogs]
  );

  const dateRange = useMemo(() => {
    const today = new Date();
    const currentWeekMonday = getMondayOfWeek(today);
    const dates: DayData[] = [];

    // Single pass: generate DayData using pre-indexed food logs (Phase 2 optimization)
    for (
      let weekOffset = -pastWeeksLoaded;
      weekOffset <= futureWeeksLoaded;
      weekOffset++
    ) {
      const weekStartDate = new Date(currentWeekMonday);
      weekStartDate.setDate(currentWeekMonday.getDate() + weekOffset * 7);

      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(weekStartDate);
        currentDate.setDate(weekStartDate.getDate() + i);

        // Use local-safe date key (YYYY-MM-DD)
        const dateString = formatDateToLocalString(currentDate);
        const weekdayIndex = (currentDate.getDay() + 6) % 7;

        // O(1) lookup from pre-indexed map (only use calories & protein for performance)
        const dailyNutrients = foodLogsByDate.get(dateString);
        const dailyTotals = {
          calories: dailyNutrients?.calories || 0,
          protein: dailyNutrients?.protein || 0,
        };

        const percentages = {
          calories: dailyTargets?.calories
            ? (dailyTotals.calories / dailyTargets.calories) * 100
            : 0,
          protein: dailyTargets?.protein
            ? (dailyTotals.protein / dailyTargets.protein) * 100
            : 0,
        };

        dates.push({
          date: dateString,
          weekday: WEEKDAY_LETTERS[weekdayIndex],
          percentages,
        });
      }
    }
    return dates;
  }, [
    pastWeeksLoaded,
    futureWeeksLoaded,
    foodLogsByDate,
    dailyTargets,
    getMondayOfWeek,
  ]);

  const handleDateSelect = useCallback(
    (date: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedDate(date);
    },
    [setSelectedDate]
  );

  const renderDayItem = useCallback(
    ({ item }: { item: DayData }) => (
      <DayItem
        item={item}
        isSelected={item.date === selectedDate}
        onPress={handleDateSelect}
        styles={styles}
      />
    ),
    [selectedDate, styles, handleDateSelect]
  );

  const keyExtractor = useCallback((item: DayData) => item.date, []);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_WIDTH,
      offset: ITEM_WIDTH * index,
      index,
    }),
    []
  );

  const handleScrollEnd = useCallback(
    (event: any) => {
      if (isLoading) return;

      // Extract values before setTimeout to avoid event nullification
      const contentOffset = event.nativeEvent.contentOffset.x;
      const contentWidth = event.nativeEvent.contentSize.width;
      const layoutWidth = event.nativeEvent.layoutMeasurement.width;

      // Phase 3: Debounce scroll handler to prevent rapid state updates
      if (scrollDebounceTimer.current) {
        clearTimeout(scrollDebounceTimer.current);
      }

      scrollDebounceTimer.current = setTimeout(() => {
        // Load more past weeks when scrolling backward
        if (contentOffset < ITEM_WIDTH * 7) {
          setIsLoading(true);
          const listRef = flatListRef.current;
          setPastWeeksLoaded((prev) => {
            const newWeeks = prev + WEEKS_TO_LOAD_AT_ONCE;
            const timer = setTimeout(() => {
              const newContentOffset =
                contentOffset + WEEKS_TO_LOAD_AT_ONCE * 7 * ITEM_WIDTH;
              listRef?.scrollToOffset({
                offset: newContentOffset,
                animated: false,
              });
              setIsLoading(false);
              loadMoreTimersRef.current.delete(timer);
            }, 100);
            loadMoreTimersRef.current.add(timer);
            return newWeeks;
          });
        }

        // Load more future weeks when scrolling forward
        if (contentOffset + layoutWidth > contentWidth - ITEM_WIDTH * 7) {
          setIsLoading(true);
          setFutureWeeksLoaded((prev) => {
            const newWeeks = prev + WEEKS_TO_LOAD_AT_ONCE;
            const timer = setTimeout(() => {
              setIsLoading(false);
              loadMoreTimersRef.current.delete(timer);
            }, 100);
            loadMoreTimersRef.current.add(timer);
            return newWeeks;
          });
        }
      }, 150); // Debounce delay: 150ms
    },
    [isLoading]
  );

  // Auto-update selectedDate to today if it's from a previous day
  useEffect(() => {
    const today = getTodayKey();
    if (selectedDate < today) {
      setSelectedDate(today);
    }
  }, []); // Run once on mount

  useEffect(() => {
    const selectedDateIndex = dateRange.findIndex(
      (day) => day.date === selectedDate
    );

    if (selectedDateIndex !== -1) {
      // Selected date is already in range, just scroll to it
      const weekIndex = Math.floor(selectedDateIndex / 7);
      const offset = weekIndex * 7 * ITEM_WIDTH;

      requestAnimationFrame(() => {
        flatListRef.current?.scrollToOffset({
          offset,
          animated: false,
        });
      });
    } else {
      // Selected date is outside current range - expand range to include it
      const today = new Date();
      const currentWeekMonday = getMondayOfWeek(today);
      // Parse selectedDate (YYYY-MM-DD) as a local Date to avoid UTC shift
      const { year, month, day } = parseDateKey(selectedDate);
      const selectedDateObj = new Date(year, month - 1, day);
      const selectedWeekMonday = getMondayOfWeek(selectedDateObj);

      const weeksDifference = Math.floor(
        (selectedWeekMonday.getTime() - currentWeekMonday.getTime()) /
          (7 * 24 * 60 * 60 * 1000)
      );

      if (weeksDifference < 0) {
        // Selected date is in the past - increase pastWeeksLoaded
        const requiredPastWeeks = Math.abs(weeksDifference);
        if (requiredPastWeeks > pastWeeksLoaded) {
          setPastWeeksLoaded(requiredPastWeeks + WEEKS_TO_LOAD_AT_ONCE);
        }
      } else if (weeksDifference > 0) {
        // Selected date is in the future - increase futureWeeksLoaded
        const requiredFutureWeeks = weeksDifference;
        if (requiredFutureWeeks > futureWeeksLoaded) {
          setFutureWeeksLoaded(requiredFutureWeeks + WEEKS_TO_LOAD_AT_ONCE);
        }
      }
    }
  }, [
    selectedDate,
    dateRange,
    pastWeeksLoaded,
    futureWeeksLoaded,
    getMondayOfWeek,
  ]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      if (scrollDebounceTimer.current) {
        clearTimeout(scrollDebounceTimer.current);
      }
      loadMoreTimersRef.current.forEach((timer) => clearTimeout(timer));
      loadMoreTimersRef.current.clear();
    };
  }, []);

  return (
    <View style={styles.container}>
      <DateSliderHeader />

      <View
        style={[
          styles.sliderContainer,
          { paddingHorizontal: HORIZONTAL_PADDING / 2 },
        ]}
      >
        <FlatList
          ref={flatListRef}
          data={dateRange}
          renderItem={renderDayItem}
          keyExtractor={keyExtractor}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={ITEM_WIDTH * 7}
          decelerationRate="fast"
          getItemLayout={getItemLayout}
          initialNumToRender={11} // Initial 1.5 weeks (memory optimized)
          maxToRenderPerBatch={7} // One week at a time
          windowSize={2} // Reduced buffer for better performance
          updateCellsBatchingPeriod={100} // Batch updates for smoother scrolling
          removeClippedSubviews={true}
          onMomentumScrollEnd={handleScrollEnd}
          contentContainerStyle={{ paddingRight: SCREEN_WIDTH }}
        />
      </View>
    </View>
  );
};
