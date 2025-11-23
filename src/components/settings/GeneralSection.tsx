import React, { useMemo, useCallback } from "react";
import { View, StyleSheet, Linking } from "react-native";
import { Languages, Gift, Copy, Star } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import * as Clipboard from "expo-clipboard";

import { AppText, Card } from "@/components";
import { useTheme, Colors, Theme } from "@/theme";
import { useSafeRouter } from "@/hooks/useSafeRouter";
import { SettingRow } from "./SettingRow";
import { useLocalization } from "@/context/LocalizationContext";
import { useHud } from "@/hooks/useHud";

const APP_STORE_LINK =
  "https://apps.apple.com/de/app/macroloop-ki-kalorienz%C3%A4hler/id6754224603";
const APP_STORE_REVIEW_LINK = `${APP_STORE_LINK}?action=write-review`;

export const GeneralSection = () => {
  const { t } = useTranslation();
  const { languagePreference } = useLocalization();
  const { colors, theme } = useTheme();
  const router = useSafeRouter();
  const { showSuccess, showError } = useHud();
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

  const handleCopyAppLink = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(APP_STORE_LINK);
      showSuccess(
        t("settings.sections.general.rows.copyAppLink.toast.successTitle"),
        t("settings.sections.general.rows.copyAppLink.toast.successSubtitle")
      );
    } catch (error) {
      showError(
        t("settings.sections.general.rows.copyAppLink.toast.errorTitle"),
        t("settings.sections.general.rows.copyAppLink.toast.errorSubtitle")
      );
    }
  }, [showSuccess, showError, t]);

  const handleRateApp = useCallback(async () => {
    try {
      const canOpenReviewLink = await Linking.canOpenURL(
        APP_STORE_REVIEW_LINK
      );
      await Linking.openURL(canOpenReviewLink ? APP_STORE_REVIEW_LINK : APP_STORE_LINK);
    } catch (error) {
      showError(
        t("settings.sections.general.rows.rateApp.toast.errorTitle"),
        t("settings.sections.general.rows.rateApp.toast.errorSubtitle")
      );
    }
  }, [showError, t]);

  return (
    <View style={styles.section}>
      <AppText role="Caption" color="secondary" style={styles.sectionHeader}>
        {t("settings.sections.general.label")}
      </AppText>
      <Card padding={0}>
        <SettingRow
          icon={Gift}
          title={t("settings.sections.general.rows.changelog.title")}
          subtitle={t("settings.sections.general.rows.changelog.subtitle")}
          accessory="chevron"
          onPress={() => router.push("/settings/changelog")}
        />
        <View style={styles.separator} />
        <SettingRow
          icon={Languages}
          title={t("settings.sections.general.rows.language.title")}
          subtitle={t("settings.sections.general.rows.language.subtitle")}
          accessory="chevron"
          onPress={() => router.push("/settings/language")}
          value={languageValue}
          valueTone="secondary"
        />
        <View style={styles.separator} />
        <SettingRow
          icon={Copy}
          title={t("settings.sections.general.rows.copyAppLink.title")}
          subtitle={t("settings.sections.general.rows.copyAppLink.subtitle")}
          onPress={handleCopyAppLink}
        />
        <View style={styles.separator} />
        <SettingRow
          icon={Star}
          title={t("settings.sections.general.rows.rateApp.title")}
          subtitle={t("settings.sections.general.rows.rateApp.subtitle")}
          onPress={handleRateApp}
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
