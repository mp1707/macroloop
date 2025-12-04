import React, { useMemo, useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  Alert,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { Theme, useTheme } from "@/theme";
import { SetGoalsCTA } from "./SetGoalsCTA";
import { AppText } from "@/components";
import { AnimatedText } from "@/components/shared/AnimatedText";
import { DashboardRing } from "@/components/shared/ProgressRings";
import { useNutrientCalculations } from "./hooks/useNutrientCalculations";
import { useNutrientAnimations } from "./hooks/useNutrientAnimations";
import { useNutrientNavigation } from "./hooks/useNutrientNavigation";
import { useRingSynchronization } from "./hooks/useRingSynchronization";
import { usePressAnimation } from "@/hooks/usePressAnimation";
import {
  getRingConfig,
  getNutrientLabels,
  ANIMATION_DELAYS,
  type NutrientKey,
} from "./utils/constants";
import { getNutrientIcon } from "./utils/nutrientFormatters";
import { Flame, BicepsFlexed, Info } from "lucide-react-native";
import { hasNoDailyTargets } from "@/utils";
import { AnimatedPressable } from "@/components/shared/AnimatedPressable";

const ICON_SIZE = 18;

interface NutrientValues {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

interface NutrientDashboardProps {
  percentages: NutrientValues;
  targets: NutrientValues;
  totals: NutrientValues;
}

const RING_KEYS = ["calories", "protein"] as const;

/**
 * Dashboard displaying nutrient intake progress with ring and label visualizations.
 */
export const NutrientDashboard: React.FC<NutrientDashboardProps> = ({
  percentages,
  targets,
  totals,
}) => {
  // Call ALL hooks FIRST (before any early returns)
  const { t } = useTranslation();
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { width: screenWidth } = useWindowDimensions();
  const [showDelta, setShowDelta] = useState(true);

  // Get translated nutrient labels
  const NUTRIENT_LABELS = getNutrientLabels(t);
  const RING_CONFIG = getRingConfig(t);

  // Calculate responsive ring size: 40% of screen width
  const ringSize = useMemo(() => screenWidth * 0.45, [screenWidth]);

  // Scale stroke width proportionally (maintaining ~0.12 ratio from original 22/184)
  const strokeWidth = useMemo(() => Math.max(ringSize * 0.12, 18), [ringSize]);

  const { shouldInstantlySyncRings, mountKey } = useRingSynchronization();

  const semanticColors = useMemo(
    () =>
      ({
        calories: colors.semantic.calories,
        protein: colors.semantic.protein,
        carbs: colors.semantic.carbs,
        fat: colors.semantic.fat,
      } as Record<NutrientKey, string>),
    [colors]
  );

  const surfaceColors = useMemo(
    () =>
      ({
        calories: colors.semanticSurfaces.calories,
        protein: colors.semanticSurfaces.protein,
        carbs: colors.semanticSurfaces.carbs,
        fat: colors.semanticSurfaces.fat,
      } as Record<NutrientKey, string>),
    [colors]
  );

  const calculations = useNutrientCalculations({
    totals,
    targets,
    percentages,
  });

  const animations = useNutrientAnimations({
    totals,
    percentages,
    isProteinComplete: calculations.isProteinComplete,
  });

  const { handleOpenExplainer } = useNutrientNavigation({
    totals,
    targets,
    percentages,
  });

  const caloriesPressAnimation = usePressAnimation();
  const proteinPressAnimation = usePressAnimation();

  const ringPressAnimations = {
    calories: caloriesPressAnimation,
    protein: proteinPressAnimation,
  } as const;

  const staticTotals = useMemo(
    () => ({
      calories: Math.round(totals.calories || 0),
      protein: Math.round(totals.protein || 0),
      fat: Math.round(totals.fat || 0),
      carbs: Math.round(totals.carbs || 0),
    }),
    [totals.calories, totals.protein, totals.fat, totals.carbs]
  );

  const shouldAnimateTotals = !animations.dateChanged;

  const displayTotals: Record<NutrientKey, number | SharedValue<number>> =
    shouldAnimateTotals
      ? {
          calories: animations.animatedCaloriesTotal,
          protein: animations.animatedProteinTotal,
          fat: animations.animatedFatTotal,
          carbs: animations.animatedCarbsTotal,
        }
      : staticTotals;

  const labelTargets: Partial<Record<NutrientKey, number>> = {
    calories: Math.round(targets.calories || 0),
    protein: Math.round(targets.protein || 0),
    fat: Math.round(targets.fat || 0),
  };

  // Animated progress bar width for fat (0-100 percentage)
  const fatProgressWidth = useSharedValue(0);

  // Animate fat progress bar with stagger after rings
  useEffect(() => {
    const fatPercentage = Math.min(percentages.fat || 0, 100);

    if (animations.dateChanged) {
      // Skip animation: set value instantly on date changes
      fatProgressWidth.value = fatPercentage;
    } else {
      // Animate with delay and spring (after both rings)
      fatProgressWidth.value = withDelay(
        ANIMATION_DELAYS.BASE_DELAY + ANIMATION_DELAYS.FAT_STAT,
        withSpring(fatPercentage, {
          mass: 1.2,
          damping: 25,
          stiffness: 80,
        })
      );
    }
  }, [percentages.fat, animations.dateChanged, fatProgressWidth]);

  // Check conditions AFTER all hooks are called
  if (hasNoDailyTargets(targets)) {
    return <SetGoalsCTA />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerIconRow}>
        <AnimatedPressable
          onPress={() => handleOpenExplainer("calories")}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("explainer.macros.overview.title")}
        >
          <Info size={18} color={colors.secondaryText} />
        </AnimatedPressable>
      </View>

      <View style={styles.ringRow}>
        {RING_KEYS.map((ringKey, index) => {
          const ringConfig = RING_CONFIG.find((item) => item.key === ringKey)!;
          const ringPercentage = percentages[ringKey] || 0;
          const { handlePressIn, handlePressOut, pressAnimatedStyle } =
            ringPressAnimations[ringKey];
          const ringTarget = labelTargets[ringKey];
          let ringDetailValue: string | undefined;

          if (typeof ringTarget === "number") {
            if (showDelta) {
              const delta = ringTarget - (staticTotals[ringKey] || 0);
              const suffix =
                delta >= 0 ? t("nutrients.left") : t("nutrients.over");
              ringDetailValue = `${Math.abs(delta)} ${suffix}`;
            } else {
              ringDetailValue = `${t("nutrients.of")} ${ringTarget}`;
            }
          }

          const ringIcon = ringKey === "calories" ? Flame : BicepsFlexed;

          const ringTotal = staticTotals[ringKey];
          const accessibilityLabel = ringTarget
            ? `${ringConfig.label} ${ringTotal} ${t(
                "nutrients.of"
              )} ${ringTarget}`
            : `${ringConfig.label} ${ringTotal}`;

          return (
            <View key={`${ringKey}-${mountKey}`} style={styles.ringCell}>
              <AppText
                role="Subhead"
                color="secondary"
                style={styles.ringLabel}
              >
                {ringConfig.label}
              </AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
                accessibilityHint={t("nutrients.tapToViewDetails")}
                onPress={() => setShowDelta((prev) => !prev)}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={styles.ringPressable}
              >
                <Animated.View style={pressAnimatedStyle}>
                  <DashboardRing
                    label={ringConfig.label}
                    displayUnit={ringConfig.unit}
                    detailUnit=""
                    showDetail={false}
                    percentage={ringPercentage}
                    color={semanticColors[ringKey]}
                    trackColor={surfaceColors[ringKey]}
                    textColor={colors.primaryText}
                    displayValue={displayTotals[ringKey]}
                    detailValue={ringDetailValue}
                    animationDelay={
                      ANIMATION_DELAYS.BASE_DELAY +
                      index * ANIMATION_DELAYS.RING_STAGGER
                    }
                    strokeWidth={strokeWidth}
                    size={ringSize}
                    Icon={ringIcon}
                    smallIcon={ringKey === "protein"}
                    skipAnimation={
                      animations.dateChanged || shouldInstantlySyncRings
                    }
                  />
                </Animated.View>
              </Pressable>
            </View>
          );
        })}
      </View>

      {/* Macro Grid: Fat and Carbs only */}
      <View style={styles.macroGrid}>
        <View style={styles.gridRow}>
          <MacroGridCell
            nutrientKey="fat"
            total={displayTotals.fat}
            accessibilityTotal={staticTotals.fat}
            target={labelTargets.fat}
            unit={NUTRIENT_LABELS.fat.unit}
            percentage={percentages.fat}
            semanticColor={semanticColors.fat}
            showProgressBar
            animatedProgressWidth={fatProgressWidth}
          />
          <MacroGridCell
            nutrientKey="carbs"
            total={displayTotals.carbs}
            accessibilityTotal={staticTotals.carbs}
            unit={NUTRIENT_LABELS.carbs.unit}
            semanticColor={semanticColors.carbs}
          />
        </View>
      </View>
    </View>
  );
};

