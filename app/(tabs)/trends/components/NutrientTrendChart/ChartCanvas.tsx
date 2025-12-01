import React, { useEffect } from "react";
import {
  Canvas,
  Rect,
  Line,
  RoundedRect,
  DashPathEffect,
  vec,
} from "@shopify/react-native-skia";
import { GestureDetector } from "react-native-gesture-handler";
import {
  SharedValue,
  useDerivedValue,
  interpolate,
  Extrapolation,
  withTiming,
  useSharedValue,
  interpolateColor,
  Easing,
} from "react-native-reanimated";
import { ChartConfig, BarData } from "./types";
import { useTheme } from "@/theme";

interface ChartCanvasProps {
  config: ChartConfig;
  bars: BarData[];
  goal?: number;
  goalRange?: { min: number; max: number };
  color: string;
  progress: SharedValue<number>;
  gesture: React.ComponentProps<typeof GestureDetector>["gesture"];
  showGoalLine?: boolean;
  activeBarKey?: string | null;
}

export const ChartCanvas: React.FC<ChartCanvasProps> = ({
  config,
  bars,
  goal,
  goalRange,
  color,
  progress,
  gesture,
  showGoalLine,
  activeBarKey,
}) => {
  const { theme } = useTheme();

  const hasGoalLine =
    showGoalLine && typeof goal === "number" && config.maxValue > 0;
  const goalLineY =
    hasGoalLine && typeof goal === "number"
      ? config.PADDING.top + config.scaleY(goal)
      : undefined;

  const hasGoalRange =
    goalRange &&
    typeof goalRange.min === "number" &&
    typeof goalRange.max === "number" &&
    config.maxValue > 0;

  const goalRangeTopY =
    hasGoalRange && goalRange
      ? config.PADDING.top + config.scaleY(goalRange.max)
      : undefined;
  const goalRangeBottomY =
    hasGoalRange && goalRange
      ? config.PADDING.top + config.scaleY(goalRange.min)
      : undefined;

  const hasActiveSelection = !!activeBarKey;

  return (
    <GestureDetector gesture={gesture}>
      <Canvas
        style={{
          width: config.chartWidth,
          height: config.chartHeight,
        }}
      >
        <AnimatedGoalRange
          minY={goalRangeBottomY}
          maxY={goalRangeTopY}
          isVisible={!!hasGoalRange && !!goalRange}
          width={config.chartWidth}
          color={color}
          paddingHorizontal={theme.spacing.sm}
        />

        <AnimatedGoalLine
          targetY={goalLineY}
          isVisible={!hasGoalRange && goalLineY !== undefined}
          width={config.chartWidth}
          color={color}
          paddingHorizontal={theme.spacing.sm}
        />

        {/* Bars */}
        {bars.map((bar) => (
          <AnimatedBar
            key={bar.key}
            bar={bar}
            progress={progress}
            config={config}
            totalBars={bars.length}
            isActive={activeBarKey === bar.key}
            hasActiveSelection={hasActiveSelection}
          />
        ))}
      </Canvas>
    </GestureDetector>
  );
};

interface AnimatedGoalLineProps {
  targetY?: number;
  isVisible: boolean;
  width: number;
  color: string;
  paddingHorizontal: number;
}

