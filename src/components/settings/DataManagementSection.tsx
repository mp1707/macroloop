import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { Trash2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { AppText, Card } from "@/components";
import { useTheme, Theme } from "@/theme";
import { useSafeRouter } from "@/hooks/useSafeRouter";
import { SettingRow } from "./SettingRow";

export const DataManagementSection = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useSafeRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.section}>
      <AppText role="Caption" color="secondary" style={styles.sectionHeader}>
        {t("settings.sections.dataManagement.label")}
      </AppText>
      <Card padding={0}>
        <SettingRow
          icon={Trash2}
          title={t("settings.sections.dataManagement.rows.deleteOldLogs.title")}
          subtitle={t(
            "settings.sections.dataManagement.rows.deleteOldLogs.subtitle"
          )}
          accessory="chevron"
          onPress={() => router.push("/settings/data-cleanup")}
        />
      </Card>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    section: {
      marginBottom: theme.spacing.lg,
    },
    sectionHeader: {
      marginBottom: theme.spacing.sm,
      marginLeft: theme.spacing.lg,
      letterSpacing: 0.5,
    },
  });
