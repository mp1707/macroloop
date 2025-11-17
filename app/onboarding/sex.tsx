import React, { useMemo, useState, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";

import { useTheme } from "@/theme";
import { RadioCard } from "@/components/shared/RadioCard";
import { AppText } from "@/components/shared/AppText";
import { Button } from "@/components/shared/Button";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import { OnboardingScreen } from "@/components/onboarding/OnboardingScreen";

const SEX_OPTIONS = ["male", "female"] as const;

type SexOption = (typeof SEX_OPTIONS)[number];

const SexSelectionScreen = () => {
  const { colors, theme: themeObj } = useTheme();
  const styles = useMemo(
    () => createStyles(colors, themeObj),
    [colors, themeObj]
  );
  const { sex, setSex } = useOnboardingStore();
  const { safePush, isNavigating } = useNavigationGuard();
  const { t } = useTranslation();

  const [selectedSex, setSelectedSex] = useState<SexOption | null>(sex ?? null);

  const handleCardSelect = useCallback(async (option: SexOption) => {
    setSelectedSex(option);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleContinue = useCallback(async () => {
    if (!selectedSex) return;

    setSex(selectedSex);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    safePush("/onboarding/height");
  }, [safePush, selectedSex, setSex]);

  return (
    <OnboardingScreen
      title={<AppText role="Title2">{t("onboarding.sex.title")}</AppText>}
      subtitle={
        <AppText role="Body" color="secondary" style={styles.secondaryText}>
          {t("onboarding.sex.subtitle")}
        </AppText>
      }
      actionButton={
        <Button
          variant="primary"
          label={t("onboarding.common.continue")}
          disabled={!selectedSex}
          onPress={handleContinue}
          isLoading={isNavigating}
        />
      }
    >
      <View style={styles.contentWrapper}>
        <View style={styles.selectionSection}>
          {SEX_OPTIONS.map((option) => (
            <RadioCard
              key={option}
              title={t(`onboarding.sex.options.${option}`)}
              isSelected={selectedSex === option}
              onSelect={() => handleCardSelect(option)}
              accessibilityLabel={t("onboarding.sex.accessibility.label", {
                option: t(`onboarding.sex.options.${option}`),
              })}
              accessibilityHint={t("onboarding.sex.accessibility.hint")}
            />
          ))}
        </View>
      </View>
    </OnboardingScreen>
  );
};

export default SexSelectionScreen;

type Colors = ReturnType<typeof useTheme>["colors"];
type Theme = ReturnType<typeof useTheme>["theme"];

const createStyles = (colors: Colors, theme: Theme) => {
  const { spacing } = theme;

  return StyleSheet.create({
    secondaryText: {
      textAlign: "center",
      maxWidth: "75%",
      alignSelf: "center",
    },
    contentWrapper: {
      paddingHorizontal: spacing.pageMargins.horizontal,
    },
    selectionSection: {
      gap: spacing.md,
    },
  });
};
