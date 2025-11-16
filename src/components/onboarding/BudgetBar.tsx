import React from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/AppText";
import { useTheme } from "@/theme";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useTranslation } from "react-i18next";

interface BudgetBarProps {
  totalCalories: number;
  proteinCalories: number;
  fatCalories: number;
  carbCalories: number;
}

/**
 * BudgetBar - Visualizes calorie allocation across macros
 *
 * ACCESSIBILITY:
 * - Respects reduced motion preferences (WCAG 2.3.3)
 * - Provides text alternatives for visual budget bar (WCAG 1.1.1)
 */
export const BudgetBar = ({
  totalCalories,
  proteinCalories,
  fatCalories,
  carbCalories,
}: BudgetBarProps) => {
  const { colors, theme: themeObj } = useTheme();
  const styles = createStyles(colors, themeObj);
  const reduceMotion = useReducedMotion();
  const { t } = useTranslation();

  const proteinPct = totalCalories > 0 ? (proteinCalories / totalCalories) * 100 : 0;
  const fatPct = totalCalories > 0 ? (fatCalories / totalCalories) * 100 : 0;
  const carbPct = totalCalories > 0 ? (carbCalories / totalCalories) * 100 : 0;
  const remainingPct = 100 - proteinPct - fatPct - carbPct;

  // ACCESSIBILITY: Respect reduce motion preference (WCAG 2.3.3)
  const animationConfig = reduceMotion
    ? undefined // No animation
    : { damping: 30, stiffness: 400 };

  const proteinAnimatedStyle = useAnimatedStyle(() => ({
    width: reduceMotion
      ? `${proteinPct}%`
      : withSpring(`${proteinPct}%`, animationConfig),
  }));

  const fatAnimatedStyle = useAnimatedStyle(() => ({
    width: reduceMotion
      ? `${fatPct}%`
      : withSpring(`${fatPct}%`, animationConfig),
  }));

  const carbAnimatedStyle = useAnimatedStyle(() => ({
    width: reduceMotion
      ? `${carbPct}%`
      : withSpring(`${carbPct}%`, animationConfig),
  }));

  const remainingAnimatedStyle = useAnimatedStyle(() => ({
    width: reduceMotion
      ? `${Math.max(0, remainingPct)}%`
      : withSpring(`${Math.max(0, remainingPct)}%`, animationConfig),
  }));

  const remainingCalories = totalCalories - proteinCalories - fatCalories - carbCalories;

  // ACCESSIBILITY: Provide text alternative for visual budget bar (WCAG 1.1.1)
  const accessibilityLabel = `Calorie budget bar. Protein: ${Math.round(
    proteinPct
  )}%, Fat: ${Math.round(fatPct)}%, Carbs: ${Math.round(carbPct)}%${
    remainingPct > 0 ? `, Unallocated: ${Math.round(remainingPct)}%` : ""
  }`;

  return (
    <View style={styles.container}>
      {/* Budget Bar */}
      <View
        style={styles.barContainer}
        accessible={true}
        accessibilityRole="progressbar"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{
          min: 0,
          max: 100,
          now: 100 - remainingPct,
        }}
      >
        <View style={styles.barTrack}>
          {proteinPct > 0 && (
            <Animated.View
              style={[
                styles.barSegment,
                { backgroundColor: colors.semantic.protein },
                proteinAnimatedStyle,
              ]}
            />
          )}
          {fatPct > 0 && (
            <Animated.View
              style={[
                styles.barSegment,
                { backgroundColor: colors.semantic.fat },
                fatAnimatedStyle,
              ]}
            />
          )}
          {carbPct > 0 && (
            <Animated.View
              style={[
                styles.barSegment,
                { backgroundColor: colors.semantic.carbs },
                carbAnimatedStyle,
              ]}
            />
          )}
          {remainingPct > 0 && (
            <Animated.View
              style={[
                styles.barSegment,
                { backgroundColor: colors.subtleBackground },
                remainingAnimatedStyle,
              ]}
            />
          )}
        </View>
      </View>

      {/* Remaining Calories - only show if >= 4 kcal (enough for 1g carbs) */}
      {remainingCalories >= 4 && (
        <View style={styles.remainingContainer}>
          <AppText role="Body" color="accent">
            {t("onboarding.budgetBar.remaining", {
              value: Math.round(remainingCalories),
              macro: t("onboarding.manualInput.carbsLabel"),
            })}
          </AppText>
        </View>
      )}
    </View>
  );
};

type Colors = ReturnType<typeof useTheme>["colors"];
type Theme = ReturnType<typeof useTheme>["theme"];

const createStyles = (colors: Colors, themeObj: Theme) => {
  const { spacing } = themeObj;

  return StyleSheet.create({
    container: {
      gap: spacing.md,
    },
    barContainer: {
      //
    },
    barTrack: {
      height: 12,
      backgroundColor: colors.subtleBackground,
      borderRadius: 6,
      overflow: "hidden",
      flexDirection: "row",
    },
    barSegment: {
      height: "100%",
    },
    remainingContainer: {
      alignItems: "center",
    },
  });
};
