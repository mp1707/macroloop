import React, {
  useEffect,
  useRef,
  memo,
  useState,
  useMemo,
  useCallback,
} from "react";
import { View, Pressable } from "react-native";
import {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Favorite, FoodLog } from "@/types/models";
import { useTheme } from "@/theme";
import { Card } from "@/components/Card";
import { AppText } from "@/components";
import { ContextMenu, ContextMenuItem } from "@/components/shared/ContextMenu";
import { useAppStore } from "@/store/useAppStore";
import { isNavLocked, lockNav } from "@/utils/navigationLock";
import { createStyles } from "./LogCard.styles";
import { NutritionList } from "./NutritionList";
import { createStyles as createNutritionStyles } from "./NutritionList/NutritionList.styles";
import { FoodComponentList } from "./FoodComponentList";
import { LogCardTitle } from "./LogCardTitle";
import { useTranslation } from "react-i18next";

interface LogCardProps {
  foodLog: FoodLog | Favorite;
  isLoading?: boolean;
  onLogAgain?: (log: FoodLog | Favorite) => void;
  onSaveToFavorites?: (log: FoodLog | Favorite) => void;
  onRemoveFromFavorites?: (log: FoodLog | Favorite) => void;
  onEdit?: (log: FoodLog | Favorite) => void;
  onDelete?: (log: FoodLog | Favorite) => void;
  contextMenuPreset?: "default" | "favorites";
}

// Animated variant used only for freshly created entries that transition from loading
type WithLongPress = {
  onLongPress?: () => void;
};

const AnimatedLogCard: React.FC<LogCardProps & WithLongPress> = ({
  foodLog,
  isLoading,
  onLongPress,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Note: press scale is handled by SwipeToFunctions to avoid double-scaling

  // Track previous loading state to detect completion
  const previousLoadingRef = useRef(isLoading);
  const hapticTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Animation values for staggered reveal
  const titleOpacity = useSharedValue(isLoading ? 0 : 1);
  const nutritionOpacity = useSharedValue(isLoading ? 0 : 1);

  const displayTitle = foodLog.title || t("logCard.fallbackTitle");

  useEffect(() => {
    const wasLoading = previousLoadingRef.current;

    if (!isLoading && wasLoading) {
      // Only animate when transitioning from loading to loaded state
      // Trigger haptic feedback when loading completes
      hapticTimerRef.current = setTimeout(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        hapticTimerRef.current = null;
      }, 300);

      // Staggered reveal animation sequence
      titleOpacity.value = withDelay(
        0,
        withSpring(1, { stiffness: 400, damping: 30 })
      );
      nutritionOpacity.value = withDelay(
        150,
        withSpring(1, { stiffness: 400, damping: 30 })
      );
    } else if (!isLoading && !wasLoading) {
      // If card renders without loading, show content immediately without animation
      titleOpacity.value = 1;
      nutritionOpacity.value = 1;
    } else if (isLoading) {
      // Hide content during loading
      titleOpacity.value = 0;
      nutritionOpacity.value = 0;
    }

    // Update the previous loading state
    previousLoadingRef.current = isLoading;

    // Cleanup haptic timer on unmount or when isLoading changes
    return () => {
      if (hapticTimerRef.current) {
        clearTimeout(hapticTimerRef.current);
        hapticTimerRef.current = null;
      }
    };
  }, [isLoading]);

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [
      {
        scale: 0.95 + titleOpacity.value * 0.05,
      },
    ],
  }));

  return (
    <Pressable
      style={styles.cardContainer}
      onLongPress={isLoading ? undefined : onLongPress}
      delayLongPress={500}
      accessibilityState={{ disabled: isLoading }}
    >
      <Card elevated={true} style={styles.card}>
        <View style={styles.contentContainer}>
          <View style={styles.leftSection}>
            <LogCardTitle
              title={displayTitle}
              isLoading={isLoading}
              animated={true}
              animatedStyle={titleAnimatedStyle}
              style={styles.title}
            />
            {(foodLog.percentageEaten ?? 100) !== 100 && (
              <AppText style={styles.percentageText}>
                {t("logCard.percentageEaten", {
                  percentage: foodLog.percentageEaten,
                })}
              </AppText>
            )}
            <FoodComponentList
              foodComponents={foodLog.foodComponents}
              maxItems={2}
              style={styles.foodComponentList}
            />
          </View>

          <View style={styles.rightSection}>
            <NutritionList
              nutrition={{
                calories:
                  foodLog.calories * ((foodLog.percentageEaten ?? 100) / 100),
                protein:
                  foodLog.protein * ((foodLog.percentageEaten ?? 100) / 100),
                carbs: foodLog.carbs * ((foodLog.percentageEaten ?? 100) / 100),
                fat: foodLog.fat * ((foodLog.percentageEaten ?? 100) / 100),
              }}
              isLoading={isLoading}
              wasLoading={previousLoadingRef.current}
            />
          </View>
        </View>
      </Card>
      {isLoading && (
        <View
          pointerEvents="auto"
          style={styles.interactionBlocker}
          accessible={false}
        />
      )}
    </Pressable>
  );
};

