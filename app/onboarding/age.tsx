import React, { useState, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { Colors, Theme, useTheme } from "@/theme";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import { Button } from "@/components/index";
import { OnboardingScreen } from "../../src/components/onboarding/OnboardingScreen";
import { AppText } from "@/components/shared/AppText";
import { Host, Picker } from "@expo/ui/swift-ui";
import { useTranslation } from "react-i18next";

const AgeSelectionScreen = () => {
  const { colors, theme: themeObj } = useTheme();
  const styles = createStyles(colors, themeObj);
  const { age, setAge } = useOnboardingStore();
  const { safePush, isNavigating } = useNavigationGuard();
  const [selectedAge, setSelectedAge] = useState<number>(age || 30);
  const { t } = useTranslation();
  const selectedIndex = useMemo(() => selectedAge - 15, [selectedAge]);

  // Create age options array
  const ageOptions = useMemo(() => {
    const options: string[] = [];
    for (let i = 15; i <= 100; i++) {
      options.push(i.toString());
    }
    return options;
  }, []);

  const handleContinue = async () => {
    setAge(selectedAge);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    safePush("/onboarding/sex");
  };

  const handleAgeChange = async ({ nativeEvent: { index } }: { nativeEvent: { index: number } }) => {
    const ageValue = index + 15; // Convert index to age (offset by 15)
    setSelectedAge(ageValue);
    await Haptics.selectionAsync();
  };

  return (
    <OnboardingScreen
      scrollEnabled={false}
      title={<AppText role="Title2">{t("onboarding.age.title")}</AppText>}
      subtitle={
        <AppText role="Body" color="secondary" style={styles.secondaryText}>
          {t("onboarding.age.subtitle")}
        </AppText>
      }
      actionButton={
        <Button
          variant="primary"
          label={t("onboarding.common.continue")}
          onPress={handleContinue}
          isLoading={isNavigating}
        />
      }
    >
      <View style={styles.pickerSection}>
        <View style={styles.pickerArea}>
          <Host style={{ height: 200, width: 200 }}>
            <Picker
              options={ageOptions}
              selectedIndex={selectedIndex}
              onOptionSelected={handleAgeChange}
              variant="wheel"
            />
          </Host>
          <AppText role="Headline" style={styles.unitText}>
            {t("onboarding.age.unit")}
          </AppText>
        </View>
      </View>
    </OnboardingScreen>
  );
};

export default AgeSelectionScreen;

const createStyles = (colors: Colors, theme: Theme) => {
  const { spacing } = theme;
  return StyleSheet.create({
    secondaryText: {
      textAlign: "center",
      maxWidth: "75%",
      alignSelf: "center",
    },
    pickerSection: {
      alignItems: "center",
    },
    pickerArea: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: spacing.md,
    },
    unitText: {
      // Gap in pickerArea handles spacing
    },
  });
};
