import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Dimensions, Platform } from "react-native";
import { BlurView } from "expo-blur";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Star, StarOff, AlertCircle } from "lucide-react-native";
import { useTheme } from "@/theme";
import { useHudStore } from "@/store/useHudStore";
import { AppText } from "@/components/shared/AppText";
import * as Haptics from "expo-haptics";

const { width: screenWidth } = Dimensions.get("window");

// iOS 26 liquid glass animation - snappier and more responsive
const SPRING_CONFIG = {
  damping: 25,
  stiffness: 350,
  mass: 0.8,
};

const SWIPE_THRESHOLD = 50;
const VELOCITY_THRESHOLD = 500;

export const HudNotification: React.FC = () => {
  const { colors, colorScheme, theme } = useTheme();
  const { isVisible, type, title, subtitle, hide } = useHudStore();
  const insets = useSafeAreaInsets();
  const isMountedRef = useRef(true);

  // Animation values - slide from top instead of scale
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-100);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Entry animation - snappier iOS 26 style slide from top
  useEffect(() => {
    if (isVisible) {
      opacity.value = withTiming(1, {
        duration: 100,
        easing: Easing.out(Easing.cubic),
      });
      translateY.value = withSpring(0, SPRING_CONFIG);
    } else {
      // Exit animation - quick fade and slide up
      opacity.value = withTiming(0, { duration: 100 });
      translateY.value = withTiming(-100, {
        duration: 120,
        easing: Easing.in(Easing.cubic),
      });
    }
  }, [isVisible]);

  // Create JS thread functions
  const handleHapticFeedback = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // Haptics not available, continue silently
    }
  };

  const handleDismiss = () => {
    if (isMountedRef.current) {
      hide();
    }
  };

  const handleDismissWithDelay = () => {
    setTimeout(() => {
      if (isMountedRef.current) {
        hide();
        // Reset animation values for next show
        opacity.value = 0;
        translateY.value = -100;
      }
    }, 150);
  };

  // Tap gesture to dismiss
  const tapGesture = Gesture.Tap().onStart(() => {
    scheduleOnRN(handleHapticFeedback);
    scheduleOnRN(handleDismiss);
  });

  // Pan gesture for swipe to dismiss - only upward swipes
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Only allow upward swipes
      if (event.translationY < 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      const shouldDismiss =
        event.translationY < -SWIPE_THRESHOLD ||
        event.velocityY < -VELOCITY_THRESHOLD;

      if (shouldDismiss) {
        // Animate off screen upward
        translateY.value = withTiming(-200, {
          duration: 120,
          easing: Easing.in(Easing.cubic),
        });
        opacity.value = withTiming(0, { duration: 100 });

        // Dismiss after animation
        scheduleOnRN(handleDismissWithDelay);
      } else {
        // Spring back to position
        translateY.value = withSpring(0, SPRING_CONFIG);
      }
    });

  // Combined gesture - use Race instead of Simultaneous to prevent conflicts
  const combinedGesture = Gesture.Race(tapGesture, panGesture);

  // Animated styles - slide from top only
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  // Get icon and colors based on type
  const getIconConfig = () => {
    const iconSize = 28;

    switch (type) {
      case "success":
        return {
          icon: (
            <Star
              size={iconSize}
              color={colors.semantic.fat}
              fill={colors.semantic.fat}
            />
          ),
          iconColor: colors.semantic.fat,
        };
      case "info":
        return {
          icon: <StarOff size={iconSize} color={colors.secondaryText} />,
          iconColor: colors.secondaryText,
        };
      case "error":
        return {
          icon: <AlertCircle size={iconSize} color={colors.error} />,
          iconColor: colors.error,
        };
      default:
        return {
          icon: <AlertCircle size={iconSize} color={colors.secondaryText} />,
          iconColor: colors.secondaryText,
        };
    }
  };

  if (!isVisible) {
    return null;
  }

  const { icon } = getIconConfig();

  const styles = createStyles(colors, colorScheme, insets, theme);

  return (
    <View style={styles.overlay}>
      <GestureDetector gesture={combinedGesture}>
        <Animated.View style={[styles.container, animatedStyle]}>
          <BlurView
            intensity={100}
            tint={colorScheme}
            style={styles.blurContainer}
          >
            <View style={styles.content}>
              <View style={styles.iconContainer}>{icon}</View>

              <View style={styles.textContainer}>
                <AppText role="Headline" style={styles.titleText}>
                  {title}
                </AppText>

                {subtitle && (
                  <AppText role="Caption" style={styles.subtitleText}>
                    {subtitle}
                  </AppText>
                )}
              </View>
            </View>
          </BlurView>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const createStyles = (
  colors: any,
  colorScheme: string,
  insets: any,
  theme: any
) => {
  // iOS 26 style spacing - reasonable distance from status bar
  const topSpacing = insets.top + theme.spacing.md; // Safe area top + 16pt

  return StyleSheet.create({
    overlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: "flex-start",
      alignItems: "center",
      zIndex: 999999,
      pointerEvents: "box-none",
      paddingTop: topSpacing,
    },
    container: {
      width: screenWidth - theme.spacing.xl, // Screen width minus horizontal margins
      maxWidth: 400,
      minHeight: 80,
      borderRadius: 20,
      // overflow: "hidden",
      // iOS 26 liquid glass subtle shadow
      shadowColor:
        colorScheme === "dark" ? "rgba(0, 0, 0, 0.4)" : "rgba(0, 0, 0, 0.15)",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 1,
      shadowRadius: 24,
      elevation: 8,
    },
    blurContainer: {
      width: "100%",
      borderRadius: 20,
      overflow: "hidden",
    },
    content: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      gap: theme.spacing.sm + 4, // 12pt spacing between icon and text
    },
    iconContainer: {
      flexShrink: 0,
    },
    textContainer: {
      flex: 1,
      flexDirection: "column",
      gap: 2,
    },
    titleText: {
      textAlign: "left",
    },
    subtitleText: {
      textAlign: "left",
      opacity: 0.85,
      lineHeight: 18,
    },
  });
};
