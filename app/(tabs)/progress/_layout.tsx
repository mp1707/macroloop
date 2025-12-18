import { Platform } from "react-native";
import { Stack } from "expo-router";
import { useTheme } from "@/theme";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { useTranslation } from "react-i18next";

export default function ProgressLayout() {
  const { colors, theme, colorScheme } = useTheme();
  const { t } = useTranslation();
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
        contentStyle: {
          backgroundColor:
            colorScheme === "dark"
              ? colors.primaryBackground
              : colors.tertiaryBackground,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: t("tabs.progress"),
          headerLargeTitle: isIOS,
          headerLargeTitleShadowVisible: false,
        }}
      />
    </Stack>
  );
}
