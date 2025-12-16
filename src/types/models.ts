import { MacrosPerReferencePortion } from "../lib";

export type FoodUnit = "g" | "ml" | "piece";
export type ExactMeasurementUnit = Exclude<FoodUnit, "piece">;

export type FoodLog = {
  id: string;
  logDate: string; // YYYY-MM-DD
  createdAt: string; // ISO timestamp
  title: string;
  description?: string;
  supabaseImagePath?: string;
  localImagePath?: string;
  foodComponents: FoodComponent[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  isEstimating?: boolean;
  estimationFailed?: boolean;
  macrosPerReferencePortion?: MacrosPerReferencePortion;
  percentageEaten?: number; // 0-100, defaults to 100
};

export type FoodComponent = {
  amount: number;
  name: string;
  unit: FoodUnit;
  recommendedMeasurement?: {
    amount: number;
    unit: ExactMeasurementUnit;
  };
  // Per-component nutrition stats (from V2 endpoints)
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
};

export type Favorite = {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  supabaseImagePath?: string;
  localImagePath?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  foodComponents: FoodComponent[];
  macrosPerReferencePortion?: MacrosPerReferencePortion;
  percentageEaten?: number; // 0-100, defaults to 100
};

export type DailyTargets = {
  calories?: number;
  protein?: number; // g
  carbs?: number; // g
  fat?: number; // g
};

export type ProteinGoalType =
  | "baseline"
  | "exerciser"
  | "athlete"
  | "diet_phase";

export type UserSettings = {
  sex: "male" | "female";
  age: number;
  weight: number; // kg
  height: number; // cm
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "veryactive";
  calorieGoalType?: "lose" | "lose_mild" | "maintain" | "gain_mild" | "gain";
  proteinGoalType?: ProteinGoalType;
  fatCalculationPercentage: number;
};
