import type { FoodLog } from "@/types/models";
import { getTodayKey, formatDateKey } from "@/utils/dateHelpers";
import { aggregateConsumedNutrientsByDate } from "@/utils/nutrientCalculations";

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

export type TrendMetric = keyof TrendsData["averages"];

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
 * @returns Comprehensive trends data including averages, daily data, and today's data
 */
export function calculateTrendsData(
  foodLogs: FoodLog[],
  days: 7 | 30
): TrendsData {
  const todayKey = getTodayKey();

  // Generate date range: [today - days, today - 1] (excluding today)
  const dateKeys = generateDateRange(todayKey, days);

  const createEmptyTotals = () => ({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });

  // Use centralized utility to calculate nutrients by date with percentageEaten applied
  const nutrientsByDate = aggregateConsumedNutrientsByDate(foodLogs);

  // Build date totals map for the specified range
  const dateTotalsMap = new Map<
    string,
    { totals: ReturnType<typeof createEmptyTotals>; hasLogs: boolean }
  >();

  dateKeys.forEach((dateKey) => {
    const nutrients = nutrientsByDate.get(dateKey);
    if (nutrients?.exists) {
      dateTotalsMap.set(dateKey, {
        totals: {
          calories: nutrients.calories,
          protein: nutrients.protein,
          carbs: nutrients.carbs,
          fat: nutrients.fat,
        },
        hasLogs: true,
      });
    } else {
      dateTotalsMap.set(dateKey, { totals: createEmptyTotals(), hasLogs: false });
    }
  });

  // Extract today's data
  const todayNutrients = nutrientsByDate.get(todayKey);
  const todayTotals = todayNutrients?.exists
    ? {
        calories: todayNutrients.calories,
        protein: todayNutrients.protein,
        carbs: todayNutrients.carbs,
        fat: todayNutrients.fat,
      }
    : createEmptyTotals();

  const dailyData = dateKeys.map((dateKey) => {
    const entry = dateTotalsMap.get(dateKey);
    return {
      dateKey,
      hasLogs: entry?.hasLogs ?? false,
      totals: entry?.totals ?? createEmptyTotals(),
    };
  });

  const todayData = {
    dateKey: todayKey,
    totals: todayTotals,
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