interface MacroGridCellProps {
  nutrientKey: NutrientKey;
  total: number | string | SharedValue<number>;
  /**
   * Plain value used for accessibility labels so we never touch SharedValue.value on JS thread
   */
  accessibilityTotal?: number | string;
  target?: number | string;
  unit: string;
  percentage?: number;
  semanticColor: string;
  showProgressBar?: boolean;
  animatedProgressWidth?: SharedValue<number>;
  iconScale?: SharedValue<number>;
  isComplete?: boolean;
  onPress?: () => void;
}

const MacroGridCell: React.FC<MacroGridCellProps> = ({
  nutrientKey,
  total,
  accessibilityTotal,
  target,
  unit,
  percentage,
  semanticColor,
  showProgressBar = false,
  animatedProgressWidth,
  iconScale,
  isComplete = false,
  onPress,
}) => {
  const { t } = useTranslation();
  const { theme, colors } = useTheme();
  const styles = useMemo(() => createGridCellStyles(theme), [theme]);
  const { handlePressIn, handlePressOut, pressAnimatedStyle } =
    usePressAnimation({
      disabled: !onPress,
    });

  const NUTRIENT_LABELS = getNutrientLabels(t);
  const config = NUTRIENT_LABELS[nutrientKey];

  // Create accessibility label with current and target values
  const totalValue =
    accessibilityTotal ??
    (typeof total === "number"
      ? Math.round(total)
      : typeof total === "string"
      ? total
      : "");
  const accessibilityLabel =
    target != null
      ? `${config.label} ${totalValue} ${t("nutrients.of")} ${target} ${unit}`
      : `${config.label} ${totalValue} ${unit}`;

  // Only use getNutrientIcon for calories and protein (rings)
  const IconComponent =
    nutrientKey === "calories" || nutrientKey === "protein"
      ? getNutrientIcon(config.Icon, isComplete, nutrientKey)
      : config.Icon;

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale ? iconScale.value : 1 }],
  }));

  // Animated style for progress bar fill
  const progressBarAnimatedStyle = useAnimatedStyle(() => {
    if (animatedProgressWidth) {
      // Use animated value (0-100 percentage)
      return {
        width: `${animatedProgressWidth.value}%`,
      };
    }
    // Fallback to static width if no animated value provided
    const staticWidth =
      showProgressBar && percentage ? Math.min(percentage, 100) : 0;
    return {
      width: `${staticWidth}%`,
    };
  });

  const cellContent = (
    <View style={styles.cellContainer}>
      {/* Label Text */}
      <AppText role="Subhead" color="secondary" style={styles.label}>
        {config.label}
      </AppText>

      {/* Icon + Value Row */}
      <View style={styles.valueRow}>
        <Animated.View style={[styles.iconContainer, iconAnimatedStyle]}>
          <IconComponent
            size={ICON_SIZE}
            color={semanticColor}
            fill={semanticColor}
            strokeWidth={0}
          />
        </Animated.View>
        <View style={styles.valueContainer}>
          {typeof total === "object" && "value" in total ? (
            <AnimatedText value={total} role="Headline" color="primary" />
          ) : (
            <AppText role="Headline" color="primary">
              {total}
            </AppText>
          )}
          {target != null && (
            <>
              <AppText role="Body" color="secondary">
                {" "}
                /{" "}
              </AppText>
              <AppText role="Body" color="secondary">
                {target}
              </AppText>
            </>
          )}
          <AppText role="Body" color="secondary" style={styles.unitText}>
            {" "}
            {unit}
          </AppText>
        </View>
      </View>

      {/* Progress Bar (Fat only) */}
      {showProgressBar && (
        <View
          style={[
            styles.progressBarTrack,
            { backgroundColor: colors.disabledBackground },
          ]}
        >
          <Animated.View
            style={[
              styles.progressBarFill,
              { backgroundColor: semanticColor },
              progressBarAnimatedStyle,
            ]}
          />
        </View>
      )}
    </View>
  );

  if (!onPress) {
    return cellContent;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={t("nutrients.tapToViewDetails")}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.pressableCell}
    >
      <Animated.View style={pressAnimatedStyle}>{cellContent}</Animated.View>
    </Pressable>
  );
};

