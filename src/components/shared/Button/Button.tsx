import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { LucideIcon } from "lucide-react-native";
import { useTheme } from "@/theme";
import { createStyles } from "./Button.styles";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export type ButtonVariant = "primary" | "secondary" | "tertiary";
export type IconPlacement = "left" | "right";

export interface ButtonProps extends Omit<PressableProps, "children"> {
  label: string;
  variant: ButtonVariant;
  Icon?: LucideIcon;
  iconSize?: number;
  disabled?: boolean;
  iconPlacement?: IconPlacement; // default: left
  // Optional: customize press-in haptic intensity (default: Light)
  hapticImpact?: Haptics.ImpactFeedbackStyle;
  isLoading?: boolean;
  /**
   * Accessibility hint for screen readers (WCAG 4.1.2)
   * Provides additional context beyond the label
   * Example: "Double tap to add item to cart"
   */
  accessibilityHint?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const Button = React.memo<ButtonProps>(
  ({
    label,
    variant,
    Icon,
    iconSize = 18,
    disabled = false,
    isLoading = false,
    iconPlacement = "left",
    hapticImpact,
    accessibilityHint,
    onPress,
    onPressIn,
    onPressOut,
    style,
    ...pressableProps
  }) => {
    const { colors, theme } = useTheme();
    const styles = createStyles(colors, theme);
    const reduceMotion = useReducedMotion();

    const scale = useSharedValue(1);

    const isDisabled = disabled || isLoading;

    // Get text color based on variant
    const getTextColor = () => {
      if (isDisabled) return colors.disabledText;

      switch (variant) {
        case "primary":
          return colors.black;
        case "secondary":
          return colors.primaryText;
        case "tertiary":
          return colors.primaryText;
        default:
          return colors.primaryText;
      }
    };

    // Get background color with press state
    const getBackgroundColor = (pressed: boolean) => {
      if (isDisabled) return colors.disabledBackground;

      const baseColor = (() => {
        switch (variant) {
          case "primary":
            return colors.accent;
          case "secondary":
            return colors.secondaryBackground;
          case "tertiary":
            return colors.tertiaryBackground;
          default:
            return colors.accent;
        }
      })();

      if (pressed) {
        // Slightly darken the color when pressed
        return baseColor + "CC";
      }

      return baseColor;
    };

    const handlePressIn = useCallback(
      (event: any) => {
        if (!isDisabled) {
          // ACCESSIBILITY: Respect reduce motion preference (WCAG 2.3.3)
          if (reduceMotion) {
            scale.value = theme.interactions.press.scale; // Instant
          } else {
            scale.value = withTiming(theme.interactions.press.scale, {
              duration: theme.interactions.press.timing.duration,
              easing: theme.interactions.press.timing.easing,
            });
          }
          // Trigger configurable haptic on press-in for immediate feedback
          // Haptics preserved - they're not visual motion
          const style = hapticImpact ?? theme.interactions.haptics.light;
          Haptics.impactAsync(style);
        }
        onPressIn?.(event);
      },
      [isDisabled, onPressIn, scale, hapticImpact, reduceMotion]
    );

    const handlePressOut = useCallback(
      (event: any) => {
        if (!isDisabled) {
          // ACCESSIBILITY: Respect reduce motion preference (WCAG 2.3.3)
          if (reduceMotion) {
            scale.value = 1; // Instant
          } else {
            scale.value = withSpring(1, {
              damping: theme.interactions.press.spring.damping,
              stiffness: theme.interactions.press.spring.stiffness,
            });
          }
        }
        onPressOut?.(event);
      },
      [isDisabled, onPressOut, scale, reduceMotion]
    );

    const handlePress = useCallback(
      (event: any) => {
        if (!isDisabled) {
          onPress?.(event);
        }
      },
      [isDisabled, onPress]
    );

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const renderIcon = () => {
      if (!Icon) return null;

      return (
        <View style={styles.iconContainer}>
          <Icon size={iconSize} color={getTextColor()} />
        </View>
      );
    };

    const renderContent = () => {
      const textElement = (
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[
            styles.label,
            isDisabled
              ? styles.labelDisabled
              : variant === "primary"
              ? styles.labelPrimary
              : variant === "secondary"
              ? styles.labelSecondary
              : styles.labelTertiary,
          ]}
        >
          {label}
        </Text>
      );

      if (isLoading) {
        return (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <ActivityIndicator size="small" color={getTextColor()} />
            <View style={{ flexShrink: 1, minWidth: 0 }}>{textElement}</View>
          </View>
        );
      }

      if (!Icon) return textElement;

      return (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 1,
            minWidth: 0,
            gap: 8,
          }}
        >
          {iconPlacement === "left" ? (
            <>
              {renderIcon()}
              <View style={{ flexShrink: 1, minWidth: 0 }}>{textElement}</View>
            </>
          ) : (
            <>
              <View style={{ flexShrink: 1, minWidth: 0 }}>{textElement}</View>
              {renderIcon()}
            </>
          )}
        </View>
      );
    };

    return (
      <AnimatedPressable
        style={[animatedStyle, style]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={isDisabled}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: isDisabled, busy: isLoading || undefined }}
        {...pressableProps}
      >
        {({ pressed }) => (
          <Animated.View
            style={[
              styles.container,
              {
                backgroundColor: getBackgroundColor(pressed),
              },
            ]}
          >
            {renderContent()}
          </Animated.View>
        )}
      </AnimatedPressable>
    );
  }
);
