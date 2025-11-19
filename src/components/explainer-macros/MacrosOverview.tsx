import React, { useMemo } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Flame, BicepsFlexed, Droplet, Zap } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { AppText } from "@/components/shared/AppText";
import { Theme, useTheme } from "@/theme";

export const MacrosOverview: React.FC = () => {
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <AppText role="Title1" style={styles.title}>
          {t("explainer.macros.overview.title")}
        </AppText>

        <View style={styles.sectionsContainer}>
          {/* Primary Targets Section */}
          <View style={styles.sectionRow}>
            <View style={styles.leftColumn}>
              <View style={styles.doubleIconContainer}>
                <Flame
                  size={28}
                  color={colors.semantic.calories}
                  fill={colors.semantic.calories}
                  strokeWidth={1.5}
                />
                <BicepsFlexed
                  size={24}
                  color={colors.semantic.protein}
                  fill={colors.semantic.protein}
                  strokeWidth={1.5}
                  style={{ marginTop: 2 }}
                />
              </View>
              <AppText role="Caption" color="secondary" style={styles.label}>
                {t("explainer.macros.overview.primary.label")}
              </AppText>
            </View>
            <View style={styles.rightColumn}>
              <AppText
                role="Title2"
                color="primary"
                style={styles.sectionTitle}
              >
                {t("explainer.macros.overview.primary.title")}
              </AppText>
              <AppText role="Body" color="secondary" style={styles.description}>
                {t("explainer.macros.overview.primary.description")}
              </AppText>
            </View>
          </View>

          {/* Secondary Target Section */}
          <View style={styles.sectionRow}>
            <View style={styles.leftColumn}>
              <View style={styles.iconContainer}>
                <Droplet
                  size={28}
                  color={colors.semantic.fat}
                  fill={colors.semantic.fat}
                  strokeWidth={1.5}
                />
              </View>
              <AppText role="Caption" color="secondary" style={styles.label}>
                {t("explainer.macros.overview.secondary.label")}
              </AppText>
            </View>
            <View style={styles.rightColumn}>
              <AppText
                role="Title2"
                color="primary"
                style={styles.sectionTitle}
              >
                {t("explainer.macros.overview.secondary.title")}
              </AppText>
              <AppText role="Body" color="secondary" style={styles.description}>
                {t("explainer.macros.overview.secondary.description")}
              </AppText>
            </View>
          </View>

          {/* Flexible Filler Section */}
          <View style={styles.sectionRow}>
            <View style={styles.leftColumn}>
              <View style={styles.iconContainer}>
                <Zap
                  size={28}
                  color={colors.semantic.carbs}
                  fill={colors.semantic.carbs}
                  strokeWidth={1.5}
                />
              </View>
              <AppText role="Caption" color="secondary" style={styles.label}>
                {t("explainer.macros.overview.filler.label")}
              </AppText>
            </View>
            <View style={styles.rightColumn}>
              <AppText
                role="Title2"
                color="primary"
                style={styles.sectionTitle}
              >
                {t("explainer.macros.overview.filler.title")}
              </AppText>
              <AppText role="Body" color="secondary" style={styles.description}>
                {t("explainer.macros.overview.filler.description")}
              </AppText>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
    },
    title: {
      textAlign: "center",
      marginBottom: theme.spacing.xl,
    },
    sectionsContainer: {
      gap: theme.spacing.xl,
    },
    sectionRow: {
      flexDirection: "row",
      gap: theme.spacing.lg,
      alignItems: "flex-start",
    },
    leftColumn: {
      width: 90,
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    iconContainer: {
      width: 56,
      height: 56,
      alignItems: "center",
      justifyContent: "center",
    },
    doubleIconContainer: {
      width: 56,
      height: 56,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xs / 2,
    },
    label: {
      textAlign: "center",
    },
    rightColumn: {
      flex: 1,
      gap: theme.spacing.xs,
      paddingTop: 2,
    },
    sectionTitle: {
      marginBottom: theme.spacing.xs / 2,
    },
    description: {
      lineHeight: 20,
    },
  });
