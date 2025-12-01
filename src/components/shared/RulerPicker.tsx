import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import type { Insets } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/theme";
import { AppText } from "@/components/shared/AppText";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ITEM_WIDTH = 8;
const VISIBLE_ITEMS = Math.floor(SCREEN_WIDTH / ITEM_WIDTH);
const RULER_HIT_SLOP: Insets = { top: 120, bottom: 120, left: 20, right: 20 };

interface RulerPickerProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  unit: string;
}

export const RulerPicker: React.FC<RulerPickerProps> = ({
  min,
  max,
  step = 1,
  value,
  onChange,
  unit,
}) => {
  const { colors, theme: themeObj } = useTheme();
  const styles = createStyles(colors, themeObj);
  const scrollViewRef = useRef<Animated.ScrollView>(null);
  const scrollX = useSharedValue(0);
  const [currentValue, setCurrentValue] = useState(value);
  const lastNotifiedValue = useRef(value);
  const lastHapticValue = useRef(value);
  const hasMounted = useRef(false);

  const totalItems = Math.floor((max - min) / step) + 1;
  const centerOffset = (SCREEN_WIDTH - ITEM_WIDTH) / 2;

  // Initialize scroll position
  useEffect(() => {
    const initialOffset = ((value - min) / step + 5) * ITEM_WIDTH;
    scrollViewRef.current?.scrollTo({
      x: initialOffset,
      animated: false,
    });
  }, []);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      lastHapticValue.current = currentValue;
      return;
    }

    if (currentValue === lastHapticValue.current) {
      return;
    }

    lastHapticValue.current = currentValue;
    void Haptics.selectionAsync();
  }, [currentValue]);

  const handleValueChange = (newValue: number) => {
    if (newValue !== lastNotifiedValue.current) {
      lastNotifiedValue.current = newValue;
      onChange(newValue);
    }
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
      const index = Math.round(event.contentOffset.x / ITEM_WIDTH);
      const newValue = Math.min(max, Math.max(min, min + (index - 5) * step));
      scheduleOnRN(setCurrentValue, newValue);
    },
  });

  const handleMomentumScrollEnd = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / ITEM_WIDTH);
    const snappedOffset = index * ITEM_WIDTH;
    const newValue = Math.min(max, Math.max(min, min + (index - 5) * step));

    scrollViewRef.current?.scrollTo({
      x: snappedOffset,
      animated: true,
    });

    handleValueChange(newValue);
  };

  const renderTicks = () => {
    const ticks = [];
    const PADDING_ITEMS = 5;

    // Loop includes padding items before and after the range
    for (let i = -PADDING_ITEMS; i < totalItems + PADDING_ITEMS; i++) {
      // Check if this is a padding item (outside the valid range)
      if (i < 0 || i >= totalItems) {
        // Render empty tick container for padding
        ticks.push(<View key={i} style={styles.tickContainer} />);
      } else {
        // Valid range - render tick with labels
        const tickValue = min + i * step;
        const isMajorTick = tickValue % 10 === 0;
        const isMiddleTick = tickValue % 5 === 0 && !isMajorTick;

        ticks.push(
          <View key={i} style={styles.tickContainer}>
            {isMajorTick && (
              <AppText
                role="Caption"
                color="secondary"
                style={styles.tickLabel}
                numberOfLines={1}
              >
                {tickValue}
              </AppText>
            )}
            <View
              style={[
                styles.tick,
                isMajorTick
                  ? styles.majorTick
                  : isMiddleTick
                  ? styles.middleTick
                  : styles.minorTick,
              ]}
            />
          </View>
        );
      }
    }
    return ticks;
  };

  return (
    <View style={styles.container}>
      <View style={styles.valueContainer}>
        <AppText role="Title1" style={styles.valueText}>
          {currentValue}
        </AppText>
      </View>

      <View style={styles.rulerContainer}>
        <View style={styles.centerIndicator} />

        <Animated.ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onScroll={scrollHandler}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          scrollEventThrottle={16}
          snapToInterval={ITEM_WIDTH}
          decelerationRate="fast"
          hitSlop={RULER_HIT_SLOP}
          contentContainerStyle={{
            paddingHorizontal: centerOffset,
          }}
        >
          <View style={styles.ticksWrapper}>{renderTicks()}</View>
        </Animated.ScrollView>
      </View>

      <AppText role="Headline" style={styles.unitText}>
        {unit}
      </AppText>
    </View>
  );
};

const createStyles = (colors: any, themeObj: any) => {
  const { spacing } = themeObj;

  return StyleSheet.create({
    container: {
      alignItems: "center",
      paddingVertical: spacing.xl,
      minWidth: SCREEN_WIDTH,
      gap: themeObj.spacing.md,
    },
    valueContainer: {
      alignItems: "center",
      marginBottom: spacing.md,
    },
    valueText: {
      fontSize: 72,
      fontWeight: "700",
    },
    rulerContainer: {
      height: 100,
      width: "100%",
      position: "relative",
      marginBottom: spacing.sm,
    },
    centerIndicator: {
      position: "absolute",
      left: "50%",
      top: 24,
      bottom: -20,
      width: 2,
      backgroundColor: colors.primaryText,
      zIndex: 10,
      transform: [{ translateX: -1 }],
    },
    ticksWrapper: {
      flexDirection: "row",
      alignItems: "flex-end",
      height: "100%",
    },
    tickContainer: {
      width: ITEM_WIDTH,
      alignItems: "center",
      justifyContent: "flex-end",
      height: "100%",
      overflow: "visible",
    },
    tick: {
      backgroundColor: colors.secondaryText,
    },
    minorTick: {
      width: 1,
      height: 8,
      opacity: 0.3,
    },
    middleTick: {
      width: 1,
      height: 16,
      opacity: 0.5,
    },
    majorTick: {
      width: 2,
      height: 24,
      opacity: 0.8,
    },
    tickLabel: {
      minWidth: 40,
      textAlign: "center",
      marginBottom: spacing.xs,
      fontSize: 12,
    },
    unitText: {
      marginTop: spacing.sm,
    },
  });
};
