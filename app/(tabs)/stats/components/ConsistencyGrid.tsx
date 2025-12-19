import React, { useMemo, useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { useAppStore } from "@/store/useAppStore";
import { useTheme, Colors, Theme } from "@/theme";
import { Card, AppText } from "@/components";
import { formatDateKey } from "@/utils/dateHelpers";
import { Picker, Host } from "@expo/ui/swift-ui";
import { useTranslation } from "react-i18next";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { aggregateConsumedNutrientsByDate } from "@/utils/nutrientCalculations";

const WEEKS_TO_SHOW = 26; // Approx 6 months

type CellStatus = "empty" | "partial" | "completed";

// Static cell for non-today cells (no shared values needed)
interface StaticCellProps {
  style: any;
}

const StaticCell = React.memo(({ style }: StaticCellProps) => {
  return <View style={style} />;
});

// Animated cell only for today's cell (single shared value)
interface AnimatedCellProps {
  style: any;
  status: CellStatus;
  initialDelay?: number;
  theme: Theme;
}

const AnimatedCell = React.memo(
  ({ style, status, initialDelay = 0, theme }: AnimatedCellProps) => {
    const scale = useSharedValue(1);

    useEffect(() => {
      if (status === "empty") return;

      const performAnimation = async () => {
        // Wait for initial delay if set
        if (initialDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, initialDelay));
        }

        if (status === "completed") {
          // Success Animation: Snappy, intense, no spring
          Haptics.impactAsync(theme.interactions.haptics.light);
          scale.value = withSequence(
            withTiming(1.5, { duration: 100 }),
            withTiming(1, { duration: 100 })
          );
        } else if (status === "partial") {
          // Logged Animation: Snappy, subtle
          Haptics.impactAsync(theme.interactions.haptics.light);
          scale.value = withSequence(
            withTiming(1.2, { duration: 75 }),
            withTiming(1, { duration: 75 })
          );
        }
      };

      performAnimation();
    }, [status, initialDelay, theme]);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    return <Animated.View style={[style, animatedStyle]} />;
  }
);

