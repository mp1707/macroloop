import type { TrendMetric, TrendsData } from "../trendCalculations";

export interface NutrientTrendChartProps {
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
  calorieGoal?: number;
  // New props for integrated header
  average: number;
  target?: number;
  daysWithData: number;
  showGoalDelta: boolean;
  captionText?: string; // For fat baseline or carbs no-goal message
  timePeriod: "week" | "month";
  onPeriodChange: (index: number) => void;
}

export interface ChartConfig {
  chartWidth: number;
  chartHeight: number;
  PADDING: { left: number; right: number; top: number; bottom: number };
  contentWidth: number;
  contentHeight: number;
  BAR_SPACING: number;
  barWidth: number;
  barRadius: number;
  maxValue: number;
  scaleY: (value: number) => number;
  getBarHeight: (value: number) => number;
  totalBars: number;
}

export interface BarData {
  key: string;
  x: number;
  targetHeight: number;
  width: number;
  color: string;
  rx: number;
  isToday: boolean;
  index: number;
  value: number; // Added value for easier access in render
}
