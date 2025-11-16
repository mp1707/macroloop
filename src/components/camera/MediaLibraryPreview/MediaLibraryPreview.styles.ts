import { StyleSheet } from "react-native";
import type { Theme } from "@/theme";

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      position: "absolute",
      bottom: theme.spacing.lg,
      left: theme.spacing.lg,
      width: 70,
      height: 70,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.xl,
    },
  });
