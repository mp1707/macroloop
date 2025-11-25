import type { FoodLog, DailyTargets } from "@/types/models";
import { getTodayKey, formatDateKey } from "@/utils/dateHelpers";

export interface TrendsData {
  averages: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  dailyData: Array<{
    dateKey: string;
    hasLogs: boolean;
    totals: { calories: number; protein: number; carbs: number; fat: number };
  }>;
  todayData: {
    dateKey: string;
    totals: { calories: number; protein: number; carbs: number; fat: number };
  };
  daysWithData: number;
}

/**
 * Generates an array of date keys going back N days from today (excluding today)
 * @param todayKey - Today's date in YYYY-MM-DD format
 * @param days - Number of days to go back (7 or 30)
 * @returns Array of date keys in YYYY-MM-DD format
 */
function generateDateRange(todayKey: string, days: number): string[] {
  const dates: string[] = [];
  const today = new Date(todayKey + "T00:00:00");

  for (let i = days; i >= 1; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    dates.push(
      formatDateKey(date.getFullYear(), date.getMonth() + 1, date.getDate())
    );
  }

  return dates;
}

/**
 * Calculate comprehensive trends data for a given time period
 * Excludes days with no food logs from average calculations
 *
 * @param foodLogs - Array of all food logs from the store
 * @param days - Number of days to analyze (7 or 30)
 * @param dailyTargets - Optional user's daily nutrition targets
 * @returns Comprehensive trends data including averages, daily data, and today's data
 */
export function calculateTrendsData(
  foodLogs: FoodLog[],
  days: 7 | 30,
  _dailyTargets?: DailyTargets
): TrendsData {
  const todayKey = getTodayKey();

  // Generate date range: [today - days, today - 1] (excluding today)
  const dateKeys = generateDateRange(todayKey, days);

  // Calculate daily totals using same logic as selectDailyTotals from selectors.ts
  const dailyData = dateKeys.map((dateKey) => {
    const logsForDay = foodLogs.filter((log) => log.logDate === dateKey);
    const hasLogs = logsForDay.length > 0;

    const totals = logsForDay.reduce(
      (acc, log) => {
        // Account for percentageEaten (defaults to 100 if not set)
        const percentage = (log.percentageEaten ?? 100) / 100;
        return {
          calories: acc.calories + (log.calories || 0) * percentage,
          protein: acc.protein + (log.protein || 0) * percentage,
          carbs: acc.carbs + (log.carbs || 0) * percentage,
          fat: acc.fat + (log.fat || 0) * percentage,
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    return { dateKey, hasLogs, totals };
  });

  // Calculate today's totals separately (shown as hatched bar, not included in averages)
  const todayLogs = foodLogs.filter((log) => log.logDate === todayKey);
  const todayData = {
    dateKey: todayKey,
    totals: todayLogs.reduce(
      (acc, log) => {
        const percentage = (log.percentageEaten ?? 100) / 100;
        return {
          calories: acc.calories + (log.calories || 0) * percentage,
          protein: acc.protein + (log.protein || 0) * percentage,
          carbs: acc.carbs + (log.carbs || 0) * percentage,
          fat: acc.fat + (log.fat || 0) * percentage,
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    ),
  };

  // Calculate averages EXCLUDING days with no logs
  const daysWithLogs = dailyData.filter((d) => d.hasLogs);
  const count = daysWithLogs.length;

  // Handle case where there are no logged days in the period
  if (count === 0) {
    return {
      averages: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      dailyData,
      todayData,
      daysWithData: 0,
    };
  }

  // Sum up all nutrients from days with logs
  const sums = daysWithLogs.reduce(
    (acc, day) => ({
      calories: acc.calories + day.totals.calories,
      protein: acc.protein + day.totals.protein,
      carbs: acc.carbs + day.totals.carbs,
      fat: acc.fat + day.totals.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // Calculate averages and round to whole numbers
  return {
    averages: {
      calories: Math.round(sums.calories / count),
      protein: Math.round(sums.protein / count),
      carbs: Math.round(sums.carbs / count),
      fat: Math.round(sums.fat / count),
    },
    dailyData,
    todayData,
    daysWithData: count,
  };
}
