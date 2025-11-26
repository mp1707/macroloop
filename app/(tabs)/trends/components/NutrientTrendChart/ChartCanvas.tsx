import React from "react";
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

  return (
    <GestureDetector gesture={gesture}>
      <Canvas
        style={{
          width: config.chartWidth,
          height: config.chartHeight,
        }}
      >
        {/* Goal Range */}
        {hasGoalRange && goalRange && (
          <>
            <Rect
              x={theme.spacing.sm}
              y={config.PADDING.top + config.scaleY(goalRange.max)}
              width={config.chartWidth - theme.spacing.sm * 2}
              height={
                config.scaleY(goalRange.min) - config.scaleY(goalRange.max)
              }
              color={color}
              opacity={0.1}
            />
            <Line
              p1={vec(
                theme.spacing.sm,
                config.PADDING.top + config.scaleY(goalRange.max)
              )}
              p2={vec(
                config.chartWidth - theme.spacing.sm,
                config.PADDING.top + config.scaleY(goalRange.max)
              )}
              color={color}
              style="stroke"
              strokeWidth={1}
              opacity={0.3}
            >
              <DashPathEffect intervals={[4, 4]} />
            </Line>
            <Line
              p1={vec(
                theme.spacing.sm,
                config.PADDING.top + config.scaleY(goalRange.min)
              )}
              p2={vec(
                config.chartWidth - theme.spacing.sm,
                config.PADDING.top + config.scaleY(goalRange.min)
              )}
              color={color}
              style="stroke"
              strokeWidth={1}
              opacity={0.3}
            >
              <DashPathEffect intervals={[4, 4]} />
            </Line>
          </>
        )}

        {/* Goal Line */}
        {!hasGoalRange && goalLineY !== undefined && (
          <Line
            p1={vec(theme.spacing.sm, goalLineY)}
            p2={vec(config.chartWidth - theme.spacing.sm, goalLineY)}
            color={color}
            style="stroke"
            strokeWidth={1}
            opacity={0.5}
          >
            <DashPathEffect intervals={[4, 4]} />
          </Line>
        )}

        {/* Bars */}
        {bars.map((bar) => (
          <AnimatedBar
            key={bar.key}
            bar={bar}
            progress={progress}
            config={config}
            totalBars={bars.length}
          />
        ))}
      </Canvas>
    </GestureDetector>
  );
};

interface AnimatedBarProps {
  bar: BarData;
  progress: SharedValue<number>;
  config: ChartConfig;
  totalBars: number;
}

const AnimatedBar: React.FC<AnimatedBarProps> = ({
  bar,
  progress,
  config,
  totalBars,
}) => {
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

    return localProgress * bar.targetHeight;
  });

  const y = useDerivedValue(() => {
    return config.PADDING.top + config.contentHeight - height.value;
  });

  return (
    <RoundedRect
      x={bar.x}
      y={y}
      width={bar.width}
      height={height}
      r={bar.rx}
      color={bar.color}
      opacity={bar.isToday ? 0.35 : 1}
    />
  );
};
