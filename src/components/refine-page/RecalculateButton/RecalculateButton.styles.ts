import { StyleSheet } from "react-native";
import type { Colors, Theme } from "@/theme";

export const createStyles = (colors: Colors, theme: Theme) =>
  StyleSheet.create({
    button: {
      height: theme.components.aiActionTargets.height,
      borderRadius: theme.components.aiActionTargets.height / 2, // Pill shape
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 4,
    },
    buttonText: {
      fontSize: theme.typography.Headline.fontSize,
      fontWeight: "600",
      color: colors.primaryText,
    },
  });
