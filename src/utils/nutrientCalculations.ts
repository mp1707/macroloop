import type { FoodLog, Favorite } from "@/types/models";

/**
 * Represents the four primary macronutrients tracked in the app.
 * All values are in their respective units (calories: kcal, protein/carbs/fat: grams).
 */
export interface MacroNutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * Calculates the consumed nutrients for a single food log or favorite,
 * accounting for the percentageEaten value.
 *
 * @param log - A FoodLog or Favorite object containing nutrient data
 * @returns Adjusted nutrient values based on percentageEaten
 *
 * @example
 * ```typescript
 * const log: FoodLog = {
 *   calories: 500,
 *   protein: 30,
 *   carbs: 60,
 *   fat: 15,
 *   percentageEaten: 50, // User ate 50%
 *   // ... other fields
 * };
 *
 * const consumed = calculateConsumedNutrients(log);
 * // Returns: { calories: 250, protein: 15, carbs: 30, fat: 7.5 }
 * ```
 *
 * @remarks
 * - percentageEaten defaults to 100 if undefined
 * - Missing nutrient values default to 0
 * - Works with both FoodLog and Favorite types
 */
export function calculateConsumedNutrients(
  log: FoodLog | Favorite
): MacroNutrients {
  const percentage = (log.percentageEaten ?? 100) / 100;

  return {
    calories: (log.calories || 0) * percentage,
    protein: (log.protein || 0) * percentage,
    carbs: (log.carbs || 0) * percentage,
    fat: (log.fat || 0) * percentage,
  };
}

/**
 * Aggregates consumed nutrients across multiple food logs or favorites,
 * accounting for each log's percentageEaten value.
 *
 * @param logs - Array of FoodLog or Favorite objects
 * @returns Total consumed nutrients summed across all logs
 *
 * @example
 * ```typescript
 * const logs: FoodLog[] = [
 *   { calories: 500, protein: 30, carbs: 60, fat: 15, percentageEaten: 100 },
 *   { calories: 300, protein: 20, carbs: 40, fat: 10, percentageEaten: 50 },
 * ];
 *
 * const totals = aggregateConsumedNutrients(logs);
 * // Returns: { calories: 650, protein: 40, carbs: 80, fat: 20 }
 * ```
 *
 * @remarks
 * - Each log's percentageEaten is applied individually
 * - Empty array returns zero values for all nutrients
 * - Handles mixed FoodLog and Favorite types
 */
export function aggregateConsumedNutrients(
  logs: (FoodLog | Favorite)[]
): MacroNutrients {
  const totals: MacroNutrients = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  };

  for (const log of logs) {
    const percentage = (log.percentageEaten ?? 100) / 100;
    totals.calories += (log.calories || 0) * percentage;
    totals.protein += (log.protein || 0) * percentage;
    totals.carbs += (log.carbs || 0) * percentage;
    totals.fat += (log.fat || 0) * percentage;
  }

  return totals;
}

/**
 * Builds a date-indexed map of consumed nutrients from food logs,
 * accounting for each log's percentageEaten value.
 *
 * @param logs - Array of FoodLog objects with logDate fields
 * @returns Map with date strings as keys and nutrient totals as values
 *
 * @example
 * ```typescript
 * const logs: FoodLog[] = [
 *   { logDate: '2025-01-15', calories: 500, protein: 30, percentageEaten: 100 },
 *   { logDate: '2025-01-15', calories: 300, protein: 20, percentageEaten: 50 },
 *   { logDate: '2025-01-16', calories: 600, protein: 35, percentageEaten: 100 },
 * ];
 *
 * const byDate = aggregateConsumedNutrientsByDate(logs);
 * byDate.get('2025-01-15');
 * // Returns: { calories: 650, protein: 40, carbs: 0, fat: 0, exists: true }
 * ```
 *
 * @remarks
 * - Multiple logs for the same date are aggregated together
 * - exists flag indicates if any logs were found for that date
 * - Optimized for performance with single-pass iteration
 * - Used by DateSlider, ConsistencyGrid, and chart components
 */
export function aggregateConsumedNutrientsByDate(
  logs: FoodLog[]
): Map<string, MacroNutrients & { exists: boolean }> {
  const index = new Map<string, MacroNutrients & { exists: boolean }>();

  for (const log of logs) {
    const dateKey = log.logDate;
    const percentage = (log.percentageEaten ?? 100) / 100;

    const existing = index.get(dateKey) || {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      exists: false,
    };

    existing.exists = true;
    existing.calories += (log.calories || 0) * percentage;
    existing.protein += (log.protein || 0) * percentage;
    existing.carbs += (log.carbs || 0) * percentage;
    existing.fat += (log.fat || 0) * percentage;

    index.set(dateKey, existing);
  }

  return index;
}
