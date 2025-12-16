import React, { useMemo, useCallback } from "react";
import { View, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "@/components";
import { useTheme } from "@/theme";
import { useAppStore } from "@/store/useAppStore";
import { createStyles } from "./DateSliderHeader.styles";
import { formatDate } from "@/utils/dateHelpers";
import { HeaderButton } from "../../HeaderButton/HeaderButton.ios";
import * as Haptics from "expo-haptics";
import { useSafeRouter } from "@/hooks/useSafeRouter";

export const DateSliderHeader: React.FC = () => {
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);
  const { t, i18n } = useTranslation();
  const router = useSafeRouter();
  const selectedDate = useAppStore((state) => state.selectedDate);

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
      <HeaderButton
        variant="regular"
        size="regular"
        buttonProps={{ onPress: handleCalendarPress }}
        imageProps={{ systemName: "calendar" }}
      />
    </View>
  );
};
