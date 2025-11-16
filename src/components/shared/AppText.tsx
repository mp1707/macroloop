import { useTheme } from "@/theme/ThemeProvider";
import React from "react";
import {
  Text,
  TextProps,
  TextStyle,
  AccessibilityRole,
  PixelRatio,
} from "react-native";

export type TypographyRole =
  | "Title1"
  | "Title2"
  | "Headline"
  | "Body"
  | "Subhead"
  | "Caption"
  | "Button";

interface AppTextProps extends Omit<TextProps, "role"> {
  role?: TypographyRole;
  color?: "primary" | "secondary" | "accent" | "white" | "disabled";
  children: React.ReactNode;
  /**
   * Override the default accessibility role mapping
   * By default, Title1 = header, Title2 = header, others = text
   */
  accessibilityRole?: AccessibilityRole;
  /**
   * Accessibility label for screen readers
   * If not provided, uses children as text content
   */
  accessibilityLabel?: string;
  /**
   * Whether this text is a heading (alternative to accessibilityRole)
   * Useful for semantic structure with screen readers
   */
  isHeading?: boolean;
  /**
   * Enable dynamic text scaling (WCAG 1.4.4)
   * Default: true
   */
  allowFontScaling?: boolean;
  /**
   * Maximum font size multiplier when scaling
   * Default: theme.accessibility.textScaling.maximum (2.0)
   */
  maxFontSizeMultiplier?: number;
}

export const AppText: React.FC<AppTextProps> = ({
  role = "Body",
  color,
  style,
  children,
  accessibilityRole,
  accessibilityLabel,
  isHeading,
  allowFontScaling = true,
  maxFontSizeMultiplier,
  ...props
}) => {
  const { colors, theme } = useTheme();

  // Get typography style for the role
  const typographyStyle = theme.typography[role];

  // Determine text color
  let textColor: string;
  if (color) {
    switch (color) {
      case "primary":
        textColor = colors.primaryText;
        break;
      case "secondary":
        textColor = colors.secondaryText;
        break;
      case "accent":
        textColor = colors.accent;
        break;
      case "white":
        textColor = colors.white;
        break;
      case "disabled":
        textColor = colors.disabledText;
        break;
      default:
        textColor = colors.primaryText;
    }
  } else {
    // Default color based on role
    if (role === "Subhead" || role === "Caption") {
      textColor = colors.secondaryText;
    } else {
      textColor = colors.primaryText;
    }
  }

  // Map typography role to accessibility role (WCAG 1.3.1 - Info and Relationships)
  // This helps screen readers understand document structure
  const getAccessibilityRole = (): AccessibilityRole => {
    if (accessibilityRole) return accessibilityRole;
    if (isHeading) return "header";

    switch (role) {
      case "Title1":
      case "Title2":
        return "header"; // Semantic heading for screen readers
      case "Button":
        return "button"; // If text is styled like a button
      default:
        return "text"; // Default for body text, captions, etc.
    }
  };

  // Calculate scaled font size for accessibility (WCAG 1.4.4)
  // Respects user's text size preferences
  const getScaledFontSize = (): number => {
    if (!allowFontScaling) return typographyStyle.fontSize;

    const fontScale = PixelRatio.getFontScale();
    const scaledSize = typographyStyle.fontSize * fontScale;

    // Cap at maximum multiplier to prevent layout breakage
    const maxSize =
      typographyStyle.fontSize *
      (maxFontSizeMultiplier ?? theme.accessibility.textScaling.maximum);

    return Math.min(scaledSize, maxSize);
  };

  const textStyle: TextStyle = {
    fontFamily: typographyStyle.fontFamily,
    fontSize: getScaledFontSize(),
    fontWeight: typographyStyle.fontWeight,
    color: textColor,
  };

  return (
    <Text
      style={[textStyle, style]}
      accessibilityRole={getAccessibilityRole()}
      accessibilityLabel={accessibilityLabel}
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={
        maxFontSizeMultiplier ?? theme.accessibility.textScaling.maximum
      }
      {...props}
    >
      {children}
    </Text>
  );
};
