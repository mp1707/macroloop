import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  Path,
  Skia,
  SweepGradient,
  vec,
} from "@shopify/react-native-skia";
import {
  SharedValue,
  useSharedValue,
  useAnimatedReaction,
  runOnJS,
  withDelay,
  withSpring,
} from "react-native-reanimated";
import { useTheme } from "@/theme";
import { hexToRgb, rgbToHex, adjustColor, interpolateColor } from "@/utils/colorUtils";

interface NutrientValues {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

interface ProgressRingsProps {
  percentages: NutrientValues;
  size?: number;
  strokeWidth?: number;
  spacing?: number;
  padding?: number;
  nutrientKeys?: NutrientKey[];
}

type NutrientKey = keyof NutrientValues;

const ALL_RING_CONFIG: ReadonlyArray<{
  key: NutrientKey;
  colorKey: NutrientKey;
  label: string;
}> = [
  { key: "calories", colorKey: "calories", label: "Calories" },
  { key: "protein", colorKey: "protein", label: "Protein" },
  { key: "carbs", colorKey: "carbs", label: "Carbs" },
  { key: "fat", colorKey: "fat", label: "Fat" },
] as const;

const DEFAULT_KEYS = ALL_RING_CONFIG.map((config) => config.key);

const resolveRingConfigs = (nutrientKeys?: NutrientKey[]) => {
  const requestedKeys =
    nutrientKeys && nutrientKeys.length > 0 ? nutrientKeys : DEFAULT_KEYS;
  const uniqueKeys = Array.from(new Set(requestedKeys));
  return uniqueKeys
    .map((key) => ALL_RING_CONFIG.find((config) => config.key === key))
    .filter((config): config is (typeof ALL_RING_CONFIG)[number] =>
      Boolean(config)
    );
};

type GradientStop = { position: number; color: string };

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const TWO_PI = Math.PI * 2;

const deriveStops = (
  baseColor: string,
  sweep: number,
  effectIntensity: number,
  isDark: boolean
): GradientStop[] => {
  const normalized = clamp01(sweep);
  const intensity = clamp01(effectIntensity);

  // Tone down gradient adjustments for light mode
  const darkBase = adjustColor(baseColor, isDark ? -0.35 : -0.18);
  const lightBase = adjustColor(baseColor, isDark ? 0.12 : 0.06);

  const midShade = baseColor;
  const startShade = interpolateColor(midShade, darkBase, intensity);
  const warmShade = interpolateColor(midShade, lightBase, intensity);
  const highlightShade = midShade;
  const tailShade = startShade;

  const highlightEnd = Math.max(normalized, 0);
  // Reduce highlight flare width in light mode
  const highlightStart = Math.max(
    Math.min(highlightEnd - (isDark ? 0.12 : 0.08), highlightEnd),
    0
  );
  const warmPoint = Math.max(
    Math.min(highlightStart * 0.65, highlightStart),
    0
  );
  const finalPoint =
    normalized >= 0.999 ? 0.999 : Math.min(normalized + 0.015, 0.999);

  return [
    { position: 0, color: startShade },
    { position: warmPoint, color: midShade },
    { position: highlightStart, color: warmShade },
    { position: Math.max(highlightEnd - 0.001, 0), color: highlightShade },
    { position: finalPoint, color: highlightShade },
    { position: 0.999, color: tailShade },
    { position: 1, color: tailShade },
  ];
};

const colorAtOffset = (offset: number, stops: GradientStop[]) => {
  if (stops.length === 0) return "#FFFFFF";
  if (offset <= stops[0].position) {
    return stops[0].color;
  }
  for (let index = 0; index < stops.length - 1; index += 1) {
    const current = stops[index];
    const next = stops[index + 1];
    if (offset >= current.position && offset <= next.position) {
      const localT =
        (offset - current.position) /
        Math.max(next.position - current.position, 0.0001);
      return interpolateColor(current.color, next.color, clamp01(localT));
    }
  }
  return stops[stops.length - 1].color;
};

const stopsEqual = (a: GradientStop[], b: GradientStop[]) =>
  a.length === b.length &&
  a.every(
    (stop, index) =>
      stop.position === b[index]?.position && stop.color === b[index]?.color
  );

interface RingAnimationState {
  sweep: number;
  rotation: number;
  endX: number;
  endY: number;
  shadowX: number;
  shadowY: number;
  opacity: number;
  color: string;
  stops: GradientStop[];
}

const calculateRingState = (
  rawRatio: number,
  center: number,
  radius: number,
  strokeWidth: number,
  baseColor: string,
  isDark: boolean
): RingAnimationState => {
  const ratio = Math.max(rawRatio, 0);
  const capped = Math.min(ratio, 1);
  const sweepValue = ratio >= 1 ? 0.995 : capped;
  const angle = sweepValue * TWO_PI;
  const rotation = Math.max(ratio - 1, 0) * TWO_PI;
  const endX = center + radius * Math.cos(angle);
  const endY = center + radius * Math.sin(angle);
  const tangentAngle = angle + Math.PI / 2;
  const offsetDistance = strokeWidth * 0.55;
  const shadowX = endX + Math.cos(tangentAngle) * offsetDistance;
  const shadowY = endY + Math.sin(tangentAngle) * offsetDistance;
  const opacity = ratio > 0.002 ? 1 : 0;
  const effectIntensity = clamp01((sweepValue - 0.1) / 0.3);
  const stops = deriveStops(baseColor, sweepValue, effectIntensity, isDark);
  const color = colorAtOffset(sweepValue, stops);

  return {
    sweep: sweepValue,
    rotation,
    endX,
    endY,
    shadowX,
    shadowY,
    opacity: ratio > 0.002 ? effectIntensity : 0,
    color,
    stops,
  };
};

const ringStatesEqual = (a: RingAnimationState, b: RingAnimationState) =>
  a.sweep === b.sweep &&
  a.rotation === b.rotation &&
  a.endX === b.endX &&
  a.endY === b.endY &&
  a.shadowX === b.shadowX &&
  a.shadowY === b.shadowY &&
  a.opacity === b.opacity &&
  a.color === b.color &&
  stopsEqual(a.stops, b.stops);

interface BaseRingLayerProps {
  radius: number;
  strokeWidth: number;
  center: number;
  trackColor: string;
  baseColor: string;
  trackOpacity: number;
  shadowColor: string;
  isDark: boolean;
}

interface AnimatedRingLayerProps extends BaseRingLayerProps {
  progress: SharedValue<number>;
}

interface StaticRingLayerProps extends BaseRingLayerProps {
  value: number;
}

interface RingLayerProps extends BaseRingLayerProps {
  animated: boolean;
  progress: SharedValue<number>;
  value: number;
}

const RingVisual: React.FC<
  BaseRingLayerProps & { state: RingAnimationState }
> = ({
  state,
  radius,
  strokeWidth,
  center,
  trackColor,
  trackOpacity,
  shadowColor,
}) => {
  const path = useMemo(() => {
    const ring = Skia.Path.Make();
    ring.addCircle(center, center, radius);
    return ring;
  }, [center, radius]);

  const centerVector = useMemo(() => vec(center, center), [center]);
  const gradientColors = useMemo(
    () => state.stops.map((stop) => stop.color),
    [state.stops]
  );
  const gradientPositions = useMemo(
    () => state.stops.map((stop) => stop.position),
    [state.stops]
  );

  return (
    <>
      <Path
        path={path}
        style="stroke"
        strokeWidth={strokeWidth}
        strokeCap="round"
        color={trackColor}
        opacity={trackOpacity}
      />
      <Group origin={centerVector} transform={[{ rotate: state.rotation }]}>
        <Circle
          cx={state.shadowX}
          cy={state.shadowY}
          r={strokeWidth * 0.75}
          color={shadowColor}
          opacity={state.opacity * 0.75}
        >
          <BlurMask blur={strokeWidth * 1.2} style="normal" />
        </Circle>
        <Path
          path={path}
          style="stroke"
          strokeWidth={strokeWidth}
          strokeCap="round"
          start={0}
          end={state.sweep}
        >
          <SweepGradient
            c={centerVector}
            colors={gradientColors}
            positions={gradientPositions}
          />
        </Path>
        <Circle
          cx={state.endX}
          cy={state.endY}
          r={strokeWidth / 2}
          color={state.color}
          opacity={state.opacity}
        />
      </Group>
    </>
  );
};

const AnimatedRingLayer: React.FC<AnimatedRingLayerProps> = ({
  progress,
  ...baseProps
}) => {
  const [state, setState] = useState(() =>
    calculateRingState(
      progress.value,
      baseProps.center,
      baseProps.radius,
      baseProps.strokeWidth,
      baseProps.baseColor,
      baseProps.isDark
    )
  );

  const updateFromRatio = useCallback(
    (value: number) => {
      const nextState = calculateRingState(
        value,
        baseProps.center,
        baseProps.radius,
        baseProps.strokeWidth,
        baseProps.baseColor,
        baseProps.isDark
      );
      setState((prev) => (ringStatesEqual(prev, nextState) ? prev : nextState));
    },
    [
      baseProps.center,
      baseProps.radius,
      baseProps.strokeWidth,
      baseProps.baseColor,
      baseProps.isDark,
    ]
  );

  useEffect(() => {
    updateFromRatio(progress.value);
  }, [progress, updateFromRatio]);

  useAnimatedReaction(
    () => progress.value,
    (value) => {
      runOnJS(updateFromRatio)(value);
    },
    [updateFromRatio]
  );

  return <RingVisual state={state} {...baseProps} />;
};

const StaticRingLayer: React.FC<StaticRingLayerProps> = ({
  value,
  ...baseProps
}) => {
  const state = useMemo(
    () =>
      calculateRingState(
        value,
        baseProps.center,
        baseProps.radius,
        baseProps.strokeWidth,
        baseProps.baseColor,
        baseProps.isDark
      ),
    [
      value,
      baseProps.center,
      baseProps.radius,
      baseProps.strokeWidth,
      baseProps.baseColor,
      baseProps.isDark,
    ]
  );

  return <RingVisual state={state} {...baseProps} />;
};

const RingLayer: React.FC<RingLayerProps> = ({
  animated,
  progress,
  value,
  ...baseProps
}) => {
  if (!animated) {
    return <StaticRingLayer value={value} {...baseProps} />;
  }
  return <AnimatedRingLayer progress={progress} {...baseProps} />;
};

export const ProgressRings: React.FC<ProgressRingsProps> = ({
  percentages,
  size = 176,
  strokeWidth = 16,
  spacing = 8,
  padding = 8,
  nutrientKeys,
}) => {
  const { colors, colorScheme } = useTheme();
  const isDark = colorScheme === "dark";

  const caloriesProgress = useSharedValue(0);
  const proteinProgress = useSharedValue(0);
  const carbsProgress = useSharedValue(0);
  const fatProgress = useSharedValue(0);

  const progressValues: Record<NutrientKey, SharedValue<number>> = useMemo(
    () => ({
      calories: caloriesProgress,
      protein: proteinProgress,
      carbs: carbsProgress,
      fat: fatProgress,
    }),
    [caloriesProgress, proteinProgress, carbsProgress, fatProgress]
  );

  const ringConfigs = useMemo(
    () => resolveRingConfigs(nutrientKeys),
    [nutrientKeys]
  );

  useEffect(() => {
    ringConfigs.forEach((config, index) => {
      const raw = percentages[config.key] ?? 0;
      const normalized = Math.max(0, raw / 100);
      const delay = index * 120;
      progressValues[config.key].value = withDelay(
        delay,
        withSpring(normalized, {
          mass: 0.6,
          damping: 15,
          stiffness: 120,
        })
      );
    });
  }, [percentages, progressValues, ringConfigs]);

  const normalizedValues = useMemo(
    () =>
      ringConfigs.reduce((acc, config) => {
        const raw = percentages[config.key] ?? 0;
        acc[config.key] = Math.max(0, raw / 100);
        return acc;
      }, {} as Record<NutrientKey, number>),
    [percentages, ringConfigs]
  );

  const center = size / 2;
  const outerRadius = center - strokeWidth / 2 - padding;
  const radii = useMemo(() => {
    const values: number[] = [];
    let current = outerRadius;
    for (let index = 0; index < ringConfigs.length; index += 1) {
      values.push(current);
      if (index < ringConfigs.length - 1) {
        current -= strokeWidth + spacing;
      }
    }
    return values;
  }, [outerRadius, spacing, strokeWidth, ringConfigs]);

  const ringColors = {
    calories: colors.semantic.calories,
    protein: colors.semantic.protein,
    carbs: colors.semantic.carbs,
    fat: colors.semantic.fat,
  } satisfies Record<NutrientKey, string>;
  const ringTracks = {
    calories: colors.semanticSurfaces.calories,
    protein: colors.semanticSurfaces.protein,
    carbs: colors.semanticSurfaces.carbs,
    fat: colors.semanticSurfaces.fat,
  } satisfies Record<NutrientKey, string>;
  const shadowColor = isDark ? "rgba(0, 0, 0, 0.6)" : "rgba(0, 0, 0, 0.32)";

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
      pointerEvents="none"
    >
      <Canvas
        style={{ width: size, height: size }}
        pointerEvents="none"
        key={isDark ? "dark" : "light"}
      >
        <Group
          origin={vec(center, center)}
          transform={[{ rotate: -Math.PI / 2 }]}
        >
          {ringConfigs.map((config, index) => (
            <RingLayer
              key={config.key}
              animated
              progress={progressValues[config.key]}
              value={normalizedValues[config.key]}
              radius={radii[index] ?? outerRadius}
              strokeWidth={strokeWidth}
              center={center}
              trackColor={ringTracks[config.key]}
              baseColor={ringColors[config.key]}
              trackOpacity={1}
              shadowColor={shadowColor}
              isDark={isDark}
            />
          ))}
        </Group>
      </Canvas>
    </View>
  );
};

