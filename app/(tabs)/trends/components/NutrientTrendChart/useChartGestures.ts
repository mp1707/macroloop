import { useState, useCallback, useEffect, useMemo } from "react";
import { Gesture } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import * as Haptics from "expo-haptics";
import type { TrendMetric, TrendsData } from "../trendCalculations";
import type { ChartConfig } from "./types";

interface UseChartGesturesProps {
  dailyData: TrendsData["dailyData"];
  todayData: TrendsData["todayData"];
  nutrient: TrendMetric;
  chartConfig: ChartConfig;
}

export const useChartGestures = ({
  dailyData,
  todayData,
  nutrient,
  chartConfig,
}: UseChartGesturesProps) => {
  const [selectedBar, setSelectedBar] = useState<{
    centerX: number;
    topY: number;
    value: number;
    id: string;
    dateKey: string;
  } | null>(null);

  const [draggedBar, setDraggedBar] = useState<{
    centerX: number;
    topY: number;
    value: number;
    id: string;
    dateKey: string;
  } | null>(null);

  // Reset selection when data changes
  useEffect(() => {
    setSelectedBar(null);
    setDraggedBar(null);
  }, [dailyData, todayData, nutrient]);

  const handleBarSelect = useCallback(
    (
      centerX: number,
      topY: number,
      value: number,
      id: string,
      dateKey: string
    ) => {
      setSelectedBar((current) => {
        const isSame = current?.id === id;
        const next = isSame ? null : { centerX, topY, value, id, dateKey };
        Haptics.selectionAsync().catch(() => undefined);
        return next;
      });
    },
    []
  );

  const handleDragSelect = useCallback(
    (
      centerX: number,
      topY: number,
      value: number,
      id: string,
      dateKey: string
    ) => {
      setDraggedBar((current) => {
        if (current?.id === id) return current;
        Haptics.selectionAsync().catch(() => undefined);
        return { centerX, topY, value, id, dateKey };
      });
    },
    []
  );

  const handleDragEnd = useCallback(
    (
      centerX: number,
      topY: number,
      value: number,
      id: string,
      dateKey: string
    ) => {
      setSelectedBar({ centerX, topY, value, id, dateKey });
    },
    []
  );

  const clearDrag = useCallback(() => {
    setDraggedBar(null);
  }, []);

  const gesture = useMemo(() => {
    const getBarDataFromX = (x: number) => {
      "worklet";
      const {
        PADDING,
        barWidth,
        BAR_SPACING,
        totalBars,
        contentHeight,
        maxValue,
      } = chartConfig;

      if (x < PADDING.left) return null;

      // Calculate rough index
      const relativeX = x - PADDING.left;
      const step = barWidth + BAR_SPACING;
      const index = Math.floor(relativeX / step);

      if (index >= 0 && index < totalBars) {
        const isToday = index === dailyData.length;
        const data = isToday ? todayData : dailyData[index];
        const value = data.totals[nutrient];

        // Center of the bar
        const finalX = PADDING.left + index * step;
        const centerX = finalX + barWidth / 2;

        const barHeight =
          maxValue === 0 ? 0 : (value / maxValue) * contentHeight;

        // Ensure minimum visual height matching render logic
        const visualHeight = isToday
          ? Math.max(barHeight, 12)
          : Math.max(barHeight, 0);

        const y = PADDING.top + contentHeight - visualHeight;

        return {
          centerX,
          topY: y,
          value,
          id: data.dateKey,
          dateKey: data.dateKey,
        };
      }
      return null;
    };

    const tapGesture = Gesture.Tap()
      .maxDeltaX(10)
      .onEnd((e) => {
        const data = getBarDataFromX(e.x);
        if (data) {
          scheduleOnRN(
            handleBarSelect,
            data.centerX,
            data.topY,
            data.value,
            data.id,
            data.dateKey
          );
        }
      });

    const panGesture = Gesture.Pan()
      .activeOffsetX([-10, 10])
      .failOffsetY([-10, 10])
      .onStart((e) => {
        const data = getBarDataFromX(e.x);
        if (data) {
          scheduleOnRN(
            handleDragSelect,
            data.centerX,
            data.topY,
            data.value,
            data.id,
            data.dateKey
          );
        }
      })
      .onUpdate((e) => {
        const data = getBarDataFromX(e.x);
        if (data) {
          scheduleOnRN(
            handleDragSelect,
            data.centerX,
            data.topY,
            data.value,
            data.id,
            data.dateKey
          );
        }
      })
      .onEnd((e) => {
        const data = getBarDataFromX(e.x);
        if (data) {
          scheduleOnRN(
            handleDragEnd,
            data.centerX,
            data.topY,
            data.value,
            data.id,
            data.dateKey
          );
        }
      })
      .onFinalize(() => {
        scheduleOnRN(clearDrag);
      });

    return Gesture.Race(panGesture, tapGesture);
  }, [
    dailyData,
    todayData,
    nutrient,
    chartConfig,
    handleBarSelect,
    handleDragSelect,
    handleDragEnd,
    clearDrag,
  ]);

  return {
    activeBar: draggedBar || selectedBar,
    gesture,
  };
};