export const ConsistencyGrid = () => {
  const { colors, theme, colorScheme } = useTheme();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);
  const foodLogs = useAppStore((state) => state.foodLogs);
  const dailyTargets = useAppStore((state) => state.dailyTargets);
  const { t } = useTranslation();

  const [metric, setMetric] = useState<"calories" | "protein">("calories");

  const todayKey = useMemo(() => {
    const today = new Date();
    return formatDateKey(
      today.getFullYear(),
      today.getMonth() + 1,
      today.getDate()
    );
  }, []);

  // Data processing
  const gridData = useMemo(() => {
    // Use centralized utility to build nutrient map with percentageEaten applied
    const logMap = aggregateConsumedNutrientsByDate(foodLogs);

    const today = new Date();
    // Adjust to local Monday start of week
    const dayOfWeek = today.getDay(); // 0 is Sunday
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    // Start of current week (Monday)
    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - daysSinceMonday);

    const weeks = [];

    // Generate weeks backwards
    for (let w = 0; w < WEEKS_TO_SHOW; w++) {
      const weekStart = new Date(currentWeekStart);
      weekStart.setDate(currentWeekStart.getDate() - w * 7);

      const days = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + d);

        const dateKey = formatDateKey(
          date.getFullYear(),
          date.getMonth() + 1,
          date.getDate()
        );

        const logData = logMap.get(dateKey);

        days.push({
          dateKey,
          data: logData,
        });
      }
      weeks.unshift(days); // Add to beginning so earliest week is first (left)
    }
    return weeks;
  }, [foodLogs]);

  const getCellStatus = (dayData: any): CellStatus => {
    if (!dayData?.exists) return "empty";

    if (metric === "calories") {
      const value = dayData.calories || 0;
      const goal = dailyTargets?.calories || 2000;
      const percentage = value / goal;

      // Target met: +/- 10%
      return percentage >= 0.9 && percentage <= 1.1 ? "completed" : "partial";
    } else {
      // Protein
      const value = dayData.protein || 0;
      const goal = dailyTargets?.protein || 150;

      // Target met: >= 80%
      return value >= goal * 0.8 ? "completed" : "partial";
    }
  };

  const getStyleForStatus = (status: CellStatus) => {
    if (status === "empty") return styles.cellInactive;

    const baseColor =
      metric === "calories"
        ? colors.semantic.calories
        : colors.semantic.protein;

    if (status === "completed") {
      return { backgroundColor: baseColor, opacity: 1 };
    } else {
      // Partial: Dimmed opacity
      return { backgroundColor: baseColor, opacity: 0.35 };
    }
  };

  const pickerOptions = useMemo(
    () => [
      t("progress.consistency.tabs.calories"),
      t("progress.consistency.tabs.protein"),
    ],
    [t]
  );

  const handleMetricChange = ({
    nativeEvent: { index },
  }: {
    nativeEvent: { index: number };
  }) => {
    if (index === 0) setMetric("calories");
    else setMetric("protein");
  };

  const renderLegendItem = (
    color: string,
    text: string,
    opacity: number = 1
  ) => (
    <View style={styles.legendItem}>
      <View
        style={[styles.legendSquare, { backgroundColor: color, opacity }]}
      />
      <AppText role="Caption" color="secondary" style={styles.legendText}>
        {text}
      </AppText>
    </View>
  );

  return (
    <Card style={styles.card} padding={theme.spacing.md}>
      <View style={styles.header}>
        <Host matchContents colorScheme={colorScheme}>
          <Picker
            options={pickerOptions}
            selectedIndex={metric === "calories" ? 0 : 1}
            onOptionSelected={handleMetricChange}
            variant="segmented"
          />
        </Host>

        <View style={styles.legendContainer}>
          {metric === "calories" && (
            <>
              {renderLegendItem(
                colors.semantic.calories,
                t("progress.consistency.legend.atLeastOneLog"),
                0.35
              )}
              {renderLegendItem(
                colors.semantic.calories,
                t("progress.consistency.legend.inRange")
              )}
            </>
          )}

          {metric === "protein" && (
            <>
              {renderLegendItem(
                colors.semantic.protein,
                t("progress.consistency.legend.atLeastOneLog"),
                0.35
              )}
              {renderLegendItem(
                colors.semantic.protein,
                t("progress.consistency.legend.atLeast80")
              )}
            </>
          )}
        </View>
      </View>

      <View style={styles.grid}>
        {gridData.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.column}>
            {week.map((day) => {
              const status = getCellStatus(day.data);
              const cellStyle = getStyleForStatus(status);
              const isToday = day.dateKey === todayKey;

              return isToday ? (
                <AnimatedCell
                  key={`${day.dateKey}-${metric}`}
                  style={[styles.cell, cellStyle]}
                  status={status}
                  initialDelay={500}
                  theme={theme}
                />
              ) : (
                <StaticCell
                  key={`${day.dateKey}-${metric}`}
                  style={[styles.cell, cellStyle]}
                />
              );
            })}
          </View>
        ))}
      </View>
    </Card>
  );
};

const createStyles = (colors: Colors, theme: Theme) =>
  StyleSheet.create({
    card: {
      width: "100%",
    },
    header: {
      marginBottom: theme.spacing.md,
    },
    legendContainer: {
      marginTop: theme.spacing.md,
      gap: theme.spacing.xs / 2,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    legendSquare: {
      width: 9,
      height: 9,
      borderRadius: 2,
    },
    legendText: {
      flex: 1,
    },
    grid: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    column: {
      gap: 3,
    },
    cell: {
      width: 9, // Slightly smaller to fit 26 weeks on smaller screens (SE)
      height: 9,
      borderRadius: 2,
    },
    cellInactive: {
      backgroundColor: colors.subtleBorder,
      opacity: 0.35,
    },
  });
