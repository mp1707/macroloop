import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Hook to detect if a screen reader is currently active
 *
 * Implements WCAG 4.1.2 (Name, Role, Value)
 *
 * Screen readers:
 * - iOS: VoiceOver
 * - Android: TalkBack
 *
 * Use this hook to:
 * - Provide additional context that sighted users don't need
 * - Adjust UI for better screen reader experience
 * - Announce important changes programmatically
 * - Hide purely decorative elements
 *
 * Usage:
 * ```tsx
 * const screenReaderEnabled = useScreenReader();
 *
 * // Add extra context for screen reader users
 * const accessibilityLabel = screenReaderEnabled
 *   ? `${label} button, ${count} items selected`
 *   : label;
 *
 * // Hide decorative animations
 * const importantForAccessibility = screenReaderEnabled
 *   ? "no-hide-descendants"
 *   : "auto";
 * ```
 *
 * @returns {boolean} True if screen reader is active
 */
export const useScreenReader = (): boolean => {
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);

  useEffect(() => {
    // Check initial state
    AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      setScreenReaderEnabled(enabled ?? false);
    });

    // Listen for changes
    const subscription = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      (enabled) => {
        setScreenReaderEnabled(enabled);
      }
    );

    // Cleanup
    return () => {
      subscription.remove();
    };
  }, []);

  return screenReaderEnabled;
};

/**
 * Hook to announce messages to screen reader users
 *
 * Use for dynamic content changes that sighted users can see but
 * screen reader users need to be informed about.
 *
 * Examples:
 * - Form submission success/error
 * - Item added to list
 * - Loading complete
 * - Navigation occurred
 *
 * Usage:
 * ```tsx
 * const announceToScreenReader = useScreenReaderAnnouncement();
 *
 * const handleSubmit = async () => {
 *   const success = await submitForm();
 *   if (success) {
 *     announceToScreenReader("Form submitted successfully");
 *   } else {
 *     announceToScreenReader("Error submitting form. Please try again.");
 *   }
 * };
 * ```
 *
 * @returns Function to announce messages
 */
export const useScreenReaderAnnouncement = () => {
  const announceToScreenReader = (message: string, options?: { queue?: boolean }) => {
    // On iOS, announcements interrupt current speech by default
    // On Android, they queue by default
    // The queue option is iOS-only
    if (options?.queue !== undefined) {
      // Type assertion needed as RN types don't include queue option
      AccessibilityInfo.announceForAccessibility(message);
    } else {
      AccessibilityInfo.announceForAccessibility(message);
    }
  };

  return announceToScreenReader;
};

/**
 * Combined hook that provides screen reader state and announcement function
 *
 * Usage:
 * ```tsx
 * const { screenReaderEnabled, announce } = useAccessibility();
 *
 * if (screenReaderEnabled) {
 *   // Provide extra context
 * }
 *
 * announce("Action completed");
 * ```
 */
export const useAccessibility = () => {
  const screenReaderEnabled = useScreenReader();
  const announce = useScreenReaderAnnouncement();

  return {
    screenReaderEnabled,
    announce,
  } as const;
};
