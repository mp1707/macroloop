import { Droplet, Flame, BicepsFlexed, Wheat } from "lucide-react-native";
import type { TFunction } from "i18next";

/**
 * Animation delay constants for staggered animations
 */
export const ANIMATION_DELAYS = {
  /** Base delay before dashboard animations start (allows LogCard animations to complete) */
  BASE_DELAY: 350,
  /** Delay between ring animations (400ms per ring) */
  RING_STAGGER: 400,
  /** Delay for fat total animation (after both rings) */
  FAT_STAT: 800,
} as const;

/**
 * Snappier spring config for icon check animations
 * Used when nutrients reach their target values
 */
export const ICON_SPRING_CONFIG = {
  mass: 0.8,
  damping: 15,
  stiffness: 400,
} as const;

/**
 * Get display configuration for all nutrient labels with translations
 * Returns a new object each time to ensure fresh translations
 */
export const getNutrientLabels = (t: TFunction) =>
  ({
    calories: {
      label: t("nutrients.calories.label"),
      unit: t("nutrients.calories.unitShort"),
      Icon: Flame,
      hasTarget: true,
    },
    protein: {
      label: t("nutrients.protein.label"),
      unit: t("nutrients.protein.unit"),
      Icon: BicepsFlexed,
      hasTarget: true,
    },
    fat: {
      label: t("nutrients.fat.label"),
      unit: t("nutrients.fat.unitShort"),
      Icon: Droplet,
      hasTarget: true,
    },
    carbs: {
      label: t("nutrients.carbs.label"),
      unit: t("nutrients.carbs.unitShort"),
      Icon: Wheat,
      hasTarget: false,
    },
  } as const);

/**
 * Get configuration for ring nutrients (calories and protein)
 * These are displayed as circular progress rings
 */
export const getRingConfig = (t: TFunction) => {
  const labels = getNutrientLabels(t);
  return [
    {
      key: "calories" as const,
      ...labels.calories,
    },
    {
      key: "protein" as const,
      ...labels.protein,
    },
  ] as const;
};

/**
 * Type for nutrient keys
 */
export type NutrientKey = keyof ReturnType<typeof getNutrientLabels>;
