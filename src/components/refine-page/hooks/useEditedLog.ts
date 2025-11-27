import { useCallback, useEffect, useState } from "react";
import type { FoodComponent, FoodLog } from "@/types/models";
import type { AppState } from "@/store/useAppStore";
import { generateId } from "@/utils/idGenerator";

// Extended FoodComponent with UI-only stale indicator (not persisted or sent to API)
export type EditableFoodComponent = FoodComponent & {
  isStale?: boolean;
  _ui_id?: string;
};

// Extended FoodLog type that includes baseline components for V2 refinement
export type EditedFoodLog = Omit<FoodLog, "foodComponents"> & {
  // Food components with optional UI-only stale indicator
  foodComponents: EditableFoodComponent[];
  // Baseline components from last AI estimate (for consistent refinements)
  // When editing, these preserve the original values to send as base* fields
  baselineFoodComponents?: FoodComponent[];
};

const ensureId = (
  comp: FoodComponent | EditableFoodComponent
): EditableFoodComponent => {
  if ("_ui_id" in comp && comp._ui_id) {
    return comp as EditableFoodComponent;
  }
  return { ...comp, _ui_id: generateId("comp") };
};

export const useEditedLog = ({
  logId,
  originalLog,
  pendingComponentEdit,
  clearPendingComponentEdit,
  onComponentChange,
}: {
  logId?: string;
  originalLog?: FoodLog;
  pendingComponentEdit?: AppState["pendingComponentEdit"];
  clearPendingComponentEdit: () => void;
  onComponentChange: () => void;
}) => {
  const [editedLog, setEditedLogState] = useState<EditedFoodLog | undefined>(
    undefined
  );
  const [isDirty, setIsDirty] = useState(false);

  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  // Initialize or update edited log from original
  useEffect(() => {
    if (!originalLog) {
      setEditedLogState(undefined);
      return;
    }

    if (!isDirty) {
      // Initialize with baseline set to original components (for V2 refinement)
      setEditedLogState({
        ...originalLog,
        baselineFoodComponents: originalLog.foodComponents,
        foodComponents: originalLog.foodComponents.map(ensureId),
      });
    }
  }, [originalLog, isDirty]);

  const replaceEditedLog = useCallback(
    (next: EditedFoodLog, options: { markDirty?: boolean } = {}) => {
      // Preserve baseline if not provided in the update (e.g., from refine response)
      setEditedLogState((prev) => ({
        ...next,
        // Ensure IDs are present on new components
        foodComponents: (next.foodComponents || []).map(ensureId),
        // Use baseline from next if provided, otherwise preserve from prev
        baselineFoodComponents:
          next.baselineFoodComponents ?? prev?.baselineFoodComponents,
      }));
      if (options.markDirty !== false) {
        markDirty();
      }
    },
    [markDirty]
  );

  const updateTitle = useCallback(
    (title: string) => {
      setEditedLogState((prev) => (prev ? { ...prev, title } : prev));
      markDirty();
    },
    [markDirty]
  );

  const updateComponents = useCallback(
    (
      updater: (
        components: EditableFoodComponent[]
      ) => EditableFoodComponent[]
    ) => {
      setEditedLogState((prev) => {
        if (!prev) return prev;
        const currentComponents = prev.foodComponents || [];
        const nextComponents = updater(currentComponents);
        if (nextComponents === currentComponents) {
          return prev;
        }
        markDirty();
        onComponentChange();
        return { ...prev, foodComponents: nextComponents };
      });
    },
    [markDirty, onComponentChange]
  );

  const deleteComponent = useCallback(
    (index: number) => {
      setEditedLogState((prev) => {
        if (!prev) return prev;
        const currentComponents = prev.foodComponents || [];
        if (!currentComponents[index]) {
          return prev;
        }
        // Also delete from baseline to keep indices in sync
        const currentBaseline = prev.baselineFoodComponents || [];
        markDirty();
        onComponentChange();
        return {
          ...prev,
          foodComponents: currentComponents.filter((_, i) => i !== index),
          baselineFoodComponents: currentBaseline.filter((_, i) => i !== index),
        };
      });
    },
    [markDirty, onComponentChange]
  );

  const acceptRecommendation = useCallback(
    (index: number) => {
      updateComponents((components) => {
        const component = components[index];
        if (!component?.recommendedMeasurement) {
          return components;
        }
        const { amount, unit } = component.recommendedMeasurement;
        const next = [...components];
        next[index] = {
          ...component,
          amount,
          unit: unit as FoodComponent["unit"],
          recommendedMeasurement: undefined,
          isStale: true,
        };
        return next;
      });
    },
    [updateComponents]
  );

  useEffect(() => {
    if (!pendingComponentEdit || pendingComponentEdit.logId !== logId) return;

    if (pendingComponentEdit.action === "save") {
      updateComponents((components) => {
        const next = [...components];
        if (pendingComponentEdit.index === "new") {
          next.push(ensureId(pendingComponentEdit.component));
        } else {
          // Preserve existing macro values when editing (only name/amount/unit change)
          // Drop outdated recommendations so the UI doesn't suggest stale measurements
          // Mark component as stale since macros need recalculation
          const existingComponent = components[pendingComponentEdit.index];
          next[pendingComponentEdit.index] = {
            ...existingComponent,
            ...pendingComponentEdit.component,
            // Preserve ID
            _ui_id: existingComponent._ui_id,
            recommendedMeasurement: undefined,
            isStale: true,
          };
        }
        return next;
      });
    } else if (
      pendingComponentEdit.action === "delete" &&
      typeof pendingComponentEdit.index === "number"
    ) {
      deleteComponent(pendingComponentEdit.index);
    }

    clearPendingComponentEdit();
  }, [
    pendingComponentEdit,
    logId,
    updateComponents,
    deleteComponent,
    clearPendingComponentEdit,
  ]);

  return {
    editedLog,
    isDirty,
    markDirty,
    replaceEditedLog,
    updateTitle,
    deleteComponent,
    acceptRecommendation,
  } as const;
};
