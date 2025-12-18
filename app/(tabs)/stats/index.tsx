import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import * as Haptics from "expo-haptics";
import { useAppStore } from "@/store/useAppStore";
import { useTheme, Colors, Theme, ColorScheme } from "@/theme";
import { useTranslation } from "react-i18next";
import { calculateTrendsData } from "./components/trendCalculations";
import { NutrientTrendChart } from "./components/NutrientTrendChart";
import { MacroAverageCards } from "./components/MacroAverageCards";
import { ConsistencyGrid } from "./components/ConsistencyGrid";
import { AppText } from "@/components";
import type { TrendMetric } from "./components/trendCalculations";
import { useSegments } from "expo-router";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";

const FAT_BASELINE_RANGE = { min: 0.2, max: 0.35 };

export default function ProgressScreen() {
  const [timePeriod, setTimePeriod] = useState<"week" | "month">("week");
  const [selectedMetric, setSelectedMetric] = useState<TrendMetric>("calories");

  const segments = useSegments();
  const isFocused = useMemo(() => {
    if (!segments.length) {
      return false;
    }
    const tabsIndex = segments.lastIndexOf("(tabs)");
    if (tabsIndex === -1) {
      return segments[segments.length - 1] === "stats";
    }
    return segments[tabsIndex + 1] === "stats";
  }, [segments]);

  // Store selectors
  const foodLogs = useAppStore((state) => state.foodLogs);
  const dailyTargets = useAppStore((state) => state.dailyTargets);

  // Theme and localization
  const { colors, theme, colorScheme } = useTheme();
  const { t } = useTranslation();

  const styles = useMemo(
    () => createStyles(colors, theme, colorScheme),
    [colors, theme, colorScheme]
  );

  // Calculate trends data
  const daysToShow = timePeriod === "week" ? 7 : 30;

  const trendData = useMemo(() => {
    if (!isFocused) {
      return null;
    }
    return calculateTrendsData(foodLogs, daysToShow);
  }, [foodLogs, daysToShow, isFocused]);

  // Handle time period change
  const handlePeriodChange = useCallback((index: number) => {
    Haptics.selectionAsync();
    setTimePeriod(index === 0 ? "week" : "month");
  }, []);

  const nutrientMeta = useMemo(
    () => ({
      calories: {
        label: t("nutrients.calories.label"),
        unit: t("nutrients.calories.unitShort"),
        color: colors.semantic.calories,
      },
      protein: {
        label: t("nutrients.protein.label"),
        unit: t("nutrients.protein.unitShort"),
        color: colors.semantic.protein,
      },
      carbs: {
        label: t("nutrients.carbs.label"),
        unit: t("nutrients.carbs.unitShort"),
        color: colors.semantic.carbs,
      },
      fat: {
        label: t("nutrients.fat.label"),
        unit: t("nutrients.fat.unitShort"),
        color: colors.semantic.fat,
      },
    }),
    [
      colors.semantic.calories,
      colors.semantic.protein,
      colors.semantic.carbs,
      colors.semantic.fat,
      t,
    ]
  );

  const selectedMeta = nutrientMeta[selectedMetric];
  const showGoalDelta =
    (selectedMetric === "calories" || selectedMetric === "protein") &&
    typeof dailyTargets?.[selectedMetric] === "number";
  const shouldShowGoalLine =
    selectedMetric === "calories" || selectedMetric === "protein";
  const selectedTarget = shouldShowGoalLine
    ? dailyTargets?.[selectedMetric]
    : undefined;

  let goalRange: { min: number; max: number } | undefined;
  let captionText: string | undefined;

  if (selectedMetric === "fat" && typeof dailyTargets?.calories === "number") {
    const cals = dailyTargets.calories;
    goalRange = {
      min: (cals * FAT_BASELINE_RANGE.min) / 9,
      max: (cals * FAT_BASELINE_RANGE.max) / 9,
    };
    captionText = t("progress.chart.fatBaselineSimple");
  } else if (selectedMetric === "carbs") {
    captionText = t("progress.chart.carbsNoGoal");
  }

  const handleMacroSelect = useCallback((metric: TrendMetric) => {
    setSelectedMetric(metric);
  }, []);

  const visibleTrendData = isFocused ? trendData : null;

  return (
    <KeyboardAwareScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingBottom: theme.spacing.xl },
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
      bottomOffset={theme.spacing.lg}
    >
      {visibleTrendData ? (
        <Animated.View
          entering={FadeIn.duration(300)}
          layout={LinearTransition}
          style={styles.animatedContainer}
        >
          {/* Consistency Section */}
          <View style={styles.section}>
            <AppText
              role="Caption"
              color="secondary"
              style={styles.sectionHeader}
            >
              {t("progress.sections.consistency")}
            </AppText>
            <ConsistencyGrid />
          </View>

          {/* Trend Section */}
          <View style={styles.section}>
            <AppText
              role="Caption"
              color="secondary"
              style={styles.sectionHeader}
            >
              {t("progress.sections.trend")}
            </AppText>
            <View style={{ gap: theme.spacing.sm }}>
              <NutrientTrendChart
                dailyData={visibleTrendData.dailyData}
                todayData={visibleTrendData.todayData}
                goal={shouldShowGoalLine ? selectedTarget : undefined}
                goalRange={goalRange}
                days={daysToShow}
                nutrient={selectedMetric}
                nutrientLabel={selectedMeta.label}
                color={selectedMeta.color}
                unit={selectedMeta.unit}
                showGoalLine={shouldShowGoalLine}
                calorieGoal={dailyTargets?.calories}
                average={visibleTrendData.averages[selectedMetric]}
                target={showGoalDelta ? selectedTarget : undefined}
                daysWithData={visibleTrendData.daysWithData}
                showGoalDelta={showGoalDelta}
                captionText={captionText}
                timePeriod={timePeriod}
                onPeriodChange={handlePeriodChange}
              />

              <MacroAverageCards
                averages={visibleTrendData.averages}
                selectedMetric={selectedMetric}
                onSelect={handleMacroSelect}
                dailyTargets={dailyTargets}
              />
            </View>
          </View>
        </Animated.View>
      ) : null}
    </KeyboardAwareScrollView>
  );
}

const createStyles = (colors: Colors, theme: Theme, colorScheme: ColorScheme) =>
  StyleSheet.create({
    scrollView: {
      flex: 1,
      backgroundColor:
        colorScheme === "dark"
          ? colors.primaryBackground
          : colors.tertiaryBackground,
    },
    contentContainer: {
      paddingTop: theme.spacing.md,
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    animatedContainer: {
      gap: theme.spacing.lg, // Increased gap between sections
    },
    section: {
      gap: theme.spacing.xs,
    },
    sectionHeader: {
      marginLeft: theme.spacing.sm,
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
  });
