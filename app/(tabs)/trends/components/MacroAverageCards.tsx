import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { BicepsFlexed, Zap, Droplet, Flame } from "lucide-react-native";
import { AppText, Card } from "@/components";
import { useTheme, Colors, Theme } from "@/theme";
import { useTranslation } from "react-i18next";
import { AnimatedPressable } from "@/components/shared/AnimatedPressable";
import type { TrendMetric, TrendsData } from "./trendCalculations";

interface MacroAverageCardsProps {
  averages: TrendsData["averages"];
  selectedMetric: TrendMetric;
  onSelect: (metric: TrendMetric) => void;
}

export const MacroAverageCards: React.FC<MacroAverageCardsProps> = ({
  averages,
  selectedMetric,
  onSelect,
}) => {
  const { colors, theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);

  const baseSlots: TrendMetric[] = useMemo(
    () => ["protein", "carbs", "fat"],
    []
  );

  const displayedMetrics = useMemo(() => {
    if (selectedMetric === "calories") {
      return baseSlots;
    }
    return baseSlots.map((m) => (m === selectedMetric ? "calories" : m));
  }, [selectedMetric, baseSlots]);

  const getMetricConfig = (metric: TrendMetric) => {
    switch (metric) {
      case "calories":
        return {
          Icon: Flame,
          label: t("nutrients.calories.label"),
          color: colors.semantic.calories,
          value: averages.calories,
          unit: t("nutrients.calories.unitShort"),
        };
      case "protein":
        return {
          Icon: BicepsFlexed,
          label: t("nutrients.protein.label"),
          color: colors.semantic.protein,
          value: averages.protein,
          unit: t("nutrients.protein.unitShort"),
        };
      case "carbs":
        return {
          Icon: Zap,
          label: t("logCard.nutritionLabels.carbs"),
          color: colors.semantic.carbs,
          value: averages.carbs,
          unit: t("nutrients.carbs.unitShort"),
        };
      case "fat":
        return {
          Icon: Droplet,
          label: t("nutrients.fat.label"),
          color: colors.semantic.fat,
          value: averages.fat,
          unit: t("nutrients.fat.unitShort"),
        };
    }
  };

  return (
    <View style={styles.container}>
      {displayedMetrics.map((metric) => {
        const config = getMetricConfig(metric);
        return (
          <View key={metric} style={styles.cardWrapper}>
            <AnimatedPressable
              onPress={() => onSelect(metric)}
              style={styles.pressable}
              accessibilityLabel={config.label}
              accessibilityRole="button"
            >
              <Card elevated={true} style={[styles.card]}>
                <View style={styles.cardContent}>
                  <View style={styles.iconRow}>
                    <config.Icon
                      size={18}
                      color={config.color}
                      strokeWidth={1.6}
                      fill={config.color}
                    />
                    <AppText role="Caption" color="secondary">
                      {config.label}
                    </AppText>
                  </View>
                  <View style={styles.valueRow}>
                    <AppText role="Title2" style={styles.valueNumber}>
                      {Math.round(config.value)}
                    </AppText>
                    <AppText
                      role="Caption"
                      color="disabled"
                      style={styles.valueUnit}
                    >
                      {config.unit}
                    </AppText>
                  </View>
                  <AppText role="Caption" color="secondary">
                    {t("trends.macros.average")}
                  </AppText>
                </View>
              </Card>
            </AnimatedPressable>
          </View>
        );
      })}
    </View>
  );
};

const createStyles = (colors: Colors, theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      paddingBottom: theme.spacing.lg,
      flex: 1,
    },
    cardWrapper: {
      flex: 1,
    },
    pressable: {
      flex: 1,
    },
    card: {
      flex: 1,
    },
    cardContent: {
      alignItems: "flex-start",
      gap: theme.spacing.sm,
    },
    iconRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.xs / 2,
    },
    valueRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: theme.spacing.xs / 2,
    },
    valueNumber: {
      color: colors.primaryText,
    },
    valueUnit: {
      paddingBottom: 2,
    },
  });
