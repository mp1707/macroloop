import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { View, Pressable } from "react-native";
import { Lightbulb } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { AppText } from "@/components";
import { SwipeToFunctions } from "@/components/shared/SwipeToFunctions/SwipeToFunctions";
import { AnimatedPressable } from "@/components/shared/AnimatedPressable";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  Layout,
  useSharedValue,
  withSpring,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useTheme } from "@/theme";
import { createStyles } from "./ComponentsList.styles";
import type { FoodComponent } from "@/types/models";
import { useTranslation } from "react-i18next";

// Extended FoodComponent with UI-only stale indicator
type EditableFoodComponent = FoodComponent & {
  isStale?: boolean;
  _ui_id?: string;
};

interface ComponentRowProps {
  component: EditableFoodComponent;
  index: number;
  isExpanded: boolean;
  onTap: (index: number, comp: EditableFoodComponent) => void;
  onToggleExpansion?: (index: number) => void;
  onDelete: (index: number) => void;
  onAcceptRecommendation: (index: number, comp: EditableFoodComponent) => void;
}

const easeLayout = Layout.duration(220).easing(Easing.inOut(Easing.quad));

const ComponentRowComponent: React.FC<ComponentRowProps> = ({
  component,
  isExpanded,
  index,
  onTap,
  onToggleExpansion,
  onDelete,
  onAcceptRecommendation,
}) => {
  const { colors, theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);
  const hasRecommendation = !!component.recommendedMeasurement;
  const canExpand = hasRecommendation && !!onToggleExpansion;
  const showExpansion = hasRecommendation && isExpanded;
  const hasNutrition =
    component.calories != null || component.protein != null;

  const recommendedMeasurementAmount =
    component.recommendedMeasurement?.amount;
  const recommendedMeasurementUnit =
    component.recommendedMeasurement?.unit;

  const originalMeasurementLabel = useMemo(() => {
    const amount = component.amount;
    const unit = component.unit ?? "";
    const amountString = amount != null ? `${amount}` : "";
    return `${amountString} ${unit}`.trim();
  }, [component.amount, component.unit]);

  const recommendedMeasurementLabel = useMemo(() => {
    const amount = recommendedMeasurementAmount;
    const unit = recommendedMeasurementUnit ?? "";
    const amountString = amount != null ? `${amount}` : "";
    return `${amountString} ${unit}`.trim();
  }, [recommendedMeasurementAmount, recommendedMeasurementUnit]);

  const nutritionLabel = useMemo(() => {
    const parts: string[] = [];
    if (component.calories != null) {
      parts.push(`${Math.round(component.calories)} kcal`);
    }
    if (component.protein != null) {
      parts.push(
        `${Math.round(component.protein)}g ${t("componentRow.nutrition.protein")}`
      );
    }
    return parts.join(" • ");
  }, [component.calories, component.protein, t]);

  const ignorePressRef = useRef(false);
  const resetIgnoreTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  useEffect(() => {
    return () => {
      if (resetIgnoreTimeoutRef.current) {
        clearTimeout(resetIgnoreTimeoutRef.current);
      }
    };
  }, []);

  const lightbulbScale = useSharedValue(1);

  const lightbulbAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: lightbulbScale.value }],
  }));

  const handleLightbulbPressIn = useCallback(() => {
    lightbulbScale.value = withSpring(1.4, {
      stiffness: 600,
      damping: 22,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [lightbulbScale]);

  const handleLightbulbPressOut = useCallback(() => {
    lightbulbScale.value = withSpring(1, {
      stiffness: 800,
      damping: 60,
    });
  }, [lightbulbScale]);

  const handleTap = useCallback(() => {
    if (ignorePressRef.current) {
      ignorePressRef.current = false;
      if (resetIgnoreTimeoutRef.current) {
        clearTimeout(resetIgnoreTimeoutRef.current);
        resetIgnoreTimeoutRef.current = null;
      }
      return;
    }

    onTap(index, component);
  }, [onTap, index, component]);

  const handleToggleExpansion = useCallback(
    () => onToggleExpansion?.(index),
    [onToggleExpansion, index]
  );

  const handleDelete = useCallback(() => onDelete(index), [onDelete, index]);

  const handleAccept = useCallback(
    () => onAcceptRecommendation(index, component),
    [onAcceptRecommendation, index, component]
  );

  const handleSwipeStart = useCallback(() => {
    ignorePressRef.current = true;
    if (resetIgnoreTimeoutRef.current) {
      clearTimeout(resetIgnoreTimeoutRef.current);
      resetIgnoreTimeoutRef.current = null;
    }
  }, []);

  const handleSwipeEnd = useCallback(() => {
    if (resetIgnoreTimeoutRef.current) {
      clearTimeout(resetIgnoreTimeoutRef.current);
    }

    resetIgnoreTimeoutRef.current = setTimeout(() => {
      ignorePressRef.current = false;
      resetIgnoreTimeoutRef.current = null;
    }, 220);
  }, []);

  return (
    <Animated.View layout={easeLayout}>
      <SwipeToFunctions
        onDelete={showExpansion ? undefined : handleDelete}
        onSwipeStart={handleSwipeStart}
        onSwipeEnd={handleSwipeEnd}
      >
        <View style={styles.solidBackgroundForSwipe}>
          <View
            style={{
              margin: -theme.spacing.md,
              borderRadius: theme.components.cards.cornerRadius,
            }}
          >
            <View>
              <View
                style={[
                  styles.componentRow,
                  {
                    borderRadius: theme.components.cards.cornerRadius,
                    padding: theme.spacing.md,
                    paddingRight: theme.spacing.sm,
                    gap: canExpand ? 16 : 0,
                  },
                ]}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AnimatedPressable
                    onPress={handleTap}
                    accessibilityLabel={t(
                      "componentRow.accessibility.editLabel",
                      {
                        name: component.name,
                      }
                    )}
                    accessibilityHint={t("componentRow.accessibility.editHint")}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: theme.spacing.md,
                      }}
                    >
                      <View style={styles.leftColumn}>
                        <AppText
                          role="Body"
                          numberOfLines={1}
                          ellipsizeMode="tail"
                          style={styles.componentName}
                        >
                          {component.name}
                        </AppText>
                        {hasNutrition ? (
                          <AppText
                            role="Caption"
                            color="secondary"
                            style={
                              component.isStale
                                ? styles.nutritionSubtitleStale
                                : styles.nutritionSubtitle
                            }
                          >
                            {nutritionLabel}
                          </AppText>
                        ) : null}
                      </View>
                      <Animated.View
                        layout={easeLayout}
                        style={styles.rightColumn}
                      >
                        <AppText role="Body" color="secondary">
                          {component.amount} {component.unit ?? ""}
                        </AppText>
                      </Animated.View>
                    </View>
                  </AnimatedPressable>
                </View>

                <Animated.View
                  layout={easeLayout}
                  style={{
                    width: canExpand ? 18 : 0,
                    opacity: canExpand ? 1 : 0,
                    marginRight: canExpand ? theme.spacing.sm : 0,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                  pointerEvents={canExpand ? "auto" : "none"}
                >
                  {canExpand ? (
                    <AnimatedPressable
                      onPress={handleToggleExpansion}
                      onPressIn={handleLightbulbPressIn}
                      onPressOut={handleLightbulbPressOut}
                      hitSlop={22}
                      style={[
                        {
                          width: 18,
                          height: 18,
                          justifyContent: "center",
                          alignItems: "center",
                        },
                        lightbulbAnimatedStyle,
                      ]}
                      accessibilityLabel={t(
                        "componentRow.accessibility.toggleLabel"
                      )}
                      accessibilityHint={
                        isExpanded
                          ? t("componentRow.accessibility.toggleHintCollapse")
                          : t("componentRow.accessibility.toggleHintExpand")
                      }
                    >
                      <Lightbulb
                        size={18}
                        color={colors.accent}
                        fill={colors.accent}
                      />
                    </AnimatedPressable>
                  ) : null}
                </Animated.View>
              </View>

              {hasRecommendation ? (
                <Animated.View
                  layout={easeLayout}
                  style={{ overflow: "hidden" }}
                >
                  {showExpansion ? (
                    <Animated.View
                      entering={FadeIn.duration(200)}
                      exiting={FadeOut.duration(160)}
                      style={styles.expansionContent}
                    >
                      <View style={styles.estimateLine}>
                        <View style={styles.estimateTextColumn}>
                          <AppText role="Body" color="secondary">
                            {t("componentRow.recommendation.estimatePrefix")}
                            {t("componentRow.recommendation.estimateSuffix")}
                          </AppText>
                          <View style={styles.estimateConversionRow}>
                            <AppText
                              role="Body"
                              style={styles.estimateValueText}
                            >
                              {originalMeasurementLabel}
                            </AppText>
                            <AppText
                              role="Body"
                              color="secondary"
                              style={styles.approxSymbol}
                            >
                              {t("componentRow.recommendation.approx")}
                            </AppText>
                            <AppText
                              role="Body"
                              style={styles.estimateValueText}
                            >
                              {recommendedMeasurementLabel}
                            </AppText>
                          </View>
                        </View>
                        <Pressable
                          style={styles.acceptPill}
                          onPress={() => {
                            Haptics.impactAsync(
                              Haptics.ImpactFeedbackStyle.Light
                            );
                            handleAccept();
                          }}
                        >
                          <AppText style={styles.acceptPillText}>
                            {t("componentRow.recommendation.setButton", {
                              amount: component.recommendedMeasurement?.amount,
                              unit: component.recommendedMeasurement?.unit,
                            })}
                          </AppText>
                        </Pressable>
                      </View>
                    </Animated.View>
                  ) : null}
                </Animated.View>
              ) : null}
            </View>
          </View>
        </View>
      </SwipeToFunctions>
    </Animated.View>
  );
};

export const ComponentRow = React.memo(ComponentRowComponent, (prev, next) => {
  const prevComp = prev.component;
  const nextComp = next.component;

  const prevRec = prevComp.recommendedMeasurement;
  const nextRec = nextComp.recommendedMeasurement;

  const recommendationsEqual =
    !!prevRec === !!nextRec &&
    (!prevRec ||
      (prevRec.amount === nextRec?.amount && prevRec.unit === nextRec?.unit));

  return (
    prev.index === next.index &&
    prev.isExpanded === next.isExpanded &&
    prevComp.name === nextComp.name &&
    prevComp.amount === nextComp.amount &&
    prevComp.unit === nextComp.unit &&
    prevComp.calories === nextComp.calories &&
    prevComp.protein === nextComp.protein &&
    prevComp.isStale === nextComp.isStale &&
    recommendationsEqual &&
    prev.onTap === next.onTap &&
    prev.onToggleExpansion === next.onToggleExpansion &&
    prev.onDelete === next.onDelete &&
    prev.onAcceptRecommendation === next.onAcceptRecommendation
  );
});
