import { useCallback, useState } from "react";
import { Alert } from "react-native";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { processImage } from "@/utils/processImage";
import type { FoodLog } from "@/types/models";
import { useCreationStore } from "@/store/useCreationStore";
import { File } from "expo-file-system";

export const useImageProcessor = (
  draftId: string | null,
  updateDraft: (id: string, updates: Partial<FoodLog>) => void
) => {
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const { t } = useTranslation();

  const handleImageSelected = useCallback(
    async (uri: string) => {
      if (!draftId) return;

      setIsProcessingImage(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      let result;
      let success = false;

      try {
        result = await processImage(uri);
        success = true;
      } catch (error) {
        Alert.alert(
          t("createLog.toasts.imageProcessing.title"),
          t("createLog.toasts.imageProcessing.message")
        );
      }

      setIsProcessingImage(false);

      if (success && result) {
        const { localImagePath, supabaseImagePath } = result;
        updateDraft(draftId, {
          localImagePath,
          supabaseImagePath,
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        });
      }
    },
    [draftId, updateDraft, t]
  );

  const handleRemoveImage = useCallback(async () => {
    if (!draftId) return;

    // Get the draft to access the image path
    const draft = useCreationStore.getState().draftsById[draftId];

    // Update the draft to remove image references first for immediate UI feedback
    updateDraft(draftId, {
      localImagePath: undefined,
      supabaseImagePath: undefined,
    });

    // Delete the image file if it exists (await to ensure cleanup completes)
    if (draft?.localImagePath) {
      try {
        const file = new File(draft.localImagePath);
        await file.delete();
      } catch (error) {
        // File might not exist or already deleted - safe to ignore
        if (__DEV__) {
          console.warn("Failed to delete image file:", error);
        }
      }
    }
  }, [draftId, updateDraft]);

  return {
    handleImageSelected,
    handleRemoveImage,
    isProcessingImage,
  };
};
