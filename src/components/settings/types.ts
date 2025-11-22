import { ReactNode } from "react";

export type ValueTone = "primary" | "secondary" | "accent" | "error";

export interface SettingRowProps {
  icon?: React.ComponentType<{ size: number; color: string }>;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  disabled?: boolean;
  accessory?: "chevron" | "none";
  control?: ReactNode;
  titleAdornment?: ReactNode;
  trailingContent?: ReactNode;
  actionButton?: {
    label: string;
    onPress: () => void;
    loading?: boolean;
    tone?: ValueTone;
  };
  value?: string;
  valueTone?: ValueTone;
  valueAlignment?: "left" | "right";
  accessibilityLabel?: string;
  accessibilityHint?: string;
  hapticIntensity?: "light" | "medium" | "heavy";
  containerStyle?: object;
  backgroundColor?: string;
  showAccentRail?: boolean;
  twoLineLayout?: boolean;
}
