import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { BrainCircuit, Calculator, Check, Heart, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import { AppText } from "@/components/shared/AppText";
import { Button } from "@/components/shared/Button";
import { RoundButton } from "@/components/shared/RoundButton";
import { usePaywall } from "@/hooks/usePaywall";
import { useSafeRouter } from "@/hooks/useSafeRouter";
import { Colors, Theme, useTheme } from "@/theme";

const getPaywallFeatures = (t: TFunction) => [
  {
    title: t("paywall.features.aiLogging.title"),
    description: t("paywall.features.aiLogging.description"),
    Icon: BrainCircuit,
  },
  {
    title: t("paywall.features.instantRecalculation.title"),
    description: t("paywall.features.instantRecalculation.description"),
    Icon: Calculator,
  },
  {
    title: t("paywall.features.noAds.title"),
    description: t("paywall.features.noAds.description"),
    Icon: Heart,
  },
];

export default function PaywallScreen() {
  const { theme, colors } = useTheme();
  const styles = useMemo(() => createStyles(theme, colors), [theme, colors]);
  const router = useSafeRouter();
  const { t } = useTranslation();

  const {
    options,
    selectedId,
    isLoading,
    loadError,
    isPurchasing,
    isRestoring,
    selectOption,
    reload,
    purchase,
    restore,
  } = usePaywall();

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  const handleSelectOption = (id: string) => {
    selectOption(id);
    Haptics.impactAsync(theme.interactions.haptics.light).catch(() => {});
  };

  const handlePurchase = async () => {
    Haptics.impactAsync(theme.interactions.haptics.light).catch(() => {});
    const result = await purchase();

    if (result.status === "ok") {
      handleClose();
      return;
    }

    if (result.status === "error") {
      Alert.alert(
        t("paywall.alerts.purchaseFailed.title"),
        t("paywall.errors.purchaseFailed")
      );
    }
  };

  const handleRestore = async () => {
    Haptics.impactAsync(theme.interactions.haptics.light).catch(() => {});
    const result = await restore();

    if (result.status === "ok") {
      Alert.alert(
        t("paywall.alerts.restoreSuccess.title"),
        t("paywall.alerts.restoreSuccess.message")
      );
      handleClose();
      return;
    }

    if (result.status === "error") {
      Alert.alert(
        t("paywall.alerts.restoreFailed.title"),
        t("paywall.errors.restoreFailed")
      );
    }
  };

  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  const handleRetry = () => {
    Haptics.impactAsync(theme.interactions.haptics.light).catch(() => {});
    void reload();
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <RoundButton
          onPress={handleClose}
          Icon={X}
          variant="tertiary"
          accessibilityLabel={t("paywall.a11y.close")}
          style={styles.closeButton}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.accent} />
          <AppText role="Caption" color="secondary">
            {t("paywall.states.loading")}
          </AppText>
        </View>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.container}>
        <RoundButton
          onPress={handleClose}
          Icon={X}
          variant="tertiary"
          accessibilityLabel={t("paywall.a11y.close")}
          style={styles.closeButton}
        />
        <View style={styles.errorContainer}>
          <AppText role="Headline" style={styles.errorTitle}>
            {t("common.error")}
          </AppText>
          <AppText role="Body" color="secondary" style={styles.errorMessage}>
            {t("paywall.errors.loadFailed")}
          </AppText>
          <Button
            variant="primary"
            label={t("paywall.buttons.retry")}
            onPress={handleRetry}
            style={styles.retryButton}
          />
        </View>
      </View>
    );
  }

  if (options.length === 0) {
    return (
      <View style={styles.container}>
        <RoundButton
          onPress={handleClose}
          Icon={X}
          variant="tertiary"
          accessibilityLabel={t("paywall.a11y.close")}
          style={styles.closeButton}
        />
        <View style={styles.errorContainer}>
          <AppText role="Subhead" color="secondary">
            {t("paywall.states.unavailable")}
          </AppText>
        </View>
      </View>
    );
  }

  const highlightedId = options.length > 1 ? options[0].id : null;

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      <RoundButton
        onPress={handleClose}
        Icon={X}
        variant="tertiary"
        accessibilityLabel={t("paywall.a11y.close")}
        style={styles.closeButton}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <AppText role="Title1" style={styles.title}>
            {t("paywall.header.title")}
          </AppText>
          <AppText role="Body" color="secondary" style={styles.subtitle}>
            {t("paywall.header.subtitle")}
          </AppText>
        </View>

        <View style={styles.features}>
          {getPaywallFeatures(t).map(({ Icon, title, description }) => (
            <View key={title} style={styles.feature}>
              <View style={styles.featureIcon}>
                <Icon size={22} color={colors.accent} />
              </View>
              <View style={styles.featureText}>
                <AppText role="Headline">{title}</AppText>
                <AppText role="Caption" color="secondary">
                  {description}
                </AppText>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.packages}>
          {options.map((option) => {
            const isSelected = option.id === selectedId;
            const isMonthly = option.package.packageType === "MONTHLY";
            const hasTrial = Boolean(option.trialInfo);
            const trialDays = option.trialInfo?.days ?? 0;

            return (
              <TouchableOpacity
                key={option.id}
                activeOpacity={0.7}
                onPress={() => handleSelectOption(option.id)}
                style={[styles.package, isSelected && styles.packageSelected]}
              >
                {isMonthly ? (
                  <>
                    {hasTrial && (
                      <View style={styles.trialBadgeContainer}>
                        <View style={styles.trialBadge}>
                          <AppText
                            role="Caption"
                            style={styles.trialBadgeTitle}
                          >
                            {t("paywall.trial.badge", {
                              days: trialDays,
                            })}
                          </AppText>
                        </View>
                      </View>
                    )}
                    <View style={styles.monthlyPriceRow}>
                      <AppText role="Title2" style={styles.monthlyPrice}>
                        {option.price}
                      </AppText>
                      <AppText role="Caption" style={styles.priceMetaLabel}>
                        {t("paywall.options.period.perMonth")}
                      </AppText>
                      {hasTrial && (
                        <>
                          <View style={styles.priceMetaDivider} />
                          <AppText role="Caption" style={styles.priceMetaLabel}>
                            {t("paywall.trial.eligible.then")}
                          </AppText>
                        </>
                      )}
                    </View>
                    <View style={styles.bulletList}>
                      <View style={styles.bulletItem}>
                        <Check
                          size={14}
                          color={colors.accent}
                          style={styles.bulletIcon}
                        />
                        <AppText role="Caption" style={styles.bulletText}>
                          {t("paywall.options.period.bullets.cancelAnytime")}
                        </AppText>
                      </View>
                      <View style={styles.bulletItem}>
                        <Check
                          size={14}
                          color={colors.accent}
                          style={styles.bulletIcon}
                        />
                        <AppText role="Caption" style={styles.bulletText}>
                          {t("paywall.options.period.bullets.appleAccount")}
                        </AppText>
                      </View>
                      <View style={styles.bulletItem}>
                        <Check
                          size={14}
                          color={colors.accent}
                          style={styles.bulletIcon}
                        />
                        <AppText role="Caption" style={styles.bulletText}>
                          {t("paywall.options.period.bullets.autoRenew")}
                        </AppText>
                      </View>
                    </View>
                  </>
                ) : (
                  <>
                    {option.title && (
                      <>
                        <View style={styles.packageHeader}>
                          <AppText role="Headline">{option.title}</AppText>
                        </View>
                        <AppText role="Title2">{option.price}</AppText>
                      </>
                    )}
                    <AppText role="Caption" color="secondary">
                      {option.periodDescription}
                    </AppText>
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Button
          variant="primary"
          label={
            isPurchasing
              ? t("paywall.buttons.processing")
              : selectedId &&
                options.find((opt) => opt.id === selectedId)?.trialInfo
              ? t("paywall.buttons.primaryWithTrial", {
                  days: options.find((opt) => opt.id === selectedId)!.trialInfo!
                    .days,
                })
              : t("paywall.buttons.primary")
          }
          onPress={handlePurchase}
          disabled={isPurchasing || !selectedId}
          isLoading={isPurchasing}
        />

        <View style={styles.legal}>
          <View style={styles.links}>
            <TouchableOpacity
              onPress={() =>
                handleOpenLink(
                  "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
                )
              }
              activeOpacity={0.6}
            >
              <AppText role="Caption" style={styles.link}>
                {t("paywall.links.terms")}
              </AppText>
            </TouchableOpacity>
            <View style={styles.linkDivider} />
            <TouchableOpacity
              onPress={() =>
                handleOpenLink(
                  "https://mp1707.github.io/macroloopinfo/privacy-policy.html"
                )
              }
              activeOpacity={0.6}
            >
              <AppText role="Caption" style={styles.link}>
                {t("paywall.links.privacy")}
              </AppText>
            </TouchableOpacity>
            <View style={styles.linkDivider} />
            <TouchableOpacity
              onPress={handleRestore}
              disabled={isRestoring}
              activeOpacity={0.6}
            >
              <AppText
                role="Caption"
                style={[styles.link, isRestoring && styles.linkDisabled]}
              >
                {isRestoring
                  ? t("paywall.links.restoring")
                  : t("paywall.links.restore")}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const createStyles = (theme: Theme, colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.secondaryBackground,
      paddingTop: theme.spacing.xxl + theme.spacing.lg,
    },
    closeButton: {
      position: "absolute",
      top: theme.spacing.md,
      right: theme.spacing.md,
      zIndex: 10,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
      gap: theme.spacing.lg,
    },
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
    },
    errorContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    errorTitle: {
      textAlign: "center",
    },
    errorMessage: {
      textAlign: "center",
    },
    retryButton: {
      alignSelf: "center",
    },
    header: {
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    title: {
      textAlign: "center",
    },
    subtitle: {
      textAlign: "center",
    },
    features: {
      gap: theme.spacing.lg,
    },
    feature: {
      flexDirection: "row",
      gap: theme.spacing.md,
      alignItems: "flex-start",
    },
    featureIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.tertiaryBackground,
      alignItems: "center",
      justifyContent: "center",
    },
    featureText: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    packages: {
      gap: theme.spacing.md,
    },
    package: {
      borderWidth: 1,
      borderColor: colors.subtleBorder,
      borderRadius: theme.components.cards.cornerRadius,
      padding: theme.spacing.lg,
      backgroundColor: colors.tertiaryBackground,
      gap: theme.spacing.sm,
    },
    packageSelected: {
      borderColor: colors.accent,
      backgroundColor: "rgba(68, 235, 212, 0.05)",
    },
    packageHighlighted: {
      borderColor: colors.accent,
      backgroundColor: `rgba(68, 235, 212, 0.05)`,
    },
    packageHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    badge: {
      backgroundColor: colors.accent,
      borderRadius: theme.components.buttons.cornerRadius,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
    },
    badgeText: {
      color: colors.black,
    },
    trialBadgeContainer: {
      alignItems: "flex-start",
    },
    trialBadge: {
      backgroundColor: colors.accent,
      borderRadius: theme.components.buttons.cornerRadius,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 6,
      alignSelf: "baseline",
    },
    trialBadgeTitle: {
      color: colors.black,
      fontWeight: "600",
    },

    monthlyPriceRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    monthlyPrice: {
      color: colors.primaryText,
    },
    priceMetaLabel: {
      color: colors.primaryText,
      opacity: 0.7,
    },
    priceMetaDivider: {
      width: 2,
      height: 2,
      borderRadius: 2,
      backgroundColor: colors.primaryText,
      marginHorizontal: theme.spacing.xs,
    },
    bulletList: {
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    bulletItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.sm,
    },
    bulletIcon: {
      marginTop: 2,
      flexShrink: 0,
    },
    bulletText: {
      flex: 1,
      opacity: 0.8,
      lineHeight: 18,
    },
    legal: {
      gap: theme.spacing.sm,
      alignItems: "center",
      marginTop: theme.spacing.md,
    },
    legalText: {
      textAlign: "center",
    },
    links: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    linkDivider: {
      width: 1,
      height: 14,
      backgroundColor: colors.subtleBorder,
    },
    link: {
      color: colors.accent,
    },
    linkDisabled: {
      color: colors.disabledText,
    },
  });
