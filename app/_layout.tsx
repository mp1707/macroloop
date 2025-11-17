import { Stack } from "expo-router";
import { ThemeProvider, useTheme } from "@/theme";
import React, { useEffect } from "react";
import { useFonts } from "../src/hooks/useFonts";
import { useAppStore } from "@/store/useAppStore";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { HudNotification } from "@/components/shared/HudNotification";
import * as SplashScreen from "expo-splash-screen";
import {
  NavigationTransitionProvider,
  useNavigationTransition,
} from "@/context/NavigationTransitionContext";
import { useRevenueCat } from "@/hooks/useRevenueCat";
import "@/lib/i18n";
import { LocalizationProvider } from "@/context/LocalizationContext";
import { Image } from "expo-image";
import { ErrorBoundary } from "@/components/ErrorBoundary";

function ThemedStack() {
  const { colors, isThemeLoaded } = useTheme();
  const { fontsLoaded } = useFonts();
  const { setTransitioning } = useNavigationTransition();

  useEffect(() => {
    if (fontsLoaded && isThemeLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isThemeLoaded]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.primaryBackground },
      }}
      screenListeners={{
        transitionStart: () => setTransitioning(true),
        transitionEnd: () => setTransitioning(false),
      }}
    >
      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="new"
        options={{
          presentation: "fullScreenModal",
          headerShown: false,
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="editComponent"
        options={{
          presentation: "modal",
          headerShown: false,
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="calendarOverview"
        options={{
          presentation: "modal",
          headerShown: false,
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="onboarding"
        options={{
          presentation: "fullScreenModal",
          headerShown: false,
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="explainer-macros"
        options={{
          presentation: "modal",
          headerShown: false,
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="explainer-ai-estimation"
        options={{
          presentation: "modal",
          headerShown: false,
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="paywall"
        options={{
          presentation: "modal",
          headerShown: false,
          gestureEnabled: true,
        }}
      />
    </Stack>
  );
}

function RootLayoutContent() {
  const { colors } = useTheme();

  useRevenueCat();

  // Run cleanup once on mount - no dependencies to prevent re-runs
  useEffect(() => {
    // Cleanup incomplete estimations from previous sessions
    useAppStore.getState().cleanupIncompleteEstimations();

    // Clear image caches on app start for fresh state
    // expo-image automatically manages memory cache size (default ~50MB)
    // but we clear on start to ensure no stale images from crashed sessions
    Image.clearMemoryCache();
    Image.clearDiskCache();
  }, []);

  // Global error handler setup - runs once on mount only
  useEffect(() => {
    // Global error handlers to prevent silent crashes (React Native)
    const ErrorUtils = (global as any).ErrorUtils;
    if (ErrorUtils) {
      const originalHandler = ErrorUtils.getGlobalHandler();

      ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
        console.error("Global error:", error, "isFatal:", isFatal);
        // Call original handler to maintain default behavior
        originalHandler?.(error, isFatal);
      });

      return () => {
        // Restore original handler
        if (originalHandler) {
          ErrorUtils.setGlobalHandler(originalHandler);
        }
      };
    }
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <NavigationTransitionProvider>
            <ThemedStack />
          </NavigationTransitionProvider>
          <HudNotification />
        </KeyboardProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

export default function RootLayout() {
  return (
    <LocalizationProvider>
      <ThemeProvider>
        <RootLayoutContent />
      </ThemeProvider>
    </LocalizationProvider>
  );
}
