import { create } from "zustand";
import { FoodLog } from "@/types/models";
import { generateFoodLogId } from "@/utils/idGenerator";
import { File } from "expo-file-system";
import { useAppStore } from "@/store/useAppStore";

type DraftsById = Record<string, FoodLog>;

interface CreationState {
  draftsById: DraftsById;
  // Create a new draft and return its id
  startNewDraft: (selectedDate: string) => string;
  // Start editing an existing log (copy), keyed by log.id
  startEditingDraft: (log: FoodLog) => void;
  // Update a draft by id
  updateDraft: (id: string, update: Partial<FoodLog>) => void;
  // Remove a draft by id (on unmount/dismiss)
  clearDraft: (id: string) => Promise<void>;
}

export const useCreationStore = create<CreationState>((set, get) => ({
  draftsById: {},

  startNewDraft: (selectedDate) => {
    const id = generateFoodLogId();
    const draft: FoodLog = {
      id,
      title: "",
      description: "",
      supabaseImagePath: "",
      localImagePath: "",
      logDate: selectedDate,
      createdAt: new Date().toISOString(),
      foodComponents: [],
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      isEstimating: false,
    };
    set((state) => ({ draftsById: { ...state.draftsById, [id]: draft } }));
    return id;
  },

  startEditingDraft: (log) => {
    set((state) => ({
      draftsById: { ...state.draftsById, [log.id]: { ...log } },
    }));
  },

  updateDraft: (id, update) => {
    set((state) => {
      const existing = state.draftsById[id];
      if (!existing) return {};
      return {
        draftsById: { ...state.draftsById, [id]: { ...existing, ...update } },
      };
    });
  },

  clearDraft: async (id) => {
    // Get the draft to check for image file
    const draft = get().draftsById[id];

    // Delete the image file if it exists and isn't used by a persisted log
    if (draft?.localImagePath) {
      const { foodLogs, favorites } = useAppStore.getState();
      const isImageStillReferenced =
        foodLogs.some((log) => log.localImagePath === draft.localImagePath) ||
        favorites.some(
          (favorite) => favorite.localImagePath === draft.localImagePath
        );

      try {
        if (!isImageStillReferenced) {
          const file = new File(draft.localImagePath);
          await file.delete();
        }
      } catch (error) {
        // File doesn't exist or can't be deleted - safe to ignore
      }
    }

    // Remove draft from state
    set((state) => {
      const { [id]: _, ...rest } = state.draftsById;
      return { draftsById: rest };
    });
  },
}));
