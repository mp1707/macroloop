import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ScrollView,
  ScrollView as RNScrollView,
} from "react-native-gesture-handler";
import Animated, { Easing, Layout } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import { Calculator, Star } from "lucide-react-native";

import { AppText } from "@/components/index";
import { ComponentsList } from "@/components/refine-page/ComponentsList/ComponentsList";
import { MacrosCard } from "@/components/refine-page/MacrosCard/MacrosCard";
import { RecalculateButton } from "@/components/refine-page/RecalculateButton";
import { InlinePaywallCard } from "@/components/paywall/InlinePaywallCard";
import { ImageDisplay } from "@/components/shared/ImageDisplay";
import { TextInput } from "@/components/shared/TextInput";
import { useEstimation } from "@/hooks/useEstimation";
import { usePaywall } from "@/hooks/usePaywall";
import { useSafeRouter } from "@/hooks/useSafeRouter";
import { makeSelectLogById } from "@/store/selectors";
import { useAppStore } from "@/store/useAppStore";
import type { FoodComponent } from "@/types/models";
import { Colors, Theme, useTheme } from "@/theme";
import { useEditableTitle } from "@/components/refine-page/hooks/useEditableTitle";
import { useEditChangeTracker } from "@/components/refine-page/hooks/useEditChangeTracker";
import { useEditedLog } from "@/components/refine-page/hooks/useEditedLog";
import { Host, Image, Slider } from "@expo/ui/swift-ui";
import { createToggleFavoriteHandler } from "@/utils/foodLogHandlers";
import { useTranslation } from "react-i18next";

const easeLayout = Layout.duration(220).easing(Easing.inOut(Easing.quad));

