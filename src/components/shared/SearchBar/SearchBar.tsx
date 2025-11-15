import React, { useState } from "react";
import { View, PixelRatio, TouchableOpacity, TextInput } from "react-native";
import { Search, X } from "lucide-react-native";
import { useTheme } from "@/theme";
import { Card } from "@/components/Card";

interface SearchBarProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder,
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
      accessibilityRole="search"
      accessible
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
          accessibilityLabel="Search"
          accessibilityHint="Enter text to filter the list"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          keyboardAppearance={colorScheme}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
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
          >
            <X size={14} color={colors.primaryText} strokeWidth={1.5} />
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
};
