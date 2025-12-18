import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { useAppStore } from "@/store/useAppStore";
import { useTheme, Colors, Theme } from "@/theme";
import { Card } from "@/components";
import { formatDateKey } from "@/utils/dateHelpers";

const WEEKS_TO_SHOW = 26; // Approx 6 months

export const ConsistencyGrid = () => {
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);
  const foodLogs = useAppStore((state) => state.foodLogs);

  // Set of dates with logs for O(1) lookup
  const loggedDates = useMemo(() => {
    return new Set(foodLogs.map((log) => log.logDate));
  }, [foodLogs]);

  const gridData = useMemo(() => {
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
        
        days.push({
          dateKey,
          hasLog: loggedDates.has(dateKey),
        });
      }
      weeks.unshift(days); // Add to beginning so earliest week is first (left)
    }
    return weeks;
  }, [loggedDates]);

  return (
    <Card style={styles.card} padding={theme.spacing.md}>
      <View style={styles.grid}>
        {gridData.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.column}>
            {week.map((day) => (
              <View
                key={day.dateKey}
                style={[
                  styles.cell,
                  day.hasLog ? styles.cellActive : styles.cellInactive
                ]}
              />
            ))}
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
