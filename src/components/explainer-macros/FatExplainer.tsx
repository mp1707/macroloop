import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { Droplet } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { AppText } from "@/components/shared/AppText";
import { Theme, useTheme } from "@/theme";
import { useSafeRouter } from "@/hooks/useSafeRouter";
import { Host, Button } from "@expo/ui/swift-ui";
import { isLiquidGlassAvailable } from "expo-glass-effect";

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
  const { colors, theme, colorScheme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { t } = useTranslation();
  const hasLiquidGlass = isLiquidGlassAvailable();

  const semanticColor = colors.semantic.fat;
  const computedPercentage = target > 0 ? Math.round((total / target) * 100) : 0;
  const progressPercentage = percentage ?? computedPercentage;

  const handleChangeTargets = () => {
    router.push("/onboarding/target-method");
  };

  return (
    <View style={styles.container}>
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
          {/* Progress Bar */}
          <View
            style={[
              styles.progressBarTrack,
              { backgroundColor: colors.disabledBackground },
            ]}
          >
            <View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: semanticColor,
                  width: `${Math.min(progressPercentage, 100)}%`,
                },
              ]}
            />
          </View>
        </View>

        <AppText role="Headline" color="primary" style={[styles.sectionHeading, { color: semanticColor }]}>
          {t("explainer.macros.fat.sections.hitTarget.title")}
        </AppText>
        <AppText role="Body" color="secondary" style={styles.contentText}>
          {t("explainer.macros.fat.sections.hitTarget.body")}
        </AppText>

        <AppText
          role="Headline"
          color="primary"
          style={[styles.sectionHeading, { color: semanticColor, marginTop: theme.spacing.md }]}
        >
          {t("explainer.macros.fat.sections.why.title")}
        </AppText>
        <AppText role="Body" color="secondary" style={styles.contentText}>
          {t("explainer.macros.fat.sections.why.body")}
        </AppText>

        <AppText
          role="Headline"
          color="primary"
          style={[styles.sectionHeading, { color: semanticColor, marginTop: theme.spacing.md }]}
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

      <View style={styles.buttonContainer}>
        <Host colorScheme={colorScheme} matchContents>
          <Button
            variant={hasLiquidGlass ? "glassProminent" : "borderedProminent"}
            color={colors.accent}
            onPress={handleChangeTargets}
          >
            {t("explainer.common.adjustTargets")}
          </Button>
        </Host>
      </View>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
    },
    title: {
      textAlign: "center",
    },
    subTitle: {
      textAlign: "center",
      marginBottom: theme.spacing.lg,
    },
    content: {
      flex: 1,
    },
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
    progressBarTrack: {
      width: "55%",
      height: 5,
      borderRadius: 2.5,
      overflow: "hidden",
      marginTop: theme.spacing.xs,
    },
    progressBarFill: {
      height: "100%",
      borderRadius: 2.5,
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
    buttonContainer: {
      alignItems: "center",
      paddingTop: theme.spacing.lg,
    },
  });
