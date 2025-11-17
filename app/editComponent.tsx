import { useAppStore } from "@/store/useAppStore";
import { Colors, Theme, useTheme } from "@/theme";
import { useLocalSearchParams } from "expo-router";
import { StyleSheet, View, Alert } from "react-native";
import { HeaderButton } from "@/components/shared/HeaderButton";
import type { FoodComponent, FoodUnit } from "@/types/models";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useSafeRouter } from "@/hooks/useSafeRouter";
import { AppText } from "@/components/index";
import { TextInput } from "@/components/shared/TextInput";
import { Host, Picker } from "@expo/ui/swift-ui";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { useTranslation } from "react-i18next";

export default function EditComponent() {
  const {
    mode = "create",
    index: indexParam,
    name: nameParam = "",
    amount: amountParam = "0",
    unit: unitParam = "g",
    logId,
  } = useLocalSearchParams<{
    mode?: "create" | "edit";
    index?: string;
    name?: string;
    amount?: string;
    unit?: string;
    logId: string;
  }>();

  const router = useSafeRouter();
  const { colors, theme, colorScheme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);
  const hasLiquidGlass = isLiquidGlassAvailable();

  // Get last used unit from store for create mode
  const lastUsedUnit = useAppStore((s) => s.lastUsedUnit || "g");

  // Local state for editing
  const [name, setName] = useState(nameParam || "");
  const [amount, setAmount] = useState(
    mode === "create" ? "" : amountParam || ""
  );
  const [unit, setUnit] = useState<FoodUnit>(
    mode === "create" ? lastUsedUnit : (unitParam as FoodUnit) || "g"
  );
  const [isDirty, setIsDirty] = useState(false);

  // Refs for focus management
  const nameInputRef = useRef<any>(null);
  const amountInputRef = useRef<any>(null);
  const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldRefocusAmount = useRef(false);

  // Track if we've set initial focus
  const hasSetInitialFocus = useRef(false);

  const unitLabels = useMemo(
    () => ({
      g: t("editComponent.units.grams"),
      ml: t("editComponent.units.milliliters"),
      piece: t("editComponent.units.pieces"),
    }),
    [t]
  );
  // Unit options
  const unitOptions = useMemo(
    () => [unitLabels.g, unitLabels.ml, unitLabels.piece],
    [unitLabels]
  );

  // Set initial focus after modal transition (300ms delay)
  useEffect(() => {
    if (!hasSetInitialFocus.current) {
      const timer = setTimeout(() => {
        if (mode === "create") {
          nameInputRef.current?.focus();
        } else {
          amountInputRef.current?.focus();
        }
        hasSetInitialFocus.current = true;
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [mode]);

  // Detect changes for dirty flag
  useEffect(() => {
    if (mode === "edit") {
      const hasChanges =
        name !== nameParam ||
        amount !== amountParam ||
        unit !== (unitParam as FoodUnit);
      setIsDirty(hasChanges);
    } else {
      // In create mode, dirty if any field has content
      setIsDirty(name.trim().length > 0 || amount.trim().length > 0);
    }
  }, [name, amount, unit, nameParam, amountParam, unitParam, mode]);

  // Validation
  const nameError = useMemo(() => {
    const trimmed = name.trim();
    if (mode === "create" && trimmed.length === 0) {
      return t("editComponent.validation.nameRequired");
    }
    if (trimmed.length > 0 && trimmed.length < 2) {
      return t("editComponent.validation.nameShort", { count: 2 });
    }
    if (trimmed.length > 60) {
      return t("editComponent.validation.nameLong", { count: 60 });
    }
    return null;
  }, [name, mode, t]);

  const amountError = useMemo(() => {
    // Allow empty amount field (will show placeholder)
    if (amount.trim() === "") {
      return mode === "create"
        ? null
        : t("editComponent.validation.amountInvalid");
    }
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      return t("editComponent.validation.amountInvalid");
    }
    // Check for max 1 decimal place
    const decimalPart = amount.split(".")[1];
    if (decimalPart && decimalPart.length > 1) {
      return t("editComponent.validation.amountPrecision");
    }
    return null;
  }, [amount, mode, t]);

  const isValid =
    !nameError &&
    !amountError &&
    name.trim().length > 0 &&
    amount.trim().length > 0;

  // Handle unit change
  const handleUnitChange = useCallback((newUnit: FoodUnit) => {
    Haptics.selectionAsync();
    setUnit(newUnit);
    shouldRefocusAmount.current = true;
  }, []);

  useEffect(() => {
    if (!shouldRefocusAmount.current) {
      return;
    }

    shouldRefocusAmount.current = false;

    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
    }

    focusTimeoutRef.current = setTimeout(() => {
      amountInputRef.current?.focus();
      focusTimeoutRef.current = null;
    }, 75);

    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
        focusTimeoutRef.current = null;
      }
    };
  }, [unit]);

  // Handle Save
  const handleSave = useCallback(() => {
    if (!isValid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.impactAsync(theme.interactions.haptics.light);

    const component: FoodComponent = {
      name: name.trim(),
      amount: parseFloat(amount),
      unit,
    };

    // Store last used unit for future creates
    if (mode === "create") {
      useAppStore.getState().setLastUsedUnit(unit);
    }

    // Pass data back via store, then dismiss modal
    if (logId) {
      useAppStore.getState().setPendingComponentEdit({
        logId,
        component,
        index: mode === "edit" && indexParam ? parseInt(indexParam, 10) : "new",
        action: "save",
      });
    }

    router.back();
  }, [isValid, name, amount, unit, mode, router, logId, indexParam, theme]);

  // Handle Cancel
  const handleCancel = useCallback(() => {
    if (isDirty) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        t("editComponent.alerts.discard.title"),
        t("editComponent.alerts.discard.message"),
        [
          {
            text: t("editComponent.alerts.discard.keep"),
            style: "cancel",
          },
          {
            text: t("editComponent.alerts.discard.discard"),
            style: "destructive",
            onPress: () => {
              router.back();
            },
          },
        ]
      );
    } else {
      router.back();
    }
  }, [isDirty, router, t]);

  // Handle Delete (edit mode only)
  const handleDelete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      t("editComponent.alerts.delete.title"),
      t("editComponent.alerts.delete.message"),
      [
        {
          text: t("common.cancel"),
          style: "cancel",
        },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            // Pass delete signal back via store, then dismiss modal
            if (logId && indexParam) {
              useAppStore.getState().setPendingComponentEdit({
                logId,
                component: { name: "", amount: 0, unit: "g" }, // Dummy component for delete
                index: parseInt(indexParam, 10),
                action: "delete",
              });
            }
            router.back();
          },
        },
      ]
    );
  }, [router, logId, indexParam, t]);

  const screenTitle =
    mode === "create"
      ? t("editComponent.title.create")
      : t("editComponent.title.edit");

  return (
    <View style={styles.container}>
      {/* Header with title and buttons */}
      <View style={styles.header}>
        <HeaderButton
          imageProps={{
            systemName: mode === "edit" ? "trash" : "xmark",
          }}
          buttonProps={{
            onPress: mode === "edit" ? handleDelete : handleCancel,
            color: hasLiquidGlass ? undefined : colors.tertiaryBackground,
          }}
        />
        <AppText role="Title2" style={styles.modalTitle}>
          {screenTitle}
        </AppText>
        <HeaderButton
          variant="colored"
          buttonProps={{
            onPress: handleSave,
            disabled: !isValid,
            color: colors.accent,
          }}
          imageProps={{
            systemName: "checkmark",
            color: colors.black,
          }}
        />
      </View>

      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        bottomOffset={theme.spacing.lg}
      >
        {/* Name Field */}
        <View style={styles.fieldGroup}>
          <AppText role="Headline" style={styles.fieldLabel}>
            {t("editComponent.fields.name.label")}
          </AppText>
          <TextInput
            ref={nameInputRef}
            value={name}
            onChangeText={(text) => {
              setName(text);
            }}
            placeholder={t("editComponent.fields.name.placeholder")}
            placeholderTextColor={colors.secondaryText}
            style={styles.input}
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => amountInputRef.current?.focus()}
            fontSize="Body"
          />
        </View>

        {/* Quantity Field */}
        <View style={styles.fieldGroup}>
          <AppText role="Headline" style={styles.fieldLabel}>
            {t("editComponent.fields.quantity.label")}
          </AppText>
          <TextInput
            ref={amountInputRef}
            value={amount}
            onChangeText={(text) => {
              // Allow numbers and single decimal separator (both comma and period)
              const sanitized = text.replace(/[^0-9.,]/g, "");
              // Normalize comma to period for internal use
              const normalized = sanitized.replace(/,/g, ".");
              // Prevent multiple decimals
              const parts = normalized.split(".");
              if (parts.length > 2) {
                setAmount(parts[0] + "." + parts.slice(1).join(""));
              } else {
                setAmount(normalized);
              }
            }}
            placeholder={t("editComponent.fields.quantity.placeholder")}
            placeholderTextColor={colors.secondaryText}
            style={styles.input}
            keyboardType="decimal-pad"
            fontSize="Body"
            accessibilityLabel={t("editComponent.accessibility.quantityField", {
              unit: unitLabels[unit],
            })}
          />
        </View>

        {/* Unit Field */}
        <View style={styles.fieldGroup}>
          <AppText role="Headline" style={styles.fieldLabel}>
            {t("editComponent.fields.unit.label")}
          </AppText>
          <Host matchContents colorScheme={colorScheme}>
            <Picker
              options={unitOptions}
              selectedIndex={unit === "g" ? 0 : unit === "ml" ? 1 : 2}
              onOptionSelected={({ nativeEvent: { index } }) => {
                const newUnit: FoodUnit =
                  index === 0 ? "g" : index === 1 ? "ml" : "piece";
                handleUnitChange(newUnit);
              }}
              variant="segmented"
            />
          </Host>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const createStyles = (colors: Colors, theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.secondaryBackground,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      gap: theme.spacing.md,
    },
    scrollView: {
      flex: 1,
    },
    contentContainer: {
      paddingHorizontal: theme.spacing.pageMargins.horizontal,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.lg + theme.spacing.xl, // 24 + 32 = 56pt safe area spacer
      gap: theme.spacing.lg, // Tighter spacing: 24pt instead of 32pt
    },
    modalTitle: {
      flex: 1,
      textAlign: "center",
    },
    fieldGroup: {
      gap: theme.spacing.sm, // 8pt between label and input
    },
    fieldLabel: {
      color: colors.secondaryText,
      marginBottom: theme.spacing.xs, // 4pt below label
    },
    input: {
      backgroundColor: colors.primaryBackground,
      borderRadius: theme.components.cards.cornerRadius, // 18pt
      paddingHorizontal: theme.spacing.lg, // 24pt horizontal padding
      paddingVertical: theme.spacing.md + theme.spacing.xs, // ~20pt vertical (48-52pt total height)
      color: colors.primaryText,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 50, // Ensure 48-52pt height
    },
  });
