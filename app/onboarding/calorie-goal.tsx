import React, { useEffect, useState, useRef } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";
import * as Haptics from "expo-haptics";
import { TrendingDown, Equal, TrendingUp } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { RadioCard } from "@/components/shared/RadioCard";
import { Button } from "@/components/shared/Button";
import type { UserSettings } from "@/types/models";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import { calculateCalorieGoals } from "@/utils/calculateCalories";
import { OnboardingScreen } from "../../src/components/onboarding/OnboardingScreen";
import { AppText } from "@/components/shared/AppText";
import { useTranslation } from "react-i18next";

export default function Step3GoalsScreen() {
  const { colors, theme: themeObj } = useTheme();
  const styles = createStyles(colors, themeObj);
  const {
    age,
    sex,
    weight,
    height,
    activityLevel,
    calorieGoalType,
    setCalorieGoalType,
    setCalorieGoal,
    setInputMethod,
  } = useOnboardingStore();
  const { safePush, isNavigating } = useNavigationGuard();
  const scrollRef = useRef<ScrollView>(null);
  const { t } = useTranslation();

  const [selectedGoal, setSelectedGoal] = useState<
    UserSettings["calorieGoalType"] | null
  >(calorieGoalType || null);

  // Ensure we're in calculate mode when entering questionnaire
  useEffect(() => {
    setInputMethod("calculate");
  }, [setInputMethod]);

  // Calculate calorie goals based on onboarding data
  const calorieGoals =
    !age || !sex || !weight || !height || !activityLevel
      ? undefined
      : calculateCalorieGoals(
          {
            sex,
            age,
            weight,
            height,
            activityLevel,
            calorieGoalType: "maintain",
          },
          activityLevel as any
        );

  const handleGoalSelect = (goalType: UserSettings["calorieGoalType"]) => {
    if (!calorieGoals) return;
    if (!goalType) return;
    setSelectedGoal(goalType);
    setCalorieGoalType(goalType);
    setCalorieGoal(calorieGoals[goalType]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scrollRef.current?.scrollToEnd({ animated: true });
  };

  const handleContinue = () => {
    if (!selectedGoal) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    safePush("/onboarding/protein-goal");
  };

  if (!calorieGoals) {
    return (
      <OnboardingScreen
        actionButton={
          <Button
            variant="primary"
            label={t("onboarding.common.goBack")}
            onPress={() => safePush("/onboarding/activity-level")}
            disabled={false}
            isLoading={isNavigating}
          />
        }
      >
        <View style={{ alignItems: "center", gap: 16 }}>
          <AppText role="Body" color="secondary" style={styles.secondaryText}>
            {t("onboarding.calorieGoal.missingData")}
          </AppText>
        </View>
      </OnboardingScreen>
    );
  }

  const GOAL_OPTIONS = [
    {
      id: "lose" as const,
      Icon: TrendingDown,
      color: colors.error,
    },
    {
      id: "maintain" as const,
      Icon: Equal,
      color: colors.success,
    },
    {
      id: "gain" as const,
      Icon: TrendingUp,
      color: colors.semantic.protein,
    },
  ];

  return (
    <OnboardingScreen
      ref={scrollRef}
      title={<AppText role="Title2">{t("onboarding.calorieGoal.title")}</AppText>}
      subtitle={
        <AppText role="Body" color="secondary" style={styles.secondaryText}>
          {t("onboarding.calorieGoal.subtitle")}
        </AppText>
      }
      actionButton={
        <Button
          variant="primary"
          label={t("onboarding.common.continue")}
          disabled={!selectedGoal}
          onPress={handleContinue}
          isLoading={isNavigating}
        />
      }
    >
      <View style={styles.contentWrapper}>
        <View style={styles.goalsSection}>
          {GOAL_OPTIONS.map(({ id, Icon, color }) => {
            const caloriesValue = calorieGoals[id];
            return (
              <RadioCard
                key={id}
                title={t(`onboarding.calorieGoal.options.${id}.title`)}
                description={t(
                  `onboarding.calorieGoal.options.${id}.description`
                )}
                titleIcon={Icon}
                titleIconColor={color}
                badge={{ label: `${caloriesValue} kcal` }}
                isSelected={selectedGoal === id}
                onSelect={() => handleGoalSelect(id)}
                accessibilityLabel={t(
                  `onboarding.calorieGoal.options.${id}.accessibilityLabel`
                )}
                accessibilityHint={t(
                  `onboarding.calorieGoal.options.${id}.accessibilityHint`,
                  { calories: caloriesValue }
                )}
              />
            );
          })}
        </View>
      </View>
    </OnboardingScreen>
  );
}

type Colors = ReturnType<typeof useTheme>["colors"];
type Theme = ReturnType<typeof useTheme>["theme"];

const createStyles = (colors: Colors, themeObj: Theme) => {
  const { spacing } = themeObj;

  return StyleSheet.create({
    secondaryText: {
      textAlign: "center",
      maxWidth: "75%",
      alignSelf: "center",
    },
    contentWrapper: {
      paddingHorizontal: spacing.md,
    },
    goalsSection: {
      gap: spacing.md,
    },
  });
};
