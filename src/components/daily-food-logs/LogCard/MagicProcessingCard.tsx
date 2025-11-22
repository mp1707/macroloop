import React, { useEffect } from "react";
import { View } from "react-native";
import {
  Canvas,
  Group,
  Rect,
  RoundedRect,
  LinearGradient,
  RadialGradient,
  Circle,
  vec,
  rrect,
  rect,
  BlurMask, // <- correct blur/glow
} from "@shopify/react-native-skia";
import {
  useSharedValue,
  useDerivedValue,
  withRepeat,
  withTiming,
  Easing,
  useAnimatedReaction,
} from "react-native-reanimated";

type MagicProcessingCardProps = {
  width: number;
  height: number;
  radius: number;
  /** while true: show full-card animation. when set to false: play resolve animation then call onResolveDone */
  active: boolean;
  onResolveDone?: () => void;
  /** Brand colors (fallbacks provided) */
  colors?: {
    calories?: string; // cyan
    protein?: string; // blue
    carbs?: string; // pink
    fat?: string; // yellow
  };
};

export const MagicProcessingCard: React.FC<MagicProcessingCardProps> = ({
  width,
  height,
  radius,
  active,
  onResolveDone,
  colors = {
    calories: "#44EBD4",
    protein: "#6A9BFF",
    carbs: "#FF8A8A",
    fat: "#FFD740",
  },
}) => {
  // ---- layout + clip ----
  const clip = useDerivedValue(() =>
    rrect(rect(0, 0, width, height), radius, radius)
  );

  const center = { x: width * 0.42, y: height * 0.52 };
  const orbitBase = Math.min(width, height) * 0.22;

  // ---- main loop drivers ----
  const orbitProgress = useSharedValue(0); // 0..1 repeats
  const shimmerT = useSharedValue(0); // 0..1 repeats
  const pulseT = useSharedValue(0); // 0..1 repeats
  const reveal = useSharedValue(0); // 0..1 when leaving

  // Start loops on mount
  useEffect(() => {
    orbitProgress.value = withRepeat(
      withTiming(1, { duration: 5500, easing: Easing.linear }),
      -1,
      false
    );
    shimmerT.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    pulseT.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  // When `active` becomes false, run resolve timeline (0->1) then notify
  useAnimatedReaction(
    () => active,
    (isActive, wasActive) => {
      if (wasActive && !isActive) {
        reveal.value = withTiming(
          1,
          { duration: 700, easing: Easing.out(Easing.cubic) },
          (finished) => {
            if (finished && onResolveDone) onResolveDone();
          }
        );
      }
      if (isActive && !wasActive) {
        // going back to active: reset
        reveal.value = 0;
      }
    }
  );

  // ---- helpers ----
  const twoPi = Math.PI * 2;
  const orbit = (offset: number, speedMul: number, radiusMul: number) =>
    useDerivedValue(() => {
      const t = orbitProgress.value;
      const angle = t * twoPi * speedMul + offset;
      const r = orbitBase * radiusMul * (1 - 0.25 * reveal.value); // shrink on reveal
      const cx = center.x + r * Math.cos(angle);
      const cy = center.y + r * Math.sin(angle);
      // lerp toward target area on the right during reveal
      const targetX = width * 0.78;
      const targetYBase = height * 0.42;
      const target = { x: targetX, y: targetYBase };
      const mix = reveal.value;
      return vec(
        cx * (1 - mix) + target.x * mix,
        cy * (1 - mix) + target.y * mix
      );
    });

  // Four nutrients: staggered offsets, slight radius differences
  const p_cal = orbit(0, 1.4, 1.05); // calories (cyan)
  const p_pro = orbit((2 * Math.PI) / 4, 1.85, 1); // protein (blue)
  const p_car = orbit(((2 * Math.PI) / 4) * 2, 1.6, 0.92); // carbs (pink)
  const p_fat = orbit(((2 * Math.PI) / 4) * 3, 2.1, 0.88); // fat (yellow)

  // Orb size “breathes”, then reduces on reveal
  const orbR = useDerivedValue(() => {
    const breathe = 1 + 0.12 * Math.sin(orbitProgress.value * twoPi);
    const base = 9 * breathe;
    return base * (1 - 0.35 * reveal.value);
  });

  // Pulse ring (expanding then fading)
  const pulseR = useDerivedValue(() => {
    const t = pulseT.value; // 0..1
    const min = orbitBase * 0.6;
    const max = orbitBase * 1.35;
    return min + (max - min) * t * (1 - 0.5 * reveal.value);
  });
  const pulseOpacity = useDerivedValue(
    () => 0.35 * (1 - pulseT.value) * (1 - reveal.value)
  );

  // Shimmer sweep x position
  const shimmerX = useDerivedValue(() => {
    const t = shimmerT.value; // 0..1
    return -width * 0.6 + t * (width * 1.8);
  });

  // Whole-canvas fade when revealing
  const canvasOpacity = useDerivedValue(() => 1 - reveal.value);

  // Aurora and shimmer opacity (fade out on reveal)
  const auroraOpacity = useDerivedValue(() => 0.22 * (1 - reveal.value));
  const shimmerOpacity = useDerivedValue(() => 0.18 * (1 - reveal.value));

  // ---- render ----
  return (
    <View style={{ width, height, borderRadius: radius, overflow: "hidden" }}>
      <Canvas style={{ width, height }}>
        {/* Clip everything to rounded rect */}
        <Group clip={clip} opacity={canvasOpacity}>
          {/* Living gradient background */}
          <Rect x={0} y={0} width={width} height={height}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(width, height)}
              colors={[
                colors.protein!,
                colors.carbs!,
                colors.fat!,
                colors.calories!,
              ]}
            />
          </Rect>

          {/* Soft aurora blobs */}
          <Group opacity={auroraOpacity}>
            <Rect x={0} y={0} width={width} height={height}>
              <RadialGradient
                c={vec(width * 0.2, height * 0.2)}
                r={width * 0.5}
                colors={[colors.calories!, "transparent"]}
              />
            </Rect>
            <Rect x={0} y={0} width={width} height={height}>
              <RadialGradient
                c={vec(width * 0.9, height * 0.7)}
                r={width * 0.55}
                colors={[colors.protein!, "transparent"]}
              />
            </Rect>
          </Group>

          {/* Energy pulse ring */}
          <Group opacity={pulseOpacity}>
            <Circle
              c={vec(center.x, center.y)}
              r={pulseR}
              color={colors.calories!}
              style="stroke"
              strokeWidth={2}
            />
          </Group>

          {/* Orbiting nutrient orbs with glow */}
          <Circle c={p_cal} r={orbR} color={colors.calories!}>
            <BlurMask blur={16} style="normal" />
          </Circle>
          <Circle c={p_pro} r={orbR} color={colors.protein!}>
            <BlurMask blur={14} style="normal" />
          </Circle>
          <Circle c={p_car} r={orbR} color={colors.carbs!}>
            <BlurMask blur={14} style="normal" />
          </Circle>
          <Circle c={p_fat} r={orbR} color={colors.fat!}>
            <BlurMask blur={12} style="normal" />
          </Circle>

          {/* Shimmer sweep */}
          <Group opacity={shimmerOpacity}>
            <Rect
              x={shimmerX}
              y={-height * 0.2}
              width={width * 0.8}
              height={height * 1.4}
            >
              <LinearGradient
                start={vec(0, 0)}
                end={vec(width * 0.8, height * 1.4)}
                colors={["transparent", "#ffffff", "transparent"]}
              />
            </Rect>
          </Group>

          {/* Subtle rounded card outline to keep it “card-like” */}
          <RoundedRect
            x={0}
            y={0}
            width={width}
            height={height}
            r={radius}
            style="stroke"
            strokeWidth={1}
            color="#FFFFFF10"
          />
        </Group>
      </Canvas>
    </View>
  );
};
