import { useCallback, useEffect, useState } from 'react';
import {
  PurchasesError,
  PURCHASES_ERROR_CODE,
  PurchasesPackage,
} from 'react-native-purchases';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import {
  fetchCurrentPackages,
  purchasePackage,
  restorePurchases,
} from '@/lib/revenuecat/client';
import { applyCustomerInfoToStore } from '@/lib/revenuecat/subscription';
import { useTrialEligibility, type TrialInfo } from './useTrialEligibility';

export type PaywallOption = {
  id: string;
  title: string;
  price: string;
  periodDescription: string;
  package: PurchasesPackage;
  trialInfo?: TrialInfo;
};

type ActionResult =
  | { status: 'ok' }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

type PackageLabelKey =
  | 'annual'
  | 'monthly'
  | 'lifetime'
  | 'sixMonths'
  | 'threeMonths'
  | 'twoMonths'
  | 'weekly';

type PeriodLabelKey =
  | 'annual'
  | 'monthly'
  | 'sixMonths'
  | 'threeMonths'
  | 'twoMonths'
  | 'weekly'
  | 'oneTime';

const PACKAGE_LABEL_KEY_MAP: Record<string, PackageLabelKey | undefined> = {
  ANNUAL: 'annual',
  MONTHLY: 'monthly',
  LIFETIME: 'lifetime',
  SIX_MONTH: 'sixMonths',
  THREE_MONTH: 'threeMonths',
  TWO_MONTH: 'twoMonths',
  WEEKLY: 'weekly',
};

const PERIOD_LABEL_KEY_MAP: Record<string, PeriodLabelKey | undefined> = {
  ANNUAL: 'annual',
  MONTHLY: 'monthly',
  LIFETIME: 'oneTime',
  SIX_MONTH: 'sixMonths',
  THREE_MONTH: 'threeMonths',
  TWO_MONTH: 'twoMonths',
  WEEKLY: 'weekly',
};

const getPackageTitle = (pkg: PurchasesPackage, t: TFunction) => {
  const labelKey = PACKAGE_LABEL_KEY_MAP[pkg.packageType];
  if (labelKey) {
    return t(`paywall.options.labels.${labelKey}`);
  }

  return pkg.product.title ?? pkg.identifier;
};

const getPeriodDescription = (pkg: PurchasesPackage, t: TFunction) => {
  const periodKey = PERIOD_LABEL_KEY_MAP[pkg.packageType];
  if (!periodKey) {
    return t('paywall.options.period.cancelAnytime');
  }

  if (periodKey === 'oneTime') {
    return t('paywall.options.period.oneTime');
  }

  const periodLabel = t(`paywall.options.period.${periodKey}`);
  return t('paywall.options.period.recurring', { period: periodLabel });
};

const toOption = (
  pkg: PurchasesPackage,
  t: TFunction,
  trialInfo?: TrialInfo
): PaywallOption => {
  return {
    id: pkg.identifier,
    title: getPackageTitle(pkg, t),
    price: pkg.product.priceString,
    periodDescription: getPeriodDescription(pkg, t),
    package: pkg,
    trialInfo,
  };
};

const isPurchasesError = (error: unknown): error is PurchasesError => {
  return Boolean(error) && typeof error === 'object' && 'code' in (error as any);
};

const toErrorMessage = (error: unknown, t: TFunction): string => {
  if (isPurchasesError(error) && error.message) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return t('paywall.errors.generic');
};

export const usePaywall = () => {
  const { t } = useTranslation();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [options, setOptions] = useState<PaywallOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Check trial eligibility for all packages
  const trialEligibilityMap = useTrialEligibility(packages);

  const loadOptions = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const fetchedPackages = await fetchCurrentPackages();
      setPackages(fetchedPackages);
      // Set loading to false immediately after successful package fetch
      // Trial info will update options asynchronously without blocking the UI
      setIsLoading(false);
    } catch (error) {
      setLoadError(toErrorMessage(error, t));
      setPackages([]);
      setSelectedId(null);
      setIsLoading(false);
    }
  }, [t]);

  // Update options when packages or trial eligibility changes
  useEffect(() => {
    if (packages.length === 0) {
      setOptions([]);
      return;
    }

    const mapped = packages.map((pkg) => {
      const productId = pkg.product.identifier;
      const trialInfo = trialEligibilityMap[productId] ?? undefined;
      return toOption(pkg, t, trialInfo);
    });

    setOptions(mapped);
    setSelectedId((current) =>
      current && mapped.some((option) => option.id === current)
        ? current
        : mapped[0]?.id ?? null
    );
  }, [packages, trialEligibilityMap, t]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  const selectOption = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const purchase = useCallback(async (): Promise<ActionResult> => {
    if (!selectedId) {
      return { status: 'error', message: t('paywall.errors.noSelection') };
    }

    const option = options.find((item) => item.id === selectedId);
    if (!option) {
      return {
        status: 'error',
        message: t('paywall.errors.planUnavailable'),
      };
    }

    if (isPurchasing) {
      return { status: 'cancelled' };
    }

    setIsPurchasing(true);
    try {
      const info = await purchasePackage(option.package);
      applyCustomerInfoToStore(info);
      return { status: 'ok' };
    } catch (error) {
      if (isPurchasesError(error)) {
        if (
          error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR ||
          error.code === PURCHASES_ERROR_CODE.OPERATION_ALREADY_IN_PROGRESS_ERROR
        ) {
          return { status: 'cancelled' };
        }
      }

      return { status: 'error', message: toErrorMessage(error, t) };
    } finally {
      setIsPurchasing(false);
    }
  }, [isPurchasing, options, selectedId, t]);

  const restore = useCallback(async (): Promise<ActionResult> => {
    if (isRestoring) {
      return { status: 'cancelled' };
    }

    setIsRestoring(true);
    try {
      const info = await restorePurchases();
      applyCustomerInfoToStore(info);

      const hasPro = Boolean(info.entitlements.active?.pro);
      if (!hasPro) {
        return {
          status: 'error',
          message: t('paywall.errors.noSubscription'),
        };
      }

      return { status: 'ok' };
    } catch (error) {
      return { status: 'error', message: toErrorMessage(error, t) };
    } finally {
      setIsRestoring(false);
    }
  }, [isRestoring, t]);

  return {
    options,
    selectedId,
    isLoading,
    loadError,
    isPurchasing,
    isRestoring,
    selectOption,
    reload: loadOptions,
    purchase,
    restore,
  };
};
