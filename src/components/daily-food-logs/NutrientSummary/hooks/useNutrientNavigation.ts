import { useCallback } from "react";
import * as Haptics from "expo-haptics";

import { useSafeRouter } from "@/hooks/useSafeRouter";

import type { NutrientKey } from "../utils/constants";

interface NutrientValues {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

interface UseNutrientNavigationParams {
  totals: NutrientValues;
  targets: NutrientValues;
  percentages: NutrientValues;
}

/**
 * Hook that handles navigation to nutrient explainer pages
 * Includes haptic feedback and query parameter formatting
 */
export const useNutrientNavigation = ({
  totals,
  targets,
  percentages,
}: UseNutrientNavigationParams) => {
  const router = useSafeRouter();

  const handleOpenExplainer = useCallback(
    (nutrient: NutrientKey) => {
      // Pass all macro data to the explainer screen so each component gets correct values
      const params = new URLSearchParams({
        // Calories data
        calories_total: Math.round(totals.calories || 0).toString(),
        calories_target: Math.round(targets.calories || 0).toString(),
        calories_percentage: Math.round(percentages.calories || 0).toString(),
        // Protein data
        protein_total: Math.round(totals.protein || 0).toString(),
        protein_target: Math.round(targets.protein || 0).toString(),
        protein_percentage: Math.round(percentages.protein || 0).toString(),
        // Fat data
        fat_total: Math.round(totals.fat || 0).toString(),
        fat_target: Math.round(targets.fat || 0).toString(),
        fat_percentage: Math.round(percentages.fat || 0).toString(),
        // Carbs data (only total, no target)
        carbs_total: Math.round(totals.carbs || 0).toString(),
      });

      // Navigate to the macro explainer modal (opens at overview page)
      // The overview page allows navigation to individual nutrient pages
      router.push(`/explainer-macros?${params.toString()}` as any);
    },
    [totals, targets, percentages, router]
  );

  return { handleOpenExplainer };
};
