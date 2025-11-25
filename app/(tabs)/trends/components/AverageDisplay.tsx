import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { AppText } from "@/components";
import { useTheme, Colors, Theme } from "@/theme";
import { useTranslation } from "react-i18next";

interface AverageDisplayProps {
  average: number;
  target?: number;
  daysWithData: number;
}

export const AverageDisplay: React.FC<AverageDisplayProps> = ({
  average,
  target,
  daysWithData,
}) => {
  const { colors, theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);

  // Calculate difference from target
  const diff = target ? average - target : 0;
  const isOverTarget = diff > 0;
  const absDiff = Math.abs(Math.round(diff));

  return (
    <View style={styles.container}>
      <View style={styles.averageRow}>
        <AppText role="Title1" style={styles.averageNumber}>
          {Math.round(average)} kcal
        </AppText>
        {target && daysWithData > 0 && diff !== 0 && (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: isOverTarget
                  ? colors.semanticBadges?.carbs?.background ||
                    colors.subtleBackground
                  : colors.semanticBadges?.calories?.background ||
                    colors.subtleBackground,
              },
            ]}
          >
            <AppText
              role="Caption"
              style={[
                styles.badgeText,
                {
                  color: isOverTarget
                    ? colors.semanticBadges?.carbs?.text || colors.secondaryText
                    : colors.semanticBadges?.calories?.text ||
                      colors.secondaryText,
                },
              ]}
            >
              {isOverTarget ? "+" : "-"}
              {absDiff} vs Goal
            </AppText>
          </View>
        )}
      </View>
      <AppText role="Caption" color="secondary">
        {t("trends.averageDisplay.subtitle")}{" "}
        {t("trends.averageDisplay.subtitle_today_excluded")}
      </AppText>
    </View>
  );
};

const createStyles = (colors: Colors, theme: Theme) =>
  StyleSheet.create({
    container: {
      paddingTop: theme.spacing.lg,
      paddingHorizontal: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
      gap: theme.spacing.xs / 2,
    },
    averageRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    averageNumber: {
      color: colors.primaryText,
    },
    badge: {
      paddingHorizontal: theme.spacing.sm + theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
      borderRadius: 16,
      minHeight: 32,
      justifyContent: "center",
      alignItems: "center",
    },
    badgeText: {
      fontWeight: "600",
    },
  });
