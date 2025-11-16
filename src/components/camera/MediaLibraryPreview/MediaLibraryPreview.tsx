import { StyleProp, ViewStyle } from "react-native";
import { useCallback } from "react";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "@/theme";
import { createStyles } from "./MediaLibraryPreview.styles";
import { Host, Button, Image as SwiftImage } from "@expo/ui/swift-ui";

interface MediaLibraryPreviewProps {
  onImageSelected: (uri: string) => void;
  style?: StyleProp<ViewStyle>;
}

export const MediaLibraryPreview = ({
  onImageSelected,
  style,
}: MediaLibraryPreviewProps) => {
  const { colors, theme } = useTheme();
  const styles = createStyles(theme);

  const handleImagePickerPress = useCallback(() => {
    ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    })
      .then((result) => {
        if (!result.canceled && result.assets[0]) {
          onImageSelected(result.assets[0].uri);
        }
      })
      .catch((error) => {
        console.error("Error launching image picker:", error);
      });
  }, [onImageSelected]);

  return (
    <Host matchContents style={[styles.container, style]}>
      <Button
        variant="glass"
        controlSize="large"
        onPress={handleImagePickerPress}
      >
        <SwiftImage systemName="photo" color={colors.primaryText} />
      </Button>
    </Host>
  );
};
