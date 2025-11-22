import { StyleSheet } from "react-native";
import type { Colors, Theme } from "@/theme";

export const createStyles = (colors: Colors, theme: Theme) =>
  StyleSheet.create({
    container: {
      // Section container (no card wrapper)
    },
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    sectionHeader: {
      flex: 1,
      letterSpacing: 0.6,
      color: colors.secondaryText,
    },
    sectionHeaderAction: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      flexShrink: 0,
      gap: theme.spacing.xs,
    },
    listContainer: {
      backgroundColor: colors.primaryBackground,
      borderRadius: theme.components.cards.cornerRadius,
      // overflow: "hidden",
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.subtleBorder,
      // Full-bleed within content column - no margin offset
    },
    componentRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: 56, // 7 × 8pt for native feel
    },
    solidBackgroundForSwipe: {
      backgroundColor: colors.primaryBackground,
      paddingVertical: theme.spacing.md,
      paddingRight: theme.spacing.md,
      marginRight: -theme.spacing.md,
    },
    componentExpandContainer: {
      flexDirection: "row",
    },
    leftColumn: {
      flex: 1,
      minWidth: 0,
    },
    rightColumn: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      marginRight: theme.spacing.sm,
      flexShrink: 0,
    },
    deleteAction: {
      backgroundColor: colors.error,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: theme.spacing.lg,
      marginVertical: theme.spacing.xs,
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    addRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: theme.spacing.sm,
      alignSelf: "flex-end",
      paddingTop: theme.spacing.md,
      minHeight: 56,
      backgroundColor: colors.primaryBackground,
    },
    addLabel: {},
    componentName: {
      flex: 1,
      flexShrink: 1,
      minWidth: 0,
    },
    amountText: {
      marginRight: theme.spacing.sm,
    },
    namePressable: {
      width: "100%",
      minWidth: 0,
    },
    expansionContent: {
      padding: theme.spacing.md,
      gap: theme.spacing.md,
    },
    estimateLine: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    estimateTextColumn: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    estimateConversionRow: {
      flexDirection: "row",
      alignItems: "baseline",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    },
    estimateValueText: {
      color: colors.primaryText,
      fontWeight: "600",
    },
    approxSymbol: {
      color: colors.secondaryText,
    },
    buttonRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.md,
    },
    acceptPill: {
      minHeight: 40,
      paddingHorizontal: theme.spacing.md,
      borderRadius: 20,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    acceptPillText: {
      color: colors.black,
      fontSize: theme.typography.Body.fontSize,
      fontWeight: "600",
    },
    editTextButton: {
      paddingVertical: theme.spacing.xs,
    },
    editTextButtonLabel: {
      color: colors.secondaryText,
      fontSize: theme.typography.Body.fontSize,
    },
  });
