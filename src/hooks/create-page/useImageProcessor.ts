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
        console.error("Image processing error:", error);
        console.error("Failed URI:", uri);
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

  const handleRemoveImage = useCallback(() => {
    if (!draftId) return;

    // Get the draft to access the image path
    const draft = useCreationStore.getState().draftsById[draftId];

    // Delete the image file if it exists (fire-and-forget)
    if (draft?.localImagePath) {
      const file = new File(draft.localImagePath);
      file.delete();
    }

    // Update the draft to remove image references immediately
    updateDraft(draftId, {
      localImagePath: undefined,
      supabaseImagePath: undefined,
    });
  }, [draftId, updateDraft]);

  return {
    handleImageSelected,
    handleRemoveImage,
    isProcessingImage,
  };
};
