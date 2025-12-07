import React, { useMemo, useCallback } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { Wrench, AlertTriangle, BadgeCheck, Images, Trash2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { AppText, Card } from "@/components";
import { useTheme, Colors, Theme } from "@/theme";
import { useAppStore } from "@/store/useAppStore";
import { seedFoodLogs } from "@/utils/seed";
import { SettingRow } from "./SettingRow";
import * as FileSystem from "expo-file-system";
import { Paths } from "expo-file-system";

export const DeveloperSection = () => {
  const { t } = useTranslation();
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);
  const { clearAllLogs, clearNutritionGoals, isPro, setPro, devProOverride, setDevProOverride } = useAppStore();

  const handleSeedData = useCallback(() => {
    seedFoodLogs();
  }, []);

  const handleClearAllLogs = useCallback(() => {
    Alert.alert(
      t("settings.sections.developer.rows.deleteLogs.alert.title"),
      t("settings.sections.developer.rows.deleteLogs.alert.message"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("settings.sections.developer.rows.deleteLogs.alert.confirm"),
          style: "destructive",
          onPress: () => clearAllLogs(),
        },
      ]
    );
  }, [clearAllLogs, t]);

  const handleClearNutritionGoals = useCallback(() => {
    Alert.alert(
      t("settings.sections.developer.rows.clearGoals.alert.title"),
      t("settings.sections.developer.rows.clearGoals.alert.message"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("settings.sections.developer.rows.clearGoals.alert.confirm"),
          style: "destructive",
          onPress: () => clearNutritionGoals(),
        },
      ]
    );
  }, [clearNutritionGoals, t]);

  const handleToggleDevProOverride = useCallback(() => {
    const newValue = !devProOverride;
    setDevProOverride(newValue);

    // When enabling override, set Pro to true
    // When disabling, leave isPro as-is; real subscription will sync on next foreground
    if (newValue) {
      setPro(true);
      console.log('[DEV] Pro override enabled - app now has Pro features');
    } else {
      console.log('[DEV] Pro override disabled - real subscription will sync on next app foreground');
    }
  }, [devProOverride, setDevProOverride, setPro]);

  const getStoredImages = useCallback(() => {
    const directory = Paths.document;
    const entries = directory.list();
    const imageFiles = entries.filter(
      (entry): entry is FileSystem.File =>
        entry instanceof FileSystem.File &&
        /\.(jpg|jpeg|png|heic|heif|webp)$/i.test(entry.name)
    );
    return { directory, imageFiles };
  }, []);

  const handleLogStoredImages = useCallback(() => {
    try {
      const { directory, imageFiles } = getStoredImages();

      if (imageFiles.length === 0) {
        console.log("[Dev] No stored images", { directory: directory.uri });
        return;
      }

      const totalSize = imageFiles.reduce((sum, file) => sum + (file.size ?? 0), 0);

      console.log(
        `[Dev] ${imageFiles.length} stored image${imageFiles.length === 1 ? "" : "s"} | ${(totalSize / 1024).toFixed(1)} KB`
      );
    } catch (error) {
      console.error("[Dev] Failed to list stored images", error);
    }
  }, [getStoredImages]);

  const handleDeleteStoredImages = useCallback(() => {
    try {
      const { directory, imageFiles } = getStoredImages();

      if (imageFiles.length === 0) {
        console.log("[Dev] No stored images to delete", {
          directory: directory.uri,
        });
        return;
      }

      let deleted = 0;
      imageFiles.forEach((file) => {
        try {
          file.delete();
          deleted += 1;
        } catch (error) {
          console.error("[Dev] Failed to delete file", file.uri, error);
        }
      });

      console.log(`[Dev] Deleted ${deleted}/${imageFiles.length} stored images`);
    } catch (error) {
      console.error("[Dev] Failed to delete stored images", error);
    }
  }, [getStoredImages]);

  // Only render in development mode
  if (!__DEV__) {
    return null;
  }

  return (
    <View style={styles.section}>
      <AppText role="Caption" color="secondary" style={styles.sectionHeader}>
        {t("settings.sections.developer.label")}
      </AppText>
      <Card padding={0}>
        <SettingRow
          icon={Wrench}
          title={t("settings.sections.developer.rows.seed.title")}
          subtitle={t("settings.sections.developer.rows.seed.subtitle")}
          actionButton={{
            label: t("settings.sections.developer.rows.seed.action"),
            onPress: handleSeedData,
          }}
          accessory="none"
        />
        <View style={styles.separator} />
        <SettingRow
          icon={AlertTriangle}
          title={t("settings.sections.developer.rows.deleteLogs.title")}
          actionButton={{
            label: t("settings.sections.developer.rows.deleteLogs.action"),
            onPress: handleClearAllLogs,
            tone: "error",
          }}
          accessory="none"
        />
        <View style={styles.separator} />
        <SettingRow
          icon={AlertTriangle}
          title={t("settings.sections.developer.rows.clearGoals.title")}
          subtitle={t("settings.sections.developer.rows.clearGoals.subtitle")}
          actionButton={{
            label: t("settings.sections.developer.rows.clearGoals.action"),
            onPress: handleClearNutritionGoals,
            tone: "error",
          }}
          accessory="none"
        />
        <View style={styles.separator} />
        <SettingRow
          icon={Images}
          title="Log stored images"
          subtitle="Prints all files in the app documents directory"
          actionButton={{
            label: "Log in console",
            onPress: handleLogStoredImages,
          }}
          accessory="none"
        />
        <View style={styles.separator} />
        <SettingRow
          icon={Trash2}
          title="Delete stored images"
          subtitle="Removes every cached image on device"
          actionButton={{
            label: "Delete all",
            onPress: handleDeleteStoredImages,
            tone: "error",
          }}
          accessory="none"
        />
        <View style={styles.separator} />
        <SettingRow
          icon={BadgeCheck}
          title={`${t("settings.sections.developer.rows.togglePro.title")} ${
            devProOverride ? "(OVERRIDE ACTIVE)" : ""
          } (${
            isPro
              ? t("settings.sections.developer.rows.togglePro.states.on")
              : t("settings.sections.developer.rows.togglePro.states.off")
          })`}
          subtitle={
            devProOverride
              ? "⚠️ Dev override active - RevenueCat disabled"
              : t("settings.sections.developer.rows.togglePro.subtitle")
          }
          actionButton={{
            label: devProOverride
              ? "Disable Override"
              : "Enable Override",
            onPress: handleToggleDevProOverride,
            tone: devProOverride ? "error" : undefined,
          }}
          accessory="none"
        />
      </Card>
    </View>
  );
};

const createStyles = (colors: Colors, theme: Theme) =>
  StyleSheet.create({
    section: {
      marginBottom: theme.spacing.lg,
    },
    sectionHeader: {
      marginBottom: theme.spacing.sm,
      marginLeft: theme.spacing.lg,
      letterSpacing: 0.5,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.subtleBorder,
      marginLeft: theme.spacing.lg + 24 + theme.spacing.md,
      marginRight: theme.spacing.lg
    },
  });
