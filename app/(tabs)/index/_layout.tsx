import { Platform, StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { Colors, Theme, useTheme } from "@/theme";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaskedView from "@react-native-masked-view/masked-view";
import { BlurView } from "expo-blur";
import { DateSlider } from "@/components/shared/DateSlider";

export default function IndexLayout() {
  const { colors, theme, colorScheme } = useTheme();
  const isIOS = Platform.OS === "ios";
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const hasLiquidGlass = isLiquidGlassAvailable();
  const transparentBackground = colors.primaryBackground + "00";
  // Dynamic header height calculation
  const headerHeight = useMemo(
    () => theme.layout.calculateHeaderHeight(insets.top),
    [theme.layout, insets.top]
  );

  const styles = useMemo(
    () => createStyles(colors, headerHeight, theme),
    [colors, headerHeight, theme]
  );

  return (
    <Stack initialRouteName="index">
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          headerTransparent: true,
          header: () => (
            <View style={[styles.headerContainer, { height: headerHeight }]}>
              <LinearGradient
                colors={[colors.primaryBackground, transparentBackground]}
                locations={[0.75, 1]}
                style={[styles.gradientOverlay, { height: headerHeight + 16 }]}
                pointerEvents="none"
              />

              <MaskedView
                style={[styles.blurWrapper, { height: headerHeight + 16 }]}
                pointerEvents="none"
                maskElement={
                  <LinearGradient
                    colors={[
                      colors.primaryBackground,
                      colors.primaryBackground,
                      "transparent",
                    ]}
                    locations={[0, 0.7, 1]}
                    style={{ flex: 1 }}
                  />
                }
              >
                <BlurView
                  intensity={20}
                  tint={colorScheme}
                  style={styles.blurContainer}
                  pointerEvents="none"
                />
              </MaskedView>

              <View
                style={[styles.dateSliderWrapper, { height: headerHeight }]}
                pointerEvents="box-none"
              >
                <View style={{ paddingTop: insets.top }}>
                  <DateSlider />
                </View>
              </View>
            </View>
          ),
        }}
      />
      <Stack.Screen
        name="edit/[id]"
        options={{
          headerShown: true,
          headerTintColor: colors.accent,
          headerTransparent: hasLiquidGlass && isIOS,
          headerShadowVisible: true,
          headerTitleStyle: {
            color: colors.primaryText,
            fontFamily: theme.typography.Headline.fontFamily,
            fontSize: theme.typography.Headline.fontSize,
            fontWeight: theme.typography.Headline.fontWeight,
          },
          headerStyle: !hasLiquidGlass && {
            backgroundColor: colors.primaryBackground,
          },
          headerTitle: t("common.edit"),
          gestureEnabled: true,
          navigationBarHidden: true,
        }}
      />
    </Stack>
  );
}

const createStyles = (colors: Colors, _headerHeight: number, theme: Theme) => {
  return StyleSheet.create({
    headerContainer: {
      width: "100%",
      // backgroundColor: colors.primaryBackground,
      justifyContent: "flex-end",
    },
    blurWrapper: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 2,
    },
    gradientOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      opacity: 0.8,
      zIndex: 1,
    },
    blurContainer: {
      flex: 1,
    },
    dateSliderWrapper: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 3,
    },
    primaryButtonContainer: {
      position: "absolute",
      bottom: 120,
      right: theme.spacing.xxl + 10,
      // left: theme.spacing.xl,
      alignItems: "center",
    },
  });
};
