import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Host, Picker } from "@expo/ui/swift-ui";
import * as Haptics from "expo-haptics";
import { useAppStore } from "@/store/useAppStore";
import { useTheme, Colors, Theme, ColorScheme } from "@/theme";
import { useTranslation } from "react-i18next";
import { useTabBarSpacing } from "@/hooks/useTabBarSpacing";
import { calculateTrendsData } from "./components/trendCalculations";
import { AverageDisplay } from "./components/AverageDisplay";
import { NutrientTrendChart } from "./components/NutrientTrendChart";
import { MacroAverageCards } from "./components/MacroAverageCards";
import type { TrendMetric } from "./components/trendCalculations";

const DEFAULT_FAT_BASELINE_PERCENTAGE = 20;

export default function TrendsScreen() {
  const [timePeriod, setTimePeriod] = useState<"week" | "month">("week");
  const [selectedMetric, setSelectedMetric] = useState<TrendMetric>("calories");

  // Store selectors
  const foodLogs = useAppStore((state) => state.foodLogs);
  const dailyTargets = useAppStore((state) => state.dailyTargets);

  // Theme and localization
  const { colors, theme, colorScheme } = useTheme();
  const { t } = useTranslation();
  const { dynamicBottomPadding } = useTabBarSpacing();

  const styles = useMemo(
    () => createStyles(colors, theme, colorScheme),
    [colors, theme, colorScheme]
  );

  // Calculate trends data
  const trendData = useMemo(
    () =>
      calculateTrendsData(
        foodLogs,
        timePeriod === "week" ? 7 : 30,
        dailyTargets
      ),
    [foodLogs, timePeriod, dailyTargets]
  );

  // Time period picker options
  const pickerOptions = useMemo(
    () => [t("trends.timePeriod.week"), t("trends.timePeriod.month")],
    [t]
  );

  // Handle time period change
  const handlePeriodChange = useCallback(
    ({ nativeEvent: { index } }: { nativeEvent: { index: number } }) => {
      Haptics.selectionAsync();
      setTimePeriod(index === 0 ? "week" : "month");
    },
    []
  );

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
  if (selectedMetric === "fat" && typeof dailyTargets?.calories === "number") {
    const cals = dailyTargets.calories;
    goalRange = {
      min: (cals * 0.2) / 9,
      max: (cals * 0.35) / 9,
    };
  }

  const chartCaption = useMemo(() => {
    if (selectedMetric === "fat") {
      return t("trends.chart.fatBaselineNoValue", {
        percentage: "20-35",
      });
    }

    if (selectedMetric === "carbs") {
      return t("trends.chart.carbsNoGoal");
    }

    if (
      (selectedMetric === "calories" || selectedMetric === "protein") &&
      typeof selectedTarget === "number"
    ) {
      return t("trends.chart.goalLabel", {
        goal: Math.round(selectedTarget),
        unit: selectedMeta.unit,
      });
    }

    return undefined;
  }, [dailyTargets?.fat, selectedMetric, selectedMeta, selectedTarget, t]);

  const handleMacroSelect = useCallback((metric: TrendMetric) => {
    setSelectedMetric((prev) => (prev === metric ? "calories" : metric));
  }, []);

  return (
    <KeyboardAwareScrollView
      style={styles.scrollView}
      contentContainerStyle={[styles.contentContainer]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
      bottomOffset={theme.spacing.lg}
    >
      {/* Time Period Picker */}
      <View style={styles.pickerContainer}>
        <Host matchContents colorScheme={colorScheme}>
          <Picker
            options={pickerOptions}
            selectedIndex={timePeriod === "week" ? 0 : 1}
            onOptionSelected={handlePeriodChange}
            variant="segmented"
          />
        </Host>
      </View>

      {/* Average Display */}
      <AverageDisplay
        average={trendData.averages[selectedMetric]}
        target={showGoalDelta ? selectedTarget : undefined}
        daysWithData={trendData.daysWithData}
        nutrient={selectedMetric}
        label={selectedMeta.label}
        unit={selectedMeta.unit}
        showGoalDelta={showGoalDelta}
      />

      {/* Nutrient Chart */}
      <NutrientTrendChart
        dailyData={trendData.dailyData}
        todayData={trendData.todayData}
        goal={shouldShowGoalLine ? selectedTarget : undefined}
        goalRange={goalRange}
        days={timePeriod === "week" ? 7 : 30}
        nutrient={selectedMetric}
        nutrientLabel={selectedMeta.label}
        color={selectedMeta.color}
        unit={selectedMeta.unit}
        showGoalLine={shouldShowGoalLine}
        caption={chartCaption}
      />

      {/* Macro Average Cards */}
      <MacroAverageCards
        averages={trendData.averages}
        selectedMetric={selectedMetric}
        onSelect={handleMacroSelect}
      />
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
      paddingTop: theme.spacing.xl,
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    pickerContainer: {
      paddingHorizontal: theme.spacing.sm,
    },
  });
