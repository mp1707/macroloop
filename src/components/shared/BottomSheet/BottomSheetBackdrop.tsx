import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

interface BottomSheetBackdropProps {
  open: boolean;
  onPress: () => void;
  opacity?: number;
}

export const BottomSheetBackdrop: React.FC<BottomSheetBackdropProps> = ({
  open,
  onPress,
  opacity = 0.35,
}) => {
  const backdropOpacity = useSharedValue(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      backdropOpacity.value = withTiming(opacity, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
    } else if (visible) {
      backdropOpacity.value = withTiming(
        0,
        {
          duration: 250,
          easing: Easing.in(Easing.cubic),
        },
        (finished) => {
          if (finished) {
            scheduleOnRN(setVisible)(false);
          }
        }
      );
    }
  }, [open, opacity, visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!visible) return null;

  return (
    <Pressable style={StyleSheet.absoluteFill} onPress={onPress}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "black" },
          backdropStyle,
        ]}
      />
    </Pressable>
  );
};
