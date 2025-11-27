import React from "react";
import { View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { Host, Slider } from "@expo/ui/swift-ui";

import { AppText } from "@/components/shared/AppText";
import { useTheme } from "@/theme";
import { createStyles } from "./PortionSlider.styles";

interface PortionSliderProps {
  value: number;
  onValueChange: (value: number) => void;
}

export const PortionSlider: React.FC<PortionSliderProps> = ({
  value,
  onValueChange,
}) => {
  const { t } = useTranslation();
  const { theme, colors } = useTheme();
  const styles = createStyles(theme, colors);

  const handleValueChange = (newValue: number) => {
    const rounded = Math.round(newValue);
    onValueChange(rounded);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <Animated.View layout={LinearTransition} style={styles.container}>
      <View style={styles.header}>
        <AppText role="Caption" style={styles.label}>
          {t("createLog.percentageEaten.title")}
        </AppText>
        <AppText role="Body" style={styles.value}>
          {t("createLog.percentageEaten.value", {
            percentage: Math.round(value),
          })}
        </AppText>
      </View>
      <View style={styles.sliderContainer}>
        <Host matchContents>
          <Slider
            value={value}
            min={0}
            max={100}
            steps={19}
            color={colors.accent}
            onValueChange={handleValueChange}
          />
        </Host>
      </View>
    </Animated.View>
  );
};
