import React, { useMemo, useCallback } from "react";
import { View, StyleSheet, Alert, Linking } from "react-native";
import { Shield, FileText } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { AppText, Card } from "@/components";
import { useTheme, Colors, Theme } from "@/theme";
import { SettingRow } from "./SettingRow";

const PRIVACY_URL = "https://getmacroloop.app/privacy";
const TERMS_URL = "https://getmacroloop.app/terms";

export const AboutSection = () => {
  const { t } = useTranslation();
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);

  const handleOpenLink = useCallback(
    (url: string) => {
      Linking.openURL(url).catch(() => {
        Alert.alert(t("settings.sections.legal.linkError"));
      });
    },
    [t]
  );

  return (
    <View style={styles.section}>
      <AppText role="Caption" color="secondary" style={styles.sectionHeader}>
        {t("settings.sections.legal.label")}
      </AppText>
      <Card padding={0}>
        <SettingRow
          icon={Shield}
          title={t("settings.sections.legal.rows.privacy")}
          onPress={() => handleOpenLink(PRIVACY_URL)}
          accessory="none"
        />
        <View style={styles.separator} />
        <SettingRow
          icon={FileText}
          title={t("settings.sections.legal.rows.terms")}
          onPress={() => handleOpenLink(TERMS_URL)}
          accessory="none"
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
