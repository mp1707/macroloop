import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Host, Slider } from "@expo/ui/swift-ui";
import { AppText } from "@/components/shared/AppText";
import { useTheme } from "@/theme";
import { Flame, Plus, Minus } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";

interface CalorieControlProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export const CalorieControl = ({
  value,
  onChange,
  min = 1200,
  max = 4500,
  step = 50,
}: CalorieControlProps) => {
  const { colors, theme: themeObj } = useTheme();
  const styles = createStyles(colors, themeObj);
  const { t } = useTranslation();

  const handleIncrement = async () => {
    const newValue = Math.min(value + step, max);
    onChange(newValue);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDecrement = async () => {
    const newValue = Math.max(value - step, min);
    onChange(newValue);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSliderChange = (sliderValue: number) => {
    const roundedValue = Math.round(sliderValue / step) * step;
    onChange(roundedValue);
  };

  return (
    <View style={styles.container}>
      {/* Value Display with Steppers */}
      <View style={styles.displayRow}>
        <Pressable
          onPress={handleDecrement}
          style={styles.stepperButton}
          disabled={value <= min}
          accessibilityLabel={t("onboarding.calorieControl.decrease")}
        >
          <Minus
            size={24}
            color={value <= min ? colors.secondaryText : colors.accent}
            strokeWidth={2}
          />
        </Pressable>

        <View style={styles.valueContainer}>
          <Flame
            size={28}
            color={colors.semantic.calories}
            fill={colors.semantic.calories}
            strokeWidth={0}
          />
          <AppText role="Title1">{value}</AppText>
          <AppText role="Body" color="secondary">
            kcal
          </AppText>
        </View>

        <Pressable
          onPress={handleIncrement}
          style={styles.stepperButton}
          disabled={value >= max}
          accessibilityLabel={t("onboarding.calorieControl.increase")}
        >
          <Plus
            size={24}
            color={value >= max ? colors.secondaryText : colors.accent}
            strokeWidth={2}
          />
        </Pressable>
      </View>

      {/* Slider */}
      <View style={styles.sliderContainer}>
        <Host matchContents>
          <Slider
            value={value}
            min={min}
            max={max}
            steps={(max - min) / step - 1}
            color={colors.accent}
            onValueChange={handleSliderChange}
          />
        </Host>
        <View style={styles.sliderLabels}>
          <AppText role="Caption" color="secondary">
            {min}
          </AppText>
          <AppText role="Caption" color="secondary">
            {max}
          </AppText>
        </View>
      </View>

      {/* Helper Text */}
      <View style={styles.helperContainer}>
        <AppText role="Caption" color="secondary" style={styles.helperText}>
          {t("onboarding.calorieControl.helper")}
        </AppText>
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
      gap: spacing.lg,
    },
    displayRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.lg,
    },
    stepperButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.subtleBackground,
      alignItems: "center",
      justifyContent: "center",
    },
    valueContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    sliderContainer: {
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    sliderLabels: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: spacing.xs,
    },
    helperContainer: {
      alignItems: "center",
    },
    helperText: {
      textAlign: "center",
      lineHeight: 20,
      maxWidth: "85%",
    },
  });
};
