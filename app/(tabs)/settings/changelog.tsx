import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";

import { AppText } from "@/components";
import { useTheme, Colors, Theme } from "@/theme";

interface ChangelogEntry {
  title: string;
  description: string;
}

interface VersionChangelog {
  version: string;
  changes: ChangelogEntry[];
}

// Fill this array with your changelog entries
const CHANGELOG_DATA: VersionChangelog[] = [
  // Example structure:
  // {
  //   version: "1.2.0",
  //   changes: [
  //     { title: "New Feature", description: "Description of the new feature" },
  //     { title: "Bug Fix", description: "Description of what was fixed" },
  //   ],
  // },
];

export default function ChangelogScreen() {
  const { t } = useTranslation();
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {CHANGELOG_DATA.length === 0 ? (
          <AppText role="Body" color="secondary" style={styles.emptyState}>
            {t("settings.changelog.emptyState")}
          </AppText>
        ) : (
          CHANGELOG_DATA.map((versionEntry, versionIndex) => (
            <View
              key={versionEntry.version}
              style={[
                styles.versionSection,
                versionIndex > 0 && styles.versionSpacing,
              ]}
            >
              <AppText role="Title2" color="primary" style={styles.versionTitle}>
                {versionEntry.version}
              </AppText>
              <View style={styles.changesContainer}>
                {versionEntry.changes.map((change, changeIndex) => (
                  <View
                    key={`${versionEntry.version}-${changeIndex}`}
                    style={[
                      styles.changeItem,
                      changeIndex > 0 && styles.changeSpacing,
                    ]}
                  >
                    <View style={styles.bulletContainer}>
                      <View style={styles.bullet} />
                    </View>
                    <View style={styles.changeContent}>
                      <AppText role="Headline" color="primary">
                        {change.title}
                      </AppText>
                      <AppText
                        role="Subhead"
                        color="secondary"
                        style={styles.changeDescription}
                      >
                        {change.description}
                      </AppText>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
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
    emptyState: {
      textAlign: "center",
      marginTop: theme.spacing.xl,
    },
    versionSection: {
      marginBottom: theme.spacing.md,
    },
    versionSpacing: {
      marginTop: theme.spacing.xl,
    },
    versionTitle: {
      marginBottom: theme.spacing.md,
    },
    changesContainer: {
      paddingLeft: theme.spacing.xs,
    },
    changeItem: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    changeSpacing: {
      marginTop: theme.spacing.md,
    },
    bulletContainer: {
      width: theme.spacing.lg,
      paddingTop: theme.spacing.xs + 2,
    },
    bullet: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.accent,
    },
    changeContent: {
      flex: 1,
    },
    changeDescription: {
      marginTop: theme.spacing.xs,
    },
  });
