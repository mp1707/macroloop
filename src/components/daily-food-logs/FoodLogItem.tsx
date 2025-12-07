import React from "react";
import Animated, { LinearTransition } from "react-native-reanimated";
import { Star } from "lucide-react-native";
import { SwipeToFunctions } from "@/components/shared/SwipeToFunctions";
import { LogCard } from "@/components/daily-food-logs/LogCard";
import { FoodLog, Favorite } from "@/types/models";
import { useTheme } from "@/theme/ThemeProvider";

interface FoodLogItemProps {
  item: FoodLog;
  isLoading?: boolean;
  onDelete: (log: FoodLog | Favorite) => void;
  onToggleFavorite: (log: FoodLog) => void;
  onEdit: (log: FoodLog | Favorite) => void;
  onLogAgain: (log: FoodLog | Favorite) => void;
  onSaveToFavorites: (log: FoodLog | Favorite) => void;
  onRemoveFromFavorites: (log: FoodLog | Favorite) => void;
  onRetry?: (log: FoodLog) => void;
}

export const FoodLogItem: React.FC<FoodLogItemProps> = ({
  item,
  isLoading,
  onDelete,
  onToggleFavorite,
  onEdit,
  onLogAgain,
  onSaveToFavorites,
  onRemoveFromFavorites,
  onRetry,
}) => {
  const { theme } = useTheme();
  const isItemLoading = Boolean(isLoading ?? item.isEstimating);
  const isItemFailed = Boolean(item.estimationFailed);

  // Disable general interactions (edit/favorite) for loading or failed states
  const disableInteractions = isItemLoading || isItemFailed;

  return (
    <Animated.View
      style={{ paddingHorizontal: theme.spacing.md }}
      layout={LinearTransition}
    >
      <SwipeToFunctions
        onDelete={isItemLoading ? undefined : () => onDelete(item)}
        onLeftFunction={
          disableInteractions ? undefined : () => onToggleFavorite(item)
        }
        leftIcon={disableInteractions ? undefined : <Star size={24} color="white" />}
        onTap={disableInteractions ? undefined : () => onEdit(item)}
      >
        <LogCard
          foodLog={item}
          isLoading={isItemLoading}
          isFailed={isItemFailed}
          onRetry={onRetry}
          onLogAgain={onLogAgain}
          onSaveToFavorites={onSaveToFavorites}
          onRemoveFromFavorites={onRemoveFromFavorites}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </SwipeToFunctions>
    </Animated.View>
  );
};
