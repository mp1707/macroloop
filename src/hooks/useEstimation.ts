import { useCallback, useState, useRef, useEffect } from "react";
import { Alert } from "react-native";
import { useAppStore } from "@/store/useAppStore";
import { useHudStore } from "@/store/useHudStore";
import { EstimationInput, createEstimationLog } from "@/utils/estimation";
import type { FoodComponent, FoodLog } from "@/types/models";
import { useLocalization } from "@/context/LocalizationContext";
import { useTranslation } from "react-i18next";
import {
  estimateNutritionImageBased,
  estimateTextBased,
  refineEstimation,
  type RefinedFoodEstimateResponse,
  type FoodEstimateResponse,
  type RefineFoodComponentInput,
} from "../lib";
import {
  trackEstimationController,
  clearEstimationController,
} from "@/utils/estimationControllers";
import { showFreeLogsToast } from "@/lib/toast";

// Helpers
const hasImage = (log: { supabaseImagePath?: string | null }): boolean =>
  !!log.supabaseImagePath && log.supabaseImagePath !== "";

const makeCompletedFromInitial = (
  base: FoodLog,
  results: FoodEstimateResponse
): FoodLog => ({
  ...base,
  title: results.generatedTitle,
  calories: results.calories,
  protein: results.protein,
  carbs: results.carbs,
  fat: results.fat,
  foodComponents: results.foodComponents,
  macrosPerReferencePortion: results.macrosPerReferencePortion,
  isEstimating: false,
});

type EditableEntry = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  foodComponents: FoodComponent[];
  macrosPerReferencePortion?: FoodLog["macrosPerReferencePortion"];
  // Baseline components from last AI estimate (for V2 refinement)
  // When provided, these are used to populate base* fields for consistent refinements
  baselineFoodComponents?: FoodComponent[];
};

const makeCompletedFromRefinement = <T extends EditableEntry>(
  base: T,
  results: RefinedFoodEstimateResponse
): T =>
  ({
    ...base,
    // Title remains unchanged, even if empty
    calories: results.calories,
    protein: results.protein,
    carbs: results.carbs,
    fat: results.fat,
    // V2: Update foodComponents with fresh per-ingredient macros
    foodComponents: results.foodComponents,
    // Update baseline to the new components (for future refinements)
    baselineFoodComponents: results.foodComponents,
    ...("isEstimating" in base ? { isEstimating: false } : {}),
  } as T);

const showProRequiredHud = (subtitle: string) => {
  useHudStore.getState().show({
    type: "info",
    title: "MacroLoop Pro required",
    subtitle,
  });
};

