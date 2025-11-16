import { useCallback, useMemo } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import type { ListRenderItem } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import type { Theme } from "@/theme";
import type { Favorite } from "@/types/models";
import { FavoritePreviewCard } from "@/components/create-page/FavoritePreviewCard/FavoritePreviewCard";
import { CARD_WIDTH } from "@/constants/create";

interface FavoritesSectionProps {
  favorites: Favorite[];
  onSelectFavorite: (favorite: Favorite) => void;
  isVisible: boolean;
  minHeight?: number;
}

export const FavoritesSection = ({
  favorites,
  onSelectFavorite,
  isVisible,
  minHeight,
}: FavoritesSectionProps) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const noFavsFound = favorites.length === 0;

  const renderFavoriteCard = useCallback<ListRenderItem<Favorite>>(
    ({ item }) => (
      <FavoritePreviewCard
        favorite={item}
        onPress={() => onSelectFavorite(item)}
        width={CARD_WIDTH}
      />
    ),
    [onSelectFavorite]
  );

  if (!isVisible || noFavsFound) return null;

  return (
    <View style={[styles.favoritesSection, { minHeight }]}>
      {favorites.length > 0 && (
        <FlatList
          horizontal
          data={favorites}
          renderItem={renderFavoriteCard}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => (
            <View style={styles.favoriteSeparator} />
          )}
          showsHorizontalScrollIndicator={false}
          contentInset={{ left: theme.spacing.sm }}
          contentContainerStyle={styles.favoritesListContent}
        />
      )}
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    favoritesSection: {
      justifyContent: "center",
      marginVertical: -theme.spacing.xl,
    },
    favoritesListContent: {
      paddingRight: theme.spacing.xl,
      paddingLeft: theme.spacing.sm,
      paddingVertical: theme.spacing.xl,
    },
    favoriteSeparator: {
      width: theme.spacing.sm,
    },
  });
