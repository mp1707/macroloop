import { useMemo } from "react";
import { Dimensions } from "react-native";
import { useTheme } from "@/theme";
import type { NutrientTrendChartProps, ChartConfig, BarData } from "./types";

type UseChartConfigProps = Pick<
  NutrientTrendChartProps,
  | "dailyData"
  | "todayData"
  | "goal"
  | "goalRange"
  | "days"
  | "nutrient"
  | "color"
>;

export const useChartConfig = ({
  dailyData,
  todayData,
  goal,
  goalRange,
  days,
  nutrient,
  color,
}: UseChartConfigProps) => {
  const { theme } = useTheme();

  const config = useMemo<ChartConfig>(() => {
    const screenWidth = Dimensions.get("window").width;
    const chartWidth = screenWidth - theme.spacing.pageMargins.horizontal * 2;
    const chartHeight = 145;

    const PADDING = { left: 24, right: 24, top: 16, bottom: 4 };
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

  const bars = useMemo<BarData[]>(() => {
    const result: BarData[] = [];
    // Daily bars
    for (let i = 0; i < dailyData.length; i++) {
      const day = dailyData[i];
      const x =
        config.PADDING.left + i * (config.barWidth + config.BAR_SPACING);
      const value = day.totals[nutrient];
      const targetHeight = day.hasLogs ? config.getBarHeight(value) : 0;
      result.push({
        key: day.dateKey,
        x,
        targetHeight: Math.max(targetHeight, 0),
        width: config.barWidth,
        color: color,
        rx: config.barRadius,
        isToday: false,
        index: i,
        value,
      });
    }
    // Today bar
    const x =
      config.PADDING.left +
      dailyData.length * (config.barWidth + config.BAR_SPACING);
    const value = todayData.totals[nutrient];
    const calculatedHeight = config.getBarHeight(value);
    const todayBarHeight = Math.max(calculatedHeight, 12);
    result.push({
      key: todayData.dateKey,
      x,
      targetHeight: todayBarHeight,
      width: config.barWidth,
      color: color,
      rx: config.barRadius,
      isToday: true,
      index: dailyData.length,
      value,
    });
    return result;
  }, [dailyData, todayData, config, nutrient, color]);

  return { config, bars };
};