const createGridCellStyles = (theme: Theme) =>
  StyleSheet.create({
    pressableCell: {
      flex: 1,
    },
    cellContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xs,
    },
    valueRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xs,
    },
    iconContainer: {
      justifyContent: "center",
      alignItems: "center",
    },
    valueContainer: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "center",
      flexWrap: "wrap",
    },
    unitText: {
      marginLeft: theme.spacing.xs / 2,
    },
    progressBarTrack: {
      width: "55%",
      height: 5,
      borderRadius: 2.5,
      overflow: "hidden",
      marginTop: theme.spacing.xs,
    },
    progressBarFill: {
      height: "100%",
      borderRadius: 2.5,
    },
    label: {
      textAlign: "center",
    },
  });

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    headerIconRow: {
      position: "absolute",
      top: 5,
      right: theme.spacing.lg,
      zIndex: 10,
    },
    container: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.xs,
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.xl,
    },
    ringRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: theme.spacing.lg,
    },
    ringCell: {
      flex: 1,
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    ringPressable: {
      width: "100%",
      alignItems: "center",
    },
    ringLabel: {
      textAlign: "center",
    },
    macroGrid: {
      gap: theme.spacing.lg,
    },
    gridRow: {
      flexDirection: "row",
      gap: theme.spacing.lg,
    },
  });
