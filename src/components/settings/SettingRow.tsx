import React, { useMemo } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { ChevronRight } from "lucide-react-native";

import { AppText } from "@/components";
import { AnimatedPressable } from "@/components/shared/AnimatedPressable";
import { useTheme, Colors, Theme } from "@/theme";
import { SettingRowProps, ValueTone } from "./types";

const valueToneMap: Record<ValueTone, (colors: Colors) => string> = {
  primary: (colors) => colors.primaryText,
  secondary: (colors) => colors.secondaryText,
  accent: (colors) => colors.accent,
  error: (colors) => colors.error,
};

export const SettingRow = ({
  icon: Icon,
  title,
  subtitle,
  onPress,
  disabled,
  accessory = "chevron",
  control,
  titleAdornment,
  trailingContent,
  actionButton,
  value,
  valueTone = "primary",
  valueAlignment = "right",
  accessibilityLabel,
  accessibilityHint,
  hapticIntensity = "light",
  containerStyle,
  backgroundColor,
  showAccentRail = false,
  twoLineLayout = false,
}: SettingRowProps) => {
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);

  const toneColor = valueToneMap[valueTone](colors);

  const content = (
    <View style={[styles.rowInner, twoLineLayout && styles.rowInnerTwoLine]}>
      {showAccentRail && <View style={styles.accentRail} />}

      {Icon && (
        <View style={styles.iconColumn}>
          <Icon size={24} color={colors.secondaryText} />
        </View>
      )}

      <View style={[styles.labelColumn, !Icon && styles.labelColumnNoIcon]}>
        <View style={styles.labelHeader}>
          <AppText role="Headline" style={styles.rowTitle}>
            {title}
          </AppText>
          {titleAdornment}
        </View>
        {subtitle && (
          <AppText role="Body" color="secondary" style={styles.rowSubtitle}>
            {subtitle}
          </AppText>
        )}
        {twoLineLayout && control && (
          <View style={styles.twoLineControl}>{control}</View>
        )}
      </View>

      {!twoLineLayout && (
        <>
          {trailingContent ? (
            <View
              style={[
                styles.valueColumn,
                valueAlignment === "left" && styles.valueAlignLeft,
              ]}
            >
              {trailingContent}
            </View>
          ) : control ? (
            <View
              style={[
                styles.controlColumn,
                valueAlignment === "left" && styles.valueAlignLeft,
              ]}
            >
              {control}
            </View>
          ) : actionButton ? (
            <View style={styles.actionButtonColumn}>
              <AnimatedPressable
                onPress={actionButton.onPress}
                disabled={disabled || actionButton.loading}
                hapticIntensity={hapticIntensity}
                accessibilityRole="button"
                accessibilityLabel={actionButton.label}
              >
                {actionButton.loading ? (
                  <ActivityIndicator
                    size="small"
                    color={
                      actionButton.tone
                        ? valueToneMap[actionButton.tone](colors)
                        : colors.accent
                    }
                  />
                ) : (
                  <AppText
                    role="Body"
                    style={[
                      styles.actionButtonText,
                      {
                        color: actionButton.tone
                          ? valueToneMap[actionButton.tone](colors)
                          : colors.accent,
                      },
                    ]}
                  >
                    {actionButton.label}
                  </AppText>
                )}
              </AnimatedPressable>
            </View>
          ) : value ? (
            <View
              style={[
                styles.valueColumn,
                valueAlignment === "left" && styles.valueAlignLeft,
              ]}
            >
              <AppText
                role="Body"
                style={[styles.valueText, { color: toneColor }]}
              >
                {value}
              </AppText>
            </View>
          ) : (
            <View style={styles.valuePlaceholder} />
          )}
        </>
      )}

      {accessory === "chevron" && (
        <View style={styles.accessoryColumn}>
          {accessory === "chevron" && (
            <ChevronRight
              size={24}
              color={colors.secondaryText}
              strokeWidth={1.5}
            />
          )}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        disabled={disabled}
        hapticIntensity={hapticIntensity}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityHint={accessibilityHint}
        style={[
          styles.rowContainer,
          twoLineLayout && styles.rowContainerTwoLine,
          backgroundColor && { backgroundColor },
          containerStyle,
        ]}
      >
        {content}
      </AnimatedPressable>
    );
  }

  return (
    <View
      style={[
        styles.rowContainer,
        twoLineLayout && styles.rowContainerTwoLine,
        backgroundColor && { backgroundColor },
        containerStyle,
      ]}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
    >
      {content}
    </View>
  );
};

const createStyles = (colors: Colors, theme: Theme) =>
  StyleSheet.create({
    rowContainer: {
      minHeight: 56,
      justifyContent: "center",
      paddingVertical: theme.spacing.md,
      paddingRight: theme.spacing.lg,
    },
    rowContainerTwoLine: {
      minHeight: 72,
      paddingVertical: theme.spacing.lg,
    },
    rowInner: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.lg,
    },
    rowInnerTwoLine: {
      alignItems: "flex-start",
    },
    accentRail: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: 3,
      backgroundColor: colors.accent,
    },
    iconColumn: {
      width: 24,
      alignItems: "center",
      marginLeft: theme.spacing.lg,
    },
    labelColumn: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    labelColumnNoIcon: {
      marginLeft: theme.spacing.lg,
    },
    labelHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    rowTitle: {
      color: colors.primaryText,
    },
    rowSubtitle: {
      marginTop: -4,
    },
    twoLineControl: {
      marginTop: theme.spacing.sm,
    },
    valueColumn: {
      alignItems: "flex-end",
      marginRight: theme.spacing.xs,
    },
    controlColumn: {
      alignItems: "flex-start",
    },
    actionButtonColumn: {
      alignItems: "flex-end",
    },
    actionButtonText: {
      fontWeight: "600",
    },
    valueAlignLeft: {
      alignItems: "flex-start",
    },
    valuePlaceholder: {},
    valueText: {
      textAlign: "right",
    },
    accessoryColumn: {
      width: 24,
      alignItems: "flex-end",
    },
  });
