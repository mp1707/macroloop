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
          presentation: "modal",
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
  const cleanupIncompleteEstimations = useAppStore(
    (state) => state.cleanupIncompleteEstimations
  );

  useRevenueCat();

  useEffect(() => {
    // Cleanup incomplete estimations from previous sessions
    cleanupIncompleteEstimations();

    // Clear image caches on app start for fresh state
    // expo-image automatically manages memory cache size (default ~50MB)
    // but we clear on start to ensure no stale images from crashed sessions
    Image.clearMemoryCache();
    Image.clearDiskCache();

    // Global error handlers to prevent silent crashes
    const errorHandler = (error: ErrorEvent) => {
      console.error("Global error:", error.error);
      // Prevent default crash behavior
      return true;
    };

    const rejectionHandler = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);
      // Prevent default crash behavior
      event.preventDefault();
    };

    // @ts-ignore - These exist in React Native environment
    global.addEventListener?.("error", errorHandler);
    // @ts-ignore
    global.addEventListener?.("unhandledrejection", rejectionHandler);

    return () => {
      // @ts-ignore
      global.removeEventListener?.("error", errorHandler);
      // @ts-ignore
      global.removeEventListener?.("unhandledrejection", rejectionHandler);
    };
  }, [cleanupIncompleteEstimations]);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView
        style={{ flex: 1, backgroundColor: colors.primaryBackground }}
      >
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
