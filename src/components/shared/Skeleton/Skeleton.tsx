import React from 'react';
import { View } from 'react-native';
import { useStyles } from './Skeleton.styles';

interface SkeletonProps {
  width?: string | number;
  height?: number;
  style?: any;
}

/**
 * Skeleton - Static loading placeholder
 *
 * ACCESSIBILITY:
 * - Marked as decorative/hidden from screen readers (loading placeholders should be hidden)
 * - Parent component should provide loading state announcement
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  style
}) => {
  const styles = useStyles();

  return (
    <View
      style={[
        styles.base,
        { width, height },
        style
      ]}
      // ACCESSIBILITY: Hide from screen readers (WCAG 1.3.1)
      // Loading state should be announced by parent component
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
    />
  );
};