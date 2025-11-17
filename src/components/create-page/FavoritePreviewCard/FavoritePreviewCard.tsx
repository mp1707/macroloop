import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useTranslation } from "react-i18next";

import { Card } from "@/components/Card";
import { AppText } from "@/components/shared/AppText";
import { useTheme } from "@/theme";
import type { ColorScheme, Colors, Theme } from "@/theme";
import type { Favorite } from "@/types/models";
import { usePressAnimation } from "@/hooks/usePressAnimation";

interface FavoritePreviewCardProps {
  favorite: Favorite;
  onPress: () => void;
  width?: number;
}

export const FavoritePreviewCard: React.FC<FavoritePreviewCardProps> = ({
  favorite,
  onPress,
  width = 180,
}) => {
  const { colors, theme, colorScheme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(
    () => createStyles(theme, colors, colorScheme, width),
    [theme, colors, colorScheme, width]
  );
  const caloriesUnit = t("nutrients.calories.unitShort");
  const proteinUnit = t("nutrients.protein.unitShort");

  const { handlePressIn, handlePressOut, pressAnimatedStyle } =
    usePressAnimation({
      hapticIntensity: "light",
    });

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.pressable}
      accessibilityRole="button"
      accessibilityLabel={t("createLog.favorites.accessibilityLabel", {
        title: favorite.title,
      })}
    >
      <Animated.View style={pressAnimatedStyle}>
        <Card
          padding={theme.spacing.md}
          style={[styles.card, { backgroundColor: colors.secondaryBackground }]}
        >
          <AppText
            role="Subhead"
            numberOfLines={2}
            ellipsizeMode="tail"
            style={styles.title}
          >
            {favorite.title}
          </AppText>
          <View style={styles.nutrientRow}>
            <View style={styles.nutrientItem}>
              <View
                style={[
                  styles.nutrientDot,
                  { backgroundColor: colors.semantic.calories },
                ]}
              />
              <AppText role="Caption" style={styles.nutrientText}>
                {Math.round(favorite.calories * ((favorite.percentageEaten ?? 100) / 100))} {caloriesUnit}
              </AppText>
            </View>
            <View style={styles.nutrientItem}>
              <View
                style={[
                  styles.nutrientDot,
                  { backgroundColor: colors.semantic.protein },
                ]}
              />
              <AppText role="Caption" style={styles.nutrientText}>
                {Math.round(favorite.protein * ((favorite.percentageEaten ?? 100) / 100))} {proteinUnit}
              </AppText>
            </View>
          </View>
        </Card>
      </Animated.View>
    </Pressable>
  );
};

const createStyles = (
  theme: Theme,
  colors: Colors,
  colorScheme: ColorScheme,
  width: number
) =>
  StyleSheet.create({
    pressable: {
      borderRadius: theme.getComponentStyles(colorScheme).cards.cornerRadius,
    },
    card: {
      width,
      height: theme.spacing.xxl + theme.spacing.xxl + theme.spacing.md,
      gap: theme.spacing.md,
      justifyContent: "space-between",
    },
    title: {
      color: colors.primaryText,
    },
    nutrientRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
    },
    nutrientItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    nutrientDot: {
      width: theme.spacing.sm,
      height: theme.spacing.sm,
      borderRadius: theme.spacing.xs,
    },
    nutrientText: {
      color: colors.primaryText,
      fontWeight: "600",
    },
  });
