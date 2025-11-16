import React, { useState } from "react";
import { View, PixelRatio, TouchableOpacity, TextInput } from "react-native";
import { Search, X } from "lucide-react-native";
import { useTheme } from "@/theme";
import { Card } from "@/components/Card";

interface SearchBarProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  /**
   * Accessibility label for screen readers (WCAG 4.1.2)
   * Default: "Search"
   */
  accessibilityLabel?: string;
  /**
   * Accessibility hint for screen readers (WCAG 4.1.2)
   * Default: "Enter text to filter the list"
   */
  accessibilityHint?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder,
  accessibilityLabel = "Search",
  accessibilityHint = "Enter text to filter the list",
}) => {
  const { colors, theme, colorScheme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const fontScale = PixelRatio.getFontScale();
  const baseHeight = 40;
  const scaledHeight = Math.max(44, baseHeight * fontScale);
  const containerPadding = 2;

  return (
    <Card
      elevated
      padding={0}
      style={{
        width: "100%",
        borderRadius: theme.components.cards.cornerRadius,
        borderWidth: 2,
        borderColor: isFocused ? colors.accent : "transparent",
        backgroundColor: colors.secondaryBackground,
      }}
      accessible={false} // Let TextInput handle accessibility
    >
      <View
        style={{
          position: "relative",
          paddingHorizontal: theme.spacing.md,
          minHeight: scaledHeight,
          justifyContent: "center",
        }}
      >
        <View
          style={{
            position: "absolute",
            left: theme.spacing.md,
            top: "50%",
            transform: [{ translateY: -9 }],
            zIndex: 1,
          }}
        >
          <Search size={18} color={colors.secondaryText} strokeWidth={1.5} />
        </View>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder || "Search"}
          placeholderTextColor={colors.secondaryText}
          // Accessibility props (WCAG 4.1.2)
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
          accessibilityRole="search"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          keyboardAppearance={colorScheme}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          // Font scaling (WCAG 1.4.4)
          allowFontScaling={true}
          maxFontSizeMultiplier={theme.accessibility.textScaling.maximum}
          style={{
            paddingLeft: theme.spacing.lg + theme.spacing.sm,
            paddingRight: value
              ? theme.spacing.lg + theme.spacing.sm
              : theme.spacing.md,
            backgroundColor: "transparent",
            borderWidth: 0,
            minHeight: scaledHeight - containerPadding * 2,
            fontFamily: theme.typography.Body.fontFamily,
            fontSize: theme.typography.Body.fontSize,
            fontWeight: theme.typography.Body.fontWeight,
            color: colors.primaryText,
            textAlignVertical: "center",
          }}
        />
        {value && (
          <TouchableOpacity
            onPress={() => onChange("")}
            style={{
              position: "absolute",
              right: theme.spacing.md,
              top: "50%",
              transform: [{ translateY: -12 }],
              backgroundColor: colors.subtleBackground,
              borderRadius: 12,
              width: 24,
              height: 24,
              justifyContent: "center",
              alignItems: "center",
            }}
            accessibilityLabel="Clear search"
            accessibilityRole="button"
            accessibilityHint="Clears the search text"
            hitSlop={10} // Larger touch target for accessibility (WCAG 2.5.8)
          >
            <X size={14} color={colors.primaryText} strokeWidth={1.5} />
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
};
