import React, { useMemo } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Svg, { Line, Rect, Defs, Pattern, Text } from "react-native-svg";
import { AppText, Card } from "@/components";
import { useTheme, Colors, Theme } from "@/theme";
import { useTranslation } from "react-i18next";

interface CalorieChartProps {
  dailyData: Array<{
    dateKey: string;
    hasLogs: boolean;
    totals: { calories: number; protein: number; carbs: number; fat: number };
  }>;
  todayData: {
    dateKey: string;
    totals: { calories: number; protein: number; carbs: number; fat: number };
  };
  goal?: number;
  days: 7 | 30;
}

export const CalorieChart: React.FC<CalorieChartProps> = ({
  dailyData,
  todayData,
  goal,
  days,
}) => {
  const { colors, theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);

  const chartConfig = useMemo(() => {
    const screenWidth = Dimensions.get("window").width;
    const chartWidth = screenWidth - theme.spacing.pageMargins.horizontal * 2;
    const chartHeight = 200;

    const PADDING = { left: 16, right: 16, top: 24, bottom: 0 };
    const contentWidth = chartWidth - PADDING.left - PADDING.right;
    const contentHeight = chartHeight - PADDING.top - PADDING.bottom;

    // Calculate bar dimensions (include today in count)
    const totalBars = dailyData.length + 1; // +1 for today
    const BAR_SPACING = days === 7 ? 12 : 4;
    const barWidth = (contentWidth - BAR_SPACING * (totalBars - 1)) / totalBars;

    // Dynamic corner radius based on time period
    const barRadius = days === 7 ? 6 : 2.5;

    // Find max value for scaling (10% headroom)
    const maxCalories =
      Math.max(
        goal || 0,
        ...dailyData.map((d) => d.totals.calories),
        todayData.totals.calories
      ) * 1.1;

    // Scale helper
    const scaleY = (value: number) => {
      if (maxCalories === 0) return contentHeight;
      return contentHeight - (value / maxCalories) * contentHeight;
    };

    const getBarHeight = (calories: number) => {
      if (maxCalories === 0) return 0;
      return (calories / maxCalories) * contentHeight;
    };

    return {
      chartWidth,
      chartHeight,
      PADDING,
      contentWidth,
      contentHeight,
      BAR_SPACING,
      barWidth,
      barRadius,
      maxCalories,
      scaleY,
      getBarHeight,
    };
  }, [dailyData, todayData, goal, days, theme.spacing.pageMargins.horizontal]);

  return (
    <View style={styles.container}>
      <Card elevated={true}>
        <AppText role="Headline" style={styles.title}>
          {t("trends.chart.title", { days })}
        </AppText>

        <View style={styles.chartContainer}>
          <Svg width={chartConfig.chartWidth} height={chartConfig.chartHeight}>
            {/* Dashed goal line with label */}
            {goal && chartConfig.maxCalories > 0 && (
              <>
                <Line
                  x1={chartConfig.PADDING.left}
                  y1={chartConfig.PADDING.top + chartConfig.scaleY(goal)}
                  x2={chartConfig.chartWidth - chartConfig.PADDING.right}
                  y2={chartConfig.PADDING.top + chartConfig.scaleY(goal)}
                  stroke={colors.secondaryText}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  opacity={0.5}
                />
                <Text
                  x={chartConfig.PADDING.left + 5}
                  y={chartConfig.PADDING.top + chartConfig.scaleY(goal) - 8}
                  fill={colors.secondaryText}
                  fontSize={11}
                  textAnchor="start"
                  opacity={0.8}
                >
                  Goal ({Math.round(goal)} kcal)
                </Text>
              </>
            )}

            {/* Bars for past days */}
            {dailyData.map((day, index) => {
              const x =
                chartConfig.PADDING.left +
                index * (chartConfig.barWidth + chartConfig.BAR_SPACING);
              const barHeight = day.hasLogs
                ? chartConfig.getBarHeight(day.totals.calories)
                : 0;
              const y =
                chartConfig.PADDING.top + chartConfig.contentHeight - barHeight;

              return (
                <Rect
                  key={day.dateKey}
                  x={x}
                  y={y}
                  width={chartConfig.barWidth}
                  height={Math.max(barHeight, 0)}
                  fill={colors.accent}
                  rx={chartConfig.barRadius}
                />
              );
            })}

            {/* Today's bar (solid with reduced opacity) with minimum height */}
            {(() => {
              const calculatedHeight = chartConfig.getBarHeight(
                todayData.totals.calories
              );
              const todayBarHeight = Math.max(calculatedHeight, 12);
              const x =
                chartConfig.PADDING.left +
                dailyData.length *
                  (chartConfig.barWidth + chartConfig.BAR_SPACING);
              const y =
                chartConfig.PADDING.top +
                chartConfig.contentHeight -
                todayBarHeight;

              return (
                <Rect
                  x={x}
                  y={y}
                  width={chartConfig.barWidth}
                  height={todayBarHeight}
                  fill={colors.subtleBorder}
                  opacity={0.5}
                  rx={chartConfig.barRadius}
                />
              );
            })()}
          </Svg>
        </View>
      </Card>
    </View>
  );
};

const createStyles = (colors: Colors, theme: Theme) =>
  StyleSheet.create({
    container: {},
    title: {
      color: colors.accent,
      marginBottom: theme.spacing.sm,
    },
    chartContainer: {
      alignItems: "center",
    },
  });
