// Compatibility layer for legacy toast API using new HUD system
import { useHudStore } from "@/store/useHudStore";

/**
 * Shows an error HUD message
 */
export const showErrorToast = (message: string, subtitle?: string) => {
  // For errors, put the main message in subtitle and use "Error" as title
  const errorSubtitle = subtitle
    ? `${message}. ${subtitle}`
    : `${message}. Please try again.`;

  useHudStore.getState().show({
    type: "error",
    title: "Error",
    subtitle: errorSubtitle,
  });
};

/**
 * Shows a warning HUD message for invalid images
 */
export const showInvalidImageToast = () => {
  useHudStore.getState().show({
    type: "error",
    title: "Error",
    subtitle: "Invalid image. Please try again with a different photo.",
  });
};

/**
 * Shows a favorite added HUD using new system
 */
export const showFavoriteAddedToast = (
  _message: string = "Added to favorites",
  meal: string
) => {
  useHudStore.getState().show({
    type: "success",
    title: "Favorited",
    subtitle: meal,
  });
};

/**
 * Shows a toast for free logs remaining
 */
export const showFreeLogsToast = (title: string, subtitle: string) => {
  useHudStore.getState().show({
    type: "success",
    title,
    subtitle,
  });
};

/**
 * Shows a favorite removed HUD using new system
 */
export const showFavoriteRemovedToast = (
  _message: string = "Removed from favorites",
  meal: string
) => {
  useHudStore.getState().show({
    type: "info",
    title: "Removed",
    subtitle: meal,
  });
};