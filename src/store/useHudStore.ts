import { create } from "zustand";
import * as Haptics from "expo-haptics";

export type HudType = "success" | "info" | "error";

export interface HudState {
  isVisible: boolean;
  type: HudType;
  title: string;
  subtitle?: string;
  duration: number;
}

interface HudActions {
  show: (config: {
    type: HudType;
    title: string;
    subtitle?: string;
    duration?: number;
  }) => void;
  hide: () => void;
}

type HudStore = HudState & HudActions & {
  _activeTimerId: ReturnType<typeof setTimeout> | null;
};

const DEFAULT_DURATIONS = {
  success: 2000,
  info: 2000,
  error: 4000,
} as const;

const HAPTIC_FEEDBACK = {
  success: () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      // Haptics not available, continue silently
    }
  },
  info: () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // Haptics not available, continue silently
    }
  },
  error: () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      // Haptics not available, continue silently
    }
  },
} as const;

export const useHudStore = create<HudStore>((set, get) => ({
  // Initial state
  isVisible: false,
  type: "info",
  title: "",
  subtitle: undefined,
  duration: DEFAULT_DURATIONS.info,
  _activeTimerId: null,

  // Actions
  show: (config) => {
    const duration = config.duration ?? DEFAULT_DURATIONS[config.type];

    // Clear any existing timer to prevent memory leaks
    const currentState = get();
    if (currentState._activeTimerId) {
      clearTimeout(currentState._activeTimerId);
    }

    // Trigger haptic feedback
    HAPTIC_FEEDBACK[config.type]();

    // Auto-dismiss after duration
    const timerId = setTimeout(() => {
      const state = get();
      // Only hide if this is still the current HUD (prevents race conditions)
      if (
        state.isVisible &&
        state.type === config.type &&
        state.title === config.title
      ) {
        set({ isVisible: false, _activeTimerId: null });
      }
    }, duration);

    // Update state to show HUD and store timer reference
    set({
      isVisible: true,
      type: config.type,
      title: config.title,
      subtitle: config.subtitle,
      duration,
      _activeTimerId: timerId,
    });
  },

  hide: () => {
    const currentState = get();
    // Clear timer when manually hiding
    if (currentState._activeTimerId) {
      clearTimeout(currentState._activeTimerId);
    }
    set({ isVisible: false, _activeTimerId: null });
  },
}));