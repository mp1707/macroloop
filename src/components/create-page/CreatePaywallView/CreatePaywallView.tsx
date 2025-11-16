import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { BrainCircuit } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import type { Theme } from "@/theme";
import { InlinePaywallCard } from "@/components/paywall/InlinePaywallCard";
import { useTranslation } from "react-i18next";
import { usePaywall } from "@/hooks/usePaywall";

interface CreatePaywallViewProps {
  onShowPaywall: () => void;
}

export const CreatePaywallView = ({
  onShowPaywall,
}: CreatePaywallViewProps) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { options } = usePaywall();
  const trialDays = options[0]?.trialInfo?.days;
  const hasTrial = typeof trialDays === "number";

  const ctaLabel = hasTrial
    ? t("createLog.paywall.ctaWithTrial", { days: trialDays })
    : t("createLog.paywall.cta");

  return (
    <View style={styles.paywallContainer}>
      <InlinePaywallCard
        Icon={BrainCircuit}
        title={t("createLog.paywall.title")}
        body={t("createLog.paywall.body")}
        ctaLabel={ctaLabel}
        onPress={onShowPaywall}
        testID="create-inline-paywall"
      />
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    paywallContainer: {
      flex: 1,
      justifyContent: "center",
      paddingBottom: theme.spacing.xl,
      paddingHorizontal: theme.spacing.lg,
    },
  });
