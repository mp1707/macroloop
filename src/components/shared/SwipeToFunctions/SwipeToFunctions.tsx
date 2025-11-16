import React, { ReactNode, useMemo, useEffect, useRef } from "react";
import { Alert, Dimensions, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { lockNav, isNavLocked } from "@/utils/navigationLock";
import { theme } from "@/theme";
import { useIsFocused } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
interface SwipeToFunctionsProps {
  children: ReactNode;
  onDelete?: () => void | Promise<void>;
  confirmDelete?: boolean;
  onLeftFunction?: () => void;
  confirmLeftFunction?: boolean;
  leftIcon?: ReactNode;
  leftBackgroundColor?: string;
  onTap?: () => void; // Navigation handler for tap gestures
  borderRadius?: number;
  onSwipeStart?: () => void;
  onSwipeEnd?: () => void;
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const ACTION_THRESHOLD = SCREEN_WIDTH * 0.3; // 30% of screen width
const ACTION_COMPLETE_THRESHOLD = SCREEN_WIDTH * 0.7; // 70% of screen width
const ACTION_BUTTON_WIDTH = 90;

// Threshold for determining if gesture is horizontal vs vertical
const DIRECTION_THRESHOLD = 35; // Higher threshold to avoid accidental horizontal captures
const VERTICAL_SCROLL_THRESHOLD = 16; // Release press feedback quickly on vertical intent

export const SwipeToFunctions: React.FC<SwipeToFunctionsProps> = ({
  children,
  onDelete,
  confirmDelete = true,
  onLeftFunction,
  confirmLeftFunction = false,
  leftIcon = <FontAwesome name="star" size={24} color="white" />,
  leftBackgroundColor,
  onTap,
  borderRadius = theme.components.cards.cornerRadius,
  onSwipeStart,
  onSwipeEnd,
}) => {
  // Screen focus awareness to prevent tap-through when regaining focus
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  const focusAtTsRef = useRef<number>(0);
  const focusAtMs = useSharedValue(0);
  const tapStartMs = useSharedValue(0);
  const TAP_AFTER_FOCUS_GRACE_MS = 600; // taps must start after this grace window
  // Treat presses shorter than the long-press threshold as taps.
  // LogCard uses delayLongPress ~500ms, so give a small buffer to avoid a dead zone.
  const TAP_MAX_PRESS_DURATION_MS = 600; // anything <600ms counts as tap; >=600ms not a tap

  useEffect(() => {
    if (isFocused) {
      const now = Date.now();
      focusAtTsRef.current = now;
      focusAtMs.value = now;
    }
  }, [isFocused, focusAtMs]);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const height = useSharedValue(1);
  const isDeleting = useSharedValue(false);
  const gestureDirection = useSharedValue<
    "unknown" | "horizontal" | "vertical"
  >("unknown");

  // Persistent swipe state tracking
  const isLeftSwiped = useSharedValue(false); // Track left swipe state (leftFunction)
  const isRightSwiped = useSharedValue(false); // Track right swipe state (delete)

  // Press animation shared values
  const scale = useSharedValue(1);

  // Track if gesture started as a press (for tap vs swipe differentiation)
  const isPressing = useSharedValue(false);

  const colors = theme.getColors();
  const deleteAlertTitle = t("swipeActions.deleteTitle");
  const deleteAlertMessage = t("swipeActions.deleteMessage");
  const confirmAlertTitle = t("swipeActions.confirmTitle");
  const confirmAlertMessage = t("swipeActions.confirmMessage");
  const cancelLabel = t("common.cancel");
  const deleteLabel = t("common.delete");
  const confirmLabel = t("common.confirm");
  const deleteHint = t("swipeActions.deleteHint");

  // Helper functions for JS thread actions - defined early for worklet access
  const triggerTap = () => {
    if (!onTap) return;
    // Skip tap if navigation is currently locked (e.g., a long-press menu opened)
    if (isNavLocked()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Lock interactions briefly to prevent immediate long-press menu
    lockNav(400);
    onTap();
  };

  const executeDelete = () => {
    if (!onDelete) return;

    isDeleting.value = true;
    // Reset swipe state when deleting
    isLeftSwiped.value = false;
    isRightSwiped.value = false;

    // Start the animation first to maintain UX
    translateX.value = withTiming(
      -SCREEN_WIDTH * 1.2, // Slide slightly further for full exit effect
      {
        duration: 250, // Faster slide for more responsive feel
      },
      () => {
        // Then collapse height and fade out quickly
        opacity.value = withTiming(0, { duration: 150 });
        height.value = withTiming(
          0,
          { duration: 200 }, // Quick collapse
          () => {
            // Call onDelete at the end of the animation
            // This ensures cleanup happens but animation plays first
            runOnJS(onDelete)();
          }
        );
      }
    );
  };

  const executeLeftFunction = () => {
    if (!onLeftFunction) return;

    // Reset swipe state when executing left function
    isLeftSwiped.value = false;
    isRightSwiped.value = false;

    // Execute left function action and animate back to center
    runOnJS(onLeftFunction)();
    translateX.value = withSpring(0, {
      damping: 20,
      stiffness: 300,
    });
  };

  const handleDelete = () => {
    if (confirmDelete) {
      Alert.alert(
        deleteAlertTitle,
        deleteAlertMessage,
        [
          {
            text: cancelLabel,
            style: "cancel",
            onPress: () => {
              // Reset position and swipe state
              isLeftSwiped.value = false;
              translateX.value = withSpring(0);
            },
          },
          {
            text: deleteLabel,
            style: "destructive",
            onPress: () => {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Warning
              );
              executeDelete();
            },
          },
        ]
      );
    } else {
      // Direct delete without confirmation
      executeDelete();
    }
  };

  const handleLeftFunction = () => {
    if (confirmLeftFunction) {
      Alert.alert(confirmAlertTitle, confirmAlertMessage, [
        {
          text: cancelLabel,
          style: "cancel",
          onPress: () => {
            // Reset position and swipe state
            isLeftSwiped.value = false;
            translateX.value = withSpring(0);
          },
        },
        {
          text: confirmLabel,
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            executeLeftFunction();
          },
        },
      ]);
    } else {
      // Direct action without confirmation
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      executeLeftFunction();
    }
  };

  // Enhanced pan gesture that handles both press animations and swipe actions
  const enhancedGesture = useMemo(() => {
    const releasePressFeedback = () => {
      "worklet";
      if (!isPressing.value) return;
      isPressing.value = false;
      scale.value = withSpring(1.0, {
        damping: theme.interactions.press.spring.damping,
        stiffness: theme.interactions.press.spring.stiffness,
      });
    };

    return Gesture.Pan()
      .activeOffsetX([-10, 10]) // Only become active for horizontal movement
      .failOffsetY([-30, 30]) // Fail if vertical movement is too large
      .onBegin(() => {
        // Begin press feedback immediately; cancel if gesture changes direction
        // Only apply press animation if onTap is provided
        if (!isDeleting.value && onTap) {
          isPressing.value = true;
          tapStartMs.value = Date.now();
          // Subtle scale
          scale.value = withTiming(theme.interactions.press.scale, {
            duration: theme.interactions.press.timing.duration,
            easing: theme.interactions.press.timing.easing,
          });
        }
      })
      .onStart(() => {
        gestureDirection.value = "unknown";
        // Don't reset translateX if we're in a persistent swipe state
      })
      .onUpdate((event) => {
        // Don't allow gestures during delete animation
        if (isDeleting.value) return;

        const { translationX, translationY } = event;

        // Determine gesture direction on first significant movement
        if (gestureDirection.value === "unknown") {
          const absX = Math.abs(translationX);
          const absY = Math.abs(translationY);

          // Detect vertical intent quickly to avoid lingering press feedback while scrolling
          if (absY > VERTICAL_SCROLL_THRESHOLD && absY > absX) {
            gestureDirection.value = "vertical";
            releasePressFeedback();
            return;
          }

          // Only determine horizontal direction after significant movement
          if (absX > DIRECTION_THRESHOLD && absX > absY * 2.5) {
            gestureDirection.value = "horizontal";
            runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
            releasePressFeedback();
            if (onSwipeStart) {
              runOnJS(onSwipeStart)();
            }
          }
        }

        // Only handle horizontal swipes for actions
        if (gestureDirection.value === "horizontal") {
          // Allow swiping in both directions based on available actions
          if (translationX > 0 && onLeftFunction) {
            // Swiping right for left function
            translateX.value = translationX;

            // Check if we should dismiss right swipe state when swiping right
            if (isRightSwiped.value && translationX > 10) {
              isRightSwiped.value = false;
            }
          } else if (translationX < 0 && onDelete) {
            // Swiping left for delete
            translateX.value = translationX;

            // Check if we should dismiss left swipe state when swiping left
            if (isLeftSwiped.value && translationX < -10) {
              isLeftSwiped.value = false;
            }
          } else if (isLeftSwiped.value || isRightSwiped.value) {
            // Handle swipe back to center when in persistent swipe state
            if (isLeftSwiped.value && translationX < ACTION_BUTTON_WIDTH / 2) {
              // Swiping back from left swipe position
              translateX.value = translationX;
            } else if (
              isRightSwiped.value &&
              translationX > -ACTION_BUTTON_WIDTH / 2
            ) {
              // Swiping back from right swipe position
              translateX.value = translationX;
            }
          }
        }
      })
      .onEnd((event) => {
        // Don't process gestures during delete animation
        if (isDeleting.value) return;

        const { translationX, velocityX } = event;

        // Only process swipe actions for horizontal gestures
        if (gestureDirection.value === "horizontal") {
          if (translationX > 0 && onLeftFunction) {
            // Right swipe - Left function action
            if (
              translationX > ACTION_COMPLETE_THRESHOLD ||
              (translationX > ACTION_THRESHOLD && velocityX > 500)
            ) {
              runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Heavy);
              runOnJS(executeLeftFunction)();
            } else if (translationX > ACTION_THRESHOLD) {
              // Show left function button and set persistent state
              if (!isLeftSwiped.value) {
                runOnJS(Haptics.impactAsync)(
                  Haptics.ImpactFeedbackStyle.Medium
                );
                isLeftSwiped.value = true;
              }
              translateX.value = withSpring(ACTION_BUTTON_WIDTH);
            } else if (
              isLeftSwiped.value &&
              translationX < ACTION_BUTTON_WIDTH / 2
            ) {
              // Dismiss left swipe state when swiping back to center
              isLeftSwiped.value = false;
              translateX.value = withSpring(0);
            } else if (!isLeftSwiped.value) {
              // Snap back to original position if not in persistent state
              translateX.value = withSpring(0);
            } else {
              // Stay in swiped position
              translateX.value = withSpring(ACTION_BUTTON_WIDTH);
            }
          } else if (translationX < 0 && onDelete) {
            // Left swipe - Delete action
            if (
              translationX < -ACTION_COMPLETE_THRESHOLD ||
              (translationX < -ACTION_THRESHOLD && velocityX < -500)
            ) {
              runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Heavy);
              runOnJS(executeDelete)();
            } else if (translationX < -ACTION_THRESHOLD) {
              // Show delete button and set persistent state
              if (!isRightSwiped.value) {
                runOnJS(Haptics.impactAsync)(
                  Haptics.ImpactFeedbackStyle.Medium
                );
                isRightSwiped.value = true;
              }
              translateX.value = withSpring(-ACTION_BUTTON_WIDTH);
            } else if (
              isRightSwiped.value &&
              translationX > -ACTION_BUTTON_WIDTH / 2
            ) {
              // Dismiss right swipe state when swiping back to center
              isRightSwiped.value = false;
              translateX.value = withSpring(0);
            } else if (!isRightSwiped.value) {
              // Snap back to original position if not in persistent state
              translateX.value = withSpring(0);
            } else {
              // Stay in swiped position
              translateX.value = withSpring(-ACTION_BUTTON_WIDTH);
            }
          } else if (isLeftSwiped.value || isRightSwiped.value) {
            // Handle swipe back to center from persistent state
            if (isLeftSwiped.value && translationX < ACTION_BUTTON_WIDTH / 2) {
              isLeftSwiped.value = false;
              translateX.value = withSpring(0);
            } else if (
              isRightSwiped.value &&
              translationX > -ACTION_BUTTON_WIDTH / 2
            ) {
              isRightSwiped.value = false;
              translateX.value = withSpring(0);
            } else {
              // Stay in current swiped position
              translateX.value = withSpring(
                isLeftSwiped.value ? ACTION_BUTTON_WIDTH : -ACTION_BUTTON_WIDTH
              );
            }
          } else {
            // Snap back to original position
            translateX.value = withSpring(0);
          }
        } else {
          // For non-horizontal gestures, maintain current position if in persistent state
          if (isLeftSwiped.value) {
            translateX.value = withSpring(ACTION_BUTTON_WIDTH);
          } else if (isRightSwiped.value) {
            translateX.value = withSpring(-ACTION_BUTTON_WIDTH);
          } else {
            translateX.value = withSpring(0);
          }
        }

        // Reset direction for next gesture
        gestureDirection.value = "unknown";
      })
      .onTouchesUp(() => {
        // Handle press release animation and tap detection
        const wasJustTapping =
          isPressing.value && gestureDirection.value === "unknown";

        const tapStartedAfterFocusGrace =
          tapStartMs.value - focusAtMs.value >= TAP_AFTER_FOCUS_GRACE_MS;

        const pressDuration = Date.now() - tapStartMs.value;

        if (
          wasJustTapping &&
          tapStartedAfterFocusGrace &&
          pressDuration < TAP_MAX_PRESS_DURATION_MS &&
          !isDeleting.value &&
          onTap
        ) {
          // Confirmed tap: return to normal state and trigger tap
          isPressing.value = false;
          scale.value = withTiming(
            1.0,
            {
              duration: theme.interactions.press.timing.duration,
              easing: theme.interactions.press.timing.easing,
            },
            () => {
              runOnJS(triggerTap)();
            }
          );
        } else {
          // Not a tap: ensure any pending press visuals are cleared
          releasePressFeedback();
        }
      })
      .onFinalize(() => {
        // Only reset position if not deleting and not in persistent swipe state
        if (!isDeleting.value && !isLeftSwiped.value && !isRightSwiped.value) {
          translateX.value = withSpring(0);
        } else if (!isDeleting.value) {
          // Maintain swiped position if in persistent state
          translateX.value = withSpring(
            isLeftSwiped.value
              ? ACTION_BUTTON_WIDTH
              : isRightSwiped.value
              ? -ACTION_BUTTON_WIDTH
              : 0
          );
        }

        // Reset press state if still active
        releasePressFeedback();

        if (onSwipeEnd) {
          runOnJS(onSwipeEnd)();
        }

        gestureDirection.value = "unknown";
      })
      .onTouchesCancelled(() => {
        releasePressFeedback();
        if (onSwipeEnd) {
          runOnJS(onSwipeEnd)();
        }
        gestureDirection.value = "unknown";
      });
  }, [onDelete, onLeftFunction, onTap, onSwipeStart, onSwipeEnd]);

  const containerStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scaleY: height.value }],
    };
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const pressScaleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const deleteButtonContainerStyle = useAnimatedStyle(() => {
    // Hide delete button immediately when delete animation starts or if no delete action
    if (isDeleting.value || !onDelete) {
      return {
        opacity: 0,
        width: 0,
      };
    }

    // Only show for negative translation (left swipe)
    const translationValue = Math.min(translateX.value, 0);

    // Only show when actively swiping left
    if (translationValue >= 0) {
      return {
        opacity: 0,
        width: 0,
      };
    }

    const absTranslation = Math.abs(translationValue);

    // Fast fade-in: almost immediately visible when swiping starts
    const buttonOpacity = interpolate(
      absTranslation,
      [0, 5, 10],
      [0, 0.9, 1],
      Extrapolation.CLAMP
    );

    const width = Math.max(
      absTranslation * 1.1,
      ACTION_BUTTON_WIDTH + 20
    );

    return {
      opacity: buttonOpacity,
      width,
    };
  });

  const leftFunctionButtonContainerStyle = useAnimatedStyle(() => {
    // Hide left function button if no left function action or during delete animation
    if (!onLeftFunction || isDeleting.value) {
      return {
        opacity: 0,
        width: 0,
      };
    }

    // Only show for positive translation (right swipe)
    const translationValue = Math.max(translateX.value, 0);

    // Only show when actively swiping right
    if (translationValue <= 0) {
      return {
        opacity: 0,
        width: 0,
      };
    }

    // Fast fade-in: almost immediately visible when swiping starts
    const buttonOpacity = interpolate(
      translationValue,
      [0, 5, 10],
      [0, 0.9, 1],
      Extrapolation.CLAMP
    );

    const width = Math.max(translationValue * 1.1, ACTION_BUTTON_WIDTH + 20);

    return {
      opacity: buttonOpacity,
      width,
    };
  });

  const deleteButtonStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      Math.abs(Math.min(translateX.value, 0)),
      [0, ACTION_THRESHOLD, ACTION_COMPLETE_THRESHOLD],
      [0.8, 1, 1.1],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale }],
    };
  });

  const leftFunctionButtonStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      Math.max(translateX.value, 0),
      [0, ACTION_THRESHOLD, ACTION_COMPLETE_THRESHOLD],
      [0.8, 1, 1.1],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale }],
    };
  });

  return (
    <Animated.View>
      <Animated.View
        style={[
          {
            borderRadius,
          },
          containerStyle,
        ]}
      >
        <Animated.View style={[{ position: "relative" }, pressScaleStyle]}>
          {/* Left Function Button Background */}
          {onLeftFunction && (
            <Animated.View
              style={[
                {
                  position: "absolute",
                  left: 0,
                  top: 0,
                  borderTopLeftRadius: borderRadius,
                  borderBottomLeftRadius: borderRadius,
                  bottom: 0,
                  backgroundColor: leftBackgroundColor || colors.semantic.fat, // Using semantic FAT color
                  justifyContent: "center",
                  alignItems: "center",
                },
                leftFunctionButtonContainerStyle,
              ]}
            >
              <Pressable onPress={handleLeftFunction} style={{ padding: 5 }}>
                <Animated.View style={leftFunctionButtonStyle}>
                  {leftIcon}
                </Animated.View>
              </Pressable>
            </Animated.View>
          )}

          {/* Delete Button Background */}
          {onDelete && (
            <Animated.View
              style={[
                {
                  position: "absolute",
                  right: 0,
                  top: 0,
                  borderTopRightRadius: borderRadius,
                  borderBottomRightRadius: borderRadius,
                  bottom: 0,
                  backgroundColor: "#FF3B30", // iOS red
                  justifyContent: "center",
                  alignItems: "center",
                },
                deleteButtonContainerStyle,
              ]}
            >
              <Pressable onPress={handleDelete} style={{ padding: 5 }}>
                <Animated.View style={deleteButtonStyle}>
                  <FontAwesome
                    name="trash"
                    size={24}
                    color="white"
                    accessibilityLabel={deleteLabel}
                    accessibilityHint={deleteHint}
                    accessible
                  />
                </Animated.View>
              </Pressable>
            </Animated.View>
          )}

          {/* Swipeable Content */}
          <GestureDetector gesture={enhancedGesture}>
            <Animated.View style={animatedStyle}>
              {children}
            </Animated.View>
          </GestureDetector>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
};