// ------------- Static subcomponents (no Reanimated in static path) -------------

type StaticNutritionListProps = {
  nutrition: { calories: number; protein: number; carbs: number; fat: number };
};

const StaticNutritionList: React.FC<StaticNutritionListProps> = memo(
  ({ nutrition }) => {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const nutritionStyles = useMemo(
      () => createNutritionStyles(colors),
      [colors]
    );

    const items = [
      {
        key: "calories",
        value: Math.round(nutrition.calories),
        label: t("logCard.nutrition.calories", {
          unit: t("nutrients.calories.unitShort"),
          label: t("nutrients.calories.label"),
        }),
        color: colors.semantic.calories,
        large: true,
      },
      {
        key: "protein",
        value: Math.round(nutrition.protein),
        label: t("logCard.nutrition.protein", {
          unit: t("nutrients.protein.unitShort"),
          label: t("nutrients.protein.label"),
        }),
        color: colors.semantic.protein,
      },
      {
        key: "carbs",
        value: Math.round(nutrition.carbs),
        label: t("logCard.nutrition.carbs", {
          unit: t("nutrients.carbs.unitShort"),
          label: t("nutrients.carbs.label"),
        }),
        color: colors.semantic.carbs,
      },
      {
        key: "fat",
        value: Math.round(nutrition.fat),
        label: t("logCard.nutrition.fat", {
          unit: t("nutrients.fat.unitShort"),
          label: t("nutrients.fat.label"),
        }),
        color: colors.semantic.fat,
      },
    ];

    return (
      <View style={nutritionStyles.nutritionList}>
        {items.map((item) => (
          <View key={item.key} style={nutritionStyles.nutritionRow}>
            <View
              style={[
                nutritionStyles.nutritionDot,
                { backgroundColor: item.color },
              ]}
            />
            <AppText style={nutritionStyles.nutritionText}>
              {item.value} {item.label}
            </AppText>
          </View>
        ))}
      </View>
    );
  }
);

