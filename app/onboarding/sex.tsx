import React, { useMemo, useCallback } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { User } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/theme";
import { SelectionCard } from "@/components/settings/SelectionCard";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import { AppText } from "@/components/shared/AppText";
import { useTranslation } from "react-i18next";
import type { Colors, Theme } from "@/theme";

const SexSelectionScreen = () => {
  const { colors, theme: themeObj } = useTheme();
  const { sex, setSex } = useOnboardingStore();
  const { safePush } = useNavigationGuard();
  const { t } = useTranslation();

  const styles = useMemo(
    () => createStyles(colors, themeObj),
    [colors, themeObj]
  );

  const handleSexSelect = useCallback(
    async (selectedSex: "male" | "female") => {
      setSex(selectedSex);

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      safePush("/onboarding/height");
    },
    [setSex, safePush]
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSection}>
          <AppText role="Title2">{t("onboarding.sex.title")}</AppText>
          <AppText role="Body" color="secondary" style={styles.secondaryText}>
            {t("onboarding.sex.subtitle")}
          </AppText>
        </View>

        <View style={styles.centeredContent}>
          <View style={styles.contentWrapper}>
            <View style={styles.selectionSection}>
              {(["male", "female"] as const).map((option) => (
                <SelectionCard
                  key={option}
                  title={t(`onboarding.sex.options.${option}`)}
                  description=""
                  icon={User}
                  iconColor={option === "male" ? "#4A90E2" : "#E24A90"}
                  isSelected={sex === option}
                  onSelect={() => handleSexSelect(option)}
                  accessibilityLabel={t("onboarding.sex.accessibility.label", {
                    option: t(`onboarding.sex.options.${option}`),
                  })}
                  accessibilityHint={t("onboarding.sex.accessibility.hint")}
                />
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default SexSelectionScreen;

const createStyles = (colors: Colors, theme: Theme) => {
  const { spacing } = theme;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.primaryBackground,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: spacing.lg,
      gap: spacing.lg,
    },
    headerSection: {
      paddingTop: spacing.lg,
      paddingHorizontal: spacing.pageMargins.horizontal,
      alignItems: "center",
      gap: spacing.sm,
    },
    centeredContent: {
      flex: 1,
      justifyContent: "center",
    },
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
