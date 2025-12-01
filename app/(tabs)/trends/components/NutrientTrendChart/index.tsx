import React, { useEffect, useMemo, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { Card } from "@/components";
import { useTheme, Colors, Theme } from "@/theme";
import { useTranslation } from "react-i18next";
import {
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";

import { NutrientTrendChartProps } from "./types";
import { useChartConfig } from "./useChartConfig";
import { useChartGestures } from "./useChartGestures";
import { ChartCanvas } from "./ChartCanvas";
import { ChartTooltip } from "./ChartTooltip";
import { ChartHeader } from "./ChartHeader";
import { useAppStore } from "@/store/useAppStore";
import { useSafeRouter } from "@/hooks/useSafeRouter";

export const NutrientTrendChart: React.FC<NutrientTrendChartProps> = (props) => {
  const {
    dailyData,
    todayData,
    goal,
    goalRange,
    days,
    nutrient,
    nutrientLabel,
    color,
    unit,
    showGoalLine = true,
    average,
    target,
    daysWithData,
    showGoalDelta,
    captionText,
  } = props;

  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);
  const { setSelectedDate } = useAppStore();
  const router = useSafeRouter();

  const { config, bars } = useChartConfig({
    dailyData,
    todayData,
    goal,
    goalRange,
    days,
    nutrient,
    color,
  });

  const { activeBar, gesture } = useChartGestures({
    dailyData,
    todayData,
    nutrient,
    chartConfig: config,
  });

  const progress = useSharedValue(0);

  const handleDateSelect = useCallback(
    (dateKey: string) => {
      setSelectedDate(dateKey);
      router.navigate("/(tabs)");
    },
    [setSelectedDate, router]
  );

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: 800,
      easing: Easing.out(Easing.quad),
    });
  }, [days, dailyData[0]?.dateKey]);

  return (
    <View style={styles.container}>
      <Card elevated={true} padding={theme.spacing.xl}>
        <ChartHeader
          average={average}
          target={target}
          daysWithData={daysWithData}
          nutrient={nutrient}
          label={nutrientLabel}
          unit={unit}
          showGoalDelta={showGoalDelta}
          days={days}
          goal={goal}
          showGoalLine={showGoalLine}
          captionText={captionText}
          calorieGoal={props.calorieGoal}
        />

        <View style={styles.chartContainer}>
          <View
            style={[
              styles.chartWrapper,
              {
                width: config.chartWidth,
                height: config.chartHeight,
              },
            ]}
          >
             <ChartCanvas
                config={config}
                bars={bars}
                goal={goal}
                goalRange={goalRange}
                color={color}
                progress={progress}
                gesture={gesture}
                showGoalLine={showGoalLine}
                activeBarKey={activeBar?.dateKey}
             />

            {activeBar && (
              <ChartTooltip
                activeBar={activeBar}
                chartWidth={config.chartWidth}
                color={color}
                unit={unit}
                nutrient={nutrient}
                calorieGoal={props.calorieGoal}
                onDateSelect={handleDateSelect}
              />
            )}
          </View>
        </View>
      </Card>
    </View>
  );
};

const createStyles = (colors: Colors, theme: Theme) =>
  StyleSheet.create({
    container: {},
    chartContainer: {
      alignItems: "center",
    },
    chartWrapper: {
      position: "relative",
    },
  });
