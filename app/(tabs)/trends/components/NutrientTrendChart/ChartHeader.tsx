import React, { useMemo } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Info } from "lucide-react-native";
import { AppText } from "@/components";
import { useTheme, Colors, Theme } from "@/theme";
import { useTranslation } from "react-i18next";
import type { TrendMetric } from "../trendCalculations";

type SemanticBadges = NonNullable<Colors["semanticBadges"]>;

interface ChartHeaderProps {
  average: number;
  target?: number;
  daysWithData: number;
  nutrient: TrendMetric;
  label: string;
  unit: string;
  showGoalDelta: boolean;
  days: number;
  goal?: number;
  showGoalLine?: boolean;
  captionText?: string; // For fat baseline or carbs no-goal message
}

export const ChartHeader: React.FC<ChartHeaderProps> = ({
  average,
  target,
  daysWithData,
  nutrient,
  label,
  unit,
  showGoalDelta,
  days,
  goal,
  showGoalLine = true,
  captionText,
}) => {
  const { colors, theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);
  const router = useRouter();

  const formatValue = (val: number) => {
    const rounded = Math.round(val);
    if (nutrient === "calories") {
      return `${rounded} ${unit}`;
    }
    return `${rounded}${unit} ${label}`;
  };

  // Calculate difference from target
  const diff = typeof target === "number" ? average - target : 0;
  const isOverTarget = diff > 0;
  const absDiff = Math.abs(Math.round(diff));

  const formattedValue = useMemo(
    () => formatValue(average),
    [average, nutrient, unit, label]
  );

  const shouldShowBadge =
    showGoalDelta &&
    typeof target === "number" &&
    daysWithData > 0 &&
    diff !== 0;

  const periodLabel = t("trends.chart.averagePerDayLabel", { days });

  const nutrientBadgeColors =
    colors.semanticBadges?.[nutrient as keyof SemanticBadges];

  const badgeColorConfig = isOverTarget
    ? nutrient === "calories"
      ? colors.semanticBadges?.carbs
      : nutrientBadgeColors
    : nutrient === "calories"
    ? colors.semanticBadges?.calories
    : nutrientBadgeColors;

  const badgeBackground =
    badgeColorConfig?.background || colors.subtleBackground;
  const badgeTextColor = badgeColorConfig?.text || colors.secondaryText;

  const handleOpenExplainer = () => {
    router.push({
      pathname: "/explainer-trends",
      params: {
        formattedValue,
        days: days.toString(),
      },
    });
  };

  const caption = useMemo(() => {
    // Priority order: goal > custom caption text
    if (showGoalLine && typeof goal === "number") {
      return t("trends.chart.goalLabel", {
        goal: Math.round(goal),
        unit,
      });
    }

    return captionText;
  }, [showGoalLine, goal, unit, captionText, t]);

  return (
    <Pressable
      onPress={handleOpenExplainer}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.containerPressed,
      ]}
    >
      <View style={styles.headerRow}>
        <AppText role="Caption" style={styles.periodLabel}>
          {periodLabel}
        </AppText>
        <Info size={14} color={colors.secondaryText} />
      </View>
      <View style={styles.averageRow}>
        <AppText role="Title1" style={styles.averageNumber}>
          {formattedValue}
        </AppText>
        {shouldShowBadge && (
          <View style={[styles.badge, { backgroundColor: badgeBackground }]}>
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
      {caption && (
        <AppText role="Caption" style={styles.caption}>
          {caption}
        </AppText>
      )}
    </Pressable>
  );
};

const createStyles = (colors: Colors, theme: Theme) =>
  StyleSheet.create({
    container: {
      paddingBottom: theme.spacing.md,
      gap: theme.spacing.xs / 2,
    },
    containerPressed: {
      opacity: 0.6,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      alignSelf: "flex-start",
    },
    averageRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    averageNumber: {
      color: colors.primaryText,
      padding: 0,
      margin: 0,
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
    periodLabel: {
      letterSpacing: 0.6,
      color: colors.secondaryText,
      textTransform: "uppercase",
    },
    caption: {
      color: colors.secondaryText,
    },
  });
