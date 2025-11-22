import { StyleProp, ViewStyle } from "react-native";
import { useCallback } from "react";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "@/theme";
import { createStyles } from "./MediaLibraryPreview.styles";
import { Host, Button, Image as SwiftImage } from "@expo/ui/swift-ui";
import { showPermissionDeniedAlert } from "@/lib/permissions";

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

  const handleImagePickerPress = useCallback(async () => {
    // Check permissions first
    const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();

    if (status === "denied" || status === "undetermined") {
      const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!granted) {
        showPermissionDeniedAlert("photoLibrary");
        return;
      }
    }

    ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 1,
    })
      .then((result) => {
        if (!result.canceled && result.assets[0]) {
          const asset = result.assets[0];
          console.log("Selected image asset:", {
            uri: asset.uri,
            width: asset.width,
            height: asset.height,
            type: asset.type,
            fileName: asset.fileName,
            fileSize: asset.fileSize,
            mimeType: asset.mimeType,
          });
          onImageSelected(asset.uri);
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