// Ultra-light static variant for all non-loading cases
const StaticLogCard: React.FC<LogCardProps & WithLongPress> = ({
  foodLog,
  onLongPress,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Note: press scale is handled by SwipeToFunctions to avoid double-scaling

  const displayTitle = foodLog.title || t("logCard.fallbackTitle");

  return (
    <Pressable
      style={styles.cardContainer}
      onLongPress={onLongPress}
      delayLongPress={500}
    >
      <Card style={styles.card}>
        <View style={styles.contentContainer}>
          <View style={styles.leftSection}>
            <LogCardTitle title={displayTitle} style={styles.title} />
            {(foodLog.percentageEaten ?? 100) !== 100 && (
              <AppText style={styles.percentageText}>
                {t("logCard.percentageEaten", {
                  percentage: foodLog.percentageEaten,
                })}
              </AppText>
            )}
            <FoodComponentList
              foodComponents={foodLog.foodComponents}
              maxItems={2}
              style={styles.foodComponentList}
            />
          </View>

          <View style={styles.rightSection}>
            <StaticNutritionList
              nutrition={{
                calories:
                  foodLog.calories * ((foodLog.percentageEaten ?? 100) / 100),
                protein:
                  foodLog.protein * ((foodLog.percentageEaten ?? 100) / 100),
                carbs: foodLog.carbs * ((foodLog.percentageEaten ?? 100) / 100),
                fat: foodLog.fat * ((foodLog.percentageEaten ?? 100) / 100),
              }}
            />
          </View>
        </View>
      </Card>
    </Pressable>
  );
};

// Wrapper: choose animated only when needed, otherwise render lightweight static card
const LogCardInner: React.FC<LogCardProps> = ({
  foodLog,
  isLoading,
  onLogAgain,
  onSaveToFavorites,
  onRemoveFromFavorites,
  onEdit,
  onDelete,
  contextMenuPreset = "default",
}) => {
  const { t } = useTranslation();
  const hasEverBeenLoadingRef = useRef<boolean>(isLoading === true);
  const [useAnimatedVariant, setUseAnimatedVariant] = useState<boolean>(
    isLoading === true
  );

  useEffect(() => {
    if (isLoading) {
      hasEverBeenLoadingRef.current = true;
      setUseAnimatedVariant(true);
      return;
    }

    if (hasEverBeenLoadingRef.current) {
      // Allow animations to complete then switch to static (2000ms to avoid mid-animation switch)
      const timeout = setTimeout(() => setUseAnimatedVariant(false), 2000);
      return () => clearTimeout(timeout);
    }

    setUseAnimatedVariant(false);
  }, [isLoading]);

  const [menuVisible, setMenuVisible] = useState(false);
  const { favorites } = useAppStore();
  const isFavorite = useMemo(
    () => favorites.some((f) => f.id === (foodLog as any).id),
    [favorites, foodLog]
  );

  const items: ContextMenuItem[] = useMemo(() => {
    if (contextMenuPreset === "favorites") {
      const arr: ContextMenuItem[] = [];
      arr.push({
        label: t("logCard.contextMenu.createLog"),
        onPress: () => onLogAgain?.(foodLog),
      });
      arr.push({
        label: t("logCard.contextMenu.removeFromFavorites"),
        destructive: true,
        onPress: () => onRemoveFromFavorites?.(foodLog),
      });
      return arr;
    }

    const arr: ContextMenuItem[] = [];
    arr.push({
      label: t("logCard.contextMenu.logAgain"),
      onPress: () => onLogAgain?.(foodLog),
    });
    if (onSaveToFavorites || onRemoveFromFavorites) {
      arr.push({
        label: isFavorite
          ? t("logCard.contextMenu.removeFromFavorites")
          : t("logCard.contextMenu.saveToFavorites"),
        onPress: () =>
          isFavorite
            ? onRemoveFromFavorites?.(foodLog)
            : onSaveToFavorites?.(foodLog),
      });
    }
    arr.push({ label: t("common.edit"), onPress: () => onEdit?.(foodLog) });
    arr.push({
      label: t("common.delete"),
      destructive: true,
      onPress: () => onDelete?.(foodLog),
    });
    return arr;
  }, [
    contextMenuPreset,
    foodLog,
    onLogAgain,
    onSaveToFavorites,
    onRemoveFromFavorites,
    onEdit,
    onDelete,
    isFavorite,
    t,
  ]);

  const lastOpenRef = useRef<number>(0);
  const handleLongPress = useCallback(async () => {
    if (isNavLocked()) return; // prevent if a navigation/tap just triggered
    if (menuVisible) return; // already open
    const now = Date.now();
    if (now - lastOpenRef.current < 600) return; // throttle multiple opens
    lastOpenRef.current = now;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    // Prevent a follow-up tap from firing when the long-press menu opens
    lockNav(400);
    setMenuVisible(true);
  }, [menuVisible]);

  if (!isLoading && !hasEverBeenLoadingRef.current) {
    return (
      <>
        <StaticLogCard
          foodLog={foodLog}
          isLoading={false}
          onLongPress={handleLongPress}
        />
        <ContextMenu
          visible={menuVisible}
          items={items}
          onClose={() => setMenuVisible(false)}
        />
      </>
    );
  }

  if (useAnimatedVariant) {
    return (
      <>
        <AnimatedLogCard
          foodLog={foodLog}
          isLoading={isLoading}
          onLongPress={handleLongPress}
        />
        <ContextMenu
          visible={menuVisible}
          items={items}
          onClose={() => setMenuVisible(false)}
        />
      </>
    );
  }

  return (
    <>
      <StaticLogCard
        foodLog={foodLog}
        isLoading={false}
        onLongPress={handleLongPress}
      />
      <ContextMenu
        visible={menuVisible}
        items={items}
        onClose={() => setMenuVisible(false)}
      />
    </>
  );
};

// Memoize wrapper to avoid unnecessary re-renders when lists scroll
export const LogCard = memo(LogCardInner, (prev, next) => {
  if (prev.isLoading !== next.isLoading) return false;
  if (prev.onLogAgain !== next.onLogAgain) return false;
  if (prev.onSaveToFavorites !== next.onSaveToFavorites) return false;
  if (prev.onRemoveFromFavorites !== next.onRemoveFromFavorites) return false;
  if (prev.onEdit !== next.onEdit) return false;
  if (prev.onDelete !== next.onDelete) return false;
  if (prev.contextMenuPreset !== next.contextMenuPreset) return false;
  return prev.foodLog === next.foodLog;
});
