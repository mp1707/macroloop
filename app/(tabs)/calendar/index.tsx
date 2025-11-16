import React, {
  useMemo,
  useCallback,
  useState,
  useRef,
  useEffect,
} from "react";
import { View, Dimensions, StyleSheet, ViewToken } from "react-native";
import { FlatList, ScrollView } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { useNavigation } from "expo-router";
import { Colors, ColorScheme, Theme, useTheme } from "@/theme";
import { useAppStore } from "@/store/useAppStore";
import { CalendarGrid } from "@/components/shared/DatePicker/components/CalendarGrid";
import { AnimatedPressable } from "@/components/shared/AnimatedPressable";
import { AppText } from "@/components";
import {
  useOptimizedNutritionData,
  generateMonthKeys,
} from "@/hooks/useOptimizedNutritionData";
import {
  formatMonthYearDay,
  getTodayKey,
  parseDateKey,
} from "@/utils/dateHelpers";
import { useTranslation } from "react-i18next";

interface MonthData {
  year: number;
  month: number;
  key: string;
}

const { width: screenWidth } = Dimensions.get("window");

const HYDRATION_DELAY_MS = 40;

const getMonthKeyFromDateKey = (dateKey: string) => {
  const [year, month] = dateKey.split("-");
  return `${year}-${parseInt(month, 10)}`;
};

