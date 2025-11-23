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
  {
    version: "1.0.4",
    changes: [
      {
        title: "Per-ingredient macros",
        description:
          "Rebuilt calculations so each ingredient keeps its own calories and macros for better accuracy when editing meals.",
      },
      {
        title: "Ingredient breakdown details",
        description:
          "See per-ingredient calories and protein right inside the breakdown for easier fine-tuning.",
      },
      {
        title: "Calendar navigation",
        description:
          "Tapping a day in the calendar now jumps directly to the Home tab.",
      },
      {
        title: "Image format support",
        description:
          "Improved image parsing to handle more file types, fixing errors when logging from screenshots.",
      },
      {
        title: "Polish & fixes",
        description:
          "Cleaned up several styling glitches and typos throughout the app.",
      },
    ],
  },
  {
    version: "1.0.3",
    changes: [
      {
        title: "Initial release",
        description:
          "First public build with the core tracking experience polished and ready.",
      },
      {
        title: "Text based logging",
        description:
          "Log meals with natural language text to cut down manual entry time.",
      },
      {
        title: "Voice transcription logging",
        description:
          "Dictate what you ate and watch it turn into a structured log automatically.",
      },
      {
        title: "Image based logging",
        description:
          "Snap a photo of your plate and let the app suggest what you ate.",
      },
      {
        title: "Automated ingredient breakdown",
        description:
          "Detect and split ingredients automatically so you can fine-tune servings.",
      },
      {
        title: "Favorite food logs",
        description:
          "Save frequent food logs as favorites and add them back with a single tap.",
      },
      {
        title: "Flexible ingredient editing",
        description:
          "Add, swap, or remove ingredients on an existing log and instantly recalc macros.",
      },
      {
        title: "Suggested ingredient amounts",
        description:
          "Get auto-suggested amounts in the breakdown view when initial info is incomplete.",
      },
      {
        title: "Delete old logs",
        description:
          "Clean up older logs in bulk to reclaim space and keep things tidy.",
      },
      {
        title: "Playful interface animations",
        description:
          "Enjoy ring-fill progress animations and wobbly loading lines that make logging fun.",
      },
      {
        title: "Localization",
        description:
          "Full English and German translations so the experience feels native.",
      },
      {
        title: "Onboarding & goals",
        description:
          "Guided onboarding plus macro goals via the Mifflin-St. Jeor calculator or manual input.",
      },
    ],
  },
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
              <AppText
                role="Title2"
                color="primary"
                style={styles.versionTitle}
              >
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
