import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/theme/ThemeProvider";
import { HeaderButton } from "@/components/shared/HeaderButton";
import { MediaLibraryPreview } from "@/components/camera/MediaLibraryPreview";
import { createStyles } from "./CameraModeView.styles";

interface CameraModeViewProps {
  onImageSelected: (uri: string) => void;
}

export const CameraModeView = ({ onImageSelected }: CameraModeViewProps) => {
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);
  const cameraRef = useRef<CameraView>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  // Shutter animation
  const shutterOpacity = useSharedValue(0);

  // Camera permissions
  const [permission, requestPermission] = useCameraPermissions();

  // Request camera permissions on mount if not granted
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const takePicture = useCallback(async () => {
    if (!isCameraReady || !cameraRef.current) return;

    // Play shutter animation and haptics
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    shutterOpacity.value = withSequence(
      withTiming(0.9, { duration: 100 }),
      withTiming(0, { duration: 100 })
    );

    const image = await cameraRef.current.takePictureAsync();
    if (image?.uri) {
      onImageSelected(image.uri);
    }
  }, [isCameraReady, onImageSelected, shutterOpacity]);

  // Cleanup camera memory on unmount
  useEffect(() => {
    return () => {
      // Clear image memory cache when leaving camera to free up memory
      Image.clearMemoryCache();
    };
  }, []);

  const shutterStyle = useAnimatedStyle(() => ({
    opacity: shutterOpacity.value,
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(200)}
      style={styles.container}
    >
      <CameraView
        key={permission?.granted ? "camera-granted" : "camera-waiting"}
        style={styles.camera}
        ref={cameraRef}
        onCameraReady={() => setIsCameraReady(true)}
      />

      {/* Shutter flash overlay */}
      <Animated.View
        style={[styles.shutterFlash, shutterStyle]}
        pointerEvents="none"
      />

      <View style={styles.contentContainer}>
        <HeaderButton
          size="large"
          variant="regular"
          buttonProps={{
            onPress: takePicture,
            color: colors.white,
          }}
          imageProps={{
            systemName: "circle.fill",
            color: colors.accent,
          }}
        />
      </View>

      <MediaLibraryPreview
        onImageSelected={onImageSelected}
        style={styles.libraryPreview}
      />
    </Animated.View>
  );
};
