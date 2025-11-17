import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { AppText } from "@/components/shared/AppText";
import { useTheme } from "@/theme";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";
import * as Haptics from "expo-haptics";
import { BicepsFlexed, Droplet, Wheat } from "lucide-react-native";
import { Button } from "@/components/shared/Button";
import { OnboardingScreen } from "../../src/components/onboarding/OnboardingScreen";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import { CalorieControl } from "@/components/onboarding/CalorieControl";
import { BudgetBar } from "@/components/onboarding/BudgetBar";
import { MacroSlider } from "@/components/onboarding/MacroSlider";
import Animated, { FadeIn } from "react-native-reanimated";
import { useTranslation } from "react-i18next";

const ManualInputScreen = () => {
  const { colors, theme: themeObj } = useTheme();
  const styles = createStyles(colors, themeObj);
  const { safePush, isNavigating } = useNavigationGuard();
  const {
    calorieGoal,
    proteinGoal,
    fatGoal,
    setCalorieGoal,
    setProteinGoal,
    setFatGoal,
    setCarbGoal,
    setInputMethod,
  } = useOnboardingStore();
  const { t } = useTranslation();

  // Initialize state from store values if available
  const [calories, setCalories] = useState(calorieGoal || 2500);
  const [protein, setProtein] = useState(proteinGoal || 0);
  const [fat, setFat] = useState(fatGoal || 0);

  // Ensure we're in manual mode
  useEffect(() => {
    setInputMethod("manual");
  }, [setInputMethod]);

  // Reset protein and fat when calories change if they would exceed budget
  useEffect(() => {
    const proteinCals = protein * 4;
    const fatCals = fat * 9;
    const total = proteinCals + fatCals;

    if (total > calories) {
      setProtein(0);
      setFat(0);
    }
  }, [calories]);

  // Auto-clamp fat when protein changes to prevent over-budget
  useEffect(() => {
    const maxFatCalories = calories - protein * 4;
    const maxFatGrams = Math.floor(maxFatCalories / 9);

    if (fat > maxFatGrams) {
      setFat(Math.max(0, maxFatGrams));
    }
  }, [protein, calories]);

  // Calculate macro calories
  const proteinCalories = protein * 4;
  const fatCalories = fat * 9;
  const usedCalories = proteinCalories + fatCalories;
  const remainingCalories = calories - usedCalories;
  const carbGrams = Math.max(0, Math.round(remainingCalories / 4));
  const carbCalories = carbGrams * 4;

  // Validation - ensure calories, protein, and fat are all set
  const isValid = calories > 0 && protein > 0 && fat > 0;

  const handleContinue = async () => {
    // Save to store
    setCalorieGoal(calories);
    setProteinGoal(protein);
    setFatGoal(fat);
    setCarbGoal(carbGrams);

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    safePush("/onboarding/manual-summary");
  };

  return (
    <OnboardingScreen
      actionButton={
        <Button
          variant="primary"
          label={t("onboarding.common.continue")}
          onPress={handleContinue}
          disabled={!isValid}
          isLoading={isNavigating}
        />
      }
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentWrapper}>
          {/* Header */}
          <View style={styles.headerSection}>
            <AppText role="Title2">{t("onboarding.manualInput.title")}</AppText>
            <AppText role="Body" color="secondary" style={styles.subtitle}>
              {t("onboarding.manualInput.subtitle")}
            </AppText>
          </View>

          {/* Calorie Control */}
          <View style={styles.section}>
            <CalorieControl value={calories} onChange={setCalories} />
          </View>

          {/* Macro Distribution Section */}
          {calories > 0 && (
            <Animated.View entering={FadeIn} style={styles.macrosSection}>
              <AppText role="Headline" style={styles.sectionTitle}>
                {t("onboarding.manualInput.macroDistribution")}
              </AppText>

              <BudgetBar
                totalCalories={calories}
                proteinCalories={proteinCalories}
                fatCalories={fatCalories}
                carbCalories={carbCalories}
              />

              {/* Macro Sliders */}

              {/* Protein Slider */}
              <MacroSlider
                label={t("nutrients.protein.label")}
                icon={BicepsFlexed}
                iconColor={colors.semantic.protein}
                grams={protein}
                onChange={setProtein}
                maxCalories={calories}
                caloriesPerGram={4}
              />

              {/* Fat Slider */}
              <MacroSlider
                label={t("nutrients.fat.label")}
                icon={Droplet}
                iconColor={colors.semantic.fat}
                grams={fat}
                onChange={setFat}
                maxCalories={calories - proteinCalories}
                caloriesPerGram={9}
              />

              {/* Carbs Display (Auto-calculated) */}
              <View style={styles.carbsDisplay}>
                <View style={styles.carbsHeader}>
                  <View style={styles.carbsLabelRow}>
                    <Wheat
                      size={20}
                      color={colors.semantic.carbs}
                      fill={colors.semantic.carbs}
                      strokeWidth={0}
                    />
                    <AppText role="Body">
                      {t("onboarding.manualInput.carbsLabel")}
                    </AppText>
                    <View style={styles.autoLabel}>
                      <AppText role="Caption" color="secondary">
                        {t("onboarding.manualInput.auto")}
                      </AppText>
                    </View>
                  </View>
                </View>

                <View style={styles.carbsValueRow}>
                  <AppText role="Title2">{carbGrams} g</AppText>
                  <AppText role="Caption" color="secondary">
                    {carbCalories} kcal /{" "}
                    {calories > 0
                      ? Math.round((carbCalories / calories) * 100)
                      : 0}
                    %
                  </AppText>
                </View>

                <AppText
                  role="Caption"
                  color="secondary"
                  style={styles.carbsHelper}
                >
                  {t("onboarding.manualInput.carbsHelper")}
                </AppText>
              </View>
            </Animated.View>
          )}
        </View>
      </ScrollView>
    </OnboardingScreen>
  );
};

export default ManualInputScreen;

type Colors = ReturnType<typeof useTheme>["colors"];
type Theme = ReturnType<typeof useTheme>["theme"];

const createStyles = (colors: Colors, themeObj: Theme) => {
  const { spacing } = themeObj;

  return StyleSheet.create({
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: spacing.xl,
    },
    contentWrapper: {
      paddingHorizontal: spacing.lg,
      gap: spacing.xl,
    },
    headerSection: {
      alignItems: "center",
      gap: spacing.xs,
      paddingTop: spacing.md,
    },
    subtitle: {
      textAlign: "center",
      maxWidth: "85%",
    },
    section: {
      //
    },
    macrosSection: {
      gap: spacing.md,
    },
    sectionTitle: {
      paddingHorizontal: spacing.xs,
    },
    carbsDisplay: {
      padding: spacing.md,
      backgroundColor: colors.subtleBackground,
      borderRadius: 12,
      gap: spacing.sm,
    },
    carbsHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    carbsLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    autoLabel: {
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      backgroundColor: colors.primaryBackground,
      borderRadius: 4,
    },
    carbsValueRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: spacing.sm,
    },
    carbsHelper: {
      lineHeight: 18,
    },
  });
};
