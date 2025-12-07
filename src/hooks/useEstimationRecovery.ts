import { useEffect, useRef, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";

import { useAppStore } from "@/store/useAppStore";
import { useLocalization } from "@/context/LocalizationContext";
import {
  estimateNutritionImageBased,
  estimateTextBased,
} from "@/lib/supabase";
import { applyEstimationResults } from "@/utils/estimation";
import { uploadToSupabaseStorage } from "@/utils/uploadToSupabaseStorage";
import type { FoodLog } from "@/types/models";

const hasImage = (log: FoodLog): boolean =>
  !!log.supabaseImagePath && log.supabaseImagePath !== "";

const hasLocalImage = (log: FoodLog): boolean =>
  !!log.localImagePath && log.localImagePath !== "";

/**
 * Retries a single failed estimation.
 * Can be called from anywhere (doesn't require the hook context).
 */
export const retryFailedEstimation = async (
  logId: string,
  language: string
): Promise<void> => {
  const { foodLogs, updateFoodLog, isPro } = useAppStore.getState();

  if (!isPro) {
    if (__DEV__) {
      console.log("[Recovery] Cannot retry - Pro subscription required");
    }
    return;
  }

  const log = foodLogs.find((l) => l.id === logId);
  if (!log) {
    if (__DEV__) {
      console.log("[Recovery] Log not found:", logId);
    }
    return;
  }

  // Set back to estimating state
  updateFoodLog(logId, { isEstimating: true, estimationFailed: false });

  try {
    let imagePath = log.supabaseImagePath;

    // Re-upload image if this is an image-based estimation
    // (Supabase deletes images after AI call for privacy)
    if (hasImage(log) && hasLocalImage(log)) {
      if (__DEV__) {
        console.log("[Recovery] Re-uploading image for retry:", logId);
      }
      imagePath = await uploadToSupabaseStorage(log.localImagePath!);
      updateFoodLog(logId, { supabaseImagePath: imagePath });
    }

    const results = hasImage(log)
      ? await estimateNutritionImageBased({
          imagePath: imagePath!,
          description: log.description || "",
          language,
        })
      : await estimateTextBased({
          description: log.description || "",
          language,
        });

    const completedLog = applyEstimationResults(log, results);
    updateFoodLog(logId, {
      ...completedLog,
      estimationFailed: false,
    });

    if (__DEV__) {
      console.log("[Recovery] Successfully recovered estimation:", logId);
    }
  } catch (error) {
    if (__DEV__) {
      console.log("[Recovery] Retry failed:", logId, error);
    }
    updateFoodLog(logId, { isEstimating: false, estimationFailed: true });
  }
};

/**
 * Recovers pending estimations when app returns to foreground.
 * - Auto-retries logs with `isEstimating: true` on foreground
 * - Marks logs as `estimationFailed: true` on API failure
 *
 * Call this hook once in the root layout.
 * For manual retries, use `retryFailedEstimation` directly.
 */
export const useEstimationRecovery = () => {
  const { currentLanguage } = useLocalization();
  const language = currentLanguage || "en";
  const isProcessingRef = useRef(false);
  const isMountedRef = useRef(true);

  const retryEstimation = useCallback(
    (logId: string) => {
      void retryFailedEstimation(logId, language);
    },
    [language]
  );

  const retryPendingEstimations = useCallback(async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      const { foodLogs, updateFoodLog, isPro } = useAppStore.getState();

      if (!isPro) {
        if (__DEV__) {
          console.log("[Recovery] Skipping - Pro subscription required");
        }
        return;
      }

      // Only auto-retry logs that are still estimating (not failed ones)
      const pendingLogs = foodLogs.filter(
        (log) => log.isEstimating === true && log.estimationFailed !== true
      );

      if (pendingLogs.length === 0) return;

      if (__DEV__) {
        console.log(
          "[Recovery] Found pending estimations:",
          pendingLogs.length
        );
      }

      for (const log of pendingLogs) {
        if (!isMountedRef.current) break;

        try {
          let imagePath = log.supabaseImagePath;

          // Re-upload image if this is an image-based estimation
          // (Supabase deletes images after AI call for privacy)
          if (hasImage(log) && hasLocalImage(log)) {
            if (__DEV__) {
              console.log("[Recovery] Re-uploading image for pending:", log.id);
            }
            imagePath = await uploadToSupabaseStorage(log.localImagePath!);
            updateFoodLog(log.id, { supabaseImagePath: imagePath });
          }

          if (!isMountedRef.current) break;

          const results = hasImage(log)
            ? await estimateNutritionImageBased({
                imagePath: imagePath!,
                description: log.description || "",
                language,
              })
            : await estimateTextBased({
                description: log.description || "",
                language,
              });

          if (!isMountedRef.current) break;

          const completedLog = applyEstimationResults(log, results);
          updateFoodLog(log.id, {
            ...completedLog,
            estimationFailed: false,
          });

          if (__DEV__) {
            console.log("[Recovery] Recovered pending estimation:", log.id);
          }
        } catch (error) {
          if (!isMountedRef.current) break;

          if (__DEV__) {
            console.log("[Recovery] Failed to recover:", log.id, error);
          }
          // Mark as failed so user can manually retry
          updateFoodLog(log.id, { isEstimating: false, estimationFailed: true });
        }
      }
    } finally {
      isProcessingRef.current = false;
    }
  }, [language]);

  useEffect(() => {
    isMountedRef.current = true;

    // Retry on initial mount (handles cold start)
    void retryPendingEstimations();

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        void retryPendingEstimations();
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => {
      isMountedRef.current = false;
      subscription.remove();
    };
  }, [retryPendingEstimations]);

  return { retryEstimation };
};
