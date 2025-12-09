import React, { useEffect, useMemo, useState } from "react";
import {
  AccessibilityInfo,
  TouchableOpacity,
  ActivityIndicator,
  View,
} from "react-native";
import { Image } from "expo-image";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  interpolate,
  cancelAnimation,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/theme";
import { Card } from "@/components/Card";
import { HeaderButton } from "@/components/shared/HeaderButton";
import { createStyles } from "./ImageDisplay.styles";
import { resolveLocalImagePath } from "@/utils/fileUtils";

const AnimatedImage = Animated.createAnimatedComponent(Image);

interface ImageDisplayProps {
  imageUrl?: string;
  isUploading: boolean;
  deleteImage?: () => void;
  onExpand?: (isExpanded: boolean) => void;
  collapsedHeight?: number;
  /**
   * Accessibility label for the image (WCAG 1.1.1)
   * Describes what the image shows
   * Example: "Photo of grilled chicken salad" or "Food item photo"
   */
  imageAccessibilityLabel?: string;
}

/**
 * ImageDisplay - Displays food/meal images with expand/collapse functionality
 *
 * ACCESSIBILITY:
 * - Respects reduced motion preferences (WCAG 2.3.3)
 * - Provides text alternatives for images (WCAG 1.1.1)
 * - Images ignore color inversion for accessibility modes
 * - Loading states announced to screen readers
 * - Interactive elements have proper labels and hints
 */
