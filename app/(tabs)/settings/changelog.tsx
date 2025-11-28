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

const CHANGELOG_DATA_EN: VersionChangelog[] = [
  {
    version: "1.0.5",
    changes: [
      {
        title: "Trends tab",
        description:
          "Stay on track with your goals using the new trends tab that visualizes your macro progress over time.",
      },
      {
        title: "Dashboard shows remaining macros",
        description:
          "The ring dashboard now displays how many calories and protein you have left until your goal is reached, or how much you're already over. Tap the dashboard to switch to the total goal view.",
      },
      {
        title: "Portion slider in creation screen",
        description:
          "The consumed portion slider is now directly available in the food log creation screen, not just in the edit screen after logging.",
      },
      {
        title: "Calendar moved to main screen",
        description:
          "Calendar tab removed. The calendar is now accessible by tapping the big date on the main screen.",
      },
      {
        title: "AI food logging improvements",
        description:
          "Enhanced AI logic to better understand recipes and other notes about food for more accurate logging.",
      },
      {
        title: "Visual bug fixes",
        description:
          "Various visual glitches throughout the app have been fixed for a more polished experience.",
      },
      {
        title: "User-friendly error messages",
        description:
          "Rate limiting and other errors now display clear, helpful messages instead of technical jargon.",
      },
    ],
  },
  {
    version: "1.0.4",
    changes: [
      {
        title: "Per-ingredient macros",
        description:
          "Ingredient calculations were rebuilt so each ingredient keeps its own calories and macros for better accuracy when editing meals.",
      },
      {
        title: "Ingredient breakdown details",
        description:
          "Per-ingredient calories and protein now appear directly inside the breakdown for easier fine-tuning.",
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
          "Styling glitches and typos throughout the app were cleaned up for a smoother feel.",
      },
      {
        title: "Settings rate & share links",
        description:
          "Quickly rate the app or share it with friends directly from the Settings screen.",
      },
      {
        title: "Changelog view",
        description:
          "A new changelog tab inside the app now highlights everything that's new.",
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
          "Ingredients are detected and split automatically so servings are easier to fine-tune.",
      },
      {
        title: "Favorite food logs",
        description:
          "Frequent food logs can be saved as favorites and added back with a single tap.",
      },
      {
        title: "Flexible ingredient editing",
        description:
          "Ingredients on an existing log can be added, swapped, or removed with macros recalculated instantly.",
      },
      {
        title: "Suggested ingredient amounts",
        description:
          "Auto-suggested ingredient amounts now appear in the breakdown view when initial info is incomplete.",
      },
      {
        title: "Delete old logs",
        description:
          "Older logs can be removed in bulk to reclaim space and keep things tidy.",
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

const CHANGELOG_DATA_DE: VersionChangelog[] = [
  {
    version: "1.0.5",
    changes: [
      {
        title: "Trends-Tab",
        description:
          "Behalte deine Ziele im Blick – der neue Trends-Tab visualisiert deinen Makro-Fortschritt über Zeit.",
      },
      {
        title: "Dashboard zeigt verbleibende Makros",
        description:
          "Das Ring-Dashboard zeigt jetzt an, wie viele Kalorien und Protein dir noch bis zum Ziel fehlen oder wie viel du bereits darüber liegst. Tippe auf das Dashboard, um zur Gesamtziel-Ansicht zu wechseln.",
      },
      {
        title: "Portionsregler im Eingabebildschirm",
        description:
          "Der Verzehrte-Menge-Regler ist jetzt direkt beim Anlegen eines Eintrags verfügbar und nicht erst im Bearbeitungsbildschirm.",
      },
      {
        title: "Kalender auf Hauptbildschirm",
        description:
          "Der Kalender-Tab wurde entfernt. Der Kalender wird nun durch Tippen auf das Datum im Hauptbildschirm geöffnet.",
      },
      {
        title: "Verbesserte KI-Logik",
        description:
          "Die KI versteht jetzt Rezepte und andere Hinweise zu Lebensmitteln besser, damit das Logging noch präziser wird.",
      },
      {
        title: "Visuelle Fehlerbehebungen",
        description: "Verschiedene optische Fehler in der App behoben.",
      },
      {
        title: "Benutzerfreundliche Fehlermeldungen",
        description:
          "Rate-Limiting zeigt jetzt eine klare Meldung statt nur 'Hoppla, da ist etwas schief gelaufen'.",
      },
    ],
  },
  {
    version: "1.0.4",
    changes: [
      {
        title: "Makros pro Zutat",
        description:
          "Die Berechnungen wurden neu aufgesetzt, damit jede Zutat ihre eigenen Kalorien und Makros behält – dadurch werden Anpassungen an Gerichten deutlich präziser.",
      },
      {
        title: "Detailansicht im Zutaten-Split",
        description:
          "Die Detailansicht zeigt jetzt direkt Kalorien und Protein pro Zutat an, damit Anpassungen schneller gelingen.",
      },
      {
        title: "Kalender-Navigation",
        description:
          "Ein Tipp auf ein Datum im Kalender bringt dich jetzt sofort auf den Home-Tab.",
      },
      {
        title: "Bildformat-Unterstützung",
        description:
          "Die Bilderkennung unterstützt nun deutlich mehr Dateiformate und verarbeitet dadurch auch Screenshots zuverlässig.",
      },
      {
        title: "Feinschliff & Fixes",
        description:
          "Diverse Styling-Ausreißer und Tippfehler im gesamten Interface sind ausgebügelt.",
      },
      {
        title: "Bewerten & Teilen aus den Einstellungen",
        description:
          "Macroloop lässt sich jetzt direkt aus den Einstellungen bewerten oder mit Freund:innen teilen.",
      },
      {
        title: "Changelog-Ansicht",
        description:
          "Alle Neuerungen stehen nun gebündelt im neuen Changelog-Tab direkt in der App.",
      },
    ],
  },
  {
    version: "1.0.3",
    changes: [
      {
        title: "Erstveröffentlichung",
        description:
          "Der erste öffentliche Build – Tracking-Erlebnis poliert und startklar.",
      },
      {
        title: "Textbasiertes Logging",
        description:
          "Trage Mahlzeiten mit natürlicher Sprache ein und spare dir mühsames Tippen.",
      },
      {
        title: "Logging per Sprachaufnahme",
        description:
          "Sprich ein, was du gegessen hast, und die App wandelt es automatisch in einen sauberen Log um.",
      },
      {
        title: "Logging per Foto",
        description:
          "Fotografiere deinen Teller und erhalte passende Vorschläge.",
      },
      {
        title: "Automatische Zutaten-Aufschlüsselung",
        description:
          "Zutaten werden automatisch erkannt und getrennt, damit du Mengen leicht anpassen kannst.",
      },
      {
        title: "Lieblings-Logs",
        description:
          "Speichere häufige Einträge als Favorit und füge sie mit einem Tipp wieder hinzu.",
      },
      {
        title: "Flexible Zutatenbearbeitung",
        description:
          "Zutaten hinzufügen, tauschen oder löschen – die Makros werden sofort neu berechnet.",
      },
      {
        title: "Vorgeschlagene Mengen",
        description:
          "Wenn Infos fehlen, schlägt dir die Breakdown passende Mengen vor.",
      },
      {
        title: "Alte Logs löschen",
        description:
          "Räume ältere Einträge gesammelt weg und halte alles schlank.",
      },
      {
        title: "Verspielte Animationen",
        description:
          "Ring-Progress und wackelige Lade-Animationen machen das Logging ein Stück spaßiger.",
      },
      {
        title: "Lokalisierung",
        description:
          "Die App fühlt sich jetzt auf Englisch wie auf Deutsch zuhause an.",
      },
      {
        title: "Onboarding & Ziele",
        description:
          "Geführtes Onboarding plus Makroziele per Mifflin-St.-Jeor-Rechner oder manueller Eingabe.",
      },
    ],
  },
];

export default function ChangelogScreen() {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);
  const normalizedLanguage = (i18n.resolvedLanguage || i18n.language || "en")
    .split("-")[0]
    .toLowerCase();
  const changelogData =
    normalizedLanguage === "de" ? CHANGELOG_DATA_DE : CHANGELOG_DATA_EN;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {changelogData.length === 0 ? (
          <AppText role="Body" color="secondary" style={styles.emptyState}>
            {t("settings.changelog.emptyState")}
          </AppText>
        ) : (
          changelogData.map((versionEntry, versionIndex) => (
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
