import { Alert } from "react-native";
import { router } from "expo-router";
import i18next from "i18next";

import { useAppStore } from "@/store/useAppStore";
import {
  estimateNutritionImageBased,
  estimateTextBased,
} from "@/lib/supabase";
import { applyEstimationResults } from "@/utils/estimation";
import { uploadToSupabaseStorage } from "@/utils/uploadToSupabaseStorage";
import {
  trackEstimationController,
  clearEstimationController,
} from "@/utils/estimationControllers";
import type { FoodLog } from "@/types/models";
import { resolveLocalImagePath } from "@/utils/fileUtils";
import { showFreeLogsToast } from "@/lib/toast";

const hasImage = (log: FoodLog): boolean =>
  !!log.supabaseImagePath && log.supabaseImagePath !== "";

/**
 * Retries a single failed estimation after the user taps "Retry".
 * This no longer auto-runs on foreground events—users stay in control.
 */
export const retryFailedEstimation = async (
  logId: string,
  language: string
): Promise<void> => {
  const { foodLogs, updateFoodLog, isPro, freeLogCount, incrementFreeLogCount } =
    useAppStore.getState();

  if (!isPro && freeLogCount >= 10) {
    router.push("/paywall");
    return;
  }

  const log = foodLogs.find((l) => l.id === logId);
  if (!log) {
    if (__DEV__) {
      console.log("[Recovery] Log not found:", logId);
    }
    return;
  }

  const controller = new AbortController();
  trackEstimationController(logId, controller);

  // Set back to estimating state while keeping card responsive
  updateFoodLog(logId, {
    isEstimating: true,
    estimationFailed: false,
    title: "", // Clear title to prevent stale fallback titles during retry
  });

  try {
    let imagePath = log.supabaseImagePath;

    // Re-upload image if this is an image-based estimation
    // (Supabase deletes images after AI call for privacy)
    const resolvedLocalImagePath = resolveLocalImagePath(log.localImagePath);

    if (hasImage(log) && resolvedLocalImagePath) {
      if (__DEV__) {
        console.log("[Recovery] Re-uploading image for retry:", logId);
      }
      imagePath = await uploadToSupabaseStorage(resolvedLocalImagePath);
      updateFoodLog(logId, { supabaseImagePath: imagePath });
    }

    const results = hasImage(log)
      ? await estimateNutritionImageBased({
          imagePath: imagePath!,
          description: log.description || "",
          language,
          signal: controller.signal,
        })
      : await estimateTextBased({
          description: log.description || "",
          language,
          signal: controller.signal,
        });

    const completedLog = applyEstimationResults(log, results);
    updateFoodLog(logId, {
      ...completedLog,
      estimationFailed: false,
    });

    if (!isPro) {
      incrementFreeLogCount();

      const nextCount = freeLogCount + 1;
      const remaining = 10 - nextCount;

      if (remaining === 5) {
        setTimeout(() => {
          showFreeLogsToast(
            i18next.t("createLog.toasts.freeLogsLeft.title", {
              count: remaining,
            }),
            i18next.t("createLog.toasts.freeLogsLeft.message")
          );
        }, 1000);
      }
    }

    if (__DEV__) {
      console.log("[Recovery] Successfully recovered estimation:", logId);
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      if (__DEV__) {
        console.log("[Recovery] Retry aborted:", logId);
      }
    } else {
      updateFoodLog(logId, { isEstimating: false, estimationFailed: true });

      // Check if it's a rate limit error
      if (
        error instanceof Error &&
        error.message === "AI_ESTIMATION_RATE_LIMIT"
      ) {
        Alert.alert(
          i18next.t("errors.api.rateLimit.title"),
          i18next.t("errors.api.rateLimit.message")
        );
      }
    }
  } finally {
    clearEstimationController(logId);
  }
};
