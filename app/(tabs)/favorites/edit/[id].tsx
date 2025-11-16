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
import { Calculator, Trash2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { AppText } from "@/components/index";
import { ComponentsList } from "@/components/refine-page/ComponentsList/ComponentsList";
import { MacrosCard } from "@/components/refine-page/MacrosCard/MacrosCard";
import { RecalculateButton } from "@/components/refine-page/RecalculateButton";
import { InlinePaywallCard } from "@/components/paywall/InlinePaywallCard";
import { TextInput } from "@/components/shared/TextInput";
import { useEstimation } from "@/hooks/useEstimation";
import { usePaywall } from "@/hooks/usePaywall";
import { useSafeRouter } from "@/hooks/useSafeRouter";
import { makeSelectFavoriteById } from "@/store/selectors";
import { useAppStore } from "@/store/useAppStore";
import type { FoodComponent } from "@/types/models";
import { Colors, Theme, useTheme } from "@/theme";
import { useEditableTitle } from "@/components/refine-page/hooks/useEditableTitle";
import { useEditChangeTracker } from "@/components/refine-page/hooks/useEditChangeTracker";
import { useEditedFavorite } from "@/components/refine-page/hooks/useEditedFavorite";
import { Host, Image, Slider } from "@expo/ui/swift-ui";

const easeLayout = Layout.duration(220).easing(Easing.inOut(Easing.quad));

export default function EditFavorite() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const originalFavorite = useAppStore(makeSelectFavoriteById(id));
  const updateFavorite = useAppStore((state) => state.updateFavorite);
  const deleteFavorite = useAppStore((state) => state.deleteFavorite);
  const isPro = useAppStore((state) => state.isPro);
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
    editedFavorite,
    isDirty,
    replaceEditedFavorite,
    updateTitle,
    deleteComponent,
    acceptRecommendation,
  } = useEditedFavorite({
    favoriteId: id,
    originalFavorite,
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
    title: editedFavorite?.title ?? "",
    onCommit: updateTitle,
  });

  const scrollRef = useRef<RNScrollView | null>(null);
  const [revealKey, setRevealKey] = useState(0);
  const previousLoadingRef = useRef<boolean>(isEditEstimating);
  const [percentageEaten, setPercentageEaten] = useState(
    editedFavorite?.percentageEaten ?? 100
  );

  useEffect(() => {
    previousLoadingRef.current = isEditEstimating;
  }, [isEditEstimating]);

  useEffect(() => {
    if (editedFavorite?.percentageEaten !== undefined) {
      setPercentageEaten(editedFavorite.percentageEaten);
    }
  }, [editedFavorite?.percentageEaten]);

  const titleChanged =
    draftTitle.trim() !== (originalFavorite?.title || "").trim();
  const percentageChanged = percentageEaten !== (originalFavorite?.percentageEaten ?? 100);

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

  const handleDeleteFavorite = useCallback(() => {
    if (!id) return;

    Alert.alert(
      t("favorites.edit.alerts.delete.title"),
      t("favorites.edit.alerts.delete.message"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => {
            deleteFavorite(id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            router.back();
          },
        },
      ]
    );
  }, [deleteFavorite, id, router, t]);

  const handleShowPaywall = useCallback(() => {
    router.push("/paywall");
  }, [router]);

  const handleReestimate = useCallback(async () => {
    if (!editedFavorite) return;
    if (!isPro) {
      handleShowPaywall();
      return;
    }

    scrollRef.current?.scrollToEnd({ animated: true });

    try {
      await runEditEstimation(editedFavorite, (next) => {
        replaceEditedFavorite(next);
      });
      markReestimated();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRevealKey((key) => key + 1);
    } catch (error) {
      // Optional: silence for now; toasts handled elsewhere
    }
  }, [
    editedFavorite,
    isPro,
    handleShowPaywall,
    runEditEstimation,
    replaceEditedFavorite,
    markReestimated,
  ]);

  const commitTitleBeforeSave = useCallback(() => {
    commit();
  }, [commit]);

  const saveFavorite = useCallback(() => {
    if (!id || !editedFavorite) return;

    const trimmedTitle = draftTitle.trim();
    updateFavorite(id, {
      title: trimmedTitle,
      calories: editedFavorite.calories,
      protein: editedFavorite.protein,
      carbs: editedFavorite.carbs,
      fat: editedFavorite.fat,
      foodComponents: editedFavorite.foodComponents || [],
      macrosPerReferencePortion: editedFavorite.macrosPerReferencePortion,
      percentageEaten,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }, [draftTitle, editedFavorite, id, router, updateFavorite, percentageEaten]);

  const handleDone = useCallback(() => {
    commitTitleBeforeSave();

    if (hasUnsavedChanges && !hasReestimated) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        t("favorites.edit.alerts.unsaved.title"),
        t("favorites.edit.alerts.unsaved.message"),
        [
          {
            text: t("favorites.edit.alerts.unsaved.recalculate"),
            style: "default",
            onPress: async () => {
              await handleReestimate();
            },
          },
          {
            text: t("favorites.edit.alerts.unsaved.saveAnyway"),
            style: "default",
            onPress: () => {
              saveFavorite();
            },
          },
          {
            text: t("common.cancel"),
            style: "cancel",
          },
        ]
      );
      return;
    }
    saveFavorite();
  }, [
    commitTitleBeforeSave,
    hasUnsavedChanges,
    hasReestimated,
    handleReestimate,
    saveFavorite,
    t,
  ]);

  const doneDisabled =
    isEditEstimating ||
    (!hasReestimated &&
      !isDirty &&
      !titleChanged &&
      !percentageChanged &&
      !hasUnsavedChanges &&
      changesCount === 0);

  useEffect(() => {
    navigation.setOptions({
      headerBackTitle: t("favorites.navigation.title"),
      headerRight: () => (
        <Pressable
          onPress={handleDone}
          disabled={doneDisabled}
          style={{
            height: 32,
            width: 32,
            marginLeft: 2,
            alignItems: "center",
            justifyContent: "center",
          }}
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
    colors.disabledText,
    colors.accent,
    t,
  ]);

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
            placeholder={t("favorites.edit.title.placeholder")}
            placeholderTextColor={colors.secondaryText}
          />
        ) : (
          <Pressable onPress={startEditing}>
            <AppText role="Title2" style={styles.header}>
              {draftTitle || t("favorites.edit.title.emptyState")}
            </AppText>
          </Pressable>
        )}
        {!editedFavorite ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator />
          </View>
        ) : (
          <>
            <Animated.View layout={easeLayout}>
              <ComponentsList
                components={editedFavorite.foodComponents || []}
                onPressItem={handleOpenEditor}
                onDeleteItem={deleteComponent}
                onAddPress={handleAddComponent}
                onAcceptRecommendation={acceptRecommendation}
                disabled={isEditEstimating}
                headerAction={
                  <TouchableOpacity
                    onPress={handleDeleteFavorite}
                    style={styles.deleteFavoriteButton}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={t(
                      "favorites.edit.delete.accessibilityLabel"
                    )}
                  >
                    <Trash2 size={18} color={colors.error} />
                    <AppText
                      style={[
                        styles.deleteFavoriteLabel,
                        { color: colors.error },
                      ]}
                    >
                      {t("favorites.edit.delete.label")}
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
                    disabled={isEditEstimating}
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
                    title={t("favorites.edit.paywall.title")}
                    body={t("favorites.edit.paywall.body")}
                    ctaLabel={t("favorites.edit.paywall.cta")}
                    onPress={handleShowPaywall}
                    trialDays={trialDays}
                    testID="edit-inline-paywall"
                  />
                )
              )}
            </Animated.View>

            <Animated.View layout={easeLayout}>
              <MacrosCard
                calories={editedFavorite.calories * (percentageEaten / 100)}
                protein={editedFavorite.protein * (percentageEaten / 100)}
                carbs={editedFavorite.carbs * (percentageEaten / 100)}
                fat={editedFavorite.fat * (percentageEaten / 100)}
                processing={isEditEstimating}
                wasProcessing={previousLoadingRef.current}
                revealKey={revealKey}
                hasUnsavedChanges={isPro ? hasUnsavedChanges : false}
                changesCount={changesCount}
                foodComponentsCount={editedFavorite.foodComponents?.length || 0}
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
                    step={10}
                    color={colors.accent}
                    onChange={(value) => {
                      setPercentageEaten(Math.round(value));
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  />
                </Host>
                <AppText role="Body" style={styles.percentageText}>
                  {Math.round(percentageEaten)}%
                </AppText>
              </View>
            </Animated.View>
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
    deleteFavoriteButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
    },
    deleteFavoriteLabel: {
      fontSize: theme.typography.Body.fontSize,
      fontWeight: "600",
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
