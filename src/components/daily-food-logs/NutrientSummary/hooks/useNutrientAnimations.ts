import { useEffect, useRef } from "react";
import { useSharedValue, withSpring } from "react-native-reanimated";
import { useAnimatedNumber } from "@/hooks/useAnimationConfig";
import { useAppStore } from "@/store/useAppStore";
import { ANIMATION_DELAYS, ICON_SPRING_CONFIG } from "../utils/constants";

interface NutrientValues {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

interface UseNutrientAnimationsParams {
  totals: NutrientValues;
  percentages: NutrientValues;
  isProteinComplete: boolean;
}

/**
 * Hook that consolidates all nutrient animation logic
 * Handles number reveals, progress bars, and icon animations
 */
export const useNutrientAnimations = ({
  totals,
  isProteinComplete,
  percentages,
}: UseNutrientAnimationsParams) => {
  const { selectedDate } = useAppStore();
  const prevSelectedDate = useRef(selectedDate);

  // Check if date changed for skipAnimation prop
  const dateChanged = prevSelectedDate.current !== selectedDate;

  // Update prevSelectedDate in useEffect to ensure dateChanged stays true
  // for all effects in this render cycle
  useEffect(() => {
    if (dateChanged) {
      prevSelectedDate.current = selectedDate;
    }
  }, [dateChanged, selectedDate]);

  // Animated scales for icon transitions
  const proteinIconScale = useSharedValue(1);

  // Animated values for secondary stats totals (UI thread only - zero JS bridging)
  const animatedFatTotal = useAnimatedNumber(Math.round(totals.fat || 0));
  const animatedCarbsTotal = useAnimatedNumber(Math.round(totals.carbs || 0));

  // Animated values for ring label totals (UI thread only - zero JS bridging)
  const animatedCaloriesTotal = useAnimatedNumber(Math.round(totals.calories || 0));
  const animatedProteinTotal = useAnimatedNumber(Math.round(totals.protein || 0));

  // Trigger count-up animations when secondary stats totals change
  useEffect(() => {
    if (dateChanged) {
      animatedFatTotal.setValue(Math.round(totals.fat || 0));
      animatedCarbsTotal.setValue(Math.round(totals.carbs || 0));
    } else {
      animatedFatTotal.animateTo(Math.round(totals.fat || 0), ANIMATION_DELAYS.BASE_DELAY + ANIMATION_DELAYS.FAT_STAT);
      animatedCarbsTotal.animateTo(Math.round(totals.carbs || 0), ANIMATION_DELAYS.BASE_DELAY);
    }
  }, [totals.fat, totals.carbs, selectedDate, dateChanged]);

  // Trigger count-up animations when ring label totals change
  useEffect(() => {
    if (dateChanged) {
      animatedCaloriesTotal.setValue(Math.round(totals.calories || 0));
      animatedProteinTotal.setValue(Math.round(totals.protein || 0));
    } else {
      animatedCaloriesTotal.animateTo(Math.round(totals.calories || 0), ANIMATION_DELAYS.BASE_DELAY);
      animatedProteinTotal.animateTo(Math.round(totals.protein || 0), ANIMATION_DELAYS.BASE_DELAY + ANIMATION_DELAYS.RING_STAGGER);
    }
  }, [totals.calories, totals.protein, selectedDate, dateChanged]);

  // Trigger icon scale animations when protein reaches 100%
  useEffect(() => {
    if (dateChanged) {
      proteinIconScale.value = 1;
    } else {
      if (isProteinComplete) {
        proteinIconScale.value = 0.5;
        proteinIconScale.value = withSpring(1, ICON_SPRING_CONFIG);
      } else {
        proteinIconScale.value = 1;
      }
    }
  }, [percentages.protein, proteinIconScale, selectedDate, dateChanged, isProteinComplete]);

  return {
    // Date change detection
    dateChanged,

    // Icon scales
    proteinIconScale,

    // Animated number SharedValues (for AnimatedText - zero JS bridging)
    animatedFatTotal: animatedFatTotal.value,
    animatedCarbsTotal: animatedCarbsTotal.value,
    animatedCaloriesTotal: animatedCaloriesTotal.value,
    animatedProteinTotal: animatedProteinTotal.value,
  };
};
