import { Colors, Theme } from "@/theme/theme";
import { StyleSheet } from "react-native";

export const createStyles = (colors: Colors, theme: Theme) =>
  StyleSheet.create({
    container: {},
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
    },
    headerTitle: {
      color: colors.primaryText,
    },
    dateButton: {
      minHeight: 44,
      justifyContent: "center",
    },
    dateButtonPressed: {
      opacity: 0.6,
    },
  });
