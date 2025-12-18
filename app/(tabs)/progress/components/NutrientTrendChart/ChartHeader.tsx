import React, { useMemo } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Info } from "lucide-react-native";
import { Picker, Host } from "@expo/ui/swift-ui";
import { AppText } from "@/components";
import { useTheme, Colors, Theme, ColorScheme } from "@/theme";
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
  calorieGoal?: number; // For fat percentage calculation
  timePeriod: "week" | "month";
  onPeriodChange: (index: number) => void;
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
  calorieGoal,
  timePeriod,
  onPeriodChange,
}) => {
  const { colors, theme, colorScheme } = useTheme();
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

  // Calculate fat percentage pill for fat nutrient
  const shouldShowFatPill =
    nutrient === "fat" && typeof calorieGoal === "number" && daysWithData > 0;
  const fatPercentage = shouldShowFatPill
    ? Math.round(((average * 9) / calorieGoal!) * 100)
    : 0;

  const periodLabel = t("progress.chart.averagePerDayLabel", { days });

  const nutrientBadgeColors =
    colors.semanticBadges?.[nutrient as keyof SemanticBadges];

  const badgeColorConfig = nutrientBadgeColors;

  const badgeBackground =
    badgeColorConfig?.background || colors.subtleBackground;
  const badgeTextColor = badgeColorConfig?.text || colors.secondaryText;

  const handleOpenExplainer = () => {
    router.push({
      pathname: "/explainer-progress",
      params: {
        formattedValue,
        days: days.toString(),
      },
    });
  };

  const caption = useMemo(() => {
    // Priority order: goal > custom caption text
    if (showGoalLine && typeof goal === "number") {
      return t("progress.chart.goalLabel", {
        goal: Math.round(goal),
        unit,
      });
    }

    return captionText;
  }, [showGoalLine, goal, unit, captionText, t]);

  const pickerOptions = useMemo(
    () => [t("progress.timePeriod.week"), t("progress.timePeriod.month")],
    [t]
  );

  const handlePeriodSelection = ({
    nativeEvent: { index },
  }: {
    nativeEvent: { index: number };
  }) => {
    onPeriodChange(index);
  };

  return (
    <View style={styles.container}>
      <View style={styles.pickerWrapper}>
        <Host matchContents colorScheme={colorScheme}>
          <Picker
            options={pickerOptions}
            selectedIndex={timePeriod === "week" ? 0 : 1}
            onOptionSelected={handlePeriodSelection}
            variant="segmented"
          />
        </Host>
      </View>

      <Pressable
        onPress={handleOpenExplainer}
        style={({ pressed }) => [
          styles.headerRow,
          pressed && styles.containerPressed,
        ]}
      >
        <AppText role="Caption" style={styles.periodLabel}>
          {periodLabel}
        </AppText>
        <Info size={14} color={colors.secondaryText} />
      </Pressable>

      <Pressable
        onPress={handleOpenExplainer}
        style={({ pressed }) => [
          styles.contentContainer,
          pressed && styles.containerPressed,
        ]}
      >
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
                {absDiff} {unit} {t("progress.chart.vsGoal")}
              </AppText>
            </View>
          )}
          {shouldShowFatPill && (
            <View
              style={[
                styles.pill,
                {
                  backgroundColor:
                    colors.semanticSurfaces?.fat || colors.subtleBackground,
                },
              ]}
            >
              <AppText
                role="Caption"
                style={[styles.pillText, { color: colors.semantic.fat }]}
              >
                {fatPercentage} %
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
    </View>
  );
};

const createStyles = (colors: Colors, theme: Theme) =>
  StyleSheet.create({
    container: {
      paddingBottom: theme.spacing.md,
      gap: theme.spacing.xs / 2,
    },
    pickerWrapper: {
      marginBottom: theme.spacing.md,
    },
    contentContainer: {
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
    pill: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs / 2,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
    },
    pillText: {
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
