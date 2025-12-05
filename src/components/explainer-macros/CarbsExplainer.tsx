import React, { useMemo } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Wheat } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { AppText } from "@/components/shared/AppText";
import { Theme, useTheme } from "@/theme";

interface CarbsExplainerProps {
  total?: number;
}

export const CarbsExplainer: React.FC<CarbsExplainerProps> = ({
  total = 218,
}) => {
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const semanticColor = colors.semantic.carbs;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <AppText role="Title1" style={styles.title}>
          {t("nutrients.carbs.label")}
        </AppText>
        <AppText role="Caption" style={styles.subTitle}>
          {t("explainer.macros.carbs.subtitle")}
        </AppText>
        <View style={styles.content}>
          {/* MacroGridCell-style display */}
          <View style={styles.displaySection}>
            <View style={styles.valueRow}>
              <View style={styles.iconWrapper}>
                <Wheat
                  size={22}
                  color={semanticColor}
                  fill={semanticColor}
                  strokeWidth={0}
                />
              </View>
              <View style={styles.valueContainer}>
                <AppText role="Headline" color="primary">
                  {total}
                </AppText>
                <AppText role="Body" color="secondary" style={styles.unitText}>
                  {" "}
                  g
                </AppText>
              </View>
            </View>
          </View>

          <AppText
            role="Headline"
            color="primary"
            style={[styles.sectionHeading, { color: semanticColor }]}
          >
            {t("explainer.macros.carbs.sections.total.title")}
          </AppText>
          <AppText role="Body" color="secondary" style={styles.contentText}>
            {t("explainer.macros.carbs.sections.total.body")}
          </AppText>

          <AppText
            role="Headline"
            color="primary"
            style={[
              styles.sectionHeading,
              { color: semanticColor, marginTop: theme.spacing.md },
            ]}
          >
            {t("explainer.macros.carbs.sections.fuel.title")}
          </AppText>
          <View style={styles.bulletRow}>
            <AppText role="Body" color="secondary" style={styles.bulletChar}>
              •
            </AppText>
            <AppText role="Body" color="secondary" style={styles.bulletText}>
              {t("explainer.macros.carbs.sections.fuel.bullets.adjust")}
            </AppText>
          </View>
          <View style={styles.bulletRow}>
            <AppText role="Body" color="secondary" style={styles.bulletChar}>
              •
            </AppText>
            <AppText role="Body" color="secondary" style={styles.bulletText}>
              {t("explainer.macros.carbs.sections.fuel.bullets.timing")}
            </AppText>
          </View>

          <AppText
            role="Headline"
            color="primary"
            style={[
              styles.sectionHeading,
              { color: semanticColor, marginTop: theme.spacing.md },
            ]}
          >
            {t("explainer.macros.carbs.sections.sources.title")}
          </AppText>
          <View style={styles.bulletRow}>
            <AppText role="Body" color="secondary" style={styles.bulletChar}>
              •
            </AppText>
            <AppText role="Body" color="secondary" style={styles.bulletText}>
              {t("explainer.macros.carbs.sections.sources.bullets.whole")}
            </AppText>
          </View>
          <View style={styles.bulletRow}>
            <AppText role="Body" color="secondary" style={styles.bulletChar}>
              •
            </AppText>
            <AppText role="Body" color="secondary" style={styles.bulletText}>
              {t("explainer.macros.carbs.sections.sources.bullets.limit")}
            </AppText>
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
      paddingTop: theme.spacing.md,
    },
    title: {
      textAlign: "center",
    },
    subTitle: {
      textAlign: "center",
      marginBottom: theme.spacing.lg,
    },
    content: {},
    displaySection: {
      alignItems: "center",
      justifyContent: "center",
      marginBottom: theme.spacing.lg,
      gap: theme.spacing.xs,
    },
    valueRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xs,
    },
    iconWrapper: {
      justifyContent: "center",
      alignItems: "center",
    },
    valueContainer: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "center",
      flexWrap: "wrap",
    },
    unitText: {
      marginLeft: theme.spacing.xs / 2,
    },
    sectionHeading: {
      marginBottom: theme.spacing.xs,
    },
    contentText: {
      lineHeight: 20,
    },
    bulletRow: {
      flexDirection: "row",
      marginBottom: theme.spacing.xs,
      gap: theme.spacing.xs,
    },
    bulletChar: {
      lineHeight: 22,
    },
    bulletText: {
      flex: 1,
      lineHeight: 22,
    },
  });
