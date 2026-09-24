import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { colors, spacing } from '../../theme';
import { Typography } from '../core/Typography';
import { Icon, IconName } from '../core/Icon';

export interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightIcon?: IconName;
  onRightPress?: () => void;
  rightElement?: React.ReactNode;
  style?: ViewStyle;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBack = false,
  onBack,
  rightIcon,
  onRightPress,
  rightElement,
  style,
}) => {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.leftSection}>
        {showBack && (
          <TouchableOpacity
            onPress={handleBack}
            style={styles.iconButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="ArrowLeft" size="md" color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        {title && (
          <Typography
            variant="h3"
            numberOfLines={1}
            style={[styles.title, !showBack && { marginLeft: 0 }]}
          >
            {title}
          </Typography>
        )}
      </View>

      <View style={styles.rightSection}>
        {rightElement}
        {rightIcon && onRightPress && (
          <TouchableOpacity
            onPress={onRightPress}
            style={styles.iconButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name={rightIcon} size="md" color={colors.textPrimary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.background,
    minHeight: 48,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    marginLeft: spacing.sm,
    fontSize: 18,
    fontWeight: '700',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    padding: spacing.xs,
  },
});
