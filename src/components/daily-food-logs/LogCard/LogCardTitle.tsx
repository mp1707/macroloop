import React from "react";
import Animated from "react-native-reanimated";
import { AppText } from "@/components";
import { SkeletonPill } from "@/components/shared";

interface LogCardTitleProps {
  title: string;
  isLoading?: boolean;
  animated?: boolean;
  animatedStyle?: any;
  style?: any;
  numberOfLines?: number;
}

export const LogCardTitle: React.FC<LogCardTitleProps> = ({
  title,
  isLoading = false,
  animated = false,
  animatedStyle,
  style,
  numberOfLines = 2,
}) => {
  if (isLoading) {
    return <SkeletonPill width="80%" height={22} />;
  }

  const textContent = (
    <AppText role="Headline" style={style} numberOfLines={numberOfLines}>
      {title}
    </AppText>
  );

  if (animated && animatedStyle) {
    return <Animated.View style={animatedStyle}>{textContent}</Animated.View>;
  }

  return textContent;
};
