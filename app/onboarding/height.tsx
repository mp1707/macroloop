import React, { useState, useMemo } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import * as Haptics from "expo-haptics";
import { Info } from "lucide-react-native";
import { useTheme } from "@/theme";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";
import { Button } from "@/components/index";
import { AppText } from "@/components/shared/AppText";
import { Tooltip } from "@/components/shared/Tooltip";
import { RulerPicker } from "@/components/shared/RulerPicker";
import { useTranslation } from "react-i18next";
import type { Colors, Theme } from "@/theme";

const HeightSelectionScreen = () => {
  const { colors, theme: themeObj } = useTheme();
  const styles = useMemo(
    () => createStyles(colors, themeObj),
    [colors, themeObj]
  );
  const { height, setHeight } = useOnboardingStore();
  const { safePush, isNavigating } = useNavigationGuard();
  const [currentHeight, setCurrentHeight] = useState(height || 175);
  const { t } = useTranslation();

  const handleContinue = async () => {
    setHeight(currentHeight);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    safePush("/onboarding/weight");
  };

  const handleHeightChange = (value: number) => {
    setCurrentHeight(value);
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
          <AppText role="Title2">{t("onboarding.height.title")}</AppText>
          <View style={styles.infoRow}>
            <AppText role="Body" color="secondary" style={styles.infoText}>
              {t("onboarding.height.subtitle")}
            </AppText>
            <Tooltip text={t("onboarding.height.tooltip")}>
              <Info size={18} color={colors.secondaryText} />
            </Tooltip>
          </View>
        </View>

        <View style={styles.centeredContent}>
          <View style={styles.pickerSection}>
            <RulerPicker
              min={100}
              max={250}
              value={currentHeight}
              onChange={handleHeightChange}
              unit={t("onboarding.height.unit")}
            />
          </View>
        </View>

        <View style={styles.actionButtonContainer}>
          <Button
            variant="primary"
            label={t("onboarding.common.continue")}
            onPress={handleContinue}
            isLoading={isNavigating}
          />
        </View>
      </ScrollView>
    </View>
  );
};

export default HeightSelectionScreen;

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
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
      gap: spacing.xs,
      maxWidth: "75%",
    },
    infoText: {
      textAlign: "center",
    },
  });
};