type ProgressRingsStaticProps = ProgressRingsProps;

export const ProgressRingsStatic: React.FC<ProgressRingsStaticProps> = ({
  percentages,
  size = 176,
  strokeWidth = 16,
  spacing = 8,
  padding = 8,
  nutrientKeys,
}) => {
  const { colors, colorScheme } = useTheme();
  const isDark = colorScheme === "dark";

  const center = size / 2;
  const outerRadius = center - strokeWidth / 2 - padding;

  const ringConfigs = useMemo(
    () => resolveRingConfigs(nutrientKeys),
    [nutrientKeys]
  );

  const radii = useMemo(() => {
    const values: number[] = [];
    let current = outerRadius;
    for (let index = 0; index < ringConfigs.length; index += 1) {
      values.push(current);
      if (index < ringConfigs.length - 1) {
        current -= strokeWidth + spacing;
      }
    }
    return values;
  }, [outerRadius, spacing, strokeWidth, ringConfigs]);

  const normalizedValues = useMemo(
    () =>
      ringConfigs.reduce((acc, config) => {
        const raw = percentages[config.key] ?? 0;
        acc[config.key] = Math.max(0, raw / 100);
        return acc;
      }, {} as Record<NutrientKey, number>),
    [percentages, ringConfigs]
  );

  const ringColors = {
    calories: colors.semantic.calories,
    protein: colors.semantic.protein,
    carbs: colors.semantic.carbs,
    fat: colors.semantic.fat,
  } satisfies Record<NutrientKey, string>;
  const ringTracks = {
    calories: colors.semanticSurfaces.calories,
    protein: colors.semanticSurfaces.protein,
    carbs: colors.semanticSurfaces.carbs,
    fat: colors.semanticSurfaces.fat,
  } satisfies Record<NutrientKey, string>;
  const shadowColor = isDark ? "rgba(0, 0, 0, 0.6)" : "rgba(0, 0, 0, 0.32)";

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
      pointerEvents="none"
    >
      <Canvas
        style={{ width: size, height: size }}
        pointerEvents="none"
        key={isDark ? "dark" : "light"}
      >
        <Group
          origin={vec(center, center)}
          transform={[{ rotate: -Math.PI / 2 }]}
        >
          {ringConfigs.map((config, index) => (
            <StaticRingLayer
              key={config.key}
              value={normalizedValues[config.key]}
              radius={radii[index] ?? outerRadius}
              strokeWidth={strokeWidth}
              center={center}
              trackColor={ringTracks[config.key]}
              baseColor={ringColors[config.key]}
              trackOpacity={1}
              shadowColor={shadowColor}
              isDark={isDark}
            />
          ))}
        </Group>
      </Canvas>
    </View>
  );
};
