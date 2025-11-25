import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Svg, { Line, Rect } from "react-native-svg";
import { AppText, Card } from "@/components";
import { useTheme, Colors, Theme } from "@/theme";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import type { TrendMetric, TrendsData } from "./trendCalculations";
import { formatDisplayDate } from "@/utils/dateHelpers";

interface NutrientTrendChartProps {
  dailyData: TrendsData["dailyData"];
  todayData: TrendsData["todayData"];
  goal?: number;
  days: 7 | 30;
  nutrient: TrendMetric;
  nutrientLabel: string;
  color: string;
  unit: string;
  showGoalLine?: boolean;
  caption?: string;
}

export const NutrientTrendChart: React.FC<NutrientTrendChartProps> = ({
  dailyData,
  todayData,
  goal,
  days,
  nutrient,
  nutrientLabel,
  color,
  unit,
  showGoalLine = true,
  caption,
}) => {
  const { colors, theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);
  const [selectedBar, setSelectedBar] = useState<{
    centerX: number;
    topY: number;
    value: number;
    id: string;
    dateKey: string;
  } | null>(null);
  const [tooltipSize, setTooltipSize] = useState({ width: 0, height: 0 });

  const chartConfig = useMemo(() => {
    const screenWidth = Dimensions.get("window").width;
    const chartWidth = screenWidth - theme.spacing.pageMargins.horizontal * 2;
    const chartHeight = 180;

    const PADDING = { left: 16, right: 16, top: 24, bottom: 0 };
    const contentWidth = chartWidth - PADDING.left - PADDING.right;
    const contentHeight = chartHeight - PADDING.top - PADDING.bottom;

    const totalBars = dailyData.length + 1; // +1 for today
    const BAR_SPACING = days === 7 ? 12 : 4;
    const barWidth = (contentWidth - BAR_SPACING * (totalBars - 1)) / totalBars;
    const barRadius = days === 7 ? 6 : 2.5;

    const dailyTotals = dailyData.map((day) => day.totals[nutrient]);
    const todayValue = todayData.totals[nutrient];

    // Ensure there is at least one value when calculating max
    const valuesForMax = [goal ?? 0, ...dailyTotals, todayValue];
    const rawMax = Math.max(...valuesForMax);
    const maxValue = rawMax === 0 ? 0 : rawMax * 1.1;

    const scaleY = (value: number) => {
      if (maxValue === 0) return contentHeight;
      return contentHeight - (value / maxValue) * contentHeight;
    };

    const getBarHeight = (value: number) => {
      if (maxValue === 0) return 0;
      return (value / maxValue) * contentHeight;
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
      maxValue,
      scaleY,
      getBarHeight,
    };
  }, [
    dailyData,
    todayData,
    goal,
    days,
    nutrient,
    theme.spacing.pageMargins.horizontal,
  ]);

  const handleBarSelect = useCallback(
    (centerX: number, topY: number, value: number, id: string, dateKey: string) => {
      setSelectedBar((current) => {
        const isSame = current?.id === id;
        const next = isSame ? null : { centerX, topY, value, id, dateKey };
        Haptics.selectionAsync().catch(() => undefined);
        return next;
      });
    },
    []
  );

  useEffect(() => {
    setSelectedBar(null);
  }, [dailyData, todayData, nutrient]);

  const hasGoalLine =
    showGoalLine && typeof goal === "number" && chartConfig.maxValue > 0;
  const goalLineY =
    hasGoalLine && typeof goal === "number"
      ? chartConfig.PADDING.top + chartConfig.scaleY(goal)
      : undefined;

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
                width: chartConfig.chartWidth,
                height: chartConfig.chartHeight,
              },
            ]}
          >
            <Svg
              width={chartConfig.chartWidth}
              height={chartConfig.chartHeight}
            >
              {goalLineY !== undefined && (
                <Line
                  x1={theme.spacing.sm}
                  y1={goalLineY}
                  x2={chartConfig.chartWidth - theme.spacing.sm}
                  y2={goalLineY}
                  stroke={colors.primaryText}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  opacity={0.6}
                />
              )}

              {dailyData.map((day, index) => {
                const x =
                  chartConfig.PADDING.left +
                  index * (chartConfig.barWidth + chartConfig.BAR_SPACING);
                const barHeight = day.hasLogs
                  ? chartConfig.getBarHeight(day.totals[nutrient])
                  : 0;
                const y =
                  chartConfig.PADDING.top +
                  chartConfig.contentHeight -
                  barHeight;
                const centerX = x + chartConfig.barWidth / 2;
                const value = day.totals[nutrient];

                return (
                  <Rect
                    key={day.dateKey}
                    x={x}
                    y={y}
                    width={chartConfig.barWidth}
                    height={Math.max(barHeight, 0)}
                    fill={color}
                    rx={chartConfig.barRadius}
                    onPress={() =>
                      handleBarSelect(
                        centerX,
                        y,
                        value,
                        day.dateKey,
                        day.dateKey
                      )
                    }
                  />
                );
              })}

              {(() => {
                const calculatedHeight = chartConfig.getBarHeight(
                  todayData.totals[nutrient]
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
                const centerX = x + chartConfig.barWidth / 2;
                const value = todayData.totals[nutrient];

                return (
                  <Rect
                    x={x}
                    y={y}
                    width={chartConfig.barWidth}
                    height={todayBarHeight}
                    fill={color}
                    opacity={0.35}
                    rx={chartConfig.barRadius}
                    onPress={() =>
                      handleBarSelect(
                        centerX,
                        y,
                        value,
                        todayData.dateKey,
                        todayData.dateKey
                      )
                    }
                  />
                );
              })()}
            </Svg>
            {selectedBar && (
              <View pointerEvents="none" style={styles.tooltipOverlay}>
                <View
                  style={[
                    styles.tooltip,
                    {
                      left: getTooltipLeft(
                        selectedBar.centerX,
                        tooltipSize.width,
                        chartConfig.chartWidth,
                        theme.spacing.sm
                      ),
                      top: getTooltipTop(
                        selectedBar.topY,
                        tooltipSize.height,
                        theme.spacing.sm
                      ),
                    },
                  ]}
                  onLayout={(event) => {
                    const { width, height } = event.nativeEvent.layout;
                    setTooltipSize((prev) => ({
                      width: Math.max(prev.width, width),
                      height: Math.max(prev.height, height),
                    }));
                  }}
                >
                  <View
                    style={[styles.tooltipDot, { backgroundColor: color }]}
                  />
                  <AppText role="Caption" style={styles.tooltipDate}>
                    {formatDisplayDate(selectedBar.dateKey)}
                  </AppText>
                  <AppText role="Caption" style={styles.tooltipText}>
                    {`${Math.round(selectedBar.value)} ${unit}`}
                  </AppText>
                </View>
              </View>
            )}
          </View>
        </View>
      </Card>
    </View>
  );
};

const getTooltipLeft = (
  centerX: number,
  tooltipWidth: number,
  chartWidth: number,
  margin: number
) => {
  if (tooltipWidth === 0) {
    return centerX;
  }

  const rawLeft = centerX - tooltipWidth / 2;
  const minLeft = margin;
  const maxLeft = chartWidth - tooltipWidth - margin;
  if (rawLeft < minLeft) return minLeft;
  if (rawLeft > maxLeft) return maxLeft;
  return rawLeft;
};

const getTooltipTop = (topY: number, tooltipHeight: number, gap: number) => {
  if (tooltipHeight === 0) {
    return Math.max(topY - gap, 0);
  }

  const rawTop = topY - tooltipHeight - gap;
  return rawTop < 0 ? 0 : rawTop;
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
    tooltipOverlay: {
      ...StyleSheet.absoluteFillObject,
    },
    tooltip: {
      position: "absolute",
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      backgroundColor: colors.secondaryBackground,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    tooltipDate: {
      color: colors.secondaryText,
      fontWeight: "600",
    },
    tooltipDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    tooltipText: {
      color: colors.primaryText,
      fontWeight: "600",
    },
  });