export default function Edit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const originalLog = useAppStore(makeSelectLogById(id));
  const updateFoodLog = useAppStore((state) => state.updateFoodLog);
  const isPro = useAppStore((state) => state.isPro);
  const favorites = useAppStore((state) => state.favorites);
  const addFavorite = useAppStore((state) => state.addFavorite);
  const deleteFavorite = useAppStore((state) => state.deleteFavorite);
  const isVerifyingSubscription = useAppStore(
    (state) => state.isVerifyingSubscription
  );
  const pendingComponentEdit = useAppStore(
    (state) => state.pendingComponentEdit
  );
  const clearPendingComponentEdit = useAppStore(
    (state) => state.clearPendingComponentEdit
  );

  const router = useSafeRouter();
  const navigation = useNavigation();
  const { colors, theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);

  // Get trial info for paywall
  const { options } = usePaywall();
  const trialDays = options[0]?.trialInfo?.days;

  const {
    hasUnsavedChanges,
    changesCount,
    hasReestimated,
    markComponentChange,
    markReestimated,
  } = useEditChangeTracker();

  const { runEditEstimation, isEditEstimating } = useEstimation();

  const {
    editedLog,
    isDirty,
    replaceEditedLog,
    updateTitle,
    deleteComponent,
    acceptRecommendation,
  } = useEditedLog({
    logId: id,
    originalLog,
    pendingComponentEdit,
    clearPendingComponentEdit,
    onComponentChange: markComponentChange,
  });

  const {
    isEditing: isTitleEditing,
    draftTitle,
    startEditing,
    handleChange,
    handleBlur,
    commit,
  } = useEditableTitle({
    title: editedLog?.title ?? "",
    onCommit: updateTitle,
  });

  const scrollRef = useRef<RNScrollView | null>(null);
  const [revealKey, setRevealKey] = useState(0);
  const previousLoadingRef = useRef<boolean>(isEditEstimating);

  useEffect(() => {
    previousLoadingRef.current = isEditEstimating;
  }, [isEditEstimating]);

  const percentageEaten = editedLog?.percentageEaten ?? 100;

  const updatePercentageEaten = useCallback(
    (newPercentage: number) => {
      if (!editedLog) return;
      replaceEditedLog({ ...editedLog, percentageEaten: newPercentage });
    },
    [editedLog, replaceEditedLog]
  );

  const titleChanged = draftTitle.trim() !== (originalLog?.title || "").trim();
  const percentageChanged = percentageEaten !== (originalLog?.percentageEaten ?? 100);

  const handleOpenEditor = useCallback(
    (index: number, component: FoodComponent) => {
      router.push(
        `/editComponent?mode=edit&index=${index}&name=${encodeURIComponent(
          component.name
        )}&amount=${component.amount}&unit=${component.unit}&logId=${id}`
      );
    },
    [router, id]
  );

  const handleAddComponent = useCallback(() => {
    router.push(`/editComponent?mode=create&logId=${id}`);
  }, [router, id]);

  const toggleFavorite = useMemo(
    () =>
      createToggleFavoriteHandler(addFavorite, deleteFavorite, favorites, t),
    [addFavorite, deleteFavorite, favorites, t]
  );

  const isFavorite = useMemo(() => {
    if (!id) return false;
    return favorites.some((favorite) => favorite.id === id);
  }, [favorites, id]);

  const handleShowPaywall = useCallback(() => {
    router.push("/paywall");
  }, [router]);

  const handleReestimate = useCallback(async () => {
    if (!editedLog) return;
    if (!isPro) {
      handleShowPaywall();
      return;
    }

    scrollRef.current?.scrollToEnd({ animated: true });

    try {
      await runEditEstimation(editedLog, (log) => {
        replaceEditedLog(log);
      });
      markReestimated();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRevealKey((key) => key + 1);
    } catch (error) {
      // Optional: silence for now; toasts handled elsewhere
    }
  }, [
    editedLog,
    isPro,
    handleShowPaywall,
    runEditEstimation,
    replaceEditedLog,
    markReestimated,
  ]);

  const commitTitleBeforeSave = useCallback(() => {
    commit();
  }, [commit]);

  const saveFoodLog = useCallback(() => {
    if (!id || !editedLog) return;

    const trimmedTitle = draftTitle.trim();
    updateFoodLog(id, {
      title: trimmedTitle,
      calories: editedLog.calories,
      protein: editedLog.protein,
      carbs: editedLog.carbs,
      fat: editedLog.fat,
      foodComponents: editedLog.foodComponents || [],
      macrosPerReferencePortion: editedLog.macrosPerReferencePortion,
      percentageEaten,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }, [draftTitle, editedLog, id, router, updateFoodLog, percentageEaten]);

  const handleDone = useCallback(() => {
    commitTitleBeforeSave();

    if (hasUnsavedChanges && !hasReestimated) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(t("editLog.alert.title"), t("editLog.alert.message"), [
        {
          text: t("editLog.alert.recalculate"),
          style: "default",
          onPress: async () => {
            await handleReestimate();
          },
        },
        {
          text: t("editLog.alert.saveAnyway"),
          style: "default",
          onPress: () => {
            saveFoodLog();
          },
        },
        {
          text: t("common.cancel"),
          style: "cancel",
        },
      ]);
      return;
    }
    saveFoodLog();
  }, [
    commitTitleBeforeSave,
    hasUnsavedChanges,
    hasReestimated,
    handleReestimate,
    saveFoodLog,
    t,
  ]);

  const doneDisabled =
    isEditEstimating ||
    Boolean(originalLog?.isEstimating) ||
    (!hasReestimated &&
      !isDirty &&
      !titleChanged &&
      !percentageChanged &&
      !hasUnsavedChanges &&
      changesCount === 0);

  useEffect(() => {
    navigation.setOptions({
      headerBackTitle: t("editLog.navigation.backTitle"),
      headerRight: () => (
        <Pressable
          onPress={handleDone}
          disabled={doneDisabled}
          style={{ padding: 8 }}
          accessibilityLabel={t("common.done")}
        >
          <Host matchContents>
            <Image
              systemName={"checkmark"}
              color={doneDisabled ? colors.disabledText : colors.accent}
              size={18}
            />
          </Host>
        </Pressable>
      ),
    });
  }, [
    navigation,
    handleDone,
    doneDisabled,
    colors.accent,
    colors.disabledText,
    t,
  ]);

  const favoriteButtonLabel = isFavorite
    ? t("editLog.favorites.added")
    : t("editLog.favorites.add");

  const handleFavoriteToggle = useCallback(() => {
    if (!editedLog) return;
    toggleFavorite(editedLog);
  }, [editedLog, toggleFavorite]);

  return (
    <ScrollView style={styles.container}>
      <RNScrollView
        ref={scrollRef as any}
        style={[styles.scrollView]}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        overScrollMode="never"
      >
        {isTitleEditing ? (
          <TextInput
            value={draftTitle}
            onChangeText={handleChange}
            onBlur={handleBlur}
            autoFocus
            style={[styles.header, styles.titleInput]}
            placeholder={t("editLog.title.placeholder")}
            placeholderTextColor={colors.secondaryText}
          />
        ) : (
          <Pressable onPress={startEditing}>
            <AppText role="Title2" style={styles.header}>
              {draftTitle || t("editLog.title.emptyState")}
            </AppText>
          </Pressable>
        )}
        {!editedLog ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator />
          </View>
        ) : (
          <>
            <Animated.View layout={easeLayout}>
              <ComponentsList
                components={editedLog.foodComponents || []}
                onPressItem={handleOpenEditor}
                onDeleteItem={deleteComponent}
                onAddPress={handleAddComponent}
                onAcceptRecommendation={acceptRecommendation}
                disabled={
                  isEditEstimating || Boolean(originalLog?.isEstimating)
                }
                headerAction={
                  <TouchableOpacity
                    onPress={handleFavoriteToggle}
                    style={styles.favoriteToggleButton}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isFavorite }}
                    accessibilityLabel={favoriteButtonLabel}
                  >
                    <Star
                      size={18}
                      color={colors.semantic.fat}
                      fill={isFavorite ? colors.semantic.fat : "none"}
                    />
                    <AppText
                      style={[
                        styles.favoriteToggleLabel,
                        { color: colors.semantic.fat },
                      ]}
                    >
                      {favoriteButtonLabel}
                    </AppText>
                  </TouchableOpacity>
                }
              />
            </Animated.View>

            {isPro &&
              hasUnsavedChanges &&
              !isEditEstimating &&
              !isVerifyingSubscription && (
                <Animated.View layout={easeLayout}>
                  <RecalculateButton
                    changesCount={changesCount}
                    onPress={handleReestimate}
                    disabled={
                      isEditEstimating || Boolean(originalLog?.isEstimating)
                    }
                  />
                </Animated.View>
              )}

            <Animated.View layout={easeLayout}>
              {isVerifyingSubscription ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator />
                </View>
              ) : (
                !isPro && (
                  <InlinePaywallCard
                    Icon={Calculator}
                    title={t("editLog.paywall.title")}
                    body={t("editLog.paywall.body")}
                    ctaLabel={t("editLog.paywall.cta")}
                    onPress={handleShowPaywall}
                    trialDays={trialDays}
                    testID="edit-inline-paywall"
                  />
                )
              )}
            </Animated.View>

            <Animated.View layout={easeLayout}>
              <MacrosCard
                calories={editedLog.calories * (percentageEaten / 100)}
                protein={editedLog.protein * (percentageEaten / 100)}
                carbs={editedLog.carbs * (percentageEaten / 100)}
                fat={editedLog.fat * (percentageEaten / 100)}
                processing={isEditEstimating}
                wasProcessing={previousLoadingRef.current}
                revealKey={revealKey}
                hasUnsavedChanges={isPro ? hasUnsavedChanges : false}
                changesCount={changesCount}
                foodComponentsCount={editedLog.foodComponents?.length || 0}
              />
            </Animated.View>

            <Animated.View layout={easeLayout} style={styles.percentageSection}>
              <AppText role="Caption" style={styles.sectionHeader}>
                Wieviel hab ich gegessen?
              </AppText>
              <View style={styles.sliderContainer}>
                <Host matchContents>
                  <Slider
                    value={percentageEaten}
                    min={0}
                    max={100}
                    steps={9}
                    color={colors.accent}
                    onValueChange={(value) => {
                      updatePercentageEaten(Math.round(value));
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  />
                </Host>
                <AppText role="Body" style={styles.percentageText}>
                  {Math.round(percentageEaten)}%
                </AppText>
              </View>
            </Animated.View>

            {editedLog.localImagePath && (
              <Animated.View layout={easeLayout} style={styles.imageSection}>
                <AppText role="Caption" style={styles.sectionHeader}>
                  {t("createLog.image.title")}
                </AppText>
                <ImageDisplay
                  imageUrl={editedLog.localImagePath}
                  isUploading={false}
                />
              </Animated.View>
            )}
          </>
        )}
      </RNScrollView>
    </ScrollView>
  );
}

const createStyles = (colors: Colors, theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.primaryBackground,
    },
    scrollView: { flex: 1 },
    contentContainer: {
      paddingHorizontal: theme.spacing.pageMargins.horizontal,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.xl,
    },
    header: {},
    titleInput: {
      color: colors.primaryText,
      fontSize: theme.typography.Title2.fontSize,
      fontWeight: "600",
    },
    bottomSheet: {
      borderRadius: theme.components.cards.cornerRadius,
      backgroundColor: colors.secondaryBackground,
    },
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.xl,
    },
    favoriteToggleButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
    },
    favoriteToggleLabel: {
      fontSize: theme.typography.Body.fontSize,
      fontWeight: "600",
    },
    imageSection: {
      gap: theme.spacing.sm,
    },
    sectionHeader: {
      letterSpacing: 0.6,
      color: colors.secondaryText,
      textTransform: "uppercase",
    },
    percentageSection: {
      gap: theme.spacing.sm,
    },
    sliderContainer: {
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
    },
    percentageText: {
      textAlign: "center",
      color: colors.primaryText,
      fontWeight: "600",
    },
  });
