import React, { useMemo, useCallback } from "react";
import { View, StyleSheet, Alert, Linking, Platform } from "react-native";
import { Shield, FileText, Mail, Gift, Copy, Star } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import Constants from "expo-constants";
import * as Clipboard from "expo-clipboard";

import { AppText, Card } from "@/components";
import { useTheme, Colors, Theme } from "@/theme";
import { useSafeRouter } from "@/hooks/useSafeRouter";
import { useHud } from "@/hooks/useHud";
import { SettingRow } from "./SettingRow";

const PRIVACY_URL = "https://getmacroloop.app/privacy";
const TERMS_URL = "https://getmacroloop.app/terms";
const APP_STORE_LINK =
  "https://apps.apple.com/de/app/macroloop-ki-kalorienz%C3%A4hler/id6754224603";
const APP_STORE_REVIEW_LINK = `${APP_STORE_LINK}?action=write-review`;

export const AboutSection = () => {
  const { t } = useTranslation();
  const { colors, theme } = useTheme();
  const router = useSafeRouter();
  const { showSuccess, showError } = useHud();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);

  const handleOpenLink = useCallback(
    (url: string) => {
      Linking.openURL(url).catch(() => {
        Alert.alert(t("settings.sections.about.linkError"));
      });
    },
    [t]
  );

  const handleCopyAppLink = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(APP_STORE_LINK);
      showSuccess(
        t("settings.sections.about.rows.copyAppLink.toast.successTitle"),
        t("settings.sections.about.rows.copyAppLink.toast.successSubtitle")
      );
    } catch (error) {
      showError(
        t("settings.sections.about.rows.copyAppLink.toast.errorTitle"),
        t("settings.sections.about.rows.copyAppLink.toast.errorSubtitle")
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
        t("settings.sections.about.rows.rateApp.toast.errorTitle"),
        t("settings.sections.about.rows.rateApp.toast.errorSubtitle")
      );
    }
  }, [showError, t]);

  const handleGiveFeedback = useCallback(async () => {
    const version = Constants.expoConfig?.version ?? "1.0.0";
    const build =
      Constants.expoConfig?.ios?.buildNumber ??
      Constants.expoConfig?.android?.versionCode ??
      Constants.nativeBuildVersion ??
      "";

    const deviceInfo = Platform.select({
      ios: `iOS ${Platform.Version} - ${Constants.deviceName || 'iPhone'}`,
      android: `Android API ${Platform.Version} - ${Constants.deviceName || 'Android Device'}`,
      default: 'Unknown Device'
    });

    const appInfo = build ? `${version} (${build})` : version;
    const fullInfo = `${deviceInfo}\nApp Version: ${appInfo}`;

    const body = encodeURIComponent(`\n\n\n\n---\n${fullInfo}`);
    const mailto = `mailto:mpapps@web.de?subject=MacroLoop%20Feedback&body=${body}`;

    await Linking.openURL(mailto);
  }, []);

  return (
    <View style={styles.section}>
      <AppText role="Caption" color="secondary" style={styles.sectionHeader}>
        {t("settings.sections.about.label")}
      </AppText>
      <Card padding={0}>
        <SettingRow
          icon={Gift}
          title={t("settings.sections.about.rows.changelog.title")}
          subtitle={t("settings.sections.about.rows.changelog.subtitle")}
          accessory="chevron"
          onPress={() => router.push("/settings/changelog")}
        />
        <View style={styles.separator} />
        <SettingRow
          icon={Copy}
          title={t("settings.sections.about.rows.copyAppLink.title")}
          subtitle={t("settings.sections.about.rows.copyAppLink.subtitle")}
          onPress={handleCopyAppLink}
        />
        <View style={styles.separator} />
        <SettingRow
          icon={Star}
          title={t("settings.sections.about.rows.rateApp.title")}
          subtitle={t("settings.sections.about.rows.rateApp.subtitle")}
          onPress={handleRateApp}
        />
        <View style={styles.separator} />
        <SettingRow
          icon={Mail}
          title={t("settings.sections.about.rows.giveFeedback.title")}
          subtitle={t("settings.sections.about.rows.giveFeedback.subtitle")}
          onPress={handleGiveFeedback}
        />
        <View style={styles.separator} />
        <SettingRow
          icon={Shield}
          title={t("settings.sections.about.rows.privacy")}
          onPress={() => handleOpenLink(PRIVACY_URL)}
          accessory="none"
        />
        <View style={styles.separator} />
        <SettingRow
          icon={FileText}
          title={t("settings.sections.about.rows.terms")}
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
