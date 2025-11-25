import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { BicepsFlexed, Zap, Droplet } from "lucide-react-native";
import { AppText, Card } from "@/components";
import { useTheme, Colors, Theme } from "@/theme";
import { useTranslation } from "react-i18next";
import { AnimatedPressable } from "@/components/shared/AnimatedPressable";
import type { TrendMetric, TrendsData } from "./trendCalculations";

interface MacroAverageCardsProps {
  averages: Pick<TrendsData["averages"], "protein" | "carbs" | "fat">;
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

  const macros = useMemo(
    () =>
      [
        {
          key: "protein",
          Icon: BicepsFlexed,
          label: t("nutrients.protein.label"),
          color: colors.semantic.protein,
          surfaceColor: colors.semanticSurfaces.protein,
          value: averages.protein,
        },
        {
          key: "carbs",
          Icon: Zap,
          label: t("logCard.nutritionLabels.carbs"),
          color: colors.semantic.carbs,
          surfaceColor: colors.semanticSurfaces.carbs,
          value: averages.carbs,
        },
        {
          key: "fat",
          Icon: Droplet,
          label: t("nutrients.fat.label"),
          color: colors.semantic.fat,
          surfaceColor: colors.semanticSurfaces.fat,
          value: averages.fat,
        },
      ] satisfies Array<{
        key: Exclude<TrendMetric, "calories">;
        Icon: typeof BicepsFlexed;
        label: string;
        color: string;
        surfaceColor: string;
        value: number;
      }>,
    [
      averages,
      colors.semantic.protein,
      colors.semantic.carbs,
      colors.semantic.fat,
      colors.semanticSurfaces.protein,
      colors.semanticSurfaces.carbs,
      colors.semanticSurfaces.fat,
      t,
    ]
  );

  return (
    <View style={styles.container}>
      {macros.map((macro) => {
        const isSelected = selectedMetric === macro.key;
        return (
          <View key={macro.key} style={styles.cardWrapper}>
            <AnimatedPressable
              onPress={() => onSelect(macro.key)}
              style={styles.pressable}
              accessibilityLabel={macro.label}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Card
                elevated={true}
                style={[
                  styles.card,
                  isSelected && {
                    backgroundColor: macro.surfaceColor,
                    borderColor: macro.color,
                    borderWidth: 1.5,
                  },
                ]}
              >
                <View style={styles.cardContent}>
                  <View style={styles.iconRow}>
                    <macro.Icon
                      size={18}
                      color={macro.color}
                      strokeWidth={1.6}
                      fill={macro.color}
                    />
                    <AppText role="Caption" color="secondary">
                      {macro.label}
                    </AppText>
                  </View>
                  <View style={styles.valueRow}>
                    <AppText role="Title2" style={styles.valueNumber}>
                      {Math.round(macro.value)}
                    </AppText>
                    <AppText
                      role="Caption"
                      color="disabled"
                      style={styles.valueUnit}
                    >
                      g
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
