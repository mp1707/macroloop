const controllers = new Map<string, AbortController>();

/**
 * Registers/overwrites the AbortController for a given log id.
 * Existing controllers (if any) are aborted to avoid dangling network requests.
 */
export const trackEstimationController = (
  logId: string,
  controller: AbortController
) => {
  const existing = controllers.get(logId);
  if (existing && !existing.signal.aborted) {
    existing.abort();
  }
  controllers.set(logId, controller);
};

/**
 * Aborts the controller for a given log id, returning true when a request was cancelled.
 */
export const cancelEstimationController = (logId: string): boolean => {
  const controller = controllers.get(logId);
  if (controller) {
    if (!controller.signal.aborted) {
      controller.abort();
    }
    controllers.delete(logId);
    return true;
  }
  return false;
};

/**
 * Removes a controller from the registry without aborting (use once a request settled).
 */
export const clearEstimationController = (logId: string) => {
  controllers.delete(logId);
};
