import React, { useMemo, useCallback } from "react";
import { View, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "@/components";
import { useTheme } from "@/theme";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";
import { useAppStore } from "@/store/useAppStore";
import { createStyles } from "./DateSliderHeader.styles";
import { formatDate } from "@/utils/dateHelpers";
import { hasDailyTargetsSet } from "@/utils";
import { HeaderButton } from "../../HeaderButton/HeaderButton.ios";
import * as Haptics from "expo-haptics";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { useSafeRouter } from "@/hooks/useSafeRouter";

export const DateSliderHeader: React.FC = () => {
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);
  const { t, i18n } = useTranslation();
  const { safeNavigate } = useNavigationGuard();
  const router = useSafeRouter();
  const selectedDate = useAppStore((state) => state.selectedDate);
  const dailyTargets = useAppStore((state) => state.dailyTargets);
  const hasLiquidGlass = isLiquidGlassAvailable();

  const hasGoals = hasDailyTargetsSet(dailyTargets);

  const handleLogPress = useCallback(
    (mode: "camera" | "recording" | "typing") => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      safeNavigate(`/new?mode=${mode}`);
    },
    [safeNavigate]
  );

  const handleCalendarPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/calendar-modal");
  }, [router]);

  return (
    <View style={styles.header}>
      <Pressable
        onPress={handleCalendarPress}
        style={({ pressed }) => [
          styles.dateButton,
          pressed && styles.dateButtonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={t("calendar.a11y.openCalendar")}
      >
        <AppText role="Title1" style={styles.headerTitle}>
          {formatDate(selectedDate, { t, locale: i18n.language })}
        </AppText>
      </Pressable>
      {hasGoals && (
        <HeaderButton
          variant="regular"
          size="regular"
          buttonProps={{ onPress: () => handleLogPress("typing") }}
          imageProps={{ systemName: "plus" }}
        />
      )}
    </View>
  );
};
