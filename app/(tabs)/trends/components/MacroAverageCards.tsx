import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { BicepsFlexed, Zap, Droplet } from "lucide-react-native";
import { AppText, Card } from "@/components";
import { useTheme, Colors, Theme } from "@/theme";
import { useTranslation } from "react-i18next";

interface MacroAverageCardsProps {
  averages: {
    protein: number;
    carbs: number;
    fat: number;
  };
}

export const MacroAverageCards: React.FC<MacroAverageCardsProps> = ({
  averages,
}) => {
  const { colors, theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);

  const macros = useMemo(
    () => [
      {
        key: "protein",
        Icon: BicepsFlexed,
        label: t("nutrients.protein.label"),
        color: colors.semantic.protein,
        value: averages.protein,
      },
      {
        key: "carbs",
        Icon: Zap,
        label: t("logCard.nutritionLabels.carbs"),
        color: colors.semantic.carbs,
        value: averages.carbs,
      },
      {
        key: "fat",
        Icon: Droplet,
        label: t("nutrients.fat.label"),
        color: colors.semantic.fat,
        value: averages.fat,
      },
    ],
    [averages, colors.semantic, t]
  );

  return (
    <View style={styles.container}>
      {macros.map((macro) => (
        <Card key={macro.key} elevated={true} style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.iconRow}>
              <macro.Icon
                size={18}
                color={macro.color}
                fill={macro.color}
                strokeWidth={0}
              />
              <AppText role="Caption" color="secondary">
                {macro.label}
              </AppText>
            </View>
            <AppText role="Headline" style={styles.value}>
              {Math.round(macro.value)}g
            </AppText>
            <AppText role="Caption" color="secondary">
              {t("trends.macros.average")}
            </AppText>
          </View>
        </Card>
      ))}
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
    card: {
      flex: 1,
    },
    cardContent: {
      alignItems: "flex-start",
      gap: theme.spacing.xs,
    },
    iconRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.xs / 2,
    },
    value: {
      color: colors.primaryText,
    },
  });
