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
  freeLogCount: number;
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
  freeLogCount,
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

  const checkAccess = useCallback(() => {
    const isProOrFreeLogsAvailable = isPro || freeLogCount < 10;
    if (!isProOrFreeLogsAvailable) {
      handleShowPaywall();
      return false;
    }
    return true;
  }, [isPro, freeLogCount, handleShowPaywall]);

  const handleEstimation = useCallback(() => {
    if (!checkAccess()) return;
    
    if (!draft || isEstimating) {
      return;
    }
    runCreateEstimation(draft);
    router.back();
  }, [
    draft,
    isEstimating,
    runCreateEstimation,
    router,
    checkAccess,
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

    if (!checkAccess()) return;

    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        showPermissionDeniedAlert("camera");
        return;
      }
    }

    setMode("camera");
  }, [cameraPermission, requestCameraPermission, setMode, checkAccess]);

  const handleSwitchToRecording = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!checkAccess()) return;

    const hasPermission = await requestPermission();
    if (!hasPermission) {
      showPermissionDeniedAlert("microphone");
      return;
    }

    // Give the permission sheet a moment to dismiss before starting
    await new Promise((resolve) => setTimeout(resolve, 100));

    await startRecording();
  }, [requestPermission, startRecording, checkAccess]);

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
