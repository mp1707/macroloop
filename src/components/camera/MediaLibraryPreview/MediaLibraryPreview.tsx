import React, { useCallback, useEffect } from "react";
import { Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
} from "react-native-reanimated";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import { useTheme } from "@/theme";
import { createStyles } from "./MediaLibraryPreview.styles";

// Create animated version of expo-image Image component
const AnimatedImage = Animated.createAnimatedComponent(Image);

interface MediaLibraryPreviewProps {
  onImageSelected: (uri: string) => void;
  style?: any;
}

export const MediaLibraryPreview: React.FC<MediaLibraryPreviewProps> = ({
  onImageSelected,
  style,
}) => {
  const { colors, theme } = useTheme();
  const styles = createStyles(colors, theme);

  interface AssetWithLocalUri extends MediaLibrary.Asset {
    localUri?: string;
  }

  const [recentImages, setRecentImages] = React.useState<AssetWithLocalUri[]>([]);
  const [hasMediaPermission, setHasMediaPermission] = React.useState<boolean | null>(null);

  // Animation shared values
  const animationProgress = useSharedValue(0);
  const pressProgress = useSharedValue(0);

  const ensureMediaPermission = useCallback(async () => {
    try {
      // Check existing permission first
      const current = await MediaLibrary.getPermissionsAsync();
      const granted =
        current.granted || (current as any).accessPrivileges === "limited";

      if (granted) {
        setHasMediaPermission(true);
        return true;
      }

      // Ask for permission if not granted
      const requested = await MediaLibrary.requestPermissionsAsync();
      const isGranted =
        requested.granted || (requested as any).accessPrivileges === "limited";
      setHasMediaPermission(isGranted);
      return isGranted;
    } catch (e) {
      setHasMediaPermission(false);
      return false;
    }
  }, []);

  const fetchRecentImages = useCallback(async () => {
    try {
      const allowed = await ensureMediaPermission();
      if (!allowed) {
        // No permission — render placeholder and exit silently
        setRecentImages([]);
        return;
      }
      const { assets } = await MediaLibrary.getAssetsAsync({
        first: 1,
        sortBy: ["creationTime"],
        mediaType: MediaLibrary.MediaType.photo,
      });

      // Get localUri for each asset to enable rendering
      const assetsWithLocalUri = await Promise.all(
        assets.map(async (asset) => {
          const assetInfo = await MediaLibrary.getAssetInfoAsync(asset.id);
          return { ...asset, localUri: assetInfo.localUri };
        })
      );

      setRecentImages(assetsWithLocalUri);
      // Trigger animation immediately when images are loaded
      if (assetsWithLocalUri.length > 0) {
        animationProgress.value = withSpring(1, {
          stiffness: 200,
          damping: 25,
          mass: 0.8,
        });
      }
    } catch (error) {
      console.error("Error fetching recent images:", error);
      // Gracefully handle permission or access errors
      setRecentImages([]);
    }
  }, [animationProgress, ensureMediaPermission]);

  const handlePressIn = useCallback(() => {
    // Subtle haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    pressProgress.value = withSpring(1, {
      stiffness: 500,
      damping: 30,
    });
  }, [pressProgress]);

  const handlePressOut = useCallback(() => {
    pressProgress.value = withSpring(0, {
      stiffness: 300,
      damping: 20,
    });
  }, [pressProgress]);

  const handleImagePickerPress = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        onImageSelected(result.assets[0].uri);
        // Refresh recent images after selection
        await fetchRecentImages();
      }
    } catch (error) {
      console.error("Error launching image picker:", error);
    }
  }, [onImageSelected, fetchRecentImages]);

  // Simplified animated style for single image (memory optimized)
  const animatedStyle = useAnimatedStyle(() => {
    const scale = 1 - pressProgress.value * 0.1; // 10% smaller when pressed
    const opacity = animationProgress.value;

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  useEffect(() => {
    // Only fetch once on mount
    fetchRecentImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Pressable
      style={[styles.container, style]}
      onPress={handleImagePickerPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel="Open photo library"
    >
      {recentImages.length > 0 ? (
        <AnimatedImage
          key={recentImages[0].id}
          source={{ uri: recentImages[0].localUri || recentImages[0].uri }}
          style={[styles.stackedImage, animatedStyle]}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={recentImages[0].id}
          priority="low"
          transition={150}
        />
      ) : (
        <Animated.View style={styles.placeholder} />
      )}
    </Pressable>
  );
};
