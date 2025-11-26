import React, { useEffect, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { AppText, Card } from "@/components";
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
    caption,
  } = props;

  const { colors, theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);

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

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: 800,
      easing: Easing.out(Easing.quad),
    });
  }, [dailyData, nutrient]);

  return (
    <View style={styles.container}>
      <Card elevated={true} padding={theme.spacing.xl}>
        <AppText role="Headline" style={styles.title}>
          {t("trends.chart.nutrientTitle", { nutrient: nutrientLabel, days })}
        </AppText>
        {caption && (
          <AppText role="Caption" color="secondary" style={styles.goalCaption}>
            {caption}
          </AppText>
        )}

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
             />

            {activeBar && (
              <ChartTooltip
                activeBar={activeBar}
                chartWidth={config.chartWidth}
                color={color}
                unit={unit}
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
    title: {
      marginBottom: theme.spacing.sm,
    },
    chartContainer: {
      alignItems: "center",
    },
    chartWrapper: {
      position: "relative",
    },
    goalCaption: {
      marginBottom: theme.spacing.md,
    },
  });
