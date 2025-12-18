import React, { useMemo, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useAppStore } from "@/store/useAppStore";
import { useTheme, Colors, Theme, ColorScheme } from "@/theme";
import { Card, AppText } from "@/components";
import { formatDateKey } from "@/utils/dateHelpers";
import { Picker, Host } from "@expo/ui/swift-ui";
import { useTranslation } from "react-i18next";

const WEEKS_TO_SHOW = 26; // Approx 6 months

interface ConsistencyGridProps {
  mode?: "consistency" | "goals";
}

export const ConsistencyGrid = ({ mode = "consistency" }: ConsistencyGridProps) => {
  const { colors, theme, colorScheme } = useTheme();
  const styles = useMemo(() => createStyles(colors, theme, colorScheme), [colors, theme, colorScheme]);
  const foodLogs = useAppStore((state) => state.foodLogs);
  const dailyTargets = useAppStore((state) => state.dailyTargets);
  const { t } = useTranslation();

  const [metric, setMetric] = useState<"calories" | "protein">("protein");

  // Data processing
  const gridData = useMemo(() => {
    // 1. Build a lookup map for the data we need
    const logMap = new Map();
    foodLogs.forEach((log) => {
      const existing = logMap.get(log.logDate) || { calories: 0, protein: 0, exists: false };
      logMap.set(log.logDate, {
        exists: true,
        calories: existing.calories + (log.calories || 0),
        protein: existing.protein + (log.protein || 0),
      });
    });

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
      weekStart.setDate(currentWeekStart.getDate() - (w * 7));
      
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

  const getCellStyle = (dayData: any) => {
    if (mode === "consistency") {
      return dayData?.exists ? styles.cellActive : styles.cellInactive;
    }

    // Goals mode
    if (!dayData) return styles.cellInactive;

    if (metric === "calories") {
      const value = dayData.calories || 0;
      const goal = dailyTargets?.calories || 2000; // Fallback if no goal
      const percentage = value / goal;

      if (percentage < 0.5) {
        return styles.cellInactive;
      } else if (percentage >= 0.5 && percentage < 0.9) {
        // Darker shade
        return { backgroundColor: colors.semanticBadges?.calories?.text || colors.semantic.calories };
      } else if (percentage >= 0.9 && percentage <= 1.1) {
        // Accent
        return { backgroundColor: colors.semantic.calories };
      } else {
        // > 1.1 -> Darker shade
        return { backgroundColor: colors.semanticBadges?.calories?.text || colors.semantic.calories };
      }
    } else {
      // Protein
      const value = dayData.protein || 0;
      const goal = dailyTargets?.protein || 150; // Fallback
      
      if (value >= goal) {
        return { backgroundColor: colors.semantic.protein };
      }
      return styles.cellInactive;
    }
  };

  const pickerOptions = useMemo(
    () => [t("nutrients.protein.label"), t("nutrients.calories.label")],
    [t]
  );

  const handleMetricChange = ({ nativeEvent: { index } }: { nativeEvent: { index: number } }) => {
    setMetric(index === 0 ? "protein" : "calories");
  };

  return (
    <Card style={styles.card} padding={theme.spacing.md}>
      {mode === "goals" && (
        <View style={styles.header}>
           <Host matchContents colorScheme={colorScheme}>
            <Picker
              options={pickerOptions}
              selectedIndex={metric === "protein" ? 0 : 1}
              onOptionSelected={handleMetricChange}
              variant="segmented"
            />
          </Host>
        </View>
      )}
      <View style={styles.grid}>
        {gridData.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.column}>
            {week.map((day) => (
              <View
                key={day.dateKey}
                style={[
                  styles.cell,
                  getCellStyle(day.data)
                ]}
              />
            ))}
          </View>
        ))}
      </View>
    </Card>
  );
};

const createStyles = (colors: Colors, theme: Theme, colorScheme: ColorScheme) =>
  StyleSheet.create({
    card: {
      width: "100%",
    },
    header: {
      marginBottom: theme.spacing.md,
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
      opacity: 0.5,
    },
    cellActive: {
      backgroundColor: colors.accent,
    },
  });
