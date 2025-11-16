import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { Zap } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { AppText } from "@/components/shared/AppText";
import { Theme, useTheme } from "@/theme";
import { useSafeRouter } from "@/hooks/useSafeRouter";
import { Host, Button } from "@expo/ui/swift-ui";
import { isLiquidGlassAvailable } from "expo-glass-effect";

interface CarbsExplainerProps {
  total?: number;
}

export const CarbsExplainer: React.FC<CarbsExplainerProps> = ({
  total = 218,
}) => {
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { t } = useTranslation();
  const hasLiquidGlass = isLiquidGlassAvailable();

  const semanticColor = colors.semantic.carbs;

  const handleChangeTargets = () => {
    router.push("/onboarding/target-method");
  };

  return (
    <View style={styles.container}>
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
              <Zap
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

      <Host matchContents style={{ width: "100%", alignSelf: "center" }}>
        <Button
          variant={hasLiquidGlass ? "glassProminent" : "borderedProminent"}
          color={colors.secondaryBackground}
          onPress={handleChangeTargets}
          controlSize="large"
        >
          {t("explainer.common.adjustTargets")}
        </Button>
      </Host>
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
