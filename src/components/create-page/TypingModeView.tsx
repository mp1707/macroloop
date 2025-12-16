import { useRef, useMemo, useImperativeHandle, Ref } from "react";
import { View, TextInput as RNTextInput } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";

import { FoodLog, Favorite } from "@/types/models";
import { useTheme } from "@/theme/ThemeProvider";
import { useDelayedAutofocus } from "@/hooks/useDelayedAutofocus";
import { TextInput } from "@/components/shared/TextInput";
import { AppText } from "@/components/shared/AppText";
import { FavoritesSection } from "@/components/create-page/FavoritesSection";
import { ImageSection } from "@/components/create-page/ImageSection";
import { Waveform } from "@/components/create-page/Waveform/Waveform";
import { HeaderButton } from "@/components/shared/HeaderButton";
import { PortionSlider } from "@/components/create-page/PortionSlider";
import { CREATE_ACCESSORY_HEIGHT } from "@/constants/create";
import { createStyles } from "./TypingModeView.styles";

export interface TypingModeViewHandle {
  focus: () => void;
}

interface TypingModeViewProps {
  draft: FoodLog;
  filteredFavorites: Favorite[];
  isProcessingImage: boolean;
  onDescriptionChange: (text: string) => void;
  onSelectFavorite: (favorite: Favorite) => void;
  onRemoveImage: () => void;
  isRecording: boolean;
  volumeLevel: number;
  onStopRecording: () => void;
  onPercentageChange: (percentage: number) => void;
  ref?: Ref<TypingModeViewHandle>;
}

export const TypingModeView = ({
  draft,
  filteredFavorites,
  isProcessingImage,
  onDescriptionChange,
  onSelectFavorite,
  onRemoveImage,
  isRecording,
  volumeLevel,
  onStopRecording,
  onPercentageChange,
  ref,
}: TypingModeViewProps) => {
  const { t } = useTranslation();
  const { theme, colors, colorScheme } = useTheme();
  const styles = useMemo(
    () => createStyles(theme, colors, colorScheme),
    [theme, colors, colorScheme]
  );
  const slidingLayout = useMemo(
    () =>
      LinearTransition.duration(200).easing(Easing.bezier(0.2, 0.8, 0.2, 1)),
    []
  );

  const textInputRef = useRef<RNTextInput>(null);
  useDelayedAutofocus(textInputRef);

  useImperativeHandle(ref, () => ({
    focus: () => {
      textInputRef.current?.focus();
    },
  }));

  const isRecordingActive = isRecording;
  const hasImage = !!(draft.localImagePath || isProcessingImage);
  const showImageSection = !isRecordingActive && hasImage;
  const showRecordingSection = isRecordingActive;
  const showFavoritesSection =
    !isRecordingActive && !hasImage && filteredFavorites.length > 0;

  const sectionTitle = isRecordingActive
    ? t("createLog.recording.title")
    : showImageSection
    ? t("createLog.image.title")
    : showFavoritesSection
    ? t("createLog.favorites.title")
    : null;

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(200)}
      style={styles.container}
    >
      <TextInput
        ref={textInputRef}
        value={draft.description || ""}
        onChangeText={onDescriptionChange}
        placeholder={t("createLog.input.placeholder")}
        multiline
        fontSize="Headline"
        style={styles.textInputField}
        containerStyle={styles.textInputContainer}
        focusBorder={false}
        accessibilityLabel={t("createLog.input.accessibilityLabel")}
      />

      {sectionTitle && (
        <Animated.View
          layout={slidingLayout}
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(150)}
          style={styles.accessorySection}
        >
          <AppText role="Caption" style={styles.sectionHeading}>
            {sectionTitle}
          </AppText>
          <View style={styles.accessorySlot}>
            {showRecordingSection && (
              <Animated.View
                entering={FadeIn.duration(180)}
                exiting={FadeOut.duration(120)}
                style={styles.recordingContent}
              >
                <Waveform
                  volumeLevel={volumeLevel}
                  isActive={isRecordingActive}
                  containerStyle={styles.waveform}
                  barStyle={styles.waveformBar}
                />
                <HeaderButton
                  variant="colored"
                  buttonProps={{
                    onPress: onStopRecording,
                    color: colors.errorBackground,
                    variant: "glassProminent",
                  }}
                  imageProps={{
                    systemName: "square",
                    color: colors.error,
                  }}
                />
              </Animated.View>
            )}
            {showImageSection && (
              <ImageSection
                imageUrl={draft.localImagePath}
                isProcessing={isProcessingImage}
                onRemoveImage={onRemoveImage}
                collapsedHeight={CREATE_ACCESSORY_HEIGHT}
              />
            )}
            {showFavoritesSection && (
              <FavoritesSection
                favorites={filteredFavorites}
                onSelectFavorite={onSelectFavorite}
                isVisible={showFavoritesSection}
                minHeight={CREATE_ACCESSORY_HEIGHT}
              />
            )}
          </View>
        </Animated.View>
      )}

      <Animated.View layout={slidingLayout} style={styles.portionSliderSection}>
        <PortionSlider
          value={draft.percentageEaten ?? 100}
          onValueChange={onPercentageChange}
        />
      </Animated.View>
    </Animated.View>
  );
};
