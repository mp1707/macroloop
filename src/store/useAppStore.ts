import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  FoodLog,
  Favorite,
  DailyTargets,
  UserSettings,
  FoodComponent,
} from "../types/models";
import { getTodayKey } from "@/utils/dateHelpers";
import { File } from "expo-file-system";

export type AppState = {
  foodLogs: FoodLog[];
  favorites: Favorite[];
  dailyTargets?: DailyTargets;
  userSettings?: UserSettings;

  // Subscription state
  isPro: boolean;
  isProCanceled: boolean;
  proExpirationDate?: string | null;
  isVerifyingSubscription: boolean;
  setPro: (value: boolean) => void;
  setProMetadata: (payload: {
    isCanceled: boolean;
    expirationDate?: string | null;
  }) => void;
  setVerifyingSubscription: (value: boolean) => void;

  // UI state
  selectedDate: string; // YYYY-MM-DD (for day view)
  selectedMonth: string; // YYYY-MM (for month view)
  favoritesSearchQuery: string;

  // User preferences
  lastUsedUnit?: "g" | "ml" | "piece";
  setLastUsedUnit: (unit: "g" | "ml" | "piece") => void;

  // Temporary modal communication (not persisted)
  pendingComponentEdit?: {
    logId: string;
    component: FoodComponent;
    index: number | "new";
    action: "save" | "delete";
  };
  setPendingComponentEdit: (data: AppState["pendingComponentEdit"]) => void;
  clearPendingComponentEdit: () => void;

  // Logs
  addFoodLog: (log: FoodLog) => void;
  updateFoodLog: (id: string, update: Partial<FoodLog>) => void;
  deleteFoodLog: (id: string) => Promise<void>; // Make it async
  clearAllLogs: () => Promise<void>; // Make it async
  cleanupIncompleteEstimations: () => void;
  setFoodlogs: (logs: FoodLog[]) => void;
  pruneOldLogs: (retentionDays: number | null) => Promise<number>; // Returns count of deleted logs

  // Favorites
  addFavorite: (fav: Favorite) => void;
  updateFavorite: (id: string, update: Partial<Favorite>) => void;
  deleteFavorite: (id: string) => void;

  // Settings
  setDailyTargets: (targets: DailyTargets) => void;
  clearNutritionGoals: () => void;
  setUserSettings: (settings: UserSettings) => void;

  // UI
  setSelectedDate: (date: string) => void;
  setSelectedMonth: (month: string) => void;
  setFavoritesSearchQuery: (query: string) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    immer((set, get) => ({
      foodLogs: [],
      favorites: [],
      dailyTargets: undefined,
      userSettings: undefined,
      isPro: false,
      isProCanceled: false,
      proExpirationDate: undefined,
      isVerifyingSubscription: false,

      // default to today's date & current month (local timezone aware)
      selectedDate: getTodayKey(), // YYYY-MM-DD (local)
      selectedMonth: getTodayKey().slice(0, 7), // YYYY-MM (local)
      favoritesSearchQuery: "",

      // Logs
      addFoodLog: (log) =>
        set((state) => {
          state.foodLogs.push(log);
        }),

      updateFoodLog: (id, update) =>
        set((state) => {
          // Create new objects/array so FlatList + memoized cards re-render
          state.foodLogs = state.foodLogs.map((l) =>
            l.id === id ? { ...l, ...update } : l
          );
        }),

      deleteFoodLog: async (id) => {
        // First, find the log to get its on device image path
        const logToDelete = get().foodLogs.find((log) => log.id === id);

        // If the log has a local image, delete it from the file system
        if (logToDelete && logToDelete.localImagePath) {
          try {
            const file = new File(logToDelete.localImagePath);
            await file.delete();
          } catch (error) {
            // File doesn't exist or can't be deleted - safe to ignore
          }
        }
        set((state) => {
          state.foodLogs = state.foodLogs.filter((log) => log.id !== id);
        });
      },

      // --- 4. PROACTIVELY ENHANCE `clearAllLogs` FOR COMPLETE CLEANUP ---
      clearAllLogs: async () => {
        // Get all image paths that need to be deleted
        const imagePathsToDelete = get()
          .foodLogs.map((log) => log.localImagePath)
          .filter((path): path is string => !!path); // Filter out any null/undefined paths

        if (imagePathsToDelete.length > 0) {
          try {
            // Use Promise.all to delete all files concurrently for better performance
            await Promise.all(
              imagePathsToDelete.map((uri) => {
                const file = new File(uri);
                return file.delete();
              })
            );
            if (__DEV__) {
              console.log(`Deleted ${imagePathsToDelete.length} images.`);
            }
          } catch (error) {
            if (__DEV__) {
              console.error("Error batch deleting images:", error);
            }
          }
        }

        // Finally, clear the logs from the state
        set((state) => {
          state.foodLogs = [];
        });
      },

      cleanupIncompleteEstimations: () =>
        set((state) => {
          state.foodLogs = state.foodLogs.filter(
            (log) =>
              (log.title !== "" && log.title !== null) ||
              log.isEstimating === false
          );
        }),

      setFoodlogs: (logs) =>
        set((state) => {
          state.foodLogs = logs;
        }),

      // Prune logs older than a specified number of days
      // Returns the count of deleted logs
      pruneOldLogs: async (retentionDays: number | null) => {
        const allLogs = get().foodLogs;

        // If retentionDays is null, delete everything (same as clearAll)
        if (retentionDays === null) {
          if (allLogs.length === 0) {
            return 0;
          }

          await get().clearAllLogs();
          return allLogs.length;
        }

        const today = new Date();
        const cutoffDate = new Date(today);
        cutoffDate.setDate(today.getDate() - retentionDays);
        const cutoffString = cutoffDate.toISOString().split("T")[0];

        // Separate logs into keep and prune based on cutoff date
        const logsToKeep: FoodLog[] = [];
        const logsToDelete: FoodLog[] = [];

        allLogs.forEach((log) => {
          if (log.logDate >= cutoffString) {
            logsToKeep.push(log);
          } else {
            logsToDelete.push(log);
          }
        });

        if (logsToDelete.length === 0) {
          return 0; // Nothing to prune
        }

        // Delete associated images
        const imagesToDelete = logsToDelete
          .map((log) => log.localImagePath)
          .filter((path): path is string => !!path);

        if (imagesToDelete.length > 0) {
          try {
            await Promise.all(
              imagesToDelete.map((uri) => {
                const file = new File(uri);
                return file.delete();
              })
            );
            if (__DEV__) {
              console.log(
                `[Prune] Deleted ${imagesToDelete.length} images from ${logsToDelete.length} old logs`
              );
            }
          } catch (error) {
            if (__DEV__) {
              console.error("[Prune] Error deleting old images:", error);
            }
          }
        }

        // Update state with pruned logs
        set((state) => {
          state.foodLogs = logsToKeep;
        });

        if (__DEV__) {
          console.log(
            `[Prune] Removed ${logsToDelete.length} old logs, kept ${logsToKeep.length}`
          );
        }

        return logsToDelete.length;
      },

      // Favorites
      addFavorite: (fav) =>
        set((state) => {
          state.favorites.push(fav);
        }),

      updateFavorite: (id, update) =>
        set((state) => {
          state.favorites = state.favorites.map((favorite) =>
            favorite.id === id ? { ...favorite, ...update } : favorite
          );
        }),

      deleteFavorite: (id) =>
        set((state) => {
          state.favorites = state.favorites.filter((f) => f.id !== id);
        }),

      // Settings
      setDailyTargets: (targets) =>
        set((state) => {
          state.dailyTargets = targets;
        }),

      clearNutritionGoals: () =>
        set((state) => {
          state.dailyTargets = undefined;
        }),

      setUserSettings: (settings) =>
        set((state) => {
          state.userSettings = settings;
        }),

      setPro: (value) =>
        set((state) => {
          state.isPro = value;
        }),

      setProMetadata: ({ isCanceled, expirationDate }) =>
        set((state) => {
          state.isProCanceled = isCanceled;
          state.proExpirationDate = expirationDate ?? undefined;
        }),

      setVerifyingSubscription: (value) =>
        set((state) => {
          state.isVerifyingSubscription = value;
        }),

      // UI
      setSelectedDate: (date) =>
        set((state) => {
          state.selectedDate = date;
        }),

      setSelectedMonth: (month) =>
        set((state) => {
          state.selectedMonth = month;
        }),

      setFavoritesSearchQuery: (query) =>
        set((state) => {
          state.favoritesSearchQuery = query;
        }),

      // User preferences
      setLastUsedUnit: (unit) =>
        set((state) => {
          state.lastUsedUnit = unit;
        }),

      // Temporary modal communication (not persisted)
      pendingComponentEdit: undefined,
      setPendingComponentEdit: (data) =>
        set((state) => {
          state.pendingComponentEdit = data;
        }),
      clearPendingComponentEdit: () =>
        set((state) => {
          state.pendingComponentEdit = undefined;
        }),
    })),
    {
      name: "food-app",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        foodLogs: state.foodLogs,
        favorites: state.favorites,
        dailyTargets: state.dailyTargets,
        userSettings: state.userSettings,
        isPro: state.isPro,
        isProCanceled: state.isProCanceled,
        proExpirationDate: state.proExpirationDate,
        selectedDate: state.selectedDate,
        selectedMonth: state.selectedMonth,
        lastUsedUnit: state.lastUsedUnit,
        // Exclude: pendingComponentEdit, isVerifyingSubscription
      }),
    }
  )
);
