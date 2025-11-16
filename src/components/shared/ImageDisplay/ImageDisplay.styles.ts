import { StyleSheet } from "react-native";
import { useTheme } from "@/theme";
import type { ColorScheme, Theme } from "@/theme";

export const createStyles = (
  colors: ReturnType<typeof useTheme>["colors"],
  themeObj: Theme,
  colorScheme: ColorScheme
) => {
  const componentStyles = themeObj.getComponentStyles(colorScheme);

  return StyleSheet.create({
    container: {},
    rowContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: themeObj.spacing.md,
    },
    skeleton: {
      flex: 1,
    },
    skeletonContent: {
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
      height: "100%",
    },
    imageContainer: {
      flex: 1,
    },
    imageCard: {
      flex: 1,
      backgroundColor: "transparent",
    },
    image: {
      flex: 1,
      width: "100%",
      height: "100%",
      borderRadius: componentStyles.cards.cornerRadius,
    },
    deleteButtonContainer: {
      justifyContent: "center",
      alignItems: "center",
    },
  });
};
