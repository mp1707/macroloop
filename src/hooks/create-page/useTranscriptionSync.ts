import { useEffect, useRef } from "react";
import type { FoodLog } from "@/types/models";

interface UseTranscriptionSyncParams {
  draft: FoodLog | undefined;
  isRecording: boolean;
  liveTranscription: string;
  updateDraft: (id: string, updates: Partial<FoodLog>) => void;
  cursorPosition: number;
}

export const useTranscriptionSync = ({
  draft,
  isRecording,
  liveTranscription,
  updateDraft,
  cursorPosition,
}: UseTranscriptionSyncParams) => {
  const baseDescriptionRef = useRef<string | null>(null);
  const lastAppliedTranscriptionRef = useRef<string | null>(null);
  const insertionIndexRef = useRef<number>(0);
  const wasRecordingRef = useRef(false);

  useEffect(() => {
    if (!draft) return;

    if (isRecording && !wasRecordingRef.current) {
      const currentDescription = draft.description ?? "";
      baseDescriptionRef.current = currentDescription;
      lastAppliedTranscriptionRef.current = currentDescription;
      // Use provided cursor position, clamped to string length
      insertionIndexRef.current = Math.min(
        Math.max(0, cursorPosition),
        currentDescription.length
      );
    }

    if (!isRecording && wasRecordingRef.current) {
      baseDescriptionRef.current = null;
      lastAppliedTranscriptionRef.current = null;
      insertionIndexRef.current = 0;
    }

    wasRecordingRef.current = isRecording;
  }, [isRecording, draft]);

  useEffect(() => {
    if (!draft || !isRecording) return;

    const base = baseDescriptionRef.current || "";
    const interim = liveTranscription.trim();

    if (!interim) return;

    const index = insertionIndexRef.current;
    const before = base.slice(0, index);
    const after = base.slice(index);

    // Add spaces around the inserted text if needed
    const needsSpaceBefore =
      before.length > 0 && !before.endsWith(" ") && !before.endsWith("\n");
    const needsSpaceAfter =
      after.length > 0 && !after.startsWith(" ") && !after.startsWith("\n");

    const prefix = needsSpaceBefore ? " " : "";
    const suffix = needsSpaceAfter ? " " : "";

    const merged = before + prefix + interim + suffix + after;

    if (merged === lastAppliedTranscriptionRef.current) {
      return;
    }

    if ((draft.description ?? "") === merged) {
      lastAppliedTranscriptionRef.current = merged;
      return;
    }

    lastAppliedTranscriptionRef.current = merged;
    updateDraft(draft.id, { description: merged });
  }, [draft, isRecording, liveTranscription, updateDraft]);
};
