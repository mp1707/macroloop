import React, { useRef, useState, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Dimensions,
  ViewToken,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { X } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { RoundButton } from "@/components/shared/RoundButton";
import { DotProgressIndicator } from "@/components/explainer-macros/DotProgressIndicator";
import { MacrosOverview } from "@/components/explainer-macros/MacrosOverview";
import { CaloriesExplainer } from "@/components/explainer-macros/CaloriesExplainer";
import { ProteinExplainer } from "@/components/explainer-macros/ProteinExplainer";
import { FatExplainer } from "@/components/explainer-macros/FatExplainer";
import { CarbsExplainer } from "@/components/explainer-macros/CarbsExplainer";
import { Colors, Theme, useTheme } from "@/theme";
import { useSafeRouter } from "@/hooks/useSafeRouter";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface ExplainerPage {
  id: string;
  component: React.ComponentType<any>;
}

const PAGES: ExplainerPage[] = [
  { id: "macros", component: MacrosOverview },
  { id: "calories", component: CaloriesExplainer },
  { id: "protein", component: ProteinExplainer },
  { id: "fat", component: FatExplainer },
  { id: "carbs", component: CarbsExplainer },
];

export default function ExplainerMacrosScreen() {
  const { theme, colors } = useTheme();
  const styles = useMemo(() => createStyles(theme, colors), [theme, colors]);
  const router = useSafeRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    // Calories params
    calories_total?: string;
    calories_target?: string;
    calories_percentage?: string;
    // Protein params
    protein_total?: string;
    protein_target?: string;
    protein_percentage?: string;
    // Fat params
    fat_total?: string;
    fat_target?: string;
    fat_percentage?: string;
    // Carbs params
    carbs_total?: string;
  }>();

  const [currentPage, setCurrentPage] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentPage(viewableItems[0].index);
      }
    },
    []
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  // Parse params for each macro type
  const caloriesData = {
    total: params.calories_total ? parseInt(params.calories_total) : undefined,
    target: params.calories_target
      ? parseInt(params.calories_target)
      : undefined,
    percentage: params.calories_percentage
      ? parseInt(params.calories_percentage)
      : undefined,
  };

  const proteinData = {
    total: params.protein_total ? parseInt(params.protein_total) : undefined,
    target: params.protein_target ? parseInt(params.protein_target) : undefined,
    percentage: params.protein_percentage
      ? parseInt(params.protein_percentage)
      : undefined,
  };

  const fatData = {
    total: params.fat_total ? parseInt(params.fat_total) : undefined,
    target: params.fat_target ? parseInt(params.fat_target) : undefined,
    percentage: params.fat_percentage
      ? parseInt(params.fat_percentage)
      : undefined,
  };

  const carbsData = {
    total: params.carbs_total ? parseInt(params.carbs_total) : undefined,
  };

  const renderPage = useCallback(
    ({ item }: { item: ExplainerPage }) => {
      const Component = item.component;

      // Pass the correct data to each component based on its type
      let componentProps = {};
      switch (item.id) {
        case "calories":
          componentProps = caloriesData;
          break;
        case "protein":
          componentProps = proteinData;
          break;
        case "fat":
          componentProps = fatData;
          break;
        case "carbs":
          componentProps = carbsData;
          break;
        case "macros":
        default:
          componentProps = {};
          break;
      }

      return (
        <View style={styles.pageContainer}>
          <Component {...componentProps} />
        </View>
      );
    },
    [styles.pageContainer, caloriesData, proteinData, fatData, carbsData]
  );

  const keyExtractor = useCallback((item: ExplainerPage) => item.id, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.progressContainer}>
          <DotProgressIndicator
            currentPage={currentPage}
            totalPages={PAGES.length}
          />
        </View>
        <View style={styles.closeButton}>
          <RoundButton
            onPress={handleClose}
            Icon={X}
            variant="tertiary"
            accessibilityLabel={t("explainer.common.close")}
          />
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={PAGES}
        renderItem={renderPage}
        keyExtractor={keyExtractor}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        snapToInterval={SCREEN_WIDTH}
        decelerationRate="fast"
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />
    </View>
  );
}

const createStyles = (theme: Theme, colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.primaryBackground,
    },
    header: {
      paddingTop: theme.spacing.xxl + theme.spacing.lg,
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.lg,
      zIndex: 10,
    },
    progressContainer: {
      alignItems: "center",
      width: "100%",
    },
    closeButton: {
      position: "absolute",
      top: theme.spacing.md,
      right: theme.spacing.md,
      zIndex: 15,
    },
    pageContainer: {
      width: SCREEN_WIDTH,
      flex: 1,
    },
  });
