import { useCallback } from "react";
import * as Haptics from "expo-haptics";
import { useCameraPermissions } from "expo-camera";
import type { FoodLog, Favorite } from "@/types/models";
import type { CreationMode } from "@/types/creation";
import { generateFoodLogId } from "@/utils/idGenerator";
import { showPermissionDeniedAlert } from "@/lib/permissions";

interface UseCreateHandlersParams {
  router: ReturnType<typeof import("@/hooks/useSafeRouter").useSafeRouter>;
  draft: FoodLog | undefined;
  isPro: boolean;
  isEstimating: boolean;
  selectedDate: string;
  draftId: string | null;
  updateDraft: (id: string, updates: Partial<FoodLog>) => void;
  addFoodLog: (log: any) => void;
  runCreateEstimation: (draft: FoodLog) => void;
  setMode: (mode: CreationMode) => void;
  requestPermission: () => Promise<boolean>;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
}

export const useCreateHandlers = ({
  router,
  draft,
  isPro,
  isEstimating,
  selectedDate,
  draftId,
  updateDraft,
  addFoodLog,
  runCreateEstimation,
  setMode,
  requestPermission,
  startRecording,
  stopRecording,
}: UseCreateHandlersParams) => {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  const handleOpenExplainer = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/explainer-ai-estimation");
  }, [router]);

  const handleShowPaywall = useCallback(() => {
    router.push("/paywall");
  }, [router]);

  const handleEstimation = useCallback(() => {
    if (!draft || !isPro || isEstimating) {
      if (!isPro) {
        handleShowPaywall();
      }
      return;
    }
    runCreateEstimation(draft);
    router.back();
  }, [
    draft,
    isPro,
    isEstimating,
    runCreateEstimation,
    router,
    handleShowPaywall,
  ]);

  const handleDescriptionChange = useCallback(
    (description: string) => {
      if (!draftId) return;
      updateDraft(draftId, { description });
    },
    [draftId, updateDraft]
  );

  const handleCreateLogFromFavorite = useCallback(
    (favorite: Favorite) => {
      addFoodLog({
        ...favorite,
        logDate: selectedDate,
        createdAt: new Date().toISOString(),
        isEstimating: false,
        id: generateFoodLogId(),
        percentageEaten: draft?.percentageEaten ?? 100,
      });
      router.back();
    },
    [addFoodLog, selectedDate, router, draft]
  );

  const handleSwitchToCamera = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        showPermissionDeniedAlert("camera");
        return;
      }
    }

    setMode("camera");
  }, [cameraPermission, requestCameraPermission, setMode]);

  const handleSwitchToRecording = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const hasPermission = await requestPermission();
    if (!hasPermission) {
      showPermissionDeniedAlert("microphone");
      return;
    }

    // Give the permission sheet a moment to dismiss before starting
    await new Promise((resolve) => setTimeout(resolve, 100));

    await startRecording();
  }, [requestPermission, startRecording]);

  const handleStopRecording = useCallback(async () => {
    await stopRecording();
  }, [stopRecording]);

  const handlePercentageChange = useCallback(
    (percentage: number) => {
      if (!draftId) return;
      updateDraft(draftId, { percentageEaten: percentage });
    },
    [draftId, updateDraft]
  );

  return {
    handleCancel,
    handleOpenExplainer,
    handleShowPaywall,
    handleEstimation,
    handleDescriptionChange,
    handleCreateLogFromFavorite,
    handleSwitchToCamera,
    handleSwitchToRecording,
    handleStopRecording,
    handlePercentageChange,
  };
};