const AnimatedGoalLine: React.FC<AnimatedGoalLineProps> = ({
  targetY,
  isVisible,
  width,
  color,
  paddingHorizontal,
}) => {
  const y = useSharedValue(targetY || 0);
  const opacity = useSharedValue(0);

  const prevColor = useSharedValue(color);
  const nextColor = useSharedValue(color);
  const colorProgress = useSharedValue(1);

  useEffect(() => {
    prevColor.value = nextColor.value;
    nextColor.value = color;
    colorProgress.value = 0;
    colorProgress.value = withTiming(1, { duration: 500 });
  }, [color, prevColor, nextColor, colorProgress]);

  const derivedColor = useDerivedValue(() => {
    return interpolateColor(
      colorProgress.value,
      [0, 1],
      [prevColor.value, nextColor.value]
    );
  });

  useEffect(() => {
    if (isVisible && targetY !== undefined) {
      if (opacity.value === 0) {
        y.value = targetY;
        opacity.value = withTiming(0.5, { duration: 500 });
      } else {
        y.value = withTiming(targetY, { duration: 500 });
        opacity.value = withTiming(0.5, { duration: 500 });
      }
    } else {
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [targetY, isVisible, y, opacity]);

  // Only render if opacity is > 0 or isVisible
  // Since we can't easily unmount inside Canvas, we rely on opacity.
  // We use y.value for position.

  const p1 = useDerivedValue(() => vec(paddingHorizontal, y.value));
  const p2 = useDerivedValue(() => vec(width - paddingHorizontal, y.value));

  return (
    <Line
      p1={p1}
      p2={p2}
      color={derivedColor}
      style="stroke"
      strokeWidth={1}
      opacity={opacity}
    >
      <DashPathEffect intervals={[4, 4]} />
    </Line>
  );
};

interface AnimatedGoalRangeProps {
  minY?: number;
  maxY?: number;
  isVisible: boolean;
  width: number;
  color: string;
  paddingHorizontal: number;
}

const AnimatedGoalRange: React.FC<AnimatedGoalRangeProps> = ({
  minY,
  maxY,
  isVisible,
  width,
  color,
  paddingHorizontal,
}) => {
  const yMin = useSharedValue(minY || 0);
  const yMax = useSharedValue(maxY || 0);
  const opacity = useSharedValue(0);

  const prevColor = useSharedValue(color);
  const nextColor = useSharedValue(color);
  const colorProgress = useSharedValue(1);

  useEffect(() => {
    prevColor.value = nextColor.value;
    nextColor.value = color;
    colorProgress.value = 0;
    colorProgress.value = withTiming(1, { duration: 500 });
  }, [color, prevColor, nextColor, colorProgress]);

  const derivedColor = useDerivedValue(() => {
    return interpolateColor(
      colorProgress.value,
      [0, 1],
      [prevColor.value, nextColor.value]
    );
  });

  useEffect(() => {
    if (isVisible && minY !== undefined && maxY !== undefined) {
      if (opacity.value === 0) {
        // Appear animation: Expand from center
        const center = (minY + maxY) / 2;
        yMin.value = center;
        yMax.value = center;
        
        yMin.value = withTiming(minY, { duration: 500, easing: Easing.out(Easing.quad) });
        yMax.value = withTiming(maxY, { duration: 500, easing: Easing.out(Easing.quad) });
        opacity.value = withTiming(1, { duration: 500 });
      } else {
        // Update animation
        yMin.value = withTiming(minY, { duration: 500 });
        yMax.value = withTiming(maxY, { duration: 500 });
        opacity.value = withTiming(1, { duration: 300 });
      }
    } else {
      // Disappear animation
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [minY, maxY, isVisible, yMin, yMax, opacity]);

  const rectY = useDerivedValue(() => yMax.value);
  const rectHeight = useDerivedValue(() => yMin.value - yMax.value);
  const rectOpacity = useDerivedValue(() => opacity.value * 0.1);
  const lineOpacity = useDerivedValue(() => opacity.value * 0.3);

  const topP1 = useDerivedValue(() => vec(paddingHorizontal, yMax.value));
  const topP2 = useDerivedValue(() => vec(width - paddingHorizontal, yMax.value));

  const bottomP1 = useDerivedValue(() => vec(paddingHorizontal, yMin.value));
  const bottomP2 = useDerivedValue(() => vec(width - paddingHorizontal, yMin.value));

  return (
    <>
      <Rect
        x={paddingHorizontal}
        y={rectY}
        width={width - paddingHorizontal * 2}
        height={rectHeight}
        color={derivedColor}
        opacity={rectOpacity}
      />
      <Line
        p1={topP1}
        p2={topP2}
        color={derivedColor}
        style="stroke"
        strokeWidth={1}
        opacity={lineOpacity}
      >
        <DashPathEffect intervals={[4, 4]} />
      </Line>
      <Line
        p1={bottomP1}
        p2={bottomP2}
        color={derivedColor}
        style="stroke"
        strokeWidth={1}
        opacity={lineOpacity}
      >
        <DashPathEffect intervals={[4, 4]} />
      </Line>
    </>
  );
};

interface AnimatedBarProps {
  bar: BarData;
  progress: SharedValue<number>;
  config: ChartConfig;
  totalBars: number;
  isActive: boolean;
  hasActiveSelection: boolean;
}

const AnimatedBar: React.FC<AnimatedBarProps> = ({
  bar,
  progress,
  config,
  totalBars,
  isActive,
  hasActiveSelection,
}) => {
  const targetHeightSv = useSharedValue(bar.targetHeight);

  useEffect(() => {
    targetHeightSv.value = withTiming(bar.targetHeight, { duration: 500 });
  }, [bar.targetHeight, targetHeightSv]);

  const height = useDerivedValue(() => {
    const delayFactor = 0.5;
    const barDuration = 0.5;

    const start = (bar.index / totalBars) * delayFactor;
    const end = start + barDuration;

    const localProgress = interpolate(
      progress.value,
      [start, end],
      [0, 1],
      Extrapolation.CLAMP
    );

    return localProgress * targetHeightSv.value;
  });

  const prevColorSv = useSharedValue(bar.color);
  const nextColorSv = useSharedValue(bar.color);
  const colorProgress = useSharedValue(1);

  useEffect(() => {
    prevColorSv.value = nextColorSv.value;
    nextColorSv.value = bar.color;
    colorProgress.value = 0;
    colorProgress.value = withTiming(1, { duration: 500 });
  }, [bar.color, prevColorSv, nextColorSv, colorProgress]);

  const color = useDerivedValue(() => {
    return interpolateColor(
      colorProgress.value,
      [0, 1],
      [prevColorSv.value, nextColorSv.value]
    );
  });

  const y = useDerivedValue(() => {
    return config.PADDING.top + config.contentHeight - height.value;
  });

  const opacity = useDerivedValue(() => {
    let target = 1;
    if (hasActiveSelection) {
      target = isActive ? 1 : 0.3;
    } else {
      target = bar.isToday ? 0.35 : 1;
    }
    return withTiming(target, { duration: 200 });
  }, [hasActiveSelection, isActive, bar.isToday]);

  return (
    <RoundedRect
      x={bar.x}
      y={y}
      width={bar.width}
      height={height}
      r={bar.rx}
      color={color}
      opacity={opacity}
    />
  );
};