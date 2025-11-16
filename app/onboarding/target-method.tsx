import React, { useMemo } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { AppText } from "@/components/shared/AppText";
import { useTheme } from "@/theme";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";
import * as Haptics from "expo-haptics";
import { Calculator, Edit2 } from "lucide-react-native";
import { SelectionCard } from "@/components/settings/SelectionCard";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import { useTranslation } from "react-i18next";
import { OnboardingHeader } from "../../src/components/onboarding/OnboardingHeader";
import type { Colors, Theme } from "@/theme";

const TargetMethodScreen = () => {
  const { colors, theme: themeObj } = useTheme();
  const styles = useMemo(
    () => createStyles(colors, themeObj),
    [colors, themeObj]
  );
  const { safePush, safeDismissTo, safeBack } = useNavigationGuard();
  const { setInputMethod, setUserSkippedOnboarding } = useOnboardingStore();
  const { t } = useTranslation();

  const handleMethodSelect = async (method: "calculate" | "manual") => {
    setInputMethod(method);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (method === "calculate") {
      safePush("/onboarding/age");
    } else {
      safePush("/onboarding/manual-input");
    }
  };

  const handleSkip = () => {
    setUserSkippedOnboarding(true);
    safeDismissTo("/");
  };

  const handleBack = () => {
    safeBack();
  };

  return (
    <View style={styles.container}>
      <OnboardingHeader
        onBack={handleBack}
        onSkip={handleSkip}
        hideBackButton={true}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSection}>
          <AppText role="Title2">
            {t("onboarding.targetMethod.title")}
          </AppText>
          <AppText role="Body" color="secondary" style={styles.secondaryText}>
            {t("onboarding.targetMethod.subtitle")}
          </AppText>
        </View>

        <View style={styles.contentWrapper}>
          <View style={styles.methodsSection}>
            <SelectionCard
              title={t("onboarding.targetMethod.options.calculate.title")}
              description={t(
                "onboarding.targetMethod.options.calculate.description"
              )}
              icon={Calculator}
              iconColor={colors.accent}
              isSelected={false}
              onSelect={() => handleMethodSelect("calculate")}
              accessibilityLabel={t(
                "onboarding.targetMethod.options.calculate.accessibilityLabel"
              )}
              accessibilityHint={t(
                "onboarding.targetMethod.options.calculate.accessibilityHint"
              )}
            />

            <SelectionCard
              title={t("onboarding.targetMethod.options.manual.title")}
              description={t(
                "onboarding.targetMethod.options.manual.description"
              )}
              icon={Edit2}
              iconColor={colors.accent}
              isSelected={false}
              onSelect={() => handleMethodSelect("manual")}
              accessibilityLabel={t(
                "onboarding.targetMethod.options.manual.accessibilityLabel"
              )}
              accessibilityHint={t(
                "onboarding.targetMethod.options.manual.accessibilityHint"
              )}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default TargetMethodScreen;

const createStyles = (colors: Colors, themeObj: Theme) => {
  const { spacing } = themeObj;

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
    secondaryText: {
      textAlign: "center",
      maxWidth: "75%",
      alignSelf: "center",
    },
    contentWrapper: {
      flex: 1,
      paddingHorizontal: spacing.md,
      justifyContent: "center",
    },
    methodsSection: {
      gap: spacing.md,
    },
  });
};
