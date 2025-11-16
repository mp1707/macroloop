import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme";
import { HeaderButton } from "@/components/shared/HeaderButton";
import { ProgressBar } from "./ProgressBar";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import type { Colors, Theme } from "@/theme";

interface OnboardingHeaderProps {
  onBack: () => void;
  onSkip: () => void;
  currentStep?: number;
  totalSteps?: number;
  showProgressBar?: boolean;
  hideBackButton?: boolean;
}

export const OnboardingHeader: React.FC<OnboardingHeaderProps> = ({
  onBack,
  onSkip,
  currentStep = 0,
  totalSteps = 7,
  showProgressBar = false,
  hideBackButton = false,
}) => {
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const hasLiquidGlass = isLiquidGlassAvailable();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);

  return (
    <View
      style={[
        styles.headerContainer,
        { paddingTop: insets.top + theme.spacing.sm },
      ]}
    >
      <View style={styles.navigationContainer}>
        <View style={styles.backButton}>
          {!hideBackButton && (
            <HeaderButton
              imageProps={{
                systemName: "chevron.left",
              }}
              buttonProps={{
                onPress: onBack,
                color: hasLiquidGlass ? undefined : colors.tertiaryBackground,
              }}
            />
          )}
        </View>
        <View style={styles.skipButton}>
          <HeaderButton
            imageProps={{
              systemName: "xmark",
            }}
            buttonProps={{
              onPress: onSkip,
              color: hasLiquidGlass ? undefined : colors.tertiaryBackground,
            }}
          />
        </View>
      </View>

      {showProgressBar && (
        <View style={styles.progressBarContainer}>
          <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />
        </View>
      )}
    </View>
  );
};

const createStyles = (colors: Colors, theme: Theme) => {
  return StyleSheet.create({
    headerContainer: {
      backgroundColor: colors.primaryBackground,
      paddingBottom: theme.spacing.md,
    },
    navigationContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: theme.spacing.md,
      minHeight: 44,
    },
    backButton: {
      width: 44,
      height: 44,
      justifyContent: "center",
      alignItems: "flex-start",
    },
    skipButton: {
      width: 44,
      height: 44,
      justifyContent: "center",
      alignItems: "flex-end",
    },
    progressBarContainer: {
      marginTop: theme.spacing.md,
    },
  });
};
