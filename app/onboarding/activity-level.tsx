import React, { useState, useRef } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/theme";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import { RadioCard } from "@/components/shared/RadioCard";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";
import { ACTIVITY_LEVELS } from "@/components/settings/calculationMethods";
import { UserSettings } from "@/types/models";
import { OnboardingScreen } from "../../src/components/onboarding/OnboardingScreen";
import { AppText } from "@/components/shared/AppText";
import { Button } from "@/components/shared/Button";
import { useTranslation } from "react-i18next";

export default function Step2ActivityLevelScreen() {
  const { colors, theme: themeObj } = useTheme();
  const styles = createStyles(themeObj);
  const { activityLevel, setActivityLevel } = useOnboardingStore();
  const { safePush, isNavigating } = useNavigationGuard();
  const scrollRef = useRef<ScrollView>(null);
  const { t } = useTranslation();

  const [selectedLevel, setSelectedLevel] = useState<
    UserSettings["activityLevel"] | null
  >(activityLevel || null);

  const handleCardSelect = async (level: UserSettings["activityLevel"]) => {
    setSelectedLevel(level);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scrollRef.current?.scrollToEnd({ animated: true });
  };

  const handleContinue = async () => {
    if (!selectedLevel) return;

    setActivityLevel(selectedLevel);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    safePush("/onboarding/calorie-goal");
  };

  const activityLevels = Object.values(ACTIVITY_LEVELS);

  return (
    <OnboardingScreen
      ref={scrollRef}
      title={
        <AppText role="Title2">{t("onboarding.activityLevel.title")}</AppText>
      }
      actionButton={
        <Button
          variant="primary"
          label={t("onboarding.common.continue")}
          disabled={!selectedLevel}
          onPress={handleContinue}
          isLoading={isNavigating}
        />
      }
    >
      <View style={styles.methodsSection}>
        {activityLevels.map((level) => {
          const title = t(level.titleKey);
          const description = t(level.descriptionKey);
          return (
            <RadioCard
              key={level.id}
              title={title}
              description={description}
              isSelected={selectedLevel === level.id}
              onSelect={() => handleCardSelect(level.id)}
              accessibilityLabel={t(
                "onboarding.activityLevel.accessibility.label",
                { title }
              )}
              accessibilityHint={t(
                "onboarding.activityLevel.accessibility.hint",
                { title, description }
              )}
            />
          );
        })}
      </View>
    </OnboardingScreen>
  );
}

type Theme = ReturnType<typeof useTheme>["theme"];

const createStyles = (themeObj: Theme) => {
  const { spacing } = themeObj;

  return StyleSheet.create({
    secondaryText: {
      textAlign: "center",
      maxWidth: "75%",
      alignSelf: "center",
    },
    methodsSection: {
      gap: spacing.md,
      paddingHorizontal: spacing.md,
    },
  });
};
