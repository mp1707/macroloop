import { StyleSheet } from "react-native";
import { Colors, Theme } from "@/theme";

export const createStyles = (theme: Theme, colors: Colors) =>
  StyleSheet.create({
    container: {
      gap: theme.spacing.sm,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    label: {
      letterSpacing: 0.6,
      color: colors.secondaryText,
      textTransform: "uppercase",
    },
    value: {
      color: colors.primaryText,
      fontWeight: "600",
    },
    sliderContainer: {
      paddingHorizontal: theme.spacing.sm,
    },
  });
