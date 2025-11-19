import React, { useMemo } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { BicepsFlexed } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "@/components/shared/AppText";
import { Theme, useTheme } from "@/theme";
import { DashboardRing } from "@/components/shared/ProgressRings";

interface ProteinExplainerProps {
  total?: number;
  target?: number;
  percentage?: number;
}

export const ProteinExplainer: React.FC<ProteinExplainerProps> = ({
  total = 145,
  target = 160,
  percentage = 91,
}) => {
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const semanticColor = colors.semantic.protein;
  const detailValue =
    target !== undefined
      ? t("explainer.common.ofTarget", { target })
      : undefined;

  // WCAG 1.1.1 - Accessibility label for ring visualization
  const ringAccessibilityLabel = target
    ? `${t("nutrients.protein.label")} ${total} ${t(
        "nutrients.of"
      )} ${target} ${t("nutrients.protein.unit")}`
    : `${t("nutrients.protein.label")} ${total} ${t("nutrients.protein.unit")}`;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <AppText role="Title1" style={styles.title}>
          {t("nutrients.protein.label")}
        </AppText>
        <AppText role="Caption" style={styles.subTitle}>
          {t("explainer.macros.protein.subtitle")}
        </AppText>
        <View style={styles.content}>
          <View style={styles.ringSection}>
            <View
              style={styles.ringContainer}
              accessible={true}
              accessibilityRole="image"
              accessibilityLabel={ringAccessibilityLabel}
            >
              <DashboardRing
                percentage={percentage}
                color={semanticColor}
                trackColor={colors.semanticSurfaces.protein}
                textColor={colors.primaryText}
                displayValue={total}
                displayUnit={t("nutrients.protein.unit")}
                detailValue={detailValue}
                animationDelay={0}
                strokeWidth={22}
                Icon={BicepsFlexed}
                smallIcon
                skipAnimation
              />
            </View>
          </View>

          <AppText
            role="Headline"
            color="primary"
            style={[styles.sectionHeading, { color: semanticColor }]}
          >
            {t("explainer.macros.protein.howItWorks.title")}
          </AppText>
          <View style={styles.bulletRow}>
            <AppText role="Body" color="secondary" style={styles.bulletChar}>
              •
            </AppText>
            <AppText role="Body" color="secondary" style={styles.bulletText}>
              {t("explainer.macros.protein.howItWorks.bullets.ring")}
            </AppText>
          </View>
          <View style={styles.bulletRow}>
            <AppText role="Body" color="secondary" style={styles.bulletChar}>
              •
            </AppText>
            <AppText role="Body" color="secondary" style={styles.bulletText}>
              {t("explainer.macros.protein.howItWorks.bullets.iconPrefix")}
              <BicepsFlexed
                size={16}
                color={semanticColor}
                fill={semanticColor}
                strokeWidth={0}
                style={styles.inlineIcon}
              />
              {t("explainer.macros.protein.howItWorks.bullets.iconSuffix")}
            </AppText>
          </View>
          <View style={styles.bulletRow}>
            <AppText role="Body" color="secondary" style={styles.bulletChar}>
              •
            </AppText>
            <AppText role="Body" color="secondary" style={styles.bulletText}>
              {t("explainer.macros.protein.howItWorks.bullets.close")}
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
            {t("explainer.macros.protein.quickTips.title")}
          </AppText>
          <View style={styles.bulletRow}>
            <AppText role="Body" color="secondary" style={styles.bulletChar}>
              •
            </AppText>
            <AppText role="Body" color="secondary" style={styles.bulletText}>
              {t("explainer.macros.protein.quickTips.bullets.eachMeal")}
            </AppText>
          </View>
          <View style={styles.bulletRow}>
            <AppText role="Body" color="secondary" style={styles.bulletChar}>
              •
            </AppText>
            <AppText role="Body" color="secondary" style={styles.bulletText}>
              {t("explainer.macros.protein.quickTips.bullets.spread")}
            </AppText>
          </View>
          <View style={styles.bulletRow}>
            <AppText role="Body" color="secondary" style={styles.bulletChar}>
              •
            </AppText>
            <AppText role="Body" color="secondary" style={styles.bulletText}>
              {t("explainer.macros.protein.quickTips.bullets.over")}
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
    ringSection: {
      alignItems: "center",
      marginBottom: theme.spacing.lg,
    },
    ringContainer: {
      alignItems: "center",
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
    bold: {
      fontWeight: "600",
    },
    inlineIcon: {
      marginBottom: -2,
    },
  });
