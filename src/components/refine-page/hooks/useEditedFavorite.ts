import { useCallback, useEffect, useState } from "react";
import type { Favorite, FoodComponent } from "@/types/models";
import type { AppState } from "@/store/useAppStore";

// Extended Favorite type that includes baseline components for V2 refinement
export type EditedFavorite = Favorite & {
  // Baseline components from last AI estimate (for consistent refinements)
  // When editing, these preserve the original values to send as base* fields
  baselineFoodComponents?: FoodComponent[];
};

export const useEditedFavorite = ({
  favoriteId,
  originalFavorite,
  pendingComponentEdit,
  clearPendingComponentEdit,
  onComponentChange,
}: {
  favoriteId?: string;
  originalFavorite?: Favorite;
  pendingComponentEdit?: AppState["pendingComponentEdit"];
  clearPendingComponentEdit: () => void;
  onComponentChange: () => void;
}) => {
  const [editedFavorite, setEditedFavorite] = useState<
    EditedFavorite | undefined
  >(undefined);
  const [isDirty, setIsDirty] = useState(false);

  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  // Initialize or update edited favorite from original
  useEffect(() => {
    if (!originalFavorite) {
      setEditedFavorite(undefined);
      return;
    }

    if (!isDirty) {
      // Initialize with baseline set to original components (for V2 refinement)
      setEditedFavorite({
        ...originalFavorite,
        baselineFoodComponents: originalFavorite.foodComponents,
      });
    }
  }, [originalFavorite, isDirty]);

  const replaceEditedFavorite = useCallback(
    (next: EditedFavorite, options: { markDirty?: boolean } = {}) => {
      // Preserve baseline if not provided in the update (e.g., from refine response)
      setEditedFavorite((prev) => ({
        ...next,
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
      setEditedFavorite((prev) => (prev ? { ...prev, title } : prev));
      markDirty();
    },
    [markDirty]
  );

  const updateComponents = useCallback(
    (updater: (components: FoodComponent[]) => FoodComponent[]) => {
      setEditedFavorite((prev) => {
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
      setEditedFavorite((prev) => {
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
        };
        return next;
      });
    },
    [updateComponents]
  );

  useEffect(() => {
    if (!pendingComponentEdit || pendingComponentEdit.logId !== favoriteId) {
      return;
    }

    if (pendingComponentEdit.action === "save") {
      updateComponents((components) => {
        const next = [...components];
        if (pendingComponentEdit.index === "new") {
          next.push(pendingComponentEdit.component);
        } else {
          // Preserve existing macro values when editing (only name/amount/unit change)
          // Drop outdated recommendations so the UI doesn't suggest stale measurements
          const existingComponent = components[pendingComponentEdit.index];
          next[pendingComponentEdit.index] = {
            ...existingComponent,
            ...pendingComponentEdit.component,
            recommendedMeasurement: undefined,
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
    favoriteId,
    updateComponents,
    deleteComponent,
    clearPendingComponentEdit,
  ]);

  return {
    editedFavorite,
    isDirty,
    markDirty,
    replaceEditedFavorite,
    updateTitle,
    deleteComponent,
    acceptRecommendation,
  } as const;
};
