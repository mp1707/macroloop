import React, { useMemo } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import Constants from "expo-constants";
import { useTranslation } from "react-i18next";

import { AppText } from "@/components";
import { useTheme, Colors, Theme, ColorScheme } from "@/theme";
import { ProSection } from "@/components/settings/ProSection";
import { GeneralSection } from "@/components/settings/GeneralSection";
import { GoalsSection } from "@/components/settings/GoalsSection";
import { DataManagementSection } from "@/components/settings/DataManagementSection";
import { DeveloperSection } from "@/components/settings/DeveloperSection";
import { AboutSection } from "@/components/settings/AboutSection";

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { colors, theme, colorScheme } = useTheme();
  const styles = useMemo(
    () => createStyles(colors, theme, colorScheme),
    [colors, theme, colorScheme]
  );
  const version = Constants.expoConfig?.version ?? "1.0.0";
  const build =
    Constants.expoConfig?.ios?.buildNumber ??
    Constants.expoConfig?.android?.versionCode ??
    Constants.nativeBuildVersion ??
    "";
  const versionLabel = build
    ? t("settings.footer.versionWithBuild", { version, build })
    : t("settings.footer.version", { version });

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ProSection />
        <GeneralSection />
        <GoalsSection />
        <DataManagementSection />
        <AboutSection />
        <DeveloperSection />
        <View style={styles.footer}>
          <AppText role="Caption" color="secondary" style={styles.footerText}>
            {versionLabel}
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: Colors, theme: Theme, colorScheme: ColorScheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        colorScheme === "dark"
          ? colors.primaryBackground
          : colors.tertiaryBackground,
    },
    scrollContent: {
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xxl,
      paddingHorizontal: theme.spacing.lg,
    },
    footer: {
      marginTop: theme.spacing.xl,
      alignItems: "center",
    },
    footerText: {
      textAlign: "center",
    },
  });
