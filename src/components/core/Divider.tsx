import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { spacing, useColors } from '../../theme';

export interface DividerProps {
  vertical?: boolean;
  style?: ViewStyle;
  color?: string;
  marginVertical?: number;
}

export const Divider: React.FC<DividerProps> = ({
  vertical = false,
  style,
  color,
  marginVertical = spacing.sm,
}) => {
  const colors = useColors();
  const resolvedColor = color || colors.borderLight;

  return (
    <View
      style={[
        vertical ? styles.vertical : styles.horizontal,
        { backgroundColor: resolvedColor },
        !vertical && { marginVertical },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  horizontal: {
    height: 1,
    width: '100%',
  },
  vertical: {
    width: 1,
    height: '100%',
  },
});
