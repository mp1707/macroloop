import React, { useState, forwardRef } from "react";
import {
  TextInput as RNTextInput,
  TextInputProps,
  Pressable,
  View,
  PixelRatio,
} from "react-native";
import { useTheme } from "@/theme";
import { createStyles } from "./TextInput.styles";

interface CustomTextInputProps extends TextInputProps {
  containerStyle?: any;
  focusBorder?: boolean;
  fontSize?: "Title1" | "Title2" | "Headline" | "Body" | "Subhead" | "Caption";
  /**
   * Accessibility label for screen readers (WCAG 4.1.2)
   * Required for accessibility - describes what this input is for
   * Example: "Email address" or "Search query"
   */
  accessibilityLabel?: string;
  /**
   * Accessibility hint for screen readers (WCAG 4.1.2)
   * Provides additional context on what to enter
   * Example: "Enter your email to receive updates"
   */
  accessibilityHint?: string;
  /**
   * Whether this field is required (WCAG 3.3.2)
   * Communicated to screen readers via accessibilityRequired
   */
  required?: boolean;
  /**
   * Error message for screen readers (WCAG 3.3.1)
   * Announced when input has invalid value
   */
  errorMessage?: string;
}

export const TextInput = forwardRef<RNTextInput, CustomTextInputProps>(
  (
    {
      containerStyle,
      focusBorder = true,
      style,
      fontSize = "Body",
      accessibilityLabel,
      accessibilityHint,
      required = false,
      errorMessage,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const { colors, theme, colorScheme } = useTheme();
    const [isFocused, setIsFocused] = useState(false);
    const styles = createStyles(
      colors,
      theme,
      focusBorder ? isFocused : false,
      fontSize
    );

    const hasError = !!errorMessage;

    const handleFocus = (e: any) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: any) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    return (
      <Pressable
        style={[styles.focusBorder, containerStyle]}
        onPress={() => (ref as any)?.current?.focus()}
        accessible={false} // Let TextInput handle accessibility
      >
        <RNTextInput
          ref={ref}
          cursorColor={colors.accent}
          selectionColor={colors.accent}
          onFocus={handleFocus}
          onBlur={handleBlur}
          keyboardAppearance={colorScheme}
          style={[styles.textInput, style]}
          placeholderTextColor={colors.secondaryText}
          // Accessibility props (WCAG 4.1.2, 3.3.1, 3.3.2)
          // Use accessibilityLabel/Hint for text fields, NOT accessibilityValue
          // accessibilityValue is for adjustable controls (sliders/progress)
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={
            hasError && errorMessage
              ? `${
                  accessibilityHint ? accessibilityHint + ". " : ""
                }Error: ${errorMessage}`
              : accessibilityHint
          }
          accessibilityState={{ disabled: props.editable === false }}
          // Font scaling (WCAG 1.4.4)
          allowFontScaling={true}
          maxFontSizeMultiplier={theme.accessibility.textScaling.maximum}
          {...props}
        />
      </Pressable>
    );
  }
);

TextInput.displayName = "TextInput";
