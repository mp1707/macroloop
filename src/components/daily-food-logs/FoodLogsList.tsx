import React, { useRef, useEffect, useMemo, useCallback } from "react";
import { FlatList, ListRenderItem, View } from "react-native";
import * as Haptics from "expo-haptics";
import { FoodLog, Favorite } from "@/types/models";
import { FoodLogItem } from "./FoodLogItem";
import { NutrientDashboard } from "./NutrientSummary/NutrientDashboard";
import { HeaderButton } from "@/components/shared/HeaderButton/HeaderButton.ios";
import { useTheme } from "@/theme/ThemeProvider";
import { useSafeRouter } from "@/hooks/useSafeRouter";

const DEFAULT_TARGETS = { calories: 0, protein: 0, carbs: 0, fat: 0 };

interface FoodLogsListProps {
  foodLogs: FoodLog[];
  dailyPercentages: any;
  dailyTargets: any;
  dailyTotals: any;
  dynamicBottomPadding: number;
  headerOffset?: number;
  onDelete: (log: FoodLog | Favorite) => void;
  onToggleFavorite: (log: FoodLog) => void;
  onEdit: (log: FoodLog | Favorite) => void;
  onLogAgain: (log: FoodLog | Favorite) => void;
  onSaveToFavorites: (log: FoodLog | Favorite) => void;
  onRemoveFromFavorites: (log: FoodLog | Favorite) => void;
  onRetry?: (log: FoodLog) => void;
}

export const FoodLogsList: React.FC<FoodLogsListProps> = ({
  foodLogs,
  dailyPercentages,
  dailyTargets,
  dailyTotals,
  dynamicBottomPadding,
  headerOffset = 0,
  onDelete,
  onToggleFavorite,
  onEdit,
  onLogAgain,
  onSaveToFavorites,
  onRemoveFromFavorites,
  onRetry,
}) => {
  const { colors, theme } = useTheme();
  const router = useSafeRouter();
  const flatListRef = useRef<FlatList>(null);
  const prevDataRef = useRef({ length: foodLogs.length });

  useEffect(() => {
    const lengthIncreased = foodLogs.length > prevDataRef.current.length;

    // Scroll to top when a new log is added
    if (lengthIncreased) {
      flatListRef.current?.scrollToOffset({
        animated: true,
        offset: 0,
      });
    }

    prevDataRef.current = { length: foodLogs.length };
  }, [foodLogs.length]);

  const keyExtractor = useCallback((item: FoodLog) => item.id, []);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: 120, // Estimated LogCard height including gap
      offset: 120 * index,
      index,
    }),
    []
  );

  const renderItem: ListRenderItem<FoodLog> = useCallback(
    ({ item }) => (
      <FoodLogItem
        item={item}
        isLoading={item.isEstimating}
        onDelete={onDelete}
        onToggleFavorite={onToggleFavorite}
        onEdit={onEdit}
        onLogAgain={onLogAgain}
        onSaveToFavorites={onSaveToFavorites}
        onRemoveFromFavorites={onRemoveFromFavorites}
        onRetry={onRetry}
      />
    ),
    [
      onDelete,
      onToggleFavorite,
      onEdit,
      onLogAgain,
      onSaveToFavorites,
      onRemoveFromFavorites,
      onRetry,
    ]
  );

  const normalizedTargets = useMemo(
    () => dailyTargets || DEFAULT_TARGETS,
    [dailyTargets]
  );

  const handleCameraPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/new?mode=camera");
  }, [router]);

  const handleMicPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/new?mode=recording");
  }, [router]);

  const handleTypingPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/new?mode=typing");
  }, [router]);

  const ListHeaderComponent = useMemo(
    () => (
      <View style={{ paddingBottom: theme.spacing.lg }}>
        <NutrientDashboard
          percentages={dailyPercentages}
          targets={normalizedTargets}
          totals={dailyTotals}
        />
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: theme.spacing.lg,
          }}
        >
          <HeaderButton
            imageProps={{ systemName: "camera.fill" }}
            buttonProps={{ onPress: handleCameraPress }}
            variant="regular"
            size="regular"
          />
          <HeaderButton
            imageProps={{ systemName: "mic.fill" }}
            buttonProps={{ onPress: handleMicPress }}
            variant="regular"
            size="regular"
          />
          <HeaderButton
            imageProps={{ systemName: "text.cursor" }}
            buttonProps={{ onPress: handleTypingPress }}
            variant="regular"
            size="regular"
          />
        </View>
      </View>
    ),
    [
      dailyPercentages,
      normalizedTargets,
      dailyTotals,
      theme.spacing,
      handleCameraPress,
      handleMicPress,
      handleTypingPress,
    ]
  );

  const contentContainerStyle = useMemo(
    () => [
      {
        gap: theme.spacing.md,
        paddingBottom: dynamicBottomPadding,
        paddingTop: headerOffset,
      },
    ],
    [theme.spacing.md, dynamicBottomPadding, headerOffset]
  );

  return (
    <FlatList
      ref={flatListRef}
      data={foodLogs}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      getItemLayout={getItemLayout}
      scrollEventThrottle={16}
      style={{
        flex: 1,
        backgroundColor: colors.primaryBackground,
      }}
      contentContainerStyle={contentContainerStyle}
      ListHeaderComponent={ListHeaderComponent}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews
      initialNumToRender={3}
      maxToRenderPerBatch={5}
      windowSize={5}
      updateCellsBatchingPeriod={50}
      // contentInsetAdjustmentBehavior="automatic"
    />
  );
};
