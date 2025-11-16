import React, { useMemo, forwardRef } from "react";
import { View, StyleSheet, Text } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";
import type { LucideIcon, LucideProps } from "lucide-react-native";

import { RadioCard } from "@/components/shared/RadioCard/RadioCard";
import { useTheme, Colors, Theme, ColorScheme } from "@/theme";
import {
  useLocalization,
  LanguagePreference,
} from "@/context/LocalizationContext";

const createEmojiIcon = (emoji: string): LucideIcon =>
  forwardRef<any, LucideProps>(({ size = 24 }, _ref) => {
    const resolvedSize = typeof size === "number" ? size : Number(size) || 24;

    return (
      <Text
        style={{
          fontSize: resolvedSize,
          lineHeight: resolvedSize,
          textAlign: "center",
        }}
      >
        {emoji}
      </Text>
    );
  });

const DeviceIcon = createEmojiIcon("📱");
const EnglishIcon = createEmojiIcon("🇺🇸");
const GermanIcon = createEmojiIcon("🇩🇪");

export default function LanguageScreen() {
  const { t } = useTranslation();
  const { languagePreference, setLanguagePreference } = useLocalization();
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);

  const languageOptions = useMemo(
    () => [
      {
        value: "device" as LanguagePreference,
        label: t("settings.language.options.device.label"),
        subtitle: t("settings.language.options.device.subtitle"),
        icon: DeviceIcon,
      },
      {
        value: "en" as LanguagePreference,
        label: t("settings.language.options.en.label"),
        subtitle: t("settings.language.options.en.subtitle"),
        icon: EnglishIcon,
      },
      {
        value: "de" as LanguagePreference,
        label: t("settings.language.options.de.label"),
        subtitle: t("settings.language.options.de.subtitle"),
        icon: GermanIcon,
      },
    ],
    [t]
  );

  const handleSelectLanguage = (value: LanguagePreference) => {
    if (value === languagePreference) {
      return;
    }

    void setLanguagePreference(value);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {languageOptions.map((option, index) => (
          <View key={option.value} style={index > 0 && styles.cardSpacing}>
            <RadioCard
              title={option.label}
              description={option.subtitle}
              titleIcon={option.icon}
              titleIconColor={colors.secondaryText}
              isSelected={languagePreference === option.value}
              onSelect={() => handleSelectLanguage(option.value)}
              accessibilityLabel={t(
                "settings.language.accessibility.optionLabel",
                {
                  option: option.label,
                }
              )}
              accessibilityHint={option.subtitle}
            />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: Colors, theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.primaryBackground,
    },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.xxl,
    },
    cardSpacing: {
      marginTop: theme.spacing.md,
    },
  });
