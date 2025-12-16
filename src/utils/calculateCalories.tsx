import type { UserSettings } from "@/types/models";
import { Alert } from "react-native";

// --- Calculation Logic ---

/**
 * A dictionary mapping the activity levels to their corresponding
 * Physical Activity Level (PAL) multipliers.
 */
const activityMultipliers: Record<UserSettings["activityLevel"], number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryactive: 1.9,
};

/**
 * Safety floors for calorie intake to prevent unhealthy recommendations.
 * Diets below these levels should be medically supervised.
 */
const calorieSafetyFloors: Record<UserSettings["sex"], number> = {
  female: 1200,
  male: 1500,
};

/**
 * Calculates daily calorie goals based on the Mifflin-St Jeor equation.
 *
 * @param params - An object containing the user's physical data (sex, age, weight, height).
 * @param activityLevel - The user's estimated daily activity level.
 * @returns An object with calculated calorie goals for weight loss, maintenance, and gain.
 */
export function calculateCalorieGoals(
  params: Omit<
    UserSettings,
    "proteinGoalType" | "fatCalculationPercentage"
  >,
  activityLevel: UserSettings["activityLevel"]
): {
  lose: number;
  lose_mild: number;
  maintain: number;
  gain_mild: number;
  gain: number;
} {
  const { sex, age, weight, height } = params;

  if (!sex || !age || !weight || !height || !activityLevel) {
    throw new Error("Something went wrong. Please try again.");
  }

  // 1. Calculate Resting Metabolic Rate (RMR) using Mifflin-St Jeor
  let rmr: number;
  if (sex === "male") {
    // Formula for males
    rmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    // Formula for females
    rmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }

  // 2. Calculate Total Daily Energy Expenditure (TDEE) for maintenance
  const activityMultiplier = activityMultipliers[activityLevel];
  const maintain = Math.round(rmr * activityMultiplier);

  // 3. Calculate goals for weight loss and gain
  // Standard deficit/surplus of 500 kcal, mild of 300 kcal.
  let lose = maintain - 500;
  let lose_mild = maintain - 300;
  const gain_mild = maintain + 300;
  const gain = maintain + 500;

  // 4. Apply the safety floor to the weight loss goals to prevent unsafe targets
  const safetyFloor = calorieSafetyFloors[sex];
  if (lose < safetyFloor) {
    lose = safetyFloor;
  }
  if (lose_mild < safetyFloor) {
    lose_mild = safetyFloor;
  }

  return {
    lose: Math.round(lose),
    lose_mild: Math.round(lose_mild),
    maintain,
    gain_mild: Math.round(gain_mild),
    gain: Math.round(gain),
  };
}
