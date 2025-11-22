import { StyleSheet } from "react-native";
import type { ColorScheme, Colors, Theme } from "@/theme";

export const createStyles = (
  theme: Theme,
  colors: Colors,
  colorScheme: ColorScheme
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        colorScheme === "dark"
          ? colors.primaryBackground
          : colors.tertiaryBackground,
    },
    headerContainer: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerInfoButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      flexShrink: 1,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.xs,
    },
    headerInfoButtonPressed: {
      opacity: 0.6,
    },
    headerTitle: {
      color: colors.primaryText,
      flexShrink: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: theme.spacing.xxl,
      paddingTop: theme.spacing.lg,
      flexGrow: 1,
    },
    content: {
      gap: theme.spacing.lg,
      flexGrow: 1,
    },
    textInputContainer: {
      paddingHorizontal: theme.spacing.lg,
    },
    textInputField: {},
    favoritesSection: {
      gap: theme.spacing.sm,
    },
    favoritesListOffsetFix: {
      marginTop: -theme.spacing.xl,
    },
    heading: {
      color: colors.secondaryText,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      paddingHorizontal: theme.spacing.lg,
    },
    favoritesListContent: {
      paddingVertical: theme.spacing.xl,
      paddingRight: theme.spacing.xl,
      paddingLeft: theme.spacing.sm,
    },
    favoriteSeparator: {
      width: theme.spacing.sm,
    },
    imageSection: {
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      flex: 1,
    },
    paywallContainer: {
      flex: 1,
      justifyContent: "center",
      paddingBottom: theme.spacing.xl,
      paddingHorizontal: theme.spacing.lg,
    },
    centerContent: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.primaryBackground,
    },
  });
