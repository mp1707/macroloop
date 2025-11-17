import React, { useMemo, useCallback, useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { Crown, BadgeCheck, RotateCcw } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { restorePurchases } from "@/lib/revenuecat/client";

import { AppText, Card } from "@/components";
import { SettingRow } from "../SettingRow";
import { useTheme, Colors, Theme } from "@/theme";
import { useAppStore } from "@/store/useAppStore";
import { usePaywall } from "@/hooks/usePaywall";
import { applyCustomerInfoToStore } from "@/lib/revenuecat/subscription";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";

const PROMO_LINK = "/paywall";

export const ProSection = () => {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);
  const { safeNavigate } = useNavigationGuard();
  const { isPro, isProCanceled, proExpirationDate } = useAppStore();
  const [isRestoringPurchases, setRestoringPurchases] = useState(false);

  // Get trial info for paywall
  const { options } = usePaywall();
  const trialDays = options[0]?.trialInfo?.days;
  const hasTrial = typeof trialDays === "number";
  const trialPillLabel = useMemo(() => {
    if (!hasTrial) {
      return null;
    }
    return t("paywall.trial.badge", { days: trialDays });
  }, [hasTrial, t, trialDays]);

  const language = i18n.language ?? undefined;

  const formattedExpirationDate = useMemo(() => {
    if (!proExpirationDate) {
      return undefined;
    }

    const date = new Date(proExpirationDate);
    if (Number.isNaN(date.getTime())) {
      return undefined;
    }

    return date.toLocaleDateString(language, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [language, proExpirationDate]);

  const cancellationDescription = useMemo(() => {
    if (!isProCanceled) {
      return t("settings.sections.subscription.manageDescription");
    }

    if (formattedExpirationDate) {
      return t("settings.sections.subscription.canceledWithDate", {
        date: formattedExpirationDate,
      });
    }

    return t("settings.sections.subscription.canceledWithoutDate");
  }, [formattedExpirationDate, isProCanceled, t]);

  const handleShowPaywall = useCallback(() => {
    safeNavigate(PROMO_LINK);
  }, [safeNavigate]);

  const handleManageSubscription = useCallback(() => {
    safeNavigate(PROMO_LINK);
  }, [safeNavigate]);

  const handleRestorePurchases = useCallback(async () => {
    setRestoringPurchases(true);
    try {
      const info = await restorePurchases();
      applyCustomerInfoToStore(info);
      const hasPro = Boolean(info.entitlements.active?.pro);

      if (hasPro) {
        Alert.alert(
          t("settings.sections.subscription.restore.alerts.restored.title"),
          t("settings.sections.subscription.restore.alerts.restored.message")
        );
      } else {
        Alert.alert(
          t("settings.sections.subscription.restore.alerts.notFound.title"),
          t("settings.sections.subscription.restore.alerts.notFound.message")
        );
      }
    } catch (error: any) {
      Alert.alert(
        t("settings.sections.subscription.restore.alerts.error.title"),
        error?.message ??
          t("settings.sections.subscription.restore.alerts.error.message")
      );
      if (__DEV__) {
        console.warn("[RC] restore failed:", error);
      }
    } finally {
      setRestoringPurchases(false);
    }
  }, [t]);

  return (
    <View style={styles.section}>
      <AppText role="Caption" color="secondary" style={styles.sectionHeader}>
        {t("settings.sections.subscription.label")}
      </AppText>
      <Card padding={0} style={styles.sectionCard}>
        {!isPro && trialPillLabel && (
          <View style={styles.trialPillWrapper}>
            <View style={styles.trialPill}>
              <AppText role="Caption" style={styles.trialPillText}>
                {trialPillLabel}
              </AppText>
            </View>
          </View>
        )}
        <SettingRow
          icon={isPro ? BadgeCheck : Crown}
          title={
            isPro
              ? t("settings.sections.subscription.manageTitle")
              : t("settings.sections.subscription.upgradeTitle")
          }
          subtitle={
            isPro
              ? cancellationDescription
              : hasTrial
              ? t("settings.sections.subscription.upgradeDescriptionWithTrial")
              : t("settings.sections.subscription.upgradeDescription")
          }
          accessory="chevron"
          onPress={isPro ? handleManageSubscription : handleShowPaywall}
          hapticIntensity="light"
        />
        {!isPro && (
          <>
            <View style={styles.separator} />
            <SettingRow
              icon={RotateCcw}
              title={t("settings.sections.subscription.restore.title")}
              subtitle={t("settings.sections.subscription.restore.subtitle")}
              actionButton={{
                label: isRestoringPurchases
                  ? t("settings.sections.subscription.restore.buttonLoading")
                  : t("settings.sections.subscription.restore.button"),
                onPress: handleRestorePurchases,
                loading: isRestoringPurchases,
              }}
              accessory="none"
            />
          </>
        )}
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
    sectionCard: {
      position: "relative",
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.subtleBorder,
      marginLeft: theme.spacing.lg + 24 + theme.spacing.md,
      marginRight: theme.spacing.lg,
    },
    trialPillWrapper: {
      position: "absolute",
      top: -theme.spacing.sm,
      right: theme.spacing.sm,
      zIndex: 1,
    },
    trialPill: {
      backgroundColor: colors.accent,
      borderRadius: theme.components.buttons.cornerRadius,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
    },
    trialPillText: {
      color: colors.black,
    },
  });
