import { useTheme } from "@/theme/ThemeProvider";
import {
  Host,
  Button,
  Image,
  ButtonProps,
  ImageProps,
} from "@expo/ui/swift-ui";
import {
  background,
  clipShape,
  frame,
  padding,
} from "@expo/ui/swift-ui/modifiers";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { StyleProp, ViewStyle } from "react-native";

const SIZE = 44;
const TOUCH_PADDING = 11;
const TOUCH_SIZE = SIZE + TOUCH_PADDING * 2; // 66pt touch area
const NEGATIVE_MARGIN = -8;

export interface HeaderButtonProps {
  imageProps?: ImageProps;
  buttonProps?: ButtonProps;
  style?: StyleProp<ViewStyle>;
  variant?: "regular" | "colored";
  size?: "regular" | "large";
}

export function HeaderButton({
  imageProps,
  buttonProps,
  style,
  variant = "regular",
  size = "regular",
}: HeaderButtonProps) {
  const { colorScheme } = useTheme();
  const hasLiquidGlass = isLiquidGlassAvailable();
  const { colors } = useTheme();

  return (
    <Host
      colorScheme={colorScheme}
      style={[
        {
          justifyContent: "center",
          alignItems: "center",
        },
        style,
      ]}
      matchContents
    >
      <Button
        color={buttonProps?.color || colors.secondaryBackground}
        variant={
          hasLiquidGlass
            ? variant === "colored"
              ? "glassProminent"
              : "glass"
            : "borderedProminent"
        }
        controlSize={hasLiquidGlass ? size : "regular"}
        modifiers={
          hasLiquidGlass
            ? [
                frame(
                  size === "large"
                    ? { height: 30, width: 20 }
                    : { height: 34, width: 24 }
                ),
                padding({ all: 8 }),
              ]
            : [clipShape("circle")]
        }
        {...buttonProps}
      >
        <Image
          systemName={imageProps?.systemName || "xmark"}
          color={imageProps?.color || "primary"}
          size={size === "large" && hasLiquidGlass ? 66 : 18}
          modifiers={[
            frame(
              size === "large"
                ? { height: 50, width: 40 }
                : { height: 34, width: 24 }
            ),
            padding({ all: 0 }),

            ...(imageProps?.modifiers || []),
          ]}
          {...imageProps}
        />
      </Button>
    </Host>
  );
}
