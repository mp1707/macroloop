import { FoodLog } from "@/types/models";
import { FoodEstimateResponse } from "../lib";

export type EstimationInput = Omit<
  FoodLog,
  | "isEstimating"
  | "calories"
  | "protein"
  | "carbs"
  | "fat"
>;

export const createEstimationLog = (logData: EstimationInput): FoodLog => {
  return {
    ...logData,
    title: logData.title || "",
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    isEstimating: true,
  };
};

export const applyEstimationResults = (
  existingLog: FoodLog,
  results: FoodEstimateResponse
): FoodLog => {
  return {
    ...existingLog,
    title: results.generatedTitle,
    calories: results.calories,
    protein: results.protein,
    carbs: results.carbs,
    fat: results.fat,
    foodComponents: results.foodComponents,
    macrosPerReferencePortion: results.macrosPerReferencePortion,
    isEstimating: false,
  };
};
