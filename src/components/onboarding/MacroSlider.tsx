import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Host, Slider } from "@expo/ui/swift-ui";
import { AppText } from "@/components/shared/AppText";
import { useTheme } from "@/theme";
import { Plus, Minus } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";

interface MacroSliderProps {
  label: string;
  icon: LucideIcon;
  iconColor: string;
  grams: number;
  onChange: (grams: number) => void;
  maxCalories: number;
  caloriesPerGram: number;
  step?: number;
}

export const MacroSlider = ({
  label,
  icon: Icon,
  iconColor,
  grams,
  onChange,
  maxCalories,
  caloriesPerGram,
  step = 5,
}: MacroSliderProps) => {
  const { colors, theme: themeObj } = useTheme();
  const styles = createStyles(colors, themeObj);
  const { t } = useTranslation();

  const maxGrams = Math.floor(maxCalories / caloriesPerGram);
  const calories = grams * caloriesPerGram;
  const percentage = maxCalories > 0 ? Math.round((calories / maxCalories) * 100) : 0;

  const clampGrams = (value: number): number => {
    const clamped = Math.max(0, Math.min(value, maxGrams));
    if (clamped * caloriesPerGram > maxCalories) {
      return Math.floor(maxCalories / caloriesPerGram);
    }
    return clamped;
  };

  const handleIncrement = async () => {
    const newValue = clampGrams(grams + step);
    onChange(newValue);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDecrement = async () => {
    const newValue = clampGrams(grams - step);
    onChange(newValue);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSliderChange = (value: number) => {
    const roundedValue = Math.round(value / step) * step;
    const clampedValue = clampGrams(roundedValue);
    onChange(clampedValue);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={styles.container}>
      {/* Header with Icon and Label */}
      <View style={styles.header}>
        <View style={styles.labelRow}>
          <Icon size={20} color={iconColor} fill={iconColor} strokeWidth={0} />
          <AppText role="Body">{label}</AppText>
        </View>
        <View style={styles.stepperRow}>
          <Pressable
            onPress={handleDecrement}
            style={styles.stepperButton}
            disabled={grams <= 0}
            accessibilityLabel={t("onboarding.macroSlider.decrease", {
              label,
            })}
          >
            <Minus
              size={18}
              color={grams <= 0 ? colors.secondaryText : iconColor}
              strokeWidth={2}
            />
          </Pressable>
          <Pressable
            onPress={handleIncrement}
            style={styles.stepperButton}
            disabled={grams >= maxGrams}
            accessibilityLabel={t("onboarding.macroSlider.increase", {
              label,
            })}
          >
            <Plus
              size={18}
              color={grams >= maxGrams ? colors.secondaryText : iconColor}
              strokeWidth={2}
            />
          </Pressable>
        </View>
      </View>

      {/* Value Display */}
      <View style={styles.valueRow}>
        <AppText role="Title2">{grams} g</AppText>
        <AppText role="Caption" color="secondary">
          {calories} kcal / {percentage}%
        </AppText>
      </View>

      {/* Slider */}
      <View style={styles.sliderContainer}>
        <Host matchContents>
          <Slider
            value={grams}
            min={0}
            max={maxGrams}
            steps={maxGrams > 0 ? Math.floor(maxGrams / step) - 1 : 0}
            color={iconColor}
            onValueChange={handleSliderChange}
          />
        </Host>
      </View>
    </View>
  );
};

type Colors = ReturnType<typeof useTheme>["colors"];
type Theme = ReturnType<typeof useTheme>["theme"];

const createStyles = (colors: Colors, themeObj: Theme) => {
  const { spacing } = themeObj;

  return StyleSheet.create({
    container: {
      gap: spacing.sm,
      padding: spacing.md,
      backgroundColor: colors.subtleBackground,
      borderRadius: 12,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    labelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    stepperRow: {
      flexDirection: "row",
      gap: spacing.xs,
    },
    stepperButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primaryBackground,
      alignItems: "center",
      justifyContent: "center",
    },
    valueRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: spacing.sm,
    },
    sliderContainer: {
      paddingHorizontal: spacing.sm,
    },
  });
};
