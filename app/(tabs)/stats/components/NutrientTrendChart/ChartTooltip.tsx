import React, { useState, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "@/components";
import { AnimatedPressable } from "@/components/shared/AnimatedPressable";
import { useTheme, Colors, Theme } from "@/theme";
import { formatDate } from "@/utils/dateHelpers";
import type { TrendMetric } from "../trendCalculations";

interface ChartTooltipProps {
  activeBar: {
    centerX: number;
    topY: number;
    value: number;
    dateKey: string;
  };
  chartWidth: number;
  color: string;
  unit: string;
  gap?: number;
  nutrient?: TrendMetric;
  calorieGoal?: number;
  onDateSelect?: (dateKey: string) => void;
}

export const ChartTooltip: React.FC<ChartTooltipProps> = ({
  activeBar,
  chartWidth,
  color,
  unit,
  gap,
  nutrient,
  calorieGoal,
  onDateSelect,
}) => {
  const { colors, theme } = useTheme();
  const { t, i18n } = useTranslation();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);
  const [tooltipSize, setTooltipSize] = useState({ width: 0, height: 0 });

  const effectiveGap = gap ?? theme.spacing.sm;

  const handlePress = () => {
    if (onDateSelect) {
      onDateSelect(activeBar.dateKey);
    }
  };

  const formattedDate = formatDate(activeBar.dateKey, { t, locale: i18n.language });

  const topPosition = getTooltipTop(activeBar.topY, tooltipSize.height, effectiveGap);
  const leftPosition = getTooltipLeft(
    activeBar.centerX,
    tooltipSize.width,
    chartWidth,
    effectiveGap
  );

  // Calculate line height
  // The line goes from tooltip bottom to bar top.
  // Tooltip bottom = topPosition + tooltipSize.height
  // Bar top = activeBar.topY
  // Height = activeBar.topY - (topPosition + tooltipSize.height)
  const lineTop = topPosition + tooltipSize.height;
  const lineHeight = Math.max(0, activeBar.topY - lineTop);

  const renderValue = () => {
    const baseText = `${Math.round(activeBar.value)} ${unit}`;
    
    if (nutrient === "fat" && calorieGoal && calorieGoal > 0) {
      const percentage = Math.round(((activeBar.value * 9) / calorieGoal) * 100);
      return `${baseText} (${percentage}%)`;
    }
    
    return baseText;
  };

  return (
    <View style={styles.tooltipOverlay}>
      {tooltipSize.height > 0 && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: activeBar.centerX,
            top: lineTop,
            height: lineHeight,
            width: 1,
            borderLeftWidth: 1,
            borderColor: colors.border,
            borderStyle: "dashed",
            transform: [{ translateX: -0.5 }],
          }}
        />
      )}
      <AnimatedPressable
        onPress={handlePress}
        hapticIntensity="light"
        accessibilityLabel={`${formattedDate} ${renderValue()}`}
        accessibilityHint={t("calendar.a11y.selectDate")}
        accessibilityRole="button"
        containerStyle={{
          position: "absolute",
          left: leftPosition,
          top: topPosition,
        }}
        style={[
          styles.tooltip,
          {
            opacity: tooltipSize.width === 0 ? 0 : 1, // Hide until measured
          },
        ]}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setTooltipSize((prev) => {
            if (prev.width === width && prev.height === height) return prev;
            return { width, height };
          });
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}>
          <View style={[styles.tooltipDot, { backgroundColor: color }]} />
          <AppText role="Caption" style={styles.tooltipDate}>
            {formattedDate}
          </AppText>
          <AppText role="Caption" style={styles.tooltipText}>
            {renderValue()}
          </AppText>
        </View>
      </AnimatedPressable>
    </View>
  );
};

const getTooltipLeft = (
  centerX: number,
  tooltipWidth: number,
  chartWidth: number,
  margin: number
) => {
  if (tooltipWidth === 0) {
    return centerX;
  }

  const rawLeft = centerX - tooltipWidth / 2;
  const minLeft = margin;
  const maxLeft = chartWidth - tooltipWidth - margin;
  if (rawLeft < minLeft) return minLeft;
  if (rawLeft > maxLeft) return maxLeft;
  return rawLeft;
};

const getTooltipTop = (topY: number, tooltipHeight: number, gap: number) => {
  if (tooltipHeight === 0) {
    return Math.max(topY - gap, 0);
  }

  const rawTop = topY - tooltipHeight - gap;
  return rawTop < 0 ? 0 : rawTop;
};

const createStyles = (colors: Colors, theme: Theme) =>
  StyleSheet.create({
    tooltipOverlay: {
      ...StyleSheet.absoluteFillObject,
    },
    tooltip: {
      backgroundColor: colors.secondaryBackground,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 5,
    },
    tooltipDate: {
      color: colors.secondaryText,
      fontWeight: "600",
    },
    tooltipDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    tooltipText: {
      color: colors.primaryText,
      fontWeight: "600",
    },
  });
