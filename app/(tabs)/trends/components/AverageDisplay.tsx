import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { AppText } from "@/components";
import { useTheme, Colors, Theme } from "@/theme";
import { useTranslation } from "react-i18next";
import type { TrendMetric } from "./trendCalculations";

type SemanticBadges = NonNullable<Colors["semanticBadges"]>;

interface AverageDisplayProps {
  average: number;
  target?: number;
  daysWithData: number;
  nutrient: TrendMetric;
  label: string;
  unit: string;
  showGoalDelta: boolean;
}

export const AverageDisplay: React.FC<AverageDisplayProps> = ({
  average,
  target,
  daysWithData,
  nutrient,
  label,
  unit,
  showGoalDelta,
}) => {
  const { colors, theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);

  // Calculate difference from target
  const diff = typeof target === "number" ? average - target : 0;
  const isOverTarget = diff > 0;
  const absDiff = Math.abs(Math.round(diff));

  const formattedValue = useMemo(() => {
    const roundedAverage = Math.round(average);
    if (nutrient === "calories") {
      return `${roundedAverage} ${unit}`;
    }

    return `${roundedAverage}${unit} ${label}`;
  }, [average, nutrient, unit, label]);

  const shouldShowBadge =
    showGoalDelta && typeof target === "number" && daysWithData > 0 && diff !== 0;

  const sectionHeading = t("trends.averageDisplay.subtitle");
  const captionText = t("trends.averageDisplay.subtitle_today_excluded");

  const nutrientBadgeColors = colors.semanticBadges?.[
    nutrient as keyof SemanticBadges
  ];

  const badgeColorConfig = isOverTarget
    ? nutrient === "calories"
      ? colors.semanticBadges?.carbs
      : nutrientBadgeColors
    : nutrient === "calories"
      ? colors.semanticBadges?.calories
      : nutrientBadgeColors;

  const badgeBackground = badgeColorConfig?.background || colors.subtleBackground;
  const badgeTextColor = badgeColorConfig?.text || colors.secondaryText;

  return (
    <View style={styles.container}>
      <AppText role="Caption" style={styles.sectionHeader}>
        {sectionHeading}
      </AppText>
      <View style={styles.averageRow}>
        <AppText role="Title1" style={styles.averageNumber}>
          {formattedValue}
        </AppText>
        {shouldShowBadge && (
          <View
            style={[styles.badge, { backgroundColor: badgeBackground }]}
          >
            <AppText
              role="Caption"
              style={[styles.badgeText, { color: badgeTextColor }]}
            >
              {isOverTarget ? "+" : "-"}
              {absDiff} {unit} vs Goal
            </AppText>
          </View>
        )}
      </View>
      <AppText role="Caption" color="secondary" style={styles.caption}>
        {captionText}
      </AppText>
    </View>
  );
};

const createStyles = (colors: Colors, theme: Theme) =>
  StyleSheet.create({
    container: {
      paddingTop: theme.spacing.lg,
      paddingHorizontal: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
      gap: theme.spacing.xs / 2,
    },
    averageRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    averageNumber: {
      color: colors.primaryText,
    },
    badge: {
      paddingHorizontal: theme.spacing.sm + theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
      borderRadius: 16,
      minHeight: 32,
      justifyContent: "center",
      alignItems: "center",
    },
    badgeText: {
      fontWeight: "600",
    },
    sectionHeader: {
      letterSpacing: 0.6,
      color: colors.secondaryText,
      textTransform: "uppercase",
    },
    caption: {
      marginTop: theme.spacing.xs / 2,
    },
  });
