import { CustomerInfo } from 'react-native-purchases';

import { useAppStore } from '@/store/useAppStore';

type Snapshot = {
  isPro: boolean;
  isCanceled: boolean;
  expirationDate?: string | null;
};

const toSnapshot = (info: CustomerInfo): Snapshot => {
  const entitlement = info.entitlements.active?.pro;

  if (!entitlement) {
    return {
      isPro: false,
      isCanceled: false,
      expirationDate: undefined,
    };
  }

  const expiration = entitlement.expirationDate ?? null;
  const expirationTime = expiration ? new Date(expiration).getTime() : null;
  const now = Date.now();

  const hasExpired = Boolean(expirationTime && expirationTime <= now);

  if (hasExpired) {
    return {
      isPro: false,
      isCanceled: false,
      expirationDate: expiration,
    };
  }

  const willRenew = entitlement.willRenew ?? true;

  return {
    isPro: true,
    isCanceled: !willRenew,
    expirationDate: expiration,
  };
};

export const applyCustomerInfoToStore = (info: CustomerInfo) => {
  // Skip if dev override is active (dev builds only)
  if (__DEV__) {
    const { devProOverride } = useAppStore.getState();
    if (devProOverride) {
      console.log('[DEV] Skipping subscription sync - dev Pro override active');
      return;
    }
  }

  const snapshot = toSnapshot(info);
  const { setPro, setProMetadata } = useAppStore.getState();

  setPro(snapshot.isPro);
  setProMetadata({
    isCanceled: snapshot.isCanceled,
    expirationDate: snapshot.expirationDate ?? undefined,
  });
};
