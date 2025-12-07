import { useEffect } from "react";
import { AppState } from "react-native";

import {
  addCustomerInfoListener,
  ensureRevenueCatConfigured,
  getCustomerInfo,
} from "@/lib/revenuecat/client";
import { applyCustomerInfoToStore } from "@/lib/revenuecat/subscription";
import { useAppStore } from "@/store/useAppStore";

/**
 * Initializes RevenueCat and manages subscription state.
 * - Loads customer info on mount and when app becomes active
 * - Listens for real-time subscription updates
 * - Updates store with subscription status
 */
export const useRevenueCat = () => {
  const setVerifyingSubscription = useAppStore(
    (state) => state.setVerifyingSubscription
  );

  useEffect(() => {
    // Skip entire subscription flow in dev mode if override active
    if (__DEV__) {
      const { devProOverride } = useAppStore.getState();
      if (devProOverride) {
        console.log('[DEV] RevenueCat initialization skipped - dev Pro override active');
        setVerifyingSubscription(false);
        return;
      }
    }

    if (!ensureRevenueCatConfigured()) {
      setVerifyingSubscription(false);
      return;
    }

    let isMounted = true;

    const loadCustomer = async () => {
      setVerifyingSubscription(true);
      try {
        const info = await getCustomerInfo();
        if (isMounted) {
          applyCustomerInfoToStore(info);
        }
      } catch (error) {
        if (__DEV__) {
          console.warn("[RevenueCat] Failed to fetch customer info", error);
        }
      } finally {
        if (isMounted) {
          setVerifyingSubscription(false);
        }
      }
    };

    void loadCustomer();

    const removeListener = addCustomerInfoListener(applyCustomerInfoToStore);

    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") {
          void loadCustomer();
        }
      }
    );

    return () => {
      isMounted = false;
      setVerifyingSubscription(false);
      removeListener();
      appStateSubscription.remove();
    };
  }, [setVerifyingSubscription]);
};
