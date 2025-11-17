import { StyleSheet } from "react-native";
import type { Colors, ColorScheme, Theme, Typography } from "@/theme";

export const createStyles = (colors: Colors, theme: Theme) => {
  const { typography } = theme;
  return StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 9999,
      paddingVertical: 12,
      paddingHorizontal: 16,
      minHeight: 44, // Meet WCAG 2.5.8 minimum touch target (44pt)
      flexShrink: 1, // ✅ allow button to shrink if needed
      minWidth: 0, // ✅ required so child text can ellipsize
    },
    primary: {
      backgroundColor: colors.accent,
    },
    secondary: {
      backgroundColor: colors.secondaryBackground,
    },
    tertiary: {
      backgroundColor: colors.subtleBackground,
    },
    disabled: {
      backgroundColor: colors.disabledBackground,
    },
    label: {
      ...typography.Button,
      // Let React Native handle font scaling via Text's allowFontScaling prop
      // Manual scaling causes double-scaling (fontSize * scale²)
      textAlign: "center",
      flexShrink: 1,
      minWidth: 0,
    },
    labelPrimary: {
      color: colors.black,
    },
    labelSecondary: {
      color: colors.primaryText,
    },
    labelTertiary: {
      color: colors.primaryText,
    },
    labelDisabled: {
      color: colors.disabledText,
    },
    iconContainer: {
      flexShrink: 0,
    },
  });
};
