import React, { useEffect, useMemo, useState } from "react";
import { AccessibilityInfo, TouchableOpacity, ActivityIndicator } from "react-native";
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

interface ImageDisplayProps {
  imageUrl?: string;
  isUploading: boolean;
  deleteImage?: () => void;
  onExpand?: (isExpanded: boolean) => void;
  collapsedHeight?: number;
}

export const ImageDisplay: React.FC<ImageDisplayProps> = ({
  imageUrl,
  isUploading,
  deleteImage,
  onExpand,
  collapsedHeight: collapsedHeightOverride,
}) => {
  const { colors, theme, colorScheme } = useTheme();
  const styles = useMemo(
    () => createStyles(colors, theme, colorScheme),
    [colors, theme, colorScheme]
  );

  // Toggle state for height expansion
  const [isExpanded, setIsExpanded] = useState(false);

  // Reduced motion preference
  const [isReducedMotionEnabled, setIsReducedMotionEnabled] = useState(false);

  // Shared values for animations
  const skeletonOpacity = useSharedValue(0.3);
  const imageOpacity = useSharedValue(0);
  const imageScale = useSharedValue(0.95);
  const pressScale = useSharedValue(1);
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
      cancelAnimation(imageScale);
      cancelAnimation(pressScale);
      cancelAnimation(containerHeight);
      cancelAnimation(imageWrapperWidth);
    };
  }, [
    skeletonOpacity,
    imageOpacity,
    imageScale,
    pressScale,
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

    if (imageUrl && !isUploading) {
      imageOpacity.value = withTiming(1, { duration });
      imageScale.value = withTiming(1, { duration });
    } else {
      imageOpacity.value = withTiming(0, { duration: exitDuration });
      imageScale.value = withTiming(0.95, { duration: exitDuration });
    }
  }, [imageUrl, isUploading, isReducedMotionEnabled, imageOpacity, imageScale]);

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
    transform: [{ scale: imageScale.value }],
  }));

  const imageWrapperAnimatedStyle = useAnimatedStyle(() => ({
    width: `${imageWrapperWidth.value}%`,
  }));

  // Don't render anything if no image and not uploading
  if (!imageUrl && !isUploading) {
    return null;
  }

  const canInteract = imageUrl && !isUploading;

  const content = (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      <Animated.View style={styles.rowContainer}>
        {isUploading && (
          <Animated.View style={styles.imageContainer}>
            <Card padding={0} style={styles.imageCard}>
              <Animated.View style={[styles.skeleton, styles.skeletonContent, skeletonAnimatedStyle]}>
                <ActivityIndicator size="large" color={colors.white} />
              </Animated.View>
            </Card>
          </Animated.View>
        )}

        {imageUrl && !isUploading && (
          <Animated.View style={[styles.imageContainer, imageAnimatedStyle]}>
            <Card padding={0} style={styles.imageCard}>
              <Image
                source={{ uri: imageUrl }}
                style={styles.image}
                contentFit="cover"
                cachePolicy="memory-disk"
                recyclingKey={imageUrl}
                priority="low"
                transition={200}
              />
            </Card>
          </Animated.View>
        )}

        {deleteImage && imageUrl && !isUploading && !isExpanded && (
          <Animated.View style={styles.deleteButtonContainer}>
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

  return (
    <Animated.View style={imageWrapperAnimatedStyle}>{content}</Animated.View>
  );
};
