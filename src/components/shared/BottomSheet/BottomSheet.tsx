import React, { useEffect, useState } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/theme";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const CLOSE_THRESHOLD = 100; // px to drag down before closing
const CLOSE_VELOCITY_THRESHOLD = 500; // velocity threshold for quick dismiss

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  backdropOpacity?: number;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  open,
  onClose,
  children,
}) => {
  const { colors, theme } = useTheme();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const contentHeight = useSharedValue(0);
  const [visible, setVisible] = useState(false);

  // Trigger haptic and close
  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  // Animate sheet position based on open state
  useEffect(() => {
    if (open) {
      // Show immediately and animate in
      setVisible(true);
      translateY.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
    } else if (visible) {
      // Animate out then hide
      translateY.value = withTiming(
        SCREEN_HEIGHT,
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
  }, [open, visible]);

  // Pan gesture for drag-to-close
  const panGesture = Gesture.Pan()
    .activeOffsetY([10, 999]) // Only activate on downward drag
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      const shouldClose =
        event.translationY > CLOSE_THRESHOLD ||
        event.velocityY > CLOSE_VELOCITY_THRESHOLD;

      if (shouldClose) {
        translateY.value = withTiming(
          SCREEN_HEIGHT,
          {
            duration: 250,
            easing: Easing.in(Easing.cubic),
          },
          () => {
            scheduleOnRN(handleClose)();
          }
        );
      } else {
        // Snap back to open position
        translateY.value = withSpring(0, {
          damping: 25,
          stiffness: 350,
        });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    contentHeight.value = height;
  };

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: colors.secondaryBackground,
            borderTopLeftRadius: theme.components.cards.cornerRadius,
            borderTopRightRadius: theme.components.cards.cornerRadius,
          },
          sheetStyle,
        ]}
      >
        {/* Grabber Handle - ONLY THIS IS DRAGGABLE */}
        <GestureDetector gesture={panGesture}>
          <View style={styles.grabberContainer}>
            <View
              style={[
                styles.grabber,
                { backgroundColor: colors.secondaryText },
              ]}
            />
          </View>
        </GestureDetector>

        {/* Content with Keyboard Awareness */}
        <KeyboardAwareScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          bottomOffset={20}
          extraKeyboardSpace={16}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View onLayout={handleLayout}>{children}</View>
        </KeyboardAwareScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: SCREEN_HEIGHT * 0.9,
  },
  grabberContainer: {
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 20,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
