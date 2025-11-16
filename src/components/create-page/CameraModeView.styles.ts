import { StyleSheet } from "react-native";
import type { Colors, Theme } from "@/theme";

export const createStyles = (colors: Colors, theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.primaryBackground,
    },
    camera: {
      ...StyleSheet.absoluteFillObject,
    },
    shutterFlash: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.white,
    },
    contentContainer: {
      position: "absolute",
      bottom: theme.spacing.sm,
      alignSelf: "center",
      padding: theme.spacing.lg,
    },
    cameraButton: {},
    libraryPreview: {
      position: "absolute",
      bottom: theme.spacing.lg,
      left: theme.spacing.lg,
    },
  });
