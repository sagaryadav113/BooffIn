import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { colors, spacing, layout, typography } from '../../theme';
import { Typography } from '../core/Typography';
import { Icon, IconName } from '../core/Icon';

export interface AppHeaderProps {
  title?: string;
  isBrandTitle?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  showSearch?: boolean;
  onSearch?: () => void;
  onSearchPress?: () => void;
  showCreate?: boolean;
  onCreatePress?: () => void;
  rightIcon?: IconName;
  onRightIconPress?: () => void;
  rightElement?: React.ReactNode;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title = 'BooffIn',
  isBrandTitle = false,
  showBack = false,
  onBack,
  showSearch = false,
  onSearch,
  onSearchPress,
  showCreate = false,
  onCreatePress,
  rightIcon,
  onRightIconPress,
  rightElement,
  rightAction,
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

  const searchHandler = onSearch || onSearchPress || (() => router.push('/search'));

  return (
    <View style={[styles.container, style]}>
      {/* Left side */}
      <View style={styles.leftSection}>
        {showBack && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={handleBack}
            style={styles.iconButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="ArrowLeft" size="md" color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        {isBrandTitle && (
          <Image
            source={require('../../../assets/images/booffin-symbol.png')}
            style={styles.brandIcon}
            contentFit="contain"
          />
        )}
        <Typography
          variant={isBrandTitle ? 'pageTitle' : 'sectionTitle'}
          style={[
            isBrandTitle ? styles.brandTitle : styles.title,
            showBack && { marginLeft: spacing.xs + 2 },
          ]}
          numberOfLines={1}
        >
          {title}
        </Typography>
      </View>

      {/* Right side actions */}
      <View style={styles.rightSection}>
        {showSearch && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Search discussions and papers"
            onPress={searchHandler}
            style={styles.iconButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="Search" size="sm" color={colors.textPrimary} />
          </TouchableOpacity>
        )}

        {showCreate && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Create research post or discussion"
            onPress={onCreatePress || (() => router.push('/(tabs)/create'))}
            style={[styles.iconButton, styles.createButton]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="Plus" size="sm" color={colors.white} />
          </TouchableOpacity>
        )}

        {rightIcon && onRightIconPress && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={rightIcon}
            onPress={onRightIconPress}
            style={styles.iconButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name={rightIcon} size="md" color={colors.textPrimary} />
          </TouchableOpacity>
        )}

        {rightElement || rightAction}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: layout.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  brandIcon: {
    width: 24,
    height: 28,
    marginRight: spacing.sm + 2,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: colors.textPrimary,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: colors.textPrimary,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    minHeight: layout.touchTargetMin - 4,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButton: {
    backgroundColor: colors.black,
  },
});
