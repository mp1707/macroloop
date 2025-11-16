import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import type { Theme } from "@/theme";
import { ImageDisplay } from "@/components/shared/ImageDisplay";

interface ImageSectionProps {
  imageUrl: string | undefined;
  isProcessing: boolean;
  onRemoveImage: () => void;
  collapsedHeight?: number;
}

export const ImageSection = ({
  imageUrl,
  isProcessing,
  onRemoveImage,
  collapsedHeight,
}: ImageSectionProps) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.imageSection}>
      <ImageDisplay
        imageUrl={imageUrl}
        isUploading={isProcessing}
        deleteImage={onRemoveImage}
        collapsedHeight={collapsedHeight}
      />
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    imageSection: {
      paddingHorizontal: theme.spacing.lg,
      flex: 1,
      justifyContent: "center",
      overflow: "visible",
      marginVertical: -theme.spacing.xl,
    },
  });
