import React, { useMemo } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Droplet } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { AppText } from "@/components/shared/AppText";
import { Theme, useTheme } from "@/theme";

interface FatExplainerProps {
  total?: number;
  target?: number;
  percentage?: number;
}

export const FatExplainer: React.FC<FatExplainerProps> = ({
  total = 52,
  target = 60,
  percentage,
}) => {
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const semanticColor = colors.semantic.fat;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <AppText role="Title1" style={styles.title}>
          {t("nutrients.fat.label")}
        </AppText>
        <AppText role="Caption" style={styles.subTitle}>
          {t("explainer.macros.fat.subtitle")}
        </AppText>
        <View style={styles.content}>
          {/* MacroGridCell-style display */}
          <View style={styles.displaySection}>
            <View style={styles.valueRow}>
              <View style={styles.iconWrapper}>
                <Droplet
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
                <AppText role="Body" color="secondary">
                  {" "}
                  /{" "}
                </AppText>
                <AppText role="Body" color="secondary">
                  {target}
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
            {t("explainer.macros.fat.sections.hitTarget.title")}
          </AppText>
          <AppText role="Body" color="secondary" style={styles.contentText}>
            {t("explainer.macros.fat.sections.hitTarget.body")}
          </AppText>

          <AppText
            role="Headline"
            color="primary"
            style={[
              styles.sectionHeading,
              { color: semanticColor, marginTop: theme.spacing.md },
            ]}
          >
            {t("explainer.macros.fat.sections.why.title")}
          </AppText>
          <AppText role="Body" color="secondary" style={styles.contentText}>
            {t("explainer.macros.fat.sections.why.body")}
          </AppText>

          <AppText
            role="Headline"
            color="primary"
            style={[
              styles.sectionHeading,
              { color: semanticColor, marginTop: theme.spacing.md },
            ]}
          >
            {t("explainer.macros.fat.sections.sources.title")}
          </AppText>
          <View style={styles.bulletRow}>
            <AppText role="Body" color="secondary" style={styles.bulletChar}>
              •
            </AppText>
            <AppText role="Body" color="secondary" style={styles.bulletText}>
              {t("explainer.macros.fat.sections.sources.bullets.cook")}
            </AppText>
          </View>
          <View style={styles.bulletRow}>
            <AppText role="Body" color="secondary" style={styles.bulletChar}>
              •
            </AppText>
            <AppText role="Body" color="secondary" style={styles.bulletText}>
              {t("explainer.macros.fat.sections.sources.bullets.unsaturated")}
            </AppText>
          </View>
          <View style={styles.bulletRow}>
            <AppText role="Body" color="secondary" style={styles.bulletChar}>
              •
            </AppText>
            <AppText role="Body" color="secondary" style={styles.bulletText}>
              {t("explainer.macros.fat.sections.sources.bullets.balance")}
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
    contentText: {
      lineHeight: 20,
    },
  });
