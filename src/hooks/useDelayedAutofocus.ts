import { useCallback, RefObject, useRef } from "react";
import { TextInput, InteractionManager } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

export const useDelayedAutofocus = (
  inputRef: RefObject<TextInput | null>,
  delay: number = 600
): void => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        requestAnimationFrame(() => {
          timeoutRef.current = setTimeout(() => {
            inputRef.current?.focus();
            timeoutRef.current = null;
          }, delay);
        });
      });
      return () => {
        task.cancel();
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };
    }, [inputRef, delay])
  );
};
