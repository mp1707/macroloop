import React, { useState, useMemo } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/theme";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";
import { Button } from "@/components/index";
import { AppText } from "@/components/shared/AppText";
import { RulerPicker } from "@/components/shared/RulerPicker";
import { useTranslation } from "react-i18next";
import type { Colors, Theme } from "@/theme";

const WeightSelectionScreen = () => {
  const { colors, theme: themeObj } = useTheme();
  const styles = useMemo(
    () => createStyles(colors, themeObj),
    [colors, themeObj]
  );
  const { weight, setWeight } = useOnboardingStore();
  const { safePush } = useNavigationGuard();
  const [currentWeight, setCurrentWeight] = useState(weight || 70);
  const { t } = useTranslation();

  const handleContinue = async () => {
    setWeight(currentWeight);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    safePush("/onboarding/activity-level");
  };

  const handleWeightChange = (value: number) => {
    setCurrentWeight(value);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      >
        <View style={styles.headerSection}>
          <AppText role="Title2">{t("onboarding.weight.title")}</AppText>
        </View>

        <View style={styles.centeredContent}>
          <View style={styles.pickerSection}>
            <RulerPicker
              min={30}
              max={300}
              value={currentWeight}
              onChange={handleWeightChange}
              unit={t("onboarding.weight.unit")}
            />
          </View>
        </View>

        <View style={styles.actionButtonContainer}>
          <Button
            variant="primary"
            label={t("onboarding.common.continue")}
            onPress={handleContinue}
          />
        </View>
      </ScrollView>
    </View>
  );
};

export default WeightSelectionScreen;

const createStyles = (colors: Colors, theme: Theme) => {
  const { spacing } = theme;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.primaryBackground,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: spacing.lg,
      gap: spacing.lg,
    },
    headerSection: {
      paddingTop: spacing.lg,
      paddingHorizontal: spacing.pageMargins.horizontal,
      alignItems: "center",
      gap: spacing.sm,
    },
    centeredContent: {
      flex: 1,
      justifyContent: "center",
    },
    actionButtonContainer: {
      paddingHorizontal: spacing.md,
    },
    pickerSection: {
      alignItems: "center",
      width: "100%",
    },
  });
};
