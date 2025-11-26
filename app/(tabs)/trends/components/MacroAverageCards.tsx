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

  const metrics: TrendMetric[] = useMemo(
    () => ["calories", "protein", "carbs", "fat"],
    []
  );

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
      {metrics.map((metric) => {
        const config = getMetricConfig(metric);
        const isSelected = selectedMetric === metric;

        return (
          <View key={metric} style={styles.cardWrapper}>
            <AnimatedPressable
              onPress={() => onSelect(metric)}
              containerStyle={styles.pressable}
              style={styles.pressable}
              accessibilityLabel={config.label}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Card
                elevated={isSelected}
                style={[
                  styles.card,
                  {
                    borderColor: isSelected
                      ? config.color
                      : colors.secondaryBackground,
                  },
                ]}
              >
                <View style={styles.cardContent}>
                  <View style={styles.headerRow}>
                    <config.Icon
                      size={14}
                      color={config.color}
                      fill={config.color}
                      strokeWidth={2}
                    />
                    <AppText
                      role="Caption"
                      color="secondary"
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      style={styles.label}
                    >
                      {config.label}
                    </AppText>
                  </View>
                  <View style={styles.valueRow}>
                    <AppText
                      role="Body"
                      style={[styles.valueNumber, { fontWeight: "700" }]}
                    >
                      {Math.round(config.value)}
                    </AppText>
                    <AppText role="Body" color="secondary">
                      {config.unit}
                    </AppText>
                  </View>
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
    },
    cardWrapper: {
      flex: 1,
    },
    pressable: {
      flex: 1,
    },
    card: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "transparent",
      minHeight: 85,
    },
    cardContent: {
      alignItems: "center",
      justifyContent: "center",
      gap: 0,
      width: "100%",
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginBottom: 2,
    },
    valueRow: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "center",
      flexWrap: "wrap",
      gap: 2,
    },
    valueNumber: {
      color: colors.primaryText,
      textAlign: "center",
    },
    label: {},
  });
