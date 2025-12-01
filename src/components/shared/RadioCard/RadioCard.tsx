import React, { useCallback, useEffect } from "react";
import { LayoutChangeEvent, Pressable, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import * as Haptics from "expo-haptics";
import { Circle, CircleCheck, LucideIcon } from "lucide-react-native";
import { Card } from "@/components/Card";
import { AppText } from "@/components/shared/AppText";
import { useTheme } from "@/theme";
import { useTranslation } from "react-i18next";
import { createStyles } from "./RadioCard.styles";

interface RadioCardProps {
  title: string;
  description?: string;
  factor?: number;
  badge?: { label: string };
  recommended?: boolean;
  titleIcon?: LucideIcon;
  titleIconColor?: string;
  isSelected: boolean;
  onSelect: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const RadioCard: React.FC<RadioCardProps> = ({
  title,
  description,
  factor,
  badge,
  recommended,
  titleIcon,
  titleIconColor,
  isSelected,
  onSelect,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const { colors, theme } = useTheme();
  const { t } = useTranslation();
  const styles = createStyles(colors, theme);

  // Animation values
  const pressScale = useSharedValue(1);
  const selectedProgress = useSharedValue(isSelected ? 1 : 0);
  const cardLayout = useSharedValue<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  // Update selection animation when isSelected changes
  useEffect(() => {
    selectedProgress.value = withSpring(isSelected ? 1 : 0, {
      damping: 20,
      stiffness: 300,
    });
  }, [isSelected]);

  // Animated styles for press feedback
  const animatedCardStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pressScale.value }],
    };
  });

  // Animated styles for radio indicator
  const animatedRadioStyle = useAnimatedStyle(() => {
    const selectionScale = interpolate(
      selectedProgress.value,
      [0, 1],
      [1, 1.1]
    );
    const currentPressScale = pressScale.value || 1;

    // Counter the card press scale so the SVG icon stays crisp during the press animation.
    const pressCompensation = 1 / currentPressScale;

    return {
      transform: [{ scale: selectionScale * pressCompensation }],
    };
  });

  const animatedIndicatorOverlayStyle = useAnimatedStyle(() => {
    const scale = pressScale.value;
    const { width, height } = cardLayout.value;

    if (!width || !height) {
      return {
        transform: [{ translateX: 0 }, { translateY: 0 }],
      };
    }

    const translateX = ((1 - scale) * width) / 2;
    const translateY = ((1 - scale) * height) / 2;

    return {
      transform: [{ translateX }, { translateY }],
    };
  });

  const handlePressIn = () => {
    pressScale.value = withTiming(theme.interactions.press.scale, {
      duration: theme.interactions.press.timing.duration,
      easing: theme.interactions.press.timing.easing,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    pressScale.value = withSpring(1.0, {
      damping: theme.interactions.press.spring.damping,
      stiffness: theme.interactions.press.spring.stiffness,
    });
  };

  const triggerSelection = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect();
  }, [onSelect]);

  const handlePress = () => {
    pressScale.value = withTiming(
      1.0,
      {
        duration: theme.interactions.press.timing.duration,
        easing: theme.interactions.press.timing.easing,
      },
      () => {
        scheduleOnRN(triggerSelection);
      }
    );
  };

  const RadioIndicator = isSelected ? CircleCheck : Circle;
  const TitleIcon = titleIcon;

  const handleCardLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      cardLayout.value = { width, height };
    },
    [cardLayout]
  );

  const hasDescription = Boolean(description);

  const descriptionHint = description ? ` ${description}` : "";

  return (
    <View style={styles.wrapper}>
      <Animated.View style={animatedCardStyle} onLayout={handleCardLayout}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePress}
          accessibilityRole="radio"
          accessibilityState={{ checked: isSelected }}
          accessibilityLabel={accessibilityLabel || `${title} option`}
          accessibilityHint={
            accessibilityHint ||
            (factor
              ? `Select ${factor} grams per kilogram protein goal.${descriptionHint}`
              : `Select ${title}.${descriptionHint}`)
          }
        >
          <Card elevated={true} padding={theme.spacing.md} style={styles.card}>
            <View style={styles.container}>
              <View style={styles.radioGutter} />

              {/* Content */}
              <View
                style={[
                  styles.content,
                  !hasDescription && styles.contentCentered,
                ]}
              >
                <View style={styles.titleRow}>
                  <View style={styles.titleWithIcon}>
                    <AppText
                      role="Body"
                      color={isSelected ? "accent" : "primary"}
                      numberOfLines={1}
                    >
                      {title}
                    </AppText>
                    {TitleIcon && (
                      <TitleIcon
                        size={18}
                        color={
                          titleIconColor ||
                          (isSelected ? colors.accent : colors.primaryText)
                        }
                        strokeWidth={2}
                      />
                    )}
                  </View>
                  {(badge || factor !== undefined) && (
                    <View style={styles.trailingContent}>
                      <View style={styles.factorBadge}>
                        <AppText
                          role="Caption"
                          color={isSelected ? "accent" : "primary"}
                        >
                          {badge?.label || `${factor} g Protein /kg`}
                        </AppText>
                      </View>
                    </View>
                  )}
                </View>
                {hasDescription && (
                  <AppText
                    role="Caption"
                    color="secondary"
                    numberOfLines={2}
                    style={styles.description}
                  >
                    {description}
                  </AppText>
                )}
              </View>
            </View>
            {recommended && (
              <View style={styles.recommendedPillContainer}>
                <View style={styles.recommendedPill}>
                  <AppText style={styles.recommendedPillText}>
                    {t("common.recommended")}
                  </AppText>
                </View>
              </View>
            )}
          </Card>
        </Pressable>
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[styles.radioOverlay, animatedIndicatorOverlayStyle]}
      >
        <Animated.View style={[styles.radioContainer, animatedRadioStyle]}>
          <RadioIndicator
            size={24}
            color={isSelected ? colors.accent : colors.secondaryText}
            strokeWidth={2}
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
};
