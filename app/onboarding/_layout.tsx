import { Stack, usePathname } from "expo-router";
import { useTheme } from "@/theme";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import { View } from "react-native";
import React, { useMemo } from "react";
import { useNavigationTransition } from "@/context/NavigationTransitionContext";
import { HeaderButton } from "../../src/components/shared/HeaderButton";
import { ProgressBar } from "../../src/components/onboarding/ProgressBar";
import { isLiquidGlassAvailable } from "expo-glass-effect";

// Manual flow step mapping
const MANUAL_STEP_MAP: Record<string, number> = {
  "/onboarding/manual-input": 1,
  "/onboarding/manual-summary": 2,
};

// Calculate flow step mapping
const CALCULATE_STEP_MAP: Record<string, number> = {
  "/onboarding/age": 1,
  "/onboarding/sex": 2,
  "/onboarding/height": 3,
  "/onboarding/weight": 4,
  "/onboarding/activity-level": 5,
  "/onboarding/calorie-goal": 6,
  "/onboarding/protein-goal": 7,
};

export default function OnboardingLayout() {
  const { colors } = useTheme();
  const { safeDismissTo, safeBack } = useNavigationGuard();
  const { setUserSkippedOnboarding } = useOnboardingStore();
  const { setTransitioning } = useNavigationTransition();
  const pathname = usePathname();

  // Detect which flow the user is in
  const isManualFlow = pathname.includes("/manual-");
  const isTargetMethod = pathname === "/onboarding/target-method";
  const isSummary =
    pathname === "/onboarding/calculator-summary" ||
    pathname === "/onboarding/manual-summary";

  // Get current step based on flow type
  const currentStep = useMemo(() => {
    if (isTargetMethod || isSummary) return -1; // No progress bar on these screens
    if (isManualFlow) return MANUAL_STEP_MAP[pathname] ?? -1;
    return CALCULATE_STEP_MAP[pathname] ?? -1;
  }, [pathname, isManualFlow, isTargetMethod, isSummary]);

  // Dynamic total steps based on flow
  const totalSteps = isManualFlow ? 2 : 7;
  const showProgressBar = currentStep >= 0 && !isManualFlow;

  const handleSkip = () => {
    setUserSkippedOnboarding(true);
    safeDismissTo("/");
  };

  const handleBack = () => {
    safeBack();
  };

  const hasLiquidGlass = isLiquidGlassAvailable();

  // Header configuration
  const getHeaderConfig = () => ({
    headerShown: true,
    headerTransparent: true,
    headerTitle: "",
    headerLeft: () => (
      <HeaderButton
        imageProps={{
          systemName: "chevron.left",
        }}
        buttonProps={{
          onPress: handleBack,
          color: hasLiquidGlass ? undefined : colors.tertiaryBackground,
        }}
      />
    ),
    headerRight: () => (
      <HeaderButton
        imageProps={{
          systemName: "xmark",
        }}
        buttonProps={{
          onPress: handleSkip,
          color: hasLiquidGlass ? undefined : colors.tertiaryBackground,
        }}
      />
    ),
  });

  return (
    <Stack
      screenOptions={{
        animation: "slide_from_right",
        contentStyle: { backgroundColor: colors.primaryBackground },
        ...getHeaderConfig(),
      }}
      screenListeners={{
        transitionStart: () => setTransitioning(true),
        transitionEnd: () => setTransitioning(false),
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="target-method" options={{ headerShown: false }} />
      <Stack.Screen name="age" />
      <Stack.Screen name="sex" />
      <Stack.Screen name="height" />
      <Stack.Screen name="weight" />
      <Stack.Screen name="activity-level" />
      <Stack.Screen name="calorie-goal" />
      <Stack.Screen name="protein-goal" />
      <Stack.Screen name="manual-input" />
      <Stack.Screen name="manual-summary" options={{ headerShown: false }} />
      <Stack.Screen name="calculator-summary" options={{ headerShown: false }} />
    </Stack>
  );
}
