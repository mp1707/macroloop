// store/selectors.ts

import { AppState } from "@/store/useAppStore";
import type { Favorite, FoodLog } from "../types/models"; // Adjust path if needed

/**
 * ## Basic Selectors
 * These are the fundamental building blocks for getting slices of state.
 */

/**
 * Selects all food logs for a specific day.
 * @param date - The date string in "YYYY-MM-DD" format.
 * @returns An array of food logs for that day.
 */
export const selectLogsForDate = (state: AppState, date: string): FoodLog[] =>
  state.foodLogs.filter((log) => log.logDate === date);

/**
 * Selects a single food log by id (non-reactive helper).
 * Useful for one-off reads outside React components.
 */
export const selectLogById = (state: AppState, id: string): FoodLog | undefined =>
  state.foodLogs.find((log) => log.id === id);

/**
 * Factory that returns a Zustand-ready selector for a given id.
 * Use in components: `const log = useAppStore(makeSelectLogById(id));`
 * This subscribes only to changes of the specific log, avoiding rerenders
 * when unrelated logs change.
 */
export const makeSelectLogById = (id: string) => (state: AppState): FoodLog | undefined =>
  state.foodLogs.find((log) => log.id === id);

/**
 * Factory that returns a selector for a specific favorite by id.
 */
export const makeSelectFavoriteById = (id: string) =>
  (state: AppState): Favorite | undefined =>
    state.favorites.find((favorite) => favorite.id === id);

/**
 * ## Computed Selectors
 * These selectors perform calculations on the state.
 */

/**
 * Calculates the total sum of calories, protein, carbs, and fat for a given day.
 * Takes into account the percentageEaten for each log.
 * @param date - The date string in "YYYY-MM-DD" format.
 * @returns An object containing the summed totals.
 */
export const selectDailyTotals = (state: AppState, date: string) => {
  // Reuse the basic selector to get the relevant logs first
  const logsForDay = selectLogsForDate(state, date);

  // Use reduce to sum up the values into a single object
  return logsForDay.reduce(
    (totals, log) => {
      const percentage = (log.percentageEaten ?? 100) / 100;
      totals.calories += (log.calories || 0) * percentage;
      totals.protein += (log.protein || 0) * percentage;
      totals.carbs += (log.carbs || 0) * percentage;
      totals.fat += (log.fat || 0) * percentage;
      return totals;
    },
    // The starting value for our totals object
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
};

/**
 * Calculates the achieved percentage of daily targets for a given day.
 * If a target is not set or is 0, its percentage will be 0.
 * @param date - The date string in "YYYY-MM-DD" format.
 * @returns An object containing the nutrient percentages (0-100+).
 */
export const selectDailyPercentages = (state: AppState, date: string) => {
  // Reuse the previous selector to get the totals
  const totals = selectDailyTotals(state, date);
  const targets = state.dailyTargets;

  // A safe helper function to prevent division by zero
  const calculatePercentage = (total: number, target: number | undefined) => {
    // If target is undefined, null, or 0, the percentage is 0
    if (!target) {
      return 0;
    }
    return (total / target) * 100;
  };

  return {
    calories: calculatePercentage(totals.calories, targets?.calories),
    protein: calculatePercentage(totals.protein, targets?.protein),
    carbs: calculatePercentage(totals.carbs, targets?.carbs),
    fat: calculatePercentage(totals.fat, targets?.fat),
  };
};

/**
 * ## Optimized Combined Selector
 * Single-pass computation for all daily data (logs, totals, percentages)
 * Reduces 3 array iterations to 1 for better performance
 */

export interface DailyData {
  logs: FoodLog[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  percentages: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

/**
 * State slice required for selectDailyData computation
 */
export interface DailyDataState {
  foodLogs: FoodLog[];
  dailyTargets?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
}

/**
 * Optimized selector that calculates logs, totals, and percentages in a single pass
 * Takes into account the percentageEaten for each log when calculating totals.
 * @param state - State slice containing foodLogs and dailyTargets
 * @param date - The date string in "YYYY-MM-DD" format
 * @returns Combined data object with logs, totals, and percentages
 *
 * Performance: Single pass through foodLogs array instead of 3 passes
 */
export const selectDailyData = (state: DailyDataState, date: string): DailyData => {
  const logs: FoodLog[] = [];
  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

  // Single pass: filter logs and calculate totals
  for (const log of state.foodLogs) {
    if (log.logDate === date) {
      logs.push(log);
      const percentage = (log.percentageEaten ?? 100) / 100;
      totals.calories += (log.calories || 0) * percentage;
      totals.protein += (log.protein || 0) * percentage;
      totals.carbs += (log.carbs || 0) * percentage;
      totals.fat += (log.fat || 0) * percentage;
    }
  }

  // Calculate percentages
  const targets = state.dailyTargets;
  const calculatePercentage = (total: number, target: number | undefined) =>
    target ? (total / target) * 100 : 0;

  const percentages = {
    calories: calculatePercentage(totals.calories, targets?.calories),
    protein: calculatePercentage(totals.protein, targets?.protein),
    carbs: calculatePercentage(totals.carbs, targets?.carbs),
    fat: calculatePercentage(totals.fat, targets?.fat),
  };

  return { logs, totals, percentages };
};
