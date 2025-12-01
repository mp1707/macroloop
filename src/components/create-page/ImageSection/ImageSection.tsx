import { useMemo, useState } from "react";
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
  const [isExpanded, setIsExpanded] = useState(false);
  const styles = useMemo(
    () => createStyles(theme, isExpanded),
    [theme, isExpanded]
  );

  return (
    <View style={styles.imageSection}>
      <ImageDisplay
        imageUrl={imageUrl}
        isUploading={isProcessing}
        deleteImage={onRemoveImage}
        collapsedHeight={collapsedHeight}
        onExpand={setIsExpanded}
      />
    </View>
  );
};

const createStyles = (theme: Theme, isExpanded: boolean) =>
  StyleSheet.create({
    imageSection: {
      paddingHorizontal: theme.spacing.lg,
      flex: 1,
      justifyContent: "center",
      overflow: "visible",
      marginTop: isExpanded ? 0 : -theme.spacing.xl,
      marginBottom: isExpanded ? 0 : -theme.spacing.xl,
    },
  });
