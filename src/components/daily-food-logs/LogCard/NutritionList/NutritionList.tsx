import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import Animated, {
  Easing as ReanimatedEasing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components";
import { MacroLineLoader } from "@/components/refine-page/MacrosCard/MacroLineLoader";
import { useTheme } from "@/theme";
import type { Theme } from "@/theme";
import { createStyles } from "./NutritionList.styles";

interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface NutritionListProps {
  nutrition: NutritionData;
  isLoading?: boolean;
  wasLoading?: boolean;
}

interface NutritionItemConfig {
  key: string;
  value: number;
  label: string;
  color: string;
}

interface AnimatedNutritionRowProps {
  item: NutritionItemConfig;
  index: number;
  isLoading: boolean;
  wasLoading: boolean;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
}

type MacroNutrientKey = "protein" | "carbs" | "fat";

const AnimatedNutritionRow: React.FC<AnimatedNutritionRowProps> = ({
  item,
  index,
  isLoading,
  wasLoading,
  styles,
  theme,
}) => {
  const [rowWidth, setRowWidth] = useState(0);
  const [rowHeight, setRowHeight] = useState(theme.spacing.lg + theme.spacing.xs);

  const rowWidthValue = useSharedValue(0);
  const revealProgress = useSharedValue(isLoading ? 1 : 0);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      if (width !== rowWidth) {
        setRowWidth(width);
      }
      const nextHeight = Math.max(height, theme.spacing.lg + theme.spacing.xs);
      if (nextHeight !== rowHeight) {
        setRowHeight(nextHeight);
      }
      rowWidthValue.value = width;
    },
    [rowHeight, rowWidth, rowWidthValue, theme.spacing.lg, theme.spacing.xs],
  );

  useEffect(() => {
    if (isLoading) {
      revealProgress.value = 1;
      return;
    }

    if (wasLoading) {
      revealProgress.value = withDelay(
        index * 70,
        withTiming(0, {
          duration: 420,
          easing: ReanimatedEasing.inOut(ReanimatedEasing.cubic),
        }),
      );
      return;
    }

    revealProgress.value = 0;
  }, [index, isLoading, revealProgress, wasLoading]);

  const loaderHeight = Math.max(rowHeight, theme.spacing.lg + theme.spacing.xs);

  const loaderAnimatedStyle = useAnimatedStyle(() => ({
    width: Math.max(rowWidthValue.value * revealProgress.value, 0),
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: revealProgress.value * rowWidthValue.value,
      },
    ],
  }));

  return (
    <View style={styles.nutritionRow} onLayout={handleLayout}>
      <Animated.View
        pointerEvents="none"
        style={[styles.nutritionLoaderLayer, loaderAnimatedStyle]}
      >
        {rowWidth > 0 ? (
          <MacroLineLoader
            width={rowWidth}
            height={loaderHeight}
            color={item.color}
            index={index}
          />
        ) : (
          <View style={styles.nutritionLoaderPlaceholder} />
        )}
      </Animated.View>

      <Animated.View style={[styles.nutritionContent, contentAnimatedStyle]}>
        <View
          style={[
            styles.nutritionDot,
            { backgroundColor: item.color },
          ]}
        />
        <AppText style={styles.nutritionText}>
          {Math.round(item.value)} {item.label}
        </AppText>
      </Animated.View>
    </View>
  );
};

export const NutritionList: React.FC<NutritionListProps> = ({
  nutrition,
  isLoading = false,
  wasLoading = false,
}) => {
  const { colors, theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { calories, protein, carbs, fat } = nutrition;

  const nutritionItems: NutritionItemConfig[] = useMemo(
    () => {
      const macroLabel = (nutrientKey: MacroNutrientKey) => {
        const nutrientLabel =
          nutrientKey === "carbs"
            ? t("logCard.nutritionLabels.carbs", {
                defaultValue: t(`nutrients.${nutrientKey}.label`),
              })
            : t(`nutrients.${nutrientKey}.label`);

        return t("dailyFoodLogs.nutritionList.macroLabel", {
          unit: t(`nutrients.${nutrientKey}.unitShort`),
          nutrient: nutrientLabel,
        });
      };

      return [
        {
          key: "calories",
          value: calories,
          label: t("nutrients.calories.unitShort"),
          color: colors.semantic.calories,
        },
        {
          key: "protein",
          value: protein,
          label: macroLabel("protein"),
          color: colors.semantic.protein,
        },
        {
          key: "carbs",
          value: carbs,
          label: macroLabel("carbs"),
          color: colors.semantic.carbs,
        },
        {
          key: "fat",
          value: fat,
          label: macroLabel("fat"),
          color: colors.semantic.fat,
        },
      ];
    },
    [
      calories,
      protein,
      carbs,
      fat,
      colors.semantic.calories,
      colors.semantic.protein,
      colors.semantic.carbs,
      colors.semantic.fat,
      t,
    ],
  );

  return (
    <View style={styles.nutritionList}>
      {nutritionItems.map((item, index) => (
        <AnimatedNutritionRow
          key={item.key}
          item={item}
          index={index}
          isLoading={!!isLoading}
          wasLoading={!!wasLoading}
          styles={styles}
          theme={theme}
        />
      ))}
    </View>
  );
};
