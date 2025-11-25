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
import { CalorieChart } from "./components/CalorieChart";
import { MacroAverageCards } from "./components/MacroAverageCards";

export default function TrendsScreen() {
  const [timePeriod, setTimePeriod] = useState<"week" | "month">("week");

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
        average={trendData.averages.calories}
        target={dailyTargets?.calories}
        daysWithData={trendData.daysWithData}
      />

      {/* Calorie Chart */}
      <CalorieChart
        dailyData={trendData.dailyData}
        todayData={trendData.todayData}
        goal={dailyTargets?.calories}
        days={timePeriod === "week" ? 7 : 30}
      />

      {/* Macro Average Cards */}
      <MacroAverageCards averages={trendData.averages} />
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
