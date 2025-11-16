import React, { useEffect, useMemo } from "react";
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

export const TargetMethodContent = () => {
  const { colors, theme: themeObj } = useTheme();
  const styles = useMemo(
    () => createContentStyles(colors, themeObj),
    [colors, themeObj]
  );
  const { t } = useTranslation();
  const { setInputMethod } = useOnboardingStore();
  const { safePush } = useNavigationGuard();

  const handleMethodSelect = async (method: "calculate" | "manual") => {
    setInputMethod(method);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (method === "calculate") {
      safePush("/onboarding/age");
    } else {
      safePush("/onboarding/manual-input");
    }
  };

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerSection}>
        <AppText role="Title2" style={styles.text}>
          {t("onboarding.targetMethod.title")}
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
  );
};

const TargetMethodScreen = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createScreenStyles(colors), [colors]);
  const { safeDismissTo, safeBack } = useNavigationGuard();
  const { setUserSkippedOnboarding, reset } = useOnboardingStore();

  const handleSkip = () => {
    setUserSkippedOnboarding(true);
    safeDismissTo("/");
  };

  const handleBack = () => {
    safeBack();
  };

  useEffect(() => {
    // Reset onboarding store to ensure clean state
    reset();
  }, [reset]);

  return (
    <View style={styles.container}>
      <OnboardingHeader
        onBack={handleBack}
        onSkip={handleSkip}
        hideBackButton={true}
      />
      <TargetMethodContent />
    </View>
  );
};

export default TargetMethodScreen;

const createScreenStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.primaryBackground,
    },
  });

const createContentStyles = (colors: Colors, themeObj: Theme) => {
  const { spacing } = themeObj;

  return StyleSheet.create({
    scrollView: {
      flex: 1,
      paddingVertical: themeObj.spacing.xxl * 3,
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
    text: {
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