export const ImageDisplay: React.FC<ImageDisplayProps> = ({
  imageUrl,
  isUploading,
  deleteImage,
  onExpand,
  collapsedHeight: collapsedHeightOverride,
  imageAccessibilityLabel,
}) => {
  const { colors, theme, colorScheme } = useTheme();
  const styles = useMemo(
    () => createStyles(colors, theme, colorScheme),
    [colors, theme, colorScheme]
  );

  const resolvedImageUrl = useMemo(
    () => resolveLocalImagePath(imageUrl),
    [imageUrl]
  );

  // Toggle state for height expansion
  const [isExpanded, setIsExpanded] = useState(false);

  // Reduced motion preference
  const [isReducedMotionEnabled, setIsReducedMotionEnabled] = useState(false);

  // Shared values for animations
  const skeletonOpacity = useSharedValue(0.3);
  const imageOpacity = useSharedValue(0);
  const pressScale = useSharedValue(1);
  const trashButtonOpacity = useSharedValue(0);
  const collapsedHeight = collapsedHeightOverride ?? 100;
  const expandedHeight = Math.max(collapsedHeight * 2.4, collapsedHeight + 120);
  const containerHeight = useSharedValue(collapsedHeight);
  const imageWrapperWidth = useSharedValue(50);

  // Check for reduced motion preference
  useEffect(() => {
    const checkReducedMotion = async () => {
      const reduceMotionEnabled =
        await AccessibilityInfo.isReduceMotionEnabled();
      setIsReducedMotionEnabled(reduceMotionEnabled);
    };

    checkReducedMotion();

    // Listen for changes to reduced motion preference
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setIsReducedMotionEnabled
    );

    return () => {
      subscription.remove();
      // Cancel all animations on unmount to free resources
      cancelAnimation(skeletonOpacity);
      cancelAnimation(imageOpacity);
      cancelAnimation(pressScale);
      cancelAnimation(trashButtonOpacity);
      cancelAnimation(containerHeight);
      cancelAnimation(imageWrapperWidth);
    };
  }, [
    skeletonOpacity,
    imageOpacity,
    pressScale,
    trashButtonOpacity,
    containerHeight,
    imageWrapperWidth,
  ]);

  // Skeleton pulsing animation
  useEffect(() => {
    if (isUploading && !isReducedMotionEnabled) {
      skeletonOpacity.value = withRepeat(
        withTiming(0.7, { duration: 1000 }),
        -1,
        true
      );
    } else {
      cancelAnimation(skeletonOpacity);
      skeletonOpacity.value = isReducedMotionEnabled ? 0.5 : 0.3;
    }
  }, [isUploading, isReducedMotionEnabled, skeletonOpacity]);

  // Image entrance animation
  useEffect(() => {
    const duration = isReducedMotionEnabled ? 0 : 400;
    const exitDuration = isReducedMotionEnabled ? 0 : 200;

    if (resolvedImageUrl && !isUploading) {
      imageOpacity.value = withTiming(1, { duration });
    } else {
      imageOpacity.value = withTiming(0, { duration: exitDuration });
    }
  }, [resolvedImageUrl, isUploading, isReducedMotionEnabled, imageOpacity]);

  // Height and width toggle animation
  useEffect(() => {
    const animationConfig = {
      duration: isReducedMotionEnabled ? 0 : 180,
      easing: Easing.inOut(Easing.cubic),
    };

    if (isExpanded) {
      containerHeight.value = withTiming(expandedHeight, animationConfig);
      imageWrapperWidth.value = withTiming(100, animationConfig);
    } else {
      containerHeight.value = withTiming(collapsedHeight, animationConfig);
      imageWrapperWidth.value = withTiming(50, animationConfig);
    }
  }, [
    collapsedHeight,
    expandedHeight,
    isExpanded,
    isReducedMotionEnabled,
    containerHeight,
    imageWrapperWidth,
  ]);

  // Trash button visibility animation
  useEffect(() => {
    const shouldShow =
      deleteImage && resolvedImageUrl && !isUploading && !isExpanded;
    const duration = isReducedMotionEnabled ? 0 : 200;

    trashButtonOpacity.value = withTiming(shouldShow ? 1 : 0, { duration });
  }, [
    deleteImage,
    resolvedImageUrl,
    isUploading,
    isExpanded,
    isReducedMotionEnabled,
    trashButtonOpacity,
  ]);

  // Press handlers
  const handlePressIn = () => {
    if (isReducedMotionEnabled) {
      pressScale.value = 1;
      return;
    }

    pressScale.value = withTiming(0.98, {
      duration: 120,
      easing: Easing.out(Easing.ease),
    });
  };

  const handlePressOut = () => {
    if (isReducedMotionEnabled) {
      pressScale.value = 1;
      return;
    }

    pressScale.value = withTiming(1, {
      duration: 120,
      easing: Easing.out(Easing.ease),
    });
  };

  const handlePress = () => {
    Haptics.selectionAsync();
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);
    onExpand?.(newExpandedState);
  };

  // Animated styles
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    height: containerHeight.value,
    transform: [{ scale: pressScale.value }],
  }));

  const skeletonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(skeletonOpacity.value, [0.3, 0.7], [0.3, 0.7]),
  }));

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
  }));

  const imageWrapperAnimatedStyle = useAnimatedStyle(() => ({
    width: `${imageWrapperWidth.value}%`,
  }));

  const trashButtonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: trashButtonOpacity.value,
  }));

  const canInteract = resolvedImageUrl && !isUploading;
  const shouldShowTrash =
    deleteImage && resolvedImageUrl && !isUploading && !isExpanded;

  const content = (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      <Animated.View style={styles.rowContainer}>
        <View
          style={styles.imageContainer}
          // ACCESSIBILITY: Announce loading state (WCAG 4.1.3)
          accessible={isUploading}
          accessibilityRole={isUploading ? "progressbar" : undefined}
          accessibilityLabel={isUploading ? "Uploading image" : undefined}
          accessibilityValue={
            isUploading
              ? { text: "Loading", now: 0, min: 0, max: 100 }
              : undefined
          }
        >
          <Card padding={0} style={styles.imageCard}>
            {isUploading || !resolvedImageUrl ? (
              <ActivityIndicator
                size="large"
                color={colors.white}
                style={styles.image}
                // ACCESSIBILITY: Hide ActivityIndicator from screen readers
                // (parent View announces loading state)
                importantForAccessibility="no-hide-descendants"
              />
            ) : (
              <AnimatedImage
                source={{ uri: resolvedImageUrl }}
                style={[styles.image, imageAnimatedStyle]}
                contentFit="cover"
                cachePolicy="memory-disk"
                recyclingKey={resolvedImageUrl}
                priority="low"
                // ACCESSIBILITY: Text alternative for image (WCAG 1.1.1)
                accessible={true}
                accessibilityLabel={
                  imageAccessibilityLabel || "Food or meal photo"
                }
                accessibilityRole="image"
                // ACCESSIBILITY: Don't invert colors for photos (iOS)
                accessibilityIgnoresInvertColors={true}
              />
            )}
          </Card>
        </View>
        {deleteImage && (
          <Animated.View
            style={[styles.deleteButtonContainer, trashButtonAnimatedStyle]}
            pointerEvents={shouldShowTrash ? "auto" : "none"}
          >
            <HeaderButton
              variant="colored"
              buttonProps={{
                onPress: deleteImage,
                color: colors.errorBackground,
                variant: "glassProminent",
              }}
              imageProps={{
                systemName: "trash",
                color: colors.error,
              }}
            />
          </Animated.View>
        )}
      </Animated.View>
    </Animated.View>
  );

  // Always wrap content with imageWrapperAnimatedStyle for consistent sizing
  if (canInteract) {
    return (
      <Animated.View style={imageWrapperAnimatedStyle}>
        <TouchableOpacity
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
          accessibilityRole="button"
          accessibilityLabel={`${
            isExpanded ? "Collapse" : "Expand"
          } image view`}
          accessibilityHint="Double tap to toggle image size"
        >
          {content}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Apply the same width wrapper to non-interactive states (loading)
  return (
    <Animated.View style={imageWrapperAnimatedStyle}>{content}</Animated.View>
  );
};
