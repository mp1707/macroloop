import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {
  NativeTabs,
  Label,
  Icon,
  VectorIcon,
} from "expo-router/unstable-native-tabs";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Appearance, View } from "react-native";

export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors, colorScheme, isThemeLoaded } = useTheme();
  const hasLiquidGlass = isLiquidGlassAvailable();
  const deviceColorScheme = Appearance.getColorScheme();
  if (!isThemeLoaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: deviceColorScheme === "dark" ? "#000" : "#fff",
        }}
      />
    );
  }

  return (
    <NativeTabs
      blurEffect={colorScheme}
      minimizeBehavior="onScrollDown"
      labelStyle={
        !hasLiquidGlass
          ? {
              color: colors.secondaryText,
            }
          : undefined
      }
      iconColor={!hasLiquidGlass ? colors.secondaryText : undefined}
      disableTransparentOnScrollEdge
    >
      <NativeTabs.Trigger name="index">
        <Icon
          src={{
            default: (
              <VectorIcon
                family={MaterialCommunityIcons}
                name="notebook-outline"
              />
            ),
            selected: (
              <VectorIcon family={MaterialCommunityIcons} name="notebook" />
            ),
          }}
          selectedColor={colors.accent}
        />
        <Label selectedStyle={{ color: colors.accent }}>
          {t("tabs.logging")}
        </Label>
      </NativeTabs.Trigger>

      {/* <NativeTabs.Trigger name="favorites">
        <Icon
          src={{
            default: (
              <VectorIcon family={MaterialCommunityIcons} name="star-outline" />
            ),
            selected: (
              <VectorIcon family={MaterialCommunityIcons} name="star" />
            ),
          }}
          selectedColor={colors.accent}
        />
        <Label selectedStyle={{ color: colors.accent }}>Favorites</Label>
      </NativeTabs.Trigger> */}

      <NativeTabs.Trigger name="calendar">
        <Icon
          src={{
            default: (
              <VectorIcon
                family={MaterialCommunityIcons}
                name="calendar-outline"
              />
            ),
            selected: (
              <VectorIcon family={MaterialCommunityIcons} name="calendar" />
            ),
          }}
          selectedColor={colors.accent}
        />
        <Label selectedStyle={{ color: colors.accent }}>
          {t("tabs.calendar")}
        </Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="favorites">
        <Icon
          src={{
            default: (
              <VectorIcon family={MaterialCommunityIcons} name="star-outline" />
            ),
            selected: (
              <VectorIcon family={MaterialCommunityIcons} name="star" />
            ),
          }}
          selectedColor={colors.accent}
        />
        <Label>{t("tabs.favorites")}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon
          src={{
            default: (
              <VectorIcon family={MaterialCommunityIcons} name="cog-outline" />
            ),
            selected: <VectorIcon family={MaterialCommunityIcons} name="cog" />,
          }}
          selectedColor={colors.accent}
        />
        <Label selectedStyle={{ color: colors.accent }}>
          {t("tabs.settings")}
        </Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
