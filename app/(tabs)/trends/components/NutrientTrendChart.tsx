import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import {
  Canvas,
  Rect,
  Line,
  RoundedRect,
  DashPathEffect,
  vec,
} from "@shopify/react-native-skia";
import { AppText, Card } from "@/components";
import { useTheme, Colors, Theme } from "@/theme";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import type { TrendMetric, TrendsData } from "./trendCalculations";
import { formatDisplayDate } from "@/utils/dateHelpers";
import {
  useSharedValue,
  withTiming,
  useDerivedValue,
  interpolate,
  Extrapolation,
  Easing,
  SharedValue,
} from "react-native-reanimated";
import { runOnJS } from "react-native-worklets";
import { GestureDetector, Gesture } from "react-native-gesture-handler";

interface NutrientTrendChartProps {
  dailyData: TrendsData["dailyData"];
  todayData: TrendsData["todayData"];
  goal?: number;
  goalRange?: { min: number; max: number };
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
  goalRange,
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
  const [draggedBar, setDraggedBar] = useState<{
    centerX: number;
    topY: number;
    value: number;
    id: string;
    dateKey: string;
  } | null>(null);
  const [tooltipSize, setTooltipSize] = useState({ width: 0, height: 0 });

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: 800,
      easing: Easing.out(Easing.quad),
    });
  }, [dailyData, nutrient]);

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

    const valuesForMax = [
      goal ?? 0,
      goalRange?.max ?? 0,
      ...dailyTotals,
      todayValue,
    ];
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
      totalBars,
    };
  }, [
    dailyData,
    todayData,
    goal,
    goalRange,
    days,
    nutrient,
    theme.spacing.pageMargins.horizontal,
  ]);

  const handleBarSelect = useCallback(
    (
      centerX: number,
      topY: number,
      value: number,
      id: string,
      dateKey: string
    ) => {
      setSelectedBar((current) => {
        const isSame = current?.id === id;
        const next = isSame ? null : { centerX, topY, value, id, dateKey };
        Haptics.selectionAsync().catch(() => undefined);
        return next;
      });
    },
    []
  );

  const handleDragSelect = useCallback(
    (
      centerX: number,
      topY: number,
      value: number,
      id: string,
      dateKey: string
    ) => {
      setDraggedBar((current) => {
        if (current?.id === id) return current;
        Haptics.selectionAsync().catch(() => undefined);
        return { centerX, topY, value, id, dateKey };
      });
    },
    []
  );

  const handleDragEnd = useCallback(
    (
      centerX: number,
      topY: number,
      value: number,
      id: string,
      dateKey: string
    ) => {
      setSelectedBar({ centerX, topY, value, id, dateKey });
    },
    []
  );

  const clearDrag = useCallback(() => {
    setDraggedBar(null);
  }, []);

  useEffect(() => {
    setSelectedBar(null);
    setDraggedBar(null);
  }, [dailyData, todayData, nutrient]);

  const getBarDataFromX = (x: number) => {
    "worklet";
    const {
      PADDING,
      barWidth,
      BAR_SPACING,
      totalBars,
      contentHeight,
      maxValue,
    } = chartConfig;

    if (x < PADDING.left) return null;

    // Calculate rough index
    const relativeX = x - PADDING.left;
    const step = barWidth + BAR_SPACING;
    const index = Math.floor(relativeX / step);

    if (index >= 0 && index < totalBars) {
      // Relaxed hit detection for smoother swiping
      // If we are in the slot, we select the bar
      const isToday = index === dailyData.length;
      const data = isToday ? todayData : dailyData[index];
      const value = data.totals[nutrient];

      // Center of the bar
      const finalX = PADDING.left + index * step;
      const centerX = finalX + barWidth / 2;

      const barHeight = maxValue === 0 ? 0 : (value / maxValue) * contentHeight;

      // Ensure minimum visual height matching render logic
      const visualHeight = isToday
        ? Math.max(barHeight, 12)
        : Math.max(barHeight, 0);

      const y = PADDING.top + contentHeight - visualHeight;

      return {
        centerX,
        topY: y,
        value,
        id: data.dateKey,
        dateKey: data.dateKey,
      };
    }
    return null;
  };

  const tapGesture = Gesture.Tap()
    .maxDeltaX(10)
    .onEnd((e) => {
      const data = getBarDataFromX(e.x);
      if (data) {
        runOnJS(handleBarSelect)(
          data.centerX,
          data.topY,
          data.value,
          data.id,
          data.dateKey
        );
      }
    });

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onStart((e) => {
      const data = getBarDataFromX(e.x);
      if (data) {
        runOnJS(handleDragSelect)(
          data.centerX,
          data.topY,
          data.value,
          data.id,
          data.dateKey
        );
      }
    })
    .onUpdate((e) => {
      const data = getBarDataFromX(e.x);
      if (data) {
        runOnJS(handleDragSelect)(
          data.centerX,
          data.topY,
          data.value,
          data.id,
          data.dateKey
        );
      }
    })
    .onEnd((e) => {
      const data = getBarDataFromX(e.x);
      if (data) {
        runOnJS(handleDragEnd)(
          data.centerX,
          data.topY,
          data.value,
          data.id,
          data.dateKey
        );
      }
    })
    .onFinalize(() => {
      runOnJS(clearDrag)();
    });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  const hasGoalLine =
    showGoalLine && typeof goal === "number" && chartConfig.maxValue > 0;
  const goalLineY =
    hasGoalLine && typeof goal === "number"
      ? chartConfig.PADDING.top + chartConfig.scaleY(goal)
      : undefined;

  const hasGoalRange =
    goalRange &&
    typeof goalRange.min === "number" &&
    typeof goalRange.max === "number" &&
    chartConfig.maxValue > 0;

  // Prepare bar data for rendering
  const renderBars = useMemo(() => {
    const bars = [];
    // Daily bars
    for (let i = 0; i < dailyData.length; i++) {
      const day = dailyData[i];
      const x =
        chartConfig.PADDING.left +
        i * (chartConfig.barWidth + chartConfig.BAR_SPACING);
      const targetHeight = day.hasLogs
        ? chartConfig.getBarHeight(day.totals[nutrient])
        : 0;
      bars.push({
        key: day.dateKey,
        x,
        targetHeight: Math.max(targetHeight, 0),
        width: chartConfig.barWidth,
        color: color,
        rx: chartConfig.barRadius,
        isToday: false,
        index: i,
      });
    }
    // Today bar
    const x =
      chartConfig.PADDING.left +
      dailyData.length * (chartConfig.barWidth + chartConfig.BAR_SPACING);
    const calculatedHeight = chartConfig.getBarHeight(
      todayData.totals[nutrient]
    );
    const todayBarHeight = Math.max(calculatedHeight, 12);
    bars.push({
      key: todayData.dateKey,
      x,
      targetHeight: todayBarHeight,
      width: chartConfig.barWidth,
      color: color,
      rx: chartConfig.barRadius,
      isToday: true,
      index: dailyData.length,
    });
    return bars;
  }, [dailyData, todayData, chartConfig, nutrient, color]);

  const AnimatedBar = ({
    bar,
    progress,
  }: {
    bar: (typeof renderBars)[0];
    progress: SharedValue<number>;
  }) => {
    const height = useDerivedValue(() => {
      // Staggered animation
      // Duration of whole animation is 800ms
      // We want a cascade.
      // Start time for this bar: index * 0.03 (normalized 0-1?)
      // Let's say total items ~30. 30 * 0.02 = 0.6.
      // We can map progress (0-1) to bar progress.

      const totalItems = renderBars.length;
      const delayFactor = 0.5; // Fraction of time spent initiating bars
      const barDuration = 0.5; // Fraction of time for one bar to grow

      // This is a simple approximation
      const start = (bar.index / totalItems) * delayFactor;
      const end = start + barDuration;

      const localProgress = interpolate(
        progress.value,
        [start, end],
        [0, 1],
        Extrapolation.CLAMP
      );

      return localProgress * bar.targetHeight;
    });

    const y = useDerivedValue(() => {
      return chartConfig.PADDING.top + chartConfig.contentHeight - height.value;
    });

    return (
      <RoundedRect
        x={bar.x}
        y={y}
        width={bar.width}
        height={height}
        r={bar.rx}
        color={bar.color}
        opacity={bar.isToday ? 0.35 : 1}
      />
    );
  };

  // Determine which bar's tooltip to show
  // draggedBar takes precedence over selectedBar
  const activeBar = draggedBar || selectedBar;

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
            <GestureDetector gesture={composedGesture}>
              <Canvas
                style={{
                  width: chartConfig.chartWidth,
                  height: chartConfig.chartHeight,
                }}
              >
                {/* Goal Range */}
                {hasGoalRange && goalRange && (
                  <>
                    <Rect
                      x={theme.spacing.sm}
                      y={
                        chartConfig.PADDING.top +
                        chartConfig.scaleY(goalRange.max)
                      }
                      width={chartConfig.chartWidth - theme.spacing.sm * 2}
                      height={
                        chartConfig.scaleY(goalRange.min) -
                        chartConfig.scaleY(goalRange.max)
                      }
                      color={color}
                      opacity={0.1}
                    />
                    <Line
                      p1={vec(
                        theme.spacing.sm,
                        chartConfig.PADDING.top +
                          chartConfig.scaleY(goalRange.max)
                      )}
                      p2={vec(
                        chartConfig.chartWidth - theme.spacing.sm,
                        chartConfig.PADDING.top +
                          chartConfig.scaleY(goalRange.max)
                      )}
                      color={color}
                      style="stroke"
                      strokeWidth={1}
                      opacity={0.3}
                    >
                      <DashPathEffect intervals={[4, 4]} />
                    </Line>
                    <Line
                      p1={vec(
                        theme.spacing.sm,
                        chartConfig.PADDING.top +
                          chartConfig.scaleY(goalRange.min)
                      )}
                      p2={vec(
                        chartConfig.chartWidth - theme.spacing.sm,
                        chartConfig.PADDING.top +
                          chartConfig.scaleY(goalRange.min)
                      )}
                      color={color}
                      style="stroke"
                      strokeWidth={1}
                      opacity={0.3}
                    >
                      <DashPathEffect intervals={[4, 4]} />
                    </Line>
                  </>
                )}

                {/* Goal Line */}
                {!hasGoalRange && goalLineY !== undefined && (
                  <Line
                    p1={vec(theme.spacing.sm, goalLineY)}
                    p2={vec(
                      chartConfig.chartWidth - theme.spacing.sm,
                      goalLineY
                    )}
                    color={color}
                    style="stroke"
                    strokeWidth={1}
                    opacity={0.5}
                  >
                    <DashPathEffect intervals={[4, 4]} />
                  </Line>
                )}

                {/* Bars */}
                {renderBars.map((bar) => (
                  <AnimatedBar key={bar.key} bar={bar} progress={progress} />
                ))}
              </Canvas>
            </GestureDetector>

            {/* Tooltip Overlay */}
            {activeBar && (
              <View pointerEvents="none" style={styles.tooltipOverlay}>
                {tooltipSize.height > 0 && (
                  <View
                    style={{
                      position: "absolute",
                      left: activeBar.centerX,
                      top:
                        getTooltipTop(
                          activeBar.topY,
                          tooltipSize.height,
                          theme.spacing.sm
                        ) + tooltipSize.height,
                      height: Math.max(
                        0,
                        activeBar.topY -
                          (getTooltipTop(
                            activeBar.topY,
                            tooltipSize.height,
                            theme.spacing.sm
                          ) +
                            tooltipSize.height)
                      ),
                      width: 1,
                      borderLeftWidth: 1,
                      borderColor: colors.border,
                      borderStyle: "dashed",
                      transform: [{ translateX: -0.5 }],
                    }}
                  />
                )}
                <View
                  style={[
                    styles.tooltip,
                    {
                      left: getTooltipLeft(
                        activeBar.centerX,
                        tooltipSize.width,
                        chartConfig.chartWidth,
                        theme.spacing.sm
                      ),
                      top: getTooltipTop(
                        activeBar.topY,
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
                    {formatDisplayDate(activeBar.dateKey)}
                  </AppText>
                  <AppText role="Caption" style={styles.tooltipText}>
                    {`${Math.round(activeBar.value)} ${unit}`}
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
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 5,
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
