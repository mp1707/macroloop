import React, { useMemo, useState, useRef } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { AppText } from "@/components/shared/AppText";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/theme";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import { RadioCard } from "@/components/shared/RadioCard";
import { Button } from "@/components/shared/Button";
import { ProteinGoalType } from "@/types/models";
import { OnboardingScreen } from "../../src/components/onboarding/OnboardingScreen";
import { useTranslation } from "react-i18next";

const METHODS: Record<
  ProteinGoalType,
  {
    id: ProteinGoalType;
    titleKey: string;
    descriptionKey: string;
    factor: number;
    recommended?: boolean;
  }
> = {
  baseline: {
    id: "baseline",
    titleKey: "onboarding.proteinGoal.methods.baseline.title",
    descriptionKey: "onboarding.proteinGoal.methods.baseline.description",
    factor: 1.2,
  },
  exerciser: {
    id: "exerciser",
    titleKey: "onboarding.proteinGoal.methods.exerciser.title",
    descriptionKey: "onboarding.proteinGoal.methods.exerciser.description",
    factor: 1.6,
    recommended: true,
  },
  athlete: {
    id: "athlete",
    titleKey: "onboarding.proteinGoal.methods.athlete.title",
    descriptionKey: "onboarding.proteinGoal.methods.athlete.description",
    factor: 2.0,
  },
  diet_phase: {
    id: "diet_phase",
    titleKey: "onboarding.proteinGoal.methods.diet_phase.title",
    descriptionKey: "onboarding.proteinGoal.methods.diet_phase.description",
    factor: 2.2,
  },
};

export default function ProteinGoalsScreen() {
  const { colors, theme: themeObj } = useTheme();
  const styles = createStyles(colors, themeObj);
  const { weight, proteinGoalType, setProteinGoal, setProteinGoalType } =
    useOnboardingStore();
  const { safePush, isNavigating } = useNavigationGuard();
  const scrollRef = useRef<ScrollView>(null);
  const { t } = useTranslation();

  const [selectedMethod, setSelectedMethod] = useState<ProteinGoalType | null>(
    proteinGoalType || null
  );

  const currentWeight = weight || 0;

  const proteinGoals = useMemo(() => {
    return {
      baseline: Math.round(currentWeight * METHODS.baseline.factor),
      exerciser: Math.round(currentWeight * METHODS.exerciser.factor),
      athlete: Math.round(currentWeight * METHODS.athlete.factor),
      diet_phase: Math.round(currentWeight * METHODS.diet_phase.factor),
    };
  }, [currentWeight]);

  const handleCardSelect = async (method: ProteinGoalType) => {
    setSelectedMethod(method);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scrollRef.current?.scrollToEnd({ animated: true });
  };

  const handleContinue = async () => {
    if (!selectedMethod) return;

    const proteinValue =
      proteinGoals[selectedMethod as keyof typeof proteinGoals];
    setProteinGoal(proteinValue);
    setProteinGoalType(selectedMethod);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    safePush("/onboarding/calculator-summary");
  };

  const methods = Object.values(METHODS);
  return (
    <OnboardingScreen
      ref={scrollRef}
      title={<AppText role="Title2">{t("onboarding.proteinGoal.title")}</AppText>}
      subtitle={
        <AppText role="Body" color="secondary" style={styles.secondaryText}>
          {weight
            ? t("onboarding.proteinGoal.subtitle", { weight })
            : t("onboarding.proteinGoal.subtitleFallback")}
        </AppText>
      }
      actionButton={
        <Button
          variant="primary"
          label={t("onboarding.common.continue")}
          disabled={!selectedMethod}
          onPress={handleContinue}
          isLoading={isNavigating}
        />
      }
    >
      <View style={styles.contentWrapper}>
        <View style={styles.methodsSection}>
          {methods.map((method) => {
            const title = t(method.titleKey);
            const description = t(method.descriptionKey);
            return (
              <RadioCard
                key={method.id}
                title={title}
                description={description}
                factor={method.factor}
                recommended={method.recommended}
                isSelected={selectedMethod === method.id}
                onSelect={() => handleCardSelect(method.id)}
                accessibilityLabel={title}
                accessibilityHint={t(
                  "onboarding.proteinGoal.accessibilityHint",
                  { factor: method.factor, description }
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
    methodsSection: {
      marginBottom: spacing.lg,
      gap: spacing.md,
    },
    footer: {
      marginTop: spacing.xl,
      paddingTop: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
  });
};
