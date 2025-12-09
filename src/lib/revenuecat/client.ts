import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesOfferings,
  PurchasesPackage,
} from "react-native-purchases";

import { useAppStore } from "@/store/useAppStore";

type Listener = (info: CustomerInfo) => void;

let isConfigured = false;

const shouldBypassRevenueCat = () => {
  if (!__DEV__) {
    return false;
  }

  return useAppStore.getState().devProOverride;
};

const getApiKey = () => process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;

export const ensureRevenueCatConfigured = (): boolean => {
  if (shouldBypassRevenueCat()) {
    if (isConfigured) {
      isConfigured = false;
    }
    console.log("[RevenueCat] Dev Pro override active - skipping initialization");
    return false;
  }

  if (isConfigured) {
    return true;
  }

  const apiKey = getApiKey();

  if (!apiKey) {
    if (__DEV__) {
      console.warn("[RevenueCat] Missing EXPO_PUBLIC_REVENUECAT_IOS_KEY.");
    }
    return false;
  }

  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
  Purchases.configure({
    apiKey,
    appUserID: __DEV__ ? "dev-marco-1" : null, // null = anonymous in production
  });
  isConfigured = true;

  return true;
};

const requireConfiguration = () => {
  if (!ensureRevenueCatConfigured()) {
    throw new Error("RevenueCat is not configured.");
  }
};

export const fetchCurrentPackages = async (): Promise<PurchasesPackage[]> => {
  requireConfiguration();

  const offerings: PurchasesOfferings = await Purchases.getOfferings();
  const current = offerings.current;

  if (!current || current.availablePackages.length === 0) {
    throw new Error("No subscription packages available right now.");
  }

  return current.availablePackages;
};

export const purchasePackage = async (
  pkg: PurchasesPackage
): Promise<CustomerInfo> => {
  requireConfiguration();

  const result = await Purchases.purchasePackage(pkg);
  return result.customerInfo;
};

export const restorePurchases = async (): Promise<CustomerInfo> => {
  requireConfiguration();
  return Purchases.restorePurchases();
};

export const getCustomerInfo = async (): Promise<CustomerInfo> => {
  requireConfiguration();
  return Purchases.getCustomerInfo();
};

export const invalidateCustomerInfoCache = async () => {
  requireConfiguration();
  await Purchases.invalidateCustomerInfoCache();
};

export const addCustomerInfoListener = (listener: Listener): (() => void) => {
  requireConfiguration();
  Purchases.addCustomerInfoUpdateListener(listener);

  return () => {
    Purchases.removeCustomerInfoUpdateListener(listener);
  };
};