export const useEstimation = () => {
  const addFoodLog = useAppStore((state) => state.addFoodLog);
  const updateFoodLog = useAppStore((state) => state.updateFoodLog);
  const isPro = useAppStore((state) => state.isPro);
  const freeLogCount = useAppStore((state) => state.freeLogCount);
  const incrementFreeLogCount = useAppStore(
    (state) => state.incrementFreeLogCount
  );
  
  const freeRecalculationCount = useAppStore((state) => state.freeRecalculationCount ?? 0);
  const incrementFreeRecalculationCount = useAppStore((state) => state.incrementFreeRecalculationCount);

  const [isEditEstimating, setIsEditEstimating] = useState(false);
  const { currentLanguage } = useLocalization();
  const language = currentLanguage || "en";
  const { t } = useTranslation();

  // Track active requests to prevent race conditions
  const activeRequestRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Cancel any ongoing requests
      if (activeRequestRef.current) {
        activeRequestRef.current.abort();
      }
    };
  }, []);

  // Create page flow: add incomplete log, run initial estimation, update store
  const runCreateEstimation = useCallback(
    async (logData: EstimationInput) => {
      if (!isPro && freeLogCount >= 10) {
        showProRequiredHud("Unlock MacroLoop Pro to use AI estimations.");
        return;
      }

      const incompleteLog = createEstimationLog(logData);
      addFoodLog(incompleteLog);

      const abortController = new AbortController();
      trackEstimationController(incompleteLog.id, abortController);

      const isImageEstimation = hasImage(logData);
      const estimationFunction = async () => {
        if (__DEV__) {
          console.log(
            isImageEstimation
              ? "🖼️ Image initial estimation"
              : "📝 Text initial estimation"
          );
        }
        return isImageEstimation
          ? estimateNutritionImageBased({
              imagePath: logData.supabaseImagePath || "",
              description: logData.description || "",
              language,
              signal: abortController.signal,
            })
          : estimateTextBased({
              description: logData.description || "",
              language,
              signal: abortController.signal,
            });
      };

      try {
        const estimationResults = await estimationFunction();
        const completedLog = makeCompletedFromInitial(
          incompleteLog,
          estimationResults
        );
        updateFoodLog(incompleteLog.id, {
          ...completedLog,
          estimationFailed: false,
        });

        if (!isPro) {
          incrementFreeLogCount();
          // Calculate new count locally as store update might not be reflected immediately in closure
          const nextCount = freeLogCount + 1;
          const remaining = 10 - nextCount;
          
          if (remaining === 5) {
            setTimeout(() => {
              showFreeLogsToast(
                t("createLog.toasts.freeLogsLeft.title", { count: remaining }),
                t("createLog.toasts.freeLogsLeft.message")
              );
            }, 1000);
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          if (__DEV__) {
            console.log(
              "[Estimation] Initial estimation aborted",
              incompleteLog.id
            );
          }
        } else {
          // Mark as failed instead of deleting - allows user to retry
          updateFoodLog(incompleteLog.id, {
            isEstimating: false,
            estimationFailed: true,
          });

          // Check if it's a rate limit error
          if (
            error instanceof Error &&
            error.message === "AI_ESTIMATION_RATE_LIMIT"
          ) {
            Alert.alert(
              t("errors.api.rateLimit.title"),
              t("errors.api.rateLimit.message")
            );
          }
        }
      } finally {
        clearEstimationController(incompleteLog.id);
      }
    },
    [
      addFoodLog,
      updateFoodLog,
      isPro,
      freeLogCount,
      incrementFreeLogCount,
      language,
      t,
    ]
  );

  // Edit page flow: refinement based solely on provided components
  const runEditEstimation = useCallback(
    async <T extends EditableEntry>(
      editedEntry: T,
      onComplete: (entry: T) => void
    ) => {
      if (!isPro && freeRecalculationCount >= 50) {
        showProRequiredHud("MacroLoop Pro unlocks AI refinements.");
        return;
      }

      const hasComponents = (editedEntry.foodComponents?.length || 0) > 0;
      if (!hasComponents) {
        // Caller should prevent this; no-op for safety
        return;
      }

      // Cancel any existing request before starting a new one
      if (activeRequestRef.current) {
        activeRequestRef.current.abort();
      }

      // Create new abort controller for this request
      const abortController = new AbortController();
      activeRequestRef.current = abortController;

      if (__DEV__) {
        console.log("🛠️ Components refinement V2");
      }

      // Build RefineFoodComponentInput array with baseline stats for consistent refinements
      // Baseline comes from baselineFoodComponents (after previous refine) or original foodComponents
      const baselineComponents = editedEntry.baselineFoodComponents || [];

      const refineInputComponents: RefineFoodComponentInput[] = (
        editedEntry.foodComponents || []
      ).map((current, index) => {
        // Try to find baseline for this component by index
        // For new components (index >= baseline length), no baseline is available
        const baseline = baselineComponents[index];

        const input: RefineFoodComponentInput = {
          // CURRENT state after user edits (required)
          name: current.name,
          amount: current.amount,
          unit: current.unit,
        };

        // Add baseline values if available (for proportional refinement)
        if (baseline) {
          input.baseName = baseline.name;
          input.baseAmount = baseline.amount;
          input.baseUnit = baseline.unit;
          // Per-component macros from V2 endpoints (may be undefined for old logs)
          input.baseCalories = baseline.calories ?? null;
          input.baseProtein = baseline.protein ?? null;
          input.baseCarbs = baseline.carbs ?? null;
          input.baseFat = baseline.fat ?? null;
        }

        return input;
      });

      if (__DEV__) {
        console.log("🛠️ Refine input components:", refineInputComponents);
      }

      setIsEditEstimating(true);
      try {
        const refined: RefinedFoodEstimateResponse = await refineEstimation({
          foodComponents: refineInputComponents,
          language,
          signal: abortController.signal,
        });

        // Check if component is still mounted and request wasn't cancelled
        if (!isMountedRef.current || abortController.signal.aborted) {
          if (__DEV__) {
            console.log("🚫 Estimation cancelled or component unmounted");
          }
          return;
        }

        const completedEntry = makeCompletedFromRefinement(
          editedEntry,
          refined
        );
        onComplete(completedEntry);
        
        if (!isPro) {
          incrementFreeRecalculationCount();
        }

        return completedEntry;
      } catch (error) {
        // Only handle errors if not aborted
        if (error instanceof Error && error.name === "AbortError") {
          if (__DEV__) {
            console.log("🚫 Request aborted");
          }
          return;
        }
        // Re-throw other errors to be handled by caller
        throw error;
      } finally {
        // Only clear loading flag if this request is still the active one
        if (
          isMountedRef.current &&
          activeRequestRef.current === abortController
        ) {
          setIsEditEstimating(false);
        }
        // Clear the active request ref if this was the active request
        if (activeRequestRef.current === abortController) {
          activeRequestRef.current = null;
        }
      }
    },
    [isPro, freeLogCount, language, freeRecalculationCount, incrementFreeRecalculationCount]
  );

  return { runCreateEstimation, runEditEstimation, isEditEstimating };
};
