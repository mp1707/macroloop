import { StyleSheet } from "react-native";
import type { useTheme } from "@/theme";

type Colors = ReturnType<typeof useTheme>["colors"];
type Theme = ReturnType<typeof useTheme>["theme"];

export const createStyles = (colors: Colors, theme: Theme) => {
  const { spacing } = theme;

  return StyleSheet.create({
    wrapper: {
      position: "relative",
      width: "100%",
    },
    card: {
      position: "relative",
    },
    container: {
      flexDirection: "row",
      gap: spacing.lg,
    },
    radioContainer: {
      width: 24,
      height: 24,
      justifyContent: "center",
      alignItems: "center",
    },
    radioOverlay: {
      position: "absolute",
      left: theme.spacing.lg,
      top: theme.spacing.md,
      bottom: theme.spacing.md,
      width: 24,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1,
    },
    radioGutter: {
      width: 24,
      flexShrink: 0,
    },
    content: {
      flex: 1,
      gap: spacing.xs / 2,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.xs,
    },
    titleWithIcon: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      flex: 1,
    },
    trailingContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      flexShrink: 0,
    },
    factorBadge: {
      flexShrink: 0,
    },
    recommendedPillContainer: {
      position: "absolute",
      top: -12,
      left: spacing.md,
    },
    recommendedPill: {
      flexDirection: "row",
      alignItems: "center",
      height: 24,
      paddingHorizontal: spacing.sm,
      borderRadius: 12,
      backgroundColor: colors.recommendedBadge.background,
      shadowOpacity: 0.15,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    recommendedPillText: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.recommendedBadge.text,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    description: {
      lineHeight: 18,
    },
  });
};
