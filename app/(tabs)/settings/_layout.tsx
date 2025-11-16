import { Platform } from "react-native";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme";
import { isLiquidGlassAvailable } from "expo-glass-effect";

export default function SettingsLayout() {
  const { t } = useTranslation();
  const { colors, theme, colorScheme } = useTheme();
  const isIOS = Platform.OS === "ios";
  const hasLiquidGlass = isLiquidGlassAvailable();

  return (
    <Stack
      screenOptions={{
        headerTransparent: isIOS,
        headerBlurEffect: !hasLiquidGlass ? colorScheme : undefined,
        headerShadowVisible: true,
        headerTitleStyle: {
          color: colors.primaryText,
          fontFamily: theme.typography.Title1.fontFamily,
        },
        headerLargeTitleStyle: {
          color: colors.primaryText,
          fontFamily: theme.typography.Title1.fontFamily,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: t("settings.title"),
          headerLargeTitle: isIOS,
          headerLargeTitleShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="design"
        options={{
          title: t("settings.design.header"),
          headerLargeTitle: isIOS,
          headerLargeTitleShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="language"
        options={{
          title: t("settings.language.header"),
          headerLargeTitle: isIOS,
          headerLargeTitleShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="data-cleanup"
        options={{
          title: t("settings.dataCleanup.header"),
          headerLargeTitle: isIOS,
          headerLargeTitleShadowVisible: false,
        }}
      />
    </Stack>
  );
}
