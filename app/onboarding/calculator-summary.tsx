import React, { useMemo, useState } from "react";
import { View, StyleSheet, Pressable, Alert } from "react-native";
import { AppText } from "@/components/shared/AppText";
import { useTheme } from "@/theme";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/index";
import { OnboardingScreen } from "../../src/components/onboarding/OnboardingScreen";
import * as Haptics from "expo-haptics";
import { Flame, BicepsFlexed, Wheat, Droplet } from "lucide-react-native";
import { calculateFatGramsFromPercentage } from "@/utils/nutritionCalculations";
import { DailyTargets, ProteinGoalType } from "@/types/models";
import { useTranslation } from "react-i18next";

// Protein calculation factors mapping
const PROTEIN_FACTORS: Record<ProteinGoalType, number> = {
  baseline: 1.2,
  exerciser: 1.6,
  athlete: 2.0,
  diet_phase: 2.2,
};

const CalculatorSummaryScreen = () => {
  const { colors, theme: themeObj } = useTheme();
  const styles = createStyles(colors, themeObj);
  const { safeDismissTo, safeNavigate, isNavigating } = useNavigationGuard();
  const [isConfirming, setIsConfirming] = useState(false);
  const { t } = useTranslation();

  // Onboarding store state
  const { calorieGoal, proteinGoal, proteinGoalType, fatPercentage, weight } =
    useOnboardingStore();

  // Main app store
  const { setDailyTargets } = useAppStore();

  // Get stored values with defaults
  const effectiveFatPercentage = fatPercentage ?? 20;
  const currentCalories = calorieGoal || 0;
  const currentProtein = proteinGoal || 0;

  // Fat calculation: Calculate from percentage
  const currentFat = calorieGoal
    ? calculateFatGramsFromPercentage(calorieGoal, effectiveFatPercentage)
    : 0;

  // Carbs calculation: Calculate from remainder
  const currentCarbs = useMemo(() => {
    const proteinCals = currentProtein * 4;
    const fatCals = currentFat * 9;
    const remainingCals = Math.max(0, currentCalories - proteinCals - fatCals);
    return Math.floor(remainingCals / 4);
  }, [currentCalories, currentProtein, currentFat]);

  // Generate subtitle for protein
  const proteinSubtitle = useMemo(() => {
    if (proteinGoalType && weight) {
      const factor = PROTEIN_FACTORS[proteinGoalType];
      return t("onboarding.calculatorSummary.proteinSubtitle", { factor });
    }
    return t("onboarding.common.dailyTarget");
  }, [proteinGoalType, weight, t]);

  // Generate subtitle for fat
  const fatSubtitle = t("onboarding.calculatorSummary.fatSubtitle", {
    percentage: effectiveFatPercentage,
  });

  const handleAdjustTargets = async () => {
    if (isNavigating) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    safeNavigate("/onboarding/calorie-goal");
  };

  const handleConfirmAndStartTracking = async () => {
    // Validate we have all required data
    if (currentCalories <= 0 || currentProtein <= 0) {
      if (__DEV__) {
        console.error("Missing required data for daily targets");
      }
      Alert.alert(
        t("onboarding.common.errorTitle"),
        t("onboarding.common.missingData")
      );
      return;
    }

    // Set confirming state to prevent visual artifacts
    setIsConfirming(true);

    // Create the daily targets object
    const newTargets: DailyTargets = {
      calories: currentCalories,
      protein: currentProtein,
      carbs: currentCarbs,
      fat: currentFat,
    };

    // Save to main app store
    setDailyTargets(newTargets);

    // Note: Onboarding store will be reset when re-entering via /onboarding/index.tsx
    // No need to reset here to avoid visual artifacts

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Dismiss the onboarding modal and return to root
    safeDismissTo("/");
  };

  // Define the target rows data
  const targetRows = [
    {
      key: "calories" as const,
      icon: Flame,
      color: colors.semantic.calories,
      label: t("onboarding.calculatorSummary.rows.calories"),
      subtitle: t("onboarding.common.dailyTarget"),
      value: currentCalories,
      unit: "kcal",
      kcal: undefined,
    },
    {
      key: "protein" as const,
      icon: BicepsFlexed,
      color: colors.semantic.protein,
      label: t("onboarding.calculatorSummary.rows.protein"),
      subtitle: proteinSubtitle,
      value: currentProtein,
      unit: "g",
      kcal: currentProtein * 4,
    },
    {
      key: "fat" as const,
      icon: Droplet,
      color: colors.semantic.fat,
      label: t("onboarding.calculatorSummary.rows.fat"),
      subtitle: fatSubtitle,
      value: currentFat,
      unit: "g",
      kcal: currentFat * 9,
    },
    {
      key: "carbs" as const,
      icon: Wheat,
      color: colors.semantic.carbs,
      label: t("onboarding.calculatorSummary.rows.carbs"),
      subtitle: t("onboarding.common.remainder"),
      value: currentCarbs,
      unit: "g",
      kcal: currentCarbs * 4,
    },
  ];

  return (
    <OnboardingScreen
      actionButton={
        <View style={styles.actionButtonsContainer}>
          <View style={styles.secondaryActions}>
            <Pressable onPress={handleAdjustTargets}>
              <AppText role="Button" color="accent" style={styles.centeredText}>
                {t("onboarding.common.adjust")}
              </AppText>
            </Pressable>
          </View>
          <Button
            variant="primary"
            label={
              isConfirming
                ? t("onboarding.common.starting")
                : t("onboarding.common.confirm")
            }
            onPress={handleConfirmAndStartTracking}
            disabled={
              currentCalories <= 0 || currentProtein <= 0 || isConfirming
            }
            isLoading={isNavigating}
          />
        </View>
      }
    >
      {/* Title */}
      <View style={styles.titleSection}>
        <AppText role="Title2">{t("onboarding.calculatorSummary.title")}</AppText>
        <AppText role="Body" color="secondary" style={styles.secondaryText}>
          {t("onboarding.calculatorSummary.subtitle")}
        </AppText>
      </View>
      {/* Targets List */}
      <View style={styles.targetsSection}>
        {targetRows.map((target) => {
          const IconComponent = target.icon;

          return (
            <View key={target.key} style={styles.targetRow}>
              <View style={styles.targetLeft}>
                <IconComponent
                  size={20}
                  color={target.color}
                  fill={target.color}
                  strokeWidth={0}
                />
                <View style={styles.targetLabels}>
                  <AppText role="Body">{target.label}</AppText>
                  <AppText role="Caption" color="secondary">
                    {target.subtitle}
                  </AppText>
                </View>
              </View>

              <View style={styles.targetRight}>
                <AppText role="Headline">
                  {target.value} {target.unit}
                </AppText>
                {target.kcal !== undefined && (
                  <AppText role="Caption" color="secondary">
                    {Math.round(target.kcal)} kcal
                  </AppText>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Helper Info */}
      <View style={styles.helperSection}>
        <AppText role="Caption" color="secondary" style={styles.helperText}>
          {t("onboarding.calculatorSummary.helper")}
        </AppText>
      </View>
    </OnboardingScreen>
  );
};

export default CalculatorSummaryScreen;

type Colors = ReturnType<typeof useTheme>["colors"];
type Theme = ReturnType<typeof useTheme>["theme"];

const createStyles = (colors: Colors, theme: Theme) => {
  const { spacing } = theme;

  return StyleSheet.create({
    titleSection: {
      alignItems: "center",
      marginBottom: spacing.lg,
      gap: spacing.xs,
    },
    secondaryText: {
      textAlign: "center",
      maxWidth: "75%",
      alignSelf: "center",
    },
    targetsSection: {
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    targetRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: spacing.sm,
    },
    targetLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      flex: 1,
      flexShrink: 1,
      marginRight: spacing.md,
    },
    targetLabels: {
      gap: spacing.xs / 2,
      flex: 1,
      flexShrink: 1,
    },
    targetRight: {
      alignItems: "flex-end",
      gap: spacing.xs / 2,
    },
    helperSection: {
      paddingHorizontal: spacing.lg,
      marginTop: spacing.lg,
      marginBottom: spacing.lg,
    },
    helperText: {
      textAlign: "center",
    },
    actionButtonsContainer: {
      gap: spacing.lg,
      alignItems: "stretch",
    },
    secondaryActions: {
      gap: spacing.xs,
      alignItems: "center",
    },
    centeredText: {
      textAlign: "center",
    },
  });
};
