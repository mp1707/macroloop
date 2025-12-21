import React, { useMemo, forwardRef } from "react";
import { View, StyleSheet, Text } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";
import type { LucideIcon, LucideProps } from "lucide-react-native";

import { RadioCard } from "@/components/shared/RadioCard/RadioCard";
import { useTheme, Colors, Theme, AppearancePreference } from "@/theme";
import { Moon, Sun, Smartphone } from "lucide-react-native";

export default function AppearanceScreen() {
  const { t } = useTranslation();
  const { appearancePreference, setAppearancePreference, colors, theme } =
    useTheme();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);

  const appearanceOptions = useMemo(
    () => [
      {
        value: "system" as AppearancePreference,
        label: t("settings.appearance.options.system.label"),
        subtitle: t("settings.appearance.options.system.subtitle"),
        icon: Smartphone,
      },
      {
        value: "light" as AppearancePreference,
        label: t("settings.appearance.options.light.label"),
        subtitle: t("settings.appearance.options.light.subtitle"),
        icon: Sun,
      },
      {
        value: "dark" as AppearancePreference,
        label: t("settings.appearance.options.dark.label"),
        subtitle: t("settings.appearance.options.dark.subtitle"),
        icon: Moon,
        recommended: true,
      },
    ],
    [t]
  );

  const handleSelectAppearance = (value: AppearancePreference) => {
    if (value === appearancePreference) {
      return;
    }

    setAppearancePreference(value);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {appearanceOptions.map((option, index) => (
          <View key={option.value} style={index > 0 && styles.cardSpacing}>
            <RadioCard
              title={option.label}
              description={option.subtitle}
              titleIcon={option.icon}
              titleIconColor={colors.secondaryText}
              isSelected={appearancePreference === option.value}
              onSelect={() => handleSelectAppearance(option.value)}
              recommended={option.recommended}
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
