import React, { useMemo } from "react";
import { View, Pressable, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ProgressRingsStatic } from "@/components/shared/ProgressRings";
import { useTheme, theme } from "@/theme";
import { getTodayKey } from "@/utils/dateHelpers";

// Constant array to prevent recreating on every render
const NUTRIENT_KEYS = ["calories", "protein"] as const;

export interface DayData {
  date: string; // YYYY-MM-DD
  weekday: string; // Single letter: M, T, W, etc.
  percentages: {
    calories: number;
    protein: number;
  };
}

interface DayItemProps {
  item: DayData;
  isSelected: boolean;
  onPress: (date: string) => void;
  styles: any;
}

export const DayItem: React.FC<DayItemProps> = React.memo(
  ({ item, isSelected, onPress, styles }) => {
    const { colors } = useTheme();
    const today = getTodayKey();
    const isToday = item.date === today;

    const scale = useSharedValue(1);

    const handlePressIn = () => {
      scale.value = withTiming(theme.interactions.press.scale, {
        duration: theme.interactions.press.timing.duration,
        easing: theme.interactions.press.timing.easing,
      });
      Haptics.impactAsync(theme.interactions.haptics.light);
    };

    const handlePressOut = () => {
      scale.value = withSpring(1.0, {
        damping: theme.interactions.press.spring.damping,
        stiffness: theme.interactions.press.spring.stiffness,
      });
    };

    const handlePress = () => {
      onPress(item.date);
    };

    const pressAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    return (
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel={`Select ${item.date}`}
        accessibilityRole="button"
      >
        <Animated.View style={[styles.itemContainer, pressAnimatedStyle]}>
          <View
            style={[
              styles.weekdayContainer,
              isSelected && styles.selectedWeekdayContainer,
            ]}
          >
            <Text
              style={[
                styles.weekdayText,
                isSelected && styles.selectedWeekdayText,
                isToday && { color: colors.accent, fontWeight: "800" },
              ]}
            >
              {item.weekday}
            </Text>
          </View>
          <View style={styles.progressContainer}>
            <ProgressRingsStatic
              percentages={item.percentages}
              size={45}
              strokeWidth={6}
              spacing={1}
              padding={1}
              nutrientKeys={NUTRIENT_KEYS}
            />
          </View>
        </Animated.View>
      </Pressable>
    );
  }
);
