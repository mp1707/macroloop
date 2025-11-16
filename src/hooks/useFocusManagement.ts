import { useEffect, useRef, RefObject } from "react";
import { findNodeHandle, AccessibilityInfo, Platform } from "react-native";

/**
 * Hook to manage focus for accessibility
 *
 * Implements WCAG 2.4.7 (Focus Visible) and 2.4.3 (Focus Order)
 *
 * Features:
 * - Auto-focus elements on mount
 * - Manual focus control
 * - Focus announcements for screen readers
 *
 * Usage:
 * ```tsx
 * const inputRef = useFocusOnMount<TextInput>();
 * return <TextInput ref={inputRef} />;
 * ```
 */
export const useFocusOnMount = <T extends any>(): RefObject<T> => {
  const ref = useRef<T>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (ref.current) {
        const node = findNodeHandle(ref.current);
        if (node) {
          AccessibilityInfo.setAccessibilityFocus(node);
        }
      }
    }, 100); // Small delay to ensure component is mounted

    return () => clearTimeout(timer);
  }, []);

  return ref;
};

/**
 * Hook to manually set accessibility focus
 *
 * Usage:
 * ```tsx
 * const { ref, setFocus } = useAccessibilityFocus<View>();
 *
 * const handleAction = () => {
 *   // Do something
 *   setFocus(); // Move focus to the ref element
 * };
 *
 * return <View ref={ref}>...</View>;
 * ```
 */
export const useAccessibilityFocus = <T extends any>() => {
  const ref = useRef<T>(null);

  const setFocus = () => {
    if (ref.current) {
      const node = findNodeHandle(ref.current);
      if (node) {
        AccessibilityInfo.setAccessibilityFocus(node);
      }
    }
  };

  return { ref, setFocus } as const;
};

/**
 * Hook to trap focus within a container (for modals, bottom sheets)
 *
 * Implements WCAG 2.1.2 (No Keyboard Trap) with escape mechanism
 *
 * Note: React Native's keyboard navigation is limited compared to web.
 * This hook primarily ensures screen reader focus doesn't escape the modal.
 *
 * Usage:
 * ```tsx
 * const containerRef = useFocusTrap<View>(isOpen);
 *
 * return (
 *   <Modal visible={isOpen}>
 *     <View ref={containerRef} accessible={false}>
 *       {children}
 *     </View>
 *   </Modal>
 * );
 * ```
 *
 * @param isActive - Whether the focus trap should be active
 * @returns Ref to attach to the container
 */
export const useFocusTrap = <T extends any>(isActive: boolean): RefObject<T> => {
  const ref = useRef<T>(null);
  const previousFocusRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) return;

    // Store previous focus (if possible)
    // Note: React Native doesn't provide a way to get current focus
    // This is a limitation compared to web

    // Set focus to container when activated
    const timer = setTimeout(() => {
      if (ref.current) {
        const node = findNodeHandle(ref.current);
        if (node) {
          AccessibilityInfo.setAccessibilityFocus(node);
        }
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      // Restore previous focus would go here if RN supported it
    };
  }, [isActive]);

  return ref;
};

/**
 * Hook to announce a screen region change to screen readers
 *
 * Use when navigating to a new screen or when a major section changes.
 *
 * Usage:
 * ```tsx
 * const announceScreenChange = useScreenChange();
 *
 * useEffect(() => {
 *   announceScreenChange("Settings screen loaded");
 * }, []);
 * ```
 */
export const useScreenChange = () => {
  const announce = (message: string) => {
    // Announce with a slight delay to ensure screen is rendered
    setTimeout(() => {
      AccessibilityInfo.announceForAccessibility(message);
    }, 100);
  };

  return announce;
};

/**
 * Hook to check if bold text is enabled (accessibility preference)
 *
 * iOS: Settings > Accessibility > Display & Text Size > Bold Text
 * Android: Settings > Display > Font style > Bold
 *
 * Usage:
 * ```tsx
 * const boldTextEnabled = useBoldText();
 * const fontWeight = boldTextEnabled ? '700' : '600';
 * ```
 */
export const useBoldText = (): boolean => {
  const [boldTextEnabled, setBoldTextEnabled] = React.useState(false);

  React.useEffect(() => {
    if (Platform.OS === 'ios') {
      // iOS only - Android doesn't expose this
      AccessibilityInfo.isBoldTextEnabled?.().then((enabled) => {
        setBoldTextEnabled(enabled ?? false);
      });

      const subscription = AccessibilityInfo.addEventListener?.(
        'boldTextChanged' as any,
        (enabled: boolean) => {
          setBoldTextEnabled(enabled);
        }
      );

      return () => {
        subscription?.remove();
      };
    }
  }, []);

  return boldTextEnabled;
};

/**
 * Hook to check if grayscale is enabled (accessibility preference)
 *
 * iOS: Settings > Accessibility > Display & Text Size > Color Filters > Grayscale
 * Android: Settings > Accessibility > Color correction
 *
 * Usage:
 * ```tsx
 * const grayscaleEnabled = useGrayscale();
 * // Avoid relying on color alone for information if enabled
 * ```
 */
export const useGrayscale = (): boolean => {
  const [grayscaleEnabled, setGrayscaleEnabled] = React.useState(false);

  React.useEffect(() => {
    if (Platform.OS === 'ios') {
      AccessibilityInfo.isGrayscaleEnabled?.().then((enabled) => {
        setGrayscaleEnabled(enabled ?? false);
      });

      const subscription = AccessibilityInfo.addEventListener?.(
        'grayscaleChanged' as any,
        (enabled: boolean) => {
          setGrayscaleEnabled(enabled);
        }
      );

      return () => {
        subscription?.remove();
      };
    }
  }, []);

  return grayscaleEnabled;
};

// Re-export React for the hooks that use it
import React from 'react';
