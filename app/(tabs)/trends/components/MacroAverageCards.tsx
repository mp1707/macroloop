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

  const renderCard = (metric: TrendMetric) => {
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
              {/* Row 1 - Header: [Icon] Label · Ø/Tag · {timeframe} */}
              <View style={styles.headerRow}>
                <config.Icon
                  size={18}
                  color={config.color}
                  fill={config.color}
                  strokeWidth={0}
                />
                <AppText
                  role="Caption"
                  color="primary"
                  numberOfLines={1}
                  style={styles.headerLabel}
                >
                  {config.label}
                </AppText>
                <AppText role="Caption" color="secondary" numberOfLines={1}>
                  {" · Ø/Tag"}
                </AppText>
              </View>

              {/* Row 2 - Primary Value: value + unit on same baseline */}
              <View style={styles.valueRow}>
                <AppText role="Title2" style={styles.valueNumber}>
                  {Math.round(config.value)}
                </AppText>
                <AppText
                  role="Caption"
                  color="secondary"
                  style={styles.unitText}
                >
                  {config.unit}
                </AppText>
              </View>

              {/* Row 3 - Context: Progress bar placeholder (implementation depends on goal data) */}
              {/* For now, leaving space for future progress bar + delta pill */}
            </View>
          </Card>
        </AnimatedPressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {renderCard("calories")}
        {renderCard("protein")}
      </View>
      <View style={styles.row}>
        {renderCard("carbs")}
        {renderCard("fat")}
      </View>
    </View>
  );
};

const createStyles = (colors: Colors, theme: Theme) =>
  StyleSheet.create({
    container: {
      gap: theme.spacing.sm,
      paddingBottom: theme.spacing.lg,
    },
    row: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    cardWrapper: {
      flex: 1,
    },
    pressable: {
      flex: 1,
    },
    card: {
      flex: 1,
      padding: theme.spacing.md,
      minHeight: theme.accessibility.touchTargets.minimum,
      borderWidth: 2,
      borderColor: "transparent",
    },
    cardContent: {
      gap: theme.spacing.sm,
      width: "100%",
      alignItems: "flex-start",
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      width: "100%",
    },
    headerLabel: {
      color: colors.primaryText,
    },
    timeframeText: {
      flex: 1,
    },
    valueRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: theme.spacing.xs,
    },
    valueNumber: {
      color: colors.primaryText,
    },
    unitText: {
      lineHeight: undefined,
    },
  });
