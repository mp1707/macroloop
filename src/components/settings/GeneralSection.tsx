import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { Languages } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { AppText, Card } from "@/components";
import { useTheme, Colors, Theme } from "@/theme";
import { useSafeRouter } from "@/hooks/useSafeRouter";
import { SettingRow } from "./SettingRow";
import { useLocalization } from "@/context/LocalizationContext";

export const GeneralSection = () => {
  const { t } = useTranslation();
  const { languagePreference } = useLocalization();
  const { colors, theme } = useTheme();
  const router = useSafeRouter();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);
  const languageValue = useMemo(() => {
    switch (languagePreference) {
      case "en":
        return t("settings.language.options.en.label");
      case "de":
        return t("settings.language.options.de.label");
      default:
        return t("settings.language.options.device.label");
    }
  }, [languagePreference, t]);

  return (
    <View style={styles.section}>
      <AppText role="Caption" color="secondary" style={styles.sectionHeader}>
        {t("settings.sections.general.label")}
      </AppText>
      <Card padding={0}>
        <SettingRow
          icon={Languages}
          title={t("settings.sections.general.rows.language.title")}
          subtitle={t("settings.sections.general.rows.language.subtitle")}
          accessory="chevron"
          onPress={() => router.push("/settings/language")}
          value={languageValue}
          valueTone="secondary"
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
