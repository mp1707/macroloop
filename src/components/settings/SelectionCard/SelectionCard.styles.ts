import { StyleSheet } from "react-native";
import { ColorScheme, theme, Colors } from "@/theme";

export const createStyles = (colors: Colors, colorScheme: ColorScheme) => {
  const componentStyles = theme.getComponentStyles(colorScheme);
  const { typography, spacing } = theme;

  return StyleSheet.create({
    // Main card container
    card: {
      ...componentStyles.cards,
      borderRadius: componentStyles.cards.cornerRadius,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: "transparent",
    },

    // Selected state
    selectedCard: {
      backgroundColor:
        colorScheme === "dark"
          ? `${colors.accent}0D` // ~5% opacity for dark mode
          : `${colors.accent}0A`, // ~4% opacity - just a whisper for light mode
    },

    // Content container
    content: {
      flexDirection: "column",
    },

    // Header section with icon and text
    header: {
      flexDirection: "row",
      alignItems: "center",
    },

    // Icon container
    iconContainer: {
      marginRight: spacing.md,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primaryBackground,
      justifyContent: "center",
      alignItems: "center",
    },

    // Selected icon container
    selectedIconContainer: {
      backgroundColor:
        colorScheme === "dark"
          ? `${colors.accent}1A` // ~10% opacity for dark mode
          : `${colors.accent}19`, // ~10% opacity for light mode too
    },

    // Text container
    textContainer: {
      flex: 1,
    },

    // Title text
    title: {
      fontSize: typography.Headline.fontSize,
      fontFamily: typography.Headline.fontFamily,
      fontWeight: typography.Headline.fontWeight,
      color: colors.primaryText,
      marginBottom: spacing.xs / 2,
    },

    // Description text
    description: {
      fontSize: typography.Caption.fontSize,
      fontFamily: typography.Caption.fontFamily,
      color: colors.secondaryText,
      lineHeight: 20,
    },

    // Selected text states
    selectedTitle: {
      color: colors.accent,
    },

    // Daily target section
    targetSection: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: spacing.sm,
      paddingVertical: spacing.xs,
    },

    // Target label
    targetLabel: {
      fontSize: typography.Body.fontSize,
      fontFamily: typography.Body.fontFamily,
      color: colors.secondaryText,
    },

    // Target value
    targetValue: {
      fontSize: typography.Headline.fontSize,
      fontFamily: typography.Headline.fontFamily,
      fontWeight: typography.Headline.fontWeight,
      color: colors.primaryText,
    },

    // Selected target value
    selectedTargetValue: {
      color: colors.accent,
    },

    // Recommended badge container
    recommendedPillContainer: {
      position: "absolute",
      top: -12,
      left: spacing.md,
      zIndex: 10,
    },

    // Recommended badge pill
    recommendedPill: {
      height: 24,
      paddingHorizontal: spacing.sm,
      borderRadius: 12,
      backgroundColor: colors.recommendedBadge.background,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 3,
    },

    // Recommended badge text
    recommendedPillText: {
      fontSize: 11,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.4,
      color: colors.recommendedBadge.text,
    },
  });
};
