import React, { useMemo, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { Calculator, Edit2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { AppText, Card } from "@/components";
import { useTheme, Theme, Colors } from "@/theme";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";
import { SettingRow } from "../SettingRow";
import { useOnboardingStore } from "@/store/useOnboardingStore";

export const GoalsSection = () => {
  const { t } = useTranslation();
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);
  const { safeNavigate } = useNavigationGuard();
  const { setInputMethod } = useOnboardingStore();

  const handleCalculatedTargets = useCallback(() => {
    setInputMethod("calculate");
    safeNavigate("/onboarding/age");
  }, [safeNavigate, setInputMethod]);

  const handleManualTargets = useCallback(() => {
    setInputMethod("manual");
    safeNavigate("/onboarding/manual-input");
  }, [safeNavigate, setInputMethod]);

  return (
    <View style={styles.section}>
      <AppText role="Caption" color="secondary" style={styles.sectionHeader}>
        {t("settings.sections.tracking.label")}
      </AppText>
      <Card padding={0}>
        <SettingRow
          icon={Calculator}
          title={t("settings.sections.tracking.rows.calculateTargets.title")}
          subtitle={t(
            "settings.sections.tracking.rows.calculateTargets.subtitle"
          )}
          onPress={handleCalculatedTargets}
          accessory="chevron"
        />
        <View style={styles.separator} />

        <SettingRow
          icon={Edit2}
          title={t("settings.sections.tracking.rows.manualTargets.title")}
          subtitle={t("settings.sections.tracking.rows.manualTargets.subtitle")}
          onPress={handleManualTargets}
          accessory="chevron"
        />
      </Card>
    </View>
  );
};

const createStyles = (colors: Colors, theme: Theme) =>
  StyleSheet.create({
    section: {
      marginBottom: theme.spacing.lg,
    },
    sectionHeader: {
      marginBottom: theme.spacing.sm,
      marginLeft: theme.spacing.lg,
      letterSpacing: 0.5,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.subtleBorder,
      marginLeft: theme.spacing.lg + 24 + theme.spacing.md,
      marginRight: theme.spacing.lg,
    },
  });
