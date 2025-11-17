import { StyleSheet } from "react-native";
import type { ColorScheme, Colors, Theme } from "@/theme";
import { CREATE_ACCESSORY_HEIGHT } from "@/constants/create";

export const createStyles = (
  theme: Theme,
  colors: Colors,
  colorScheme: ColorScheme
) =>
  StyleSheet.create({
    container: {
      gap: theme.spacing.lg,
    },
    textInputContainer: {
      paddingHorizontal: theme.spacing.lg,
    },
    textInputField: {},
    sectionHeading: {
      textTransform: "uppercase",
      letterSpacing: 0.6,
      paddingHorizontal: theme.spacing.lg,
      color: colors.secondaryText,
    },
    accessorySection: {
      gap: theme.spacing.xs,
    },
    accessorySlot: {
      minHeight: CREATE_ACCESSORY_HEIGHT,
      justifyContent: "center",
    },
    recordingContent: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
    },
    waveform: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      flex: 1,
      height: CREATE_ACCESSORY_HEIGHT,
    },
    waveformBar: {
      width: 5,
      borderRadius: theme.spacing.xs,
      marginHorizontal: 4,
      backgroundColor: colors.accent,
    },
  });
