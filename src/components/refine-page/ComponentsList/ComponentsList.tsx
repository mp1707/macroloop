import React, { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { TouchableOpacity, View } from "react-native";
import { Plus } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { AppText } from "@/components";
import { useTheme } from "@/theme";
import { createStyles } from "./ComponentsList.styles";
import type { FoodComponent } from "@/types/models";
import { ComponentRow } from "./ComponentRow";
import Animated, { Easing, Layout } from "react-native-reanimated";
import { useTranslation } from "react-i18next";

// Extended FoodComponent with UI-only stale indicator
type EditableFoodComponent = FoodComponent & {
  isStale?: boolean;
  _ui_id?: string;
};

const easeLayout = Layout.duration(220).easing(Easing.inOut(Easing.quad));

interface ComponentsListProps {
  components: EditableFoodComponent[];
  onPressItem: (index: number, comp: EditableFoodComponent) => void;
  onDeleteItem: (index: number) => void;
  onAddPress: () => void;
  onAcceptRecommendation: (index: number, comp: EditableFoodComponent) => void;
  disabled?: boolean;
  headerAction?: React.ReactNode;
}

export const ComponentsList: React.FC<ComponentsListProps> = ({
  components,
  onPressItem,
  onDeleteItem,
  onAddPress,
  onAcceptRecommendation,
  disabled,
  headerAction,
}) => {
  const { colors, theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const acceptTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Simplified: handleRowTap now only opens the edit modal
  const handleRowTap = useCallback(
    (index: number, comp: EditableFoodComponent) => {
      onPressItem(index, comp);
    },
    [onPressItem]
  );

  // New: separate handler for toggling expansion
  const handleToggleExpansion = useCallback((index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  }, []);

  const handleAcceptRecommendation = useCallback(
    (index: number, comp: EditableFoodComponent) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // First collapse the expansion to trigger animation
      setExpandedIndex(null);

      // Clear any existing timer
      if (acceptTimerRef.current) {
        clearTimeout(acceptTimerRef.current);
      }

      // Then update data after animation completes
      acceptTimerRef.current = setTimeout(() => {
        onAcceptRecommendation(index, comp);
        acceptTimerRef.current = null;
      }, 300); // Allow smooth collapse animation (250ms + buffer)
    },
    [onAcceptRecommendation]
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (acceptTimerRef.current) {
        clearTimeout(acceptTimerRef.current);
      }
    };
  }, []);

  return (
    <Animated.View layout={easeLayout} style={styles.container}>
      <View style={styles.sectionHeaderRow}>
        <AppText role="Caption" style={styles.sectionHeader}>
          {t("componentsList.sectionTitle")}
        </AppText>
        {headerAction ? (
          <View style={styles.sectionHeaderAction}>{headerAction}</View>
        ) : null}
      </View>

      <Animated.View layout={easeLayout} style={styles.listContainer}>
        {components.map((comp, index) => (
          <Animated.View
            key={comp._ui_id ?? `${comp.name}-${index}`}
            layout={easeLayout}
          >
            <ComponentRow
              component={comp}
              index={index}
              isExpanded={expandedIndex === index}
              onTap={handleRowTap}
              onToggleExpansion={handleToggleExpansion}
              onDelete={onDeleteItem}
              onAcceptRecommendation={handleAcceptRecommendation}
            />
            {index < components.length - 1 && (
              <Animated.View layout={easeLayout} style={styles.separator} />
            )}
          </Animated.View>
        ))}
        <Animated.View layout={easeLayout} style={styles.separator} />
        <Animated.View layout={easeLayout}>
          <TouchableOpacity
            onPress={onAddPress}
            style={styles.addRow}
            disabled={disabled}
            accessibilityLabel={t("componentsList.addButton")}
            accessibilityRole="button"
          >
            <Plus size={18} color={colors.accent} />
            <AppText style={styles.addLabel} color="accent">
              {t("componentsList.addButton")}
            </AppText>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
};