export default function CalendarTabScreen() {
  const { colors, theme, colorScheme } = useTheme();
  const styles = useMemo(
    () => createStyles(colors, theme, colorScheme),
    [colors, theme, colorScheme]
  );
  const { t, i18n } = useTranslation();
  const { selectedDate, setSelectedDate, foodLogs, dailyTargets } =
    useAppStore();
  const navigation = useNavigation();
  const [visibleMonth, setVisibleMonth] = useState<{
    year: number;
    month: number;
  } | null>(null);
  const flatListRef = useRef<FlatList<MonthData>>(null);

  // Get current selected date components
  const selectedDateObj = useMemo(
    () => new Date(selectedDate + "T00:00:00"),
    [selectedDate]
  );
  const selectedYear = selectedDateObj.getFullYear();
  const selectedMonth = selectedDateObj.getMonth() + 1;
  const selectedMonthKey = useMemo(
    () => getMonthKeyFromDateKey(selectedDate),
    [selectedDate]
  );

  // Get actual current date for month generation
  const actualCurrentDate = useMemo(() => new Date(), []);
  const currentYear = actualCurrentDate.getFullYear();
  const currentMonth = actualCurrentDate.getMonth() + 1;

  // Generate months array (24 months before current, up to current month only)
  const monthsData = useMemo((): MonthData[] => {
    const months: MonthData[] = [];
    const startDate = new Date(currentYear, currentMonth - 1 - 24, 1);

    for (let i = 0; i < 25; i++) {
      const date = new Date(
        startDate.getFullYear(),
        startDate.getMonth() + i,
        1
      );
      months.push({
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        key: `${date.getFullYear()}-${date.getMonth() + 1}`,
      });
    }
    return months;
  }, [currentYear, currentMonth]);

  const monthsIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    monthsData.forEach((month, index) => {
      map.set(month.key, index);
    });
    return map;
  }, [monthsData]);

  // Find initial scroll index (scroll to selected date's month)
  const initialScrollIndex = useMemo(() => {
    return monthsData.findIndex(
      (m) => m.year === selectedYear && m.month === selectedMonth
    );
  }, [monthsData, selectedYear, selectedMonth]);

  const safeInitialScrollIndex =
    initialScrollIndex >= 0 ? initialScrollIndex : 0;

  const initialMonthKey = useMemo(() => {
    return (
      monthsData[safeInitialScrollIndex]?.key ?? monthsData[0]?.key ?? null
    );
  }, [monthsData, safeInitialScrollIndex]);

  const [hydratedMonths, setHydratedMonths] = useState<Set<string>>(() => {
    const initialSet = new Set<string>();
    if (initialMonthKey) {
      initialSet.add(initialMonthKey);
    }
    return initialSet;
  });

  const hydratedMonthsRef = useRef(hydratedMonths);
  const hydrationTimeoutsRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});

  useEffect(() => {
    hydratedMonthsRef.current = hydratedMonths;
  }, [hydratedMonths]);

  const scheduleHydration = useCallback(
    (keys: Array<string | null | undefined>) => {
      keys.forEach((candidate) => {
        if (!candidate) {
          return;
        }

        if (
          hydratedMonthsRef.current.has(candidate) ||
          hydrationTimeoutsRef.current[candidate]
        ) {
          return;
        }

        hydrationTimeoutsRef.current[candidate] = setTimeout(() => {
          setHydratedMonths((prev) => {
            if (prev.has(candidate)) {
              return prev;
            }
            const next = new Set(prev);
            next.add(candidate);
            return next;
          });
          delete hydrationTimeoutsRef.current[candidate];
        }, HYDRATION_DELAY_MS);
      });
    },
    []
  );

  useEffect(() => {
    return () => {
      Object.values(hydrationTimeoutsRef.current).forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      hydrationTimeoutsRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (!initialMonthKey) {
      return;
    }
    if (!hydratedMonthsRef.current.has(initialMonthKey)) {
      setHydratedMonths((prev) => {
        if (prev.has(initialMonthKey)) {
          return prev;
        }
        const next = new Set(prev);
        next.add(initialMonthKey);
        return next;
      });
    }

    scheduleHydration([initialMonthKey]);
    // Initialize visible month to the selected month
    setVisibleMonth({ year: selectedYear, month: selectedMonth });
  }, [initialMonthKey, scheduleHydration, selectedYear, selectedMonth]);

  // Update header title based on selected date
  useEffect(() => {
    const { year, month, day } = parseDateKey(selectedDate);
    navigation.setOptions({
      title: formatMonthYearDay(year, month, day, i18n.language),
    });
  }, [selectedDate, navigation, i18n.language]);

  // Generate relevant month keys for optimized nutrition data calculation
  const relevantMonths = useMemo(() => {
    return generateMonthKeys(currentYear, currentMonth, 24);
  }, [currentYear, currentMonth]);

  // Use optimized nutrition data hook
  const { getDailyPercentages } = useOptimizedNutritionData(
    foodLogs,
    dailyTargets,
    relevantMonths
  );

  const handleDateSelect = useCallback(
    (dateKey: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedDate(dateKey);
    },
    [setSelectedDate]
  );

  const handleJumpToToday = useCallback(() => {
    const today = getTodayKey();
    const todayObj = new Date(today + "T00:00:00");
    const todayYear = todayObj.getFullYear();
    const todayMonth = todayObj.getMonth() + 1;

    // Find the index of today's month
    const todayMonthIndex = monthsData.findIndex(
      (m) => m.year === todayYear && m.month === todayMonth
    );

    if (todayMonthIndex >= 0) {
      flatListRef.current?.scrollToIndex({
        index: todayMonthIndex,
        animated: true,
      });
      setSelectedDate(today);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [monthsData, setSelectedDate]);

  useEffect(() => {
    if (!selectedMonthKey || !monthsIndexMap.has(selectedMonthKey)) {
      return;
    }
    scheduleHydration([selectedMonthKey]);
  }, [selectedMonthKey, monthsIndexMap, scheduleHydration]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<MonthData>[] }) => {
      if (!viewableItems || viewableItems.length === 0) {
        return;
      }

      const expandedKeys = new Set<string>();
      let firstVisibleMonth: MonthData | null = null;

      for (const viewToken of viewableItems) {
        const item = viewToken.item as MonthData | null;
        const monthKey = item?.key
          ? item.key
          : typeof viewToken.key === "string"
          ? viewToken.key
          : null;

        if (!monthKey) {
          continue;
        }

        // Track the first visible item
        if (!firstVisibleMonth && item) {
          firstVisibleMonth = item;
        }

        expandedKeys.add(monthKey);

        const monthIndex = monthsIndexMap.get(monthKey);
        if (monthIndex === undefined) {
          continue;
        }

        if (monthIndex > 0) {
          expandedKeys.add(monthsData[monthIndex - 1].key);
        }

        if (monthIndex < monthsData.length - 1) {
          expandedKeys.add(monthsData[monthIndex + 1].key);
        }
      }

      // Update visible month if we found one
      if (firstVisibleMonth) {
        setVisibleMonth({
          year: firstVisibleMonth.year,
          month: firstVisibleMonth.month,
        });
      }

      scheduleHydration(Array.from(expandedKeys));
    },
    [monthsData, monthsIndexMap, scheduleHydration]
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  });

  // Render month item for FlatList
  const renderMonthItem = useCallback(
    ({ item }: { item: MonthData }) => {
      const isHydrated = hydratedMonths.has(item.key);

      return (
        <CalendarGrid
          year={item.year}
          month={item.month}
          selectedDate={selectedDate}
          getDailyPercentages={getDailyPercentages}
          onDateSelect={handleDateSelect}
          width={screenWidth}
          useSimplifiedRings={!isHydrated}
        />
      );
    },
    [selectedDate, getDailyPercentages, handleDateSelect, hydratedMonths]
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.calendarContainer}>
        <FlatList<MonthData>
          ref={flatListRef}
          data={monthsData}
          renderItem={renderMonthItem}
          keyExtractor={(item) => item.key}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={safeInitialScrollIndex}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig.current}
          extraData={hydratedMonths}
          bounces={false}
          overScrollMode="never"
          getItemLayout={(_, index) => ({
            length: screenWidth,
            offset: screenWidth * index,
            index,
          })}
          removeClippedSubviews
        />
      </View>
      {selectedDate !== getTodayKey() && (
        <View style={styles.buttonContainer}>
          <AnimatedPressable
            onPress={handleJumpToToday}
            hapticIntensity="light"
            accessibilityLabel={t("calendar.a11y.jumpToToday")}
          >
            <AppText role="Body" color="accent">
              {t("calendar.actions.jumpToToday")}
            </AppText>
          </AnimatedPressable>
        </View>
      )}
    </ScrollView>
  );
}

const createStyles = (colors: Colors, theme: Theme, colorScheme: ColorScheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        colorScheme === "dark"
          ? colors.primaryBackground
          : colors.tertiaryBackground,
    },
    calendarContainer: {
      flex: 1,
    },
    buttonContainer: {
      paddingVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing.md,
      alignItems: "center",
    },
  });
