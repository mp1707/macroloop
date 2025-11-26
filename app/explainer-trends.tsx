import React, { useMemo } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isLiquidGlassAvailable } from "expo-glass-effect";

import { HeaderButton } from "@/components/shared/HeaderButton";
import { AppText } from "@/components";
import { Colors, Theme, useTheme } from "@/theme";

export default function ExplainerTrendsScreen() {
  const { theme, colors } = useTheme();
  const styles = useMemo(() => createStyles(theme, colors), [theme, colors]);
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const hasLiquidGlass = isLiquidGlassAvailable();

  const params = useLocalSearchParams<{
    formattedValue?: string;
    days?: string;
  }>();

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <View
        style={[styles.header, { paddingTop: insets.top + theme.spacing.sm }]}
      >
        <View style={styles.closeButton}>
          <HeaderButton
            imageProps={{
              systemName: "xmark",
            }}
            buttonProps={{
              onPress: handleClose,
              color: hasLiquidGlass ? undefined : colors.tertiaryBackground,
            }}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <AppText role="Caption" style={styles.heroLabel}>
            {t("trends.averageDisplay.subtitle")}
          </AppText>
          <AppText role="Title1" style={styles.heroValue}>
            {params.formattedValue}
          </AppText>
        </View>

        <View style={styles.section}>
          <AppText role="Headline" style={styles.title}>
            {t("trends.explainer.title")}
          </AppText>
          <AppText role="Body" style={styles.body}>
            {t("trends.explainer.body", { days: params.days || "7" })}
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: Theme, colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.primaryBackground,
    },
    header: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.lg,
      flexDirection: "row",
      justifyContent: "flex-end",
      zIndex: 10,
    },
    closeButton: {
      // positioned by flex-end in header
    },
    content: {
      paddingHorizontal: theme.spacing.xl,
      paddingBottom: theme.spacing.xxl,
    },
    hero: {
      marginBottom: theme.spacing.xl,
      gap: theme.spacing.xs,
      paddingBottom: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.subtleBackground,
    },
    heroLabel: {
      letterSpacing: 0.6,
      color: colors.secondaryText,
      textTransform: "uppercase",
    },
    heroValue: {
      color: colors.primaryText,
    },
    section: {
      gap: theme.spacing.md,
    },
    title: {
      color: colors.primaryText,
    },
    body: {
      color: colors.secondaryText,
    },
  });
