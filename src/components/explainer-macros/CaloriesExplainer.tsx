import React, { useMemo } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Flame } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "@/components/shared/AppText";
import { Theme, useTheme } from "@/theme";
import { DashboardRing } from "@/components/shared/ProgressRings";
interface CaloriesExplainerProps {
  total?: number;
  target?: number;
  percentage?: number;
}

export const CaloriesExplainer: React.FC<CaloriesExplainerProps> = ({
  total = 1850,
  target = 2200,
  percentage = 84,
}) => {
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const semanticColor = colors.semantic.calories;
  const detailValue =
    target !== undefined
      ? t("explainer.common.ofTarget", { target })
      : undefined;

  // WCAG 1.1.1 - Accessibility label for ring visualization
  const ringAccessibilityLabel = target
    ? `${t("nutrients.calories.label")} ${total} ${t(
        "nutrients.of"
      )} ${target} kcal`
    : `${t("nutrients.calories.label")} ${total} kcal`;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <AppText role="Title1" style={styles.title}>
          {t("nutrients.calories.label")}
        </AppText>
        <AppText role="Caption" style={styles.subTitle}>
          {t("explainer.macros.calories.subtitle")}
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
                trackColor={colors.semanticSurfaces.calories}
                textColor={colors.primaryText}
                displayValue={total}
                displayUnit="kcal"
                detailValue={detailValue}
                animationDelay={0}
                strokeWidth={22}
                Icon={Flame}
                skipAnimation
              />
            </View>
          </View>

          <AppText
            role="Headline"
            color="primary"
            style={[styles.sectionHeading, { color: semanticColor }]}
          >
            {t("explainer.macros.calories.howItWorks.title")}
          </AppText>
          <View style={styles.bulletRow}>
            <AppText role="Body" color="secondary" style={styles.bulletChar}>
              •
            </AppText>
            <AppText role="Body" color="secondary" style={styles.bulletText}>
              {t("explainer.macros.calories.howItWorks.bullets.ring")}
            </AppText>
          </View>
          <View style={styles.bulletRow}>
            <AppText role="Body" color="secondary" style={styles.bulletChar}>
              •
            </AppText>
            <AppText role="Body" color="secondary" style={styles.bulletText}>
              {t("explainer.macros.calories.howItWorks.bullets.iconPrefix")}
              <Flame
                size={16}
                color={semanticColor}
                fill={semanticColor}
                strokeWidth={0}
                style={styles.inlineIcon}
              />
              {t("explainer.macros.calories.howItWorks.bullets.iconSuffix")}
            </AppText>
          </View>
          <View style={styles.bulletRow}>
            <AppText role="Body" color="secondary" style={styles.bulletChar}>
              •
            </AppText>
            <AppText role="Body" color="secondary" style={styles.bulletText}>
              {t("explainer.macros.calories.howItWorks.bullets.close")}
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
            {t("explainer.macros.calories.quickTips.title")}
          </AppText>
          <View style={styles.bulletRow}>
            <AppText role="Body" color="secondary" style={styles.bulletChar}>
              •
            </AppText>
            <AppText role="Body" color="secondary" style={styles.bulletText}>
              {t("explainer.macros.calories.quickTips.bullets.consistency")}
            </AppText>
          </View>
          <View style={styles.bulletRow}>
            <AppText role="Body" color="secondary" style={styles.bulletChar}>
              •
            </AppText>
            <AppText role="Body" color="secondary" style={styles.bulletText}>
              {t("explainer.macros.calories.quickTips.bullets.weekly")}
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
    footnote: {
      marginTop: theme.spacing.xs,
    },
  });
