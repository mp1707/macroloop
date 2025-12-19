/**
 * Nutrition calculation utilities for managing macro targets with calorie balance
 */

export interface MacroCalculationResult {
  fat: number;
  carbs: number;
  fatPercentage: number;
}

/**
 * Calculate Fat and Carbs based on total calories and protein
 * This is used when protein is first set during the guided flow
 *
 * @param totalCalories - Total calorie target
 * @param proteinInGrams - Protein target in grams
 * @returns Object with calculated fat, carbs values and fat percentage
 */
export const calculateMacrosFromProtein = (
  totalCalories: number,
  proteinInGrams: number
): MacroCalculationResult => {
  // Protein contributes 4 calories per gram
  const proteinCalories = proteinInGrams * 4;

  // Fat should be 30% of total calories (as per requirements)
  const fatPercentage = 30;
  const fatInGrams = Math.round((totalCalories * (fatPercentage / 100)) / 9);
  const fatCalories = fatInGrams * 9;

  // Remaining calories go to carbs
  const carbCalories = totalCalories - proteinCalories - fatCalories;
  const carbsInGrams = Math.round(carbCalories / 4);

  return {
    fat: fatInGrams,
    carbs: carbsInGrams,
    fatPercentage,
  };
};

/**
 * Calculate carbs when protein changes (Fat stays constant)
 * Used in manual adjustment logic after initial setup
 *
 * @param totalCalories - Total calorie target
 * @param newProteinInGrams - New protein value in grams
 * @param currentFatInGrams - Current fat value in grams (stays constant)
 * @returns New carbs value in grams
 */
export const calculateCarbsFromProteinChange = (
  totalCalories: number,
  newProteinInGrams: number,
  currentFatInGrams: number
): number => {
  const proteinCalories = newProteinInGrams * 4;
  const fatCalories = currentFatInGrams * 9;
  const carbCalories = totalCalories - proteinCalories - fatCalories;
  return Math.round(carbCalories / 4);
};

/**
 * Calculate carbs when fat changes (Protein stays constant)
 * Used in manual adjustment logic after initial setup
 *
 * @param totalCalories - Total calorie target
 * @param currentProteinInGrams - Current protein value in grams (stays constant)
 * @param newFatInGrams - New fat value in grams
 * @returns New carbs value in grams
 */
export const calculateCarbsFromFatChange = (
  totalCalories: number,
  currentProteinInGrams: number,
  newFatInGrams: number
): number => {
  const proteinCalories = currentProteinInGrams * 4;
  const fatCalories = newFatInGrams * 9;
  const carbCalories = totalCalories - proteinCalories - fatCalories;
  return Math.round(carbCalories / 4);
};

/**
 * Calculate total calories when carbs change (Only scenario where macro overrides calorie target)
 * Used in manual adjustment logic after initial setup
 *
 * @param proteinInGrams - Current protein value in grams
 * @param fatInGrams - Current fat value in grams
 * @param newCarbsInGrams - New carbs value in grams
 * @returns New total calories value
 */
export const calculateCaloriesFromCarbsChange = (
  proteinInGrams: number,
  fatInGrams: number,
  newCarbsInGrams: number
): number => {
  const proteinCalories = proteinInGrams * 4;
  const fatCalories = fatInGrams * 9;
  const carbCalories = newCarbsInGrams * 4;
  return proteinCalories + fatCalories + carbCalories;
};

/**
 * Calculate carbs when total calories change (Protein and Fat stay constant)
 * Used in manual adjustment logic after initial setup
 *
 * @param newTotalCalories - New total calorie target
 * @param currentProteinInGrams - Current protein value in grams (stays constant)
 * @param currentFatInGrams - Current fat value in grams (stays constant)
 * @returns New carbs value in grams
 */
export const calculateCarbsFromCaloriesChange = (
  newTotalCalories: number,
  currentProteinInGrams: number,
  currentFatInGrams: number
): number => {
  const proteinCalories = currentProteinInGrams * 4;
  const fatCalories = currentFatInGrams * 9;
  const carbCalories = newTotalCalories - proteinCalories - fatCalories;
  return Math.round(carbCalories / 4);
};

/**
 * Calculate fat grams from percentage of total calories
 *
 * @param totalCalories - Total calorie target
 * @param fatPercentage - Fat percentage (0-100)
 * @returns Fat in grams
 */
export const calculateFatGramsFromPercentage = (
  totalCalories: number,
  fatPercentage: number
): number => {
  const fatPercentageDecimal = fatPercentage / 100;
  const fatCalories = totalCalories * fatPercentageDecimal;
  const fatInGrams = Math.round(fatCalories / 9);
  return fatInGrams;
};

/**
 * Calculate carbs from macros (used for the new simplified flow)
 *
 * @param totalCalories - Total calorie target
 * @param proteinInGrams - Protein in grams
 * @param fatInGrams - Fat in grams
 * @returns Carbs in grams
 */
export const calculateCarbsFromMacros = (
  totalCalories: number,
  proteinInGrams: number,
  fatInGrams: number
): number => {
  const proteinCalories = proteinInGrams * 4;
  const fatCalories = fatInGrams * 9;
  const carbCalories = totalCalories - proteinCalories - fatCalories;
  return Math.round(Math.max(0, carbCalories / 4));
};

/**
 * Calculate maximum fat percentage based on calories and protein
 * Ensures there are enough calories left for reasonable carbs (at least 50g)
 *
 * @param totalCalories - Total calorie target
 * @param proteinInGrams - Protein in grams
 * @returns Maximum fat percentage
 */
export const calculateMaxFatPercentage = (
  totalCalories: number,
  proteinInGrams: number
): number => {
  const proteinCalories = proteinInGrams * 4;
  const minCarbCalories = 50 * 4; // Reserve at least 50g carbs (200 calories)
  const availableCaloriesForFat =
    totalCalories - proteinCalories - minCarbCalories;
  const maxFatPercentage = Math.floor(
    (availableCaloriesForFat / totalCalories) * 100
  );
  return Math.max(10, Math.min(70, maxFatPercentage)); // Between 10% and 70%
};

/**
 * Calculate fat percentage from total calories consumed
 *
 * @param fatGrams - Fat consumed in grams
 * @param totalCalories - Total calories consumed
 * @returns Fat as percentage of total calories (0-100)
 */
export const calculateFatPercentageFromCalories = (
  fatGrams: number,
  totalCalories: number
): number => {
  if (totalCalories === 0) return 0;
  const fatCalories = fatGrams * 9;
  const fatPercentage = (fatCalories / totalCalories) * 100;
  return Math.round(fatPercentage);
};
