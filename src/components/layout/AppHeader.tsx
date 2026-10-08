import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { colors, spacing, layout, typography } from '../../theme';
import { Typography } from '../core/Typography';
import { Icon, IconName } from '../core/Icon';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

export interface AppHeaderProps {
  title?: string;
  isBrandTitle?: boolean;
  onTitlePress?: () => void;
  isRefreshing?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  showSearch?: boolean;
  onSearch?: () => void;
  onSearchPress?: () => void;
  showWorkspace?: boolean;
  onWorkspacePress?: () => void;
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
  onTitlePress,
  isRefreshing = false,
  showBack = false,
  onBack,
  showSearch = false,
  onSearch,
  onSearchPress,
  showWorkspace = false,
  onWorkspacePress,
  showCreate = false,
  onCreatePress,
  rightIcon,
  onRightIconPress,
  rightElement,
  rightAction,
  style,
}) => {
  const workspaceUnread = useWorkspaceStore((s) => s.unreadTotal);
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
      <TouchableOpacity
        disabled={!onTitlePress}
        onPress={onTitlePress}
        activeOpacity={onTitlePress ? 0.7 : 1}
        style={styles.leftSection}
      >
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
        {isBrandTitle ? (
          <Image
            source={require('../../../assets/images/booffin-wordmark.jpg')}
            style={styles.brandLogoImage}
            contentFit="contain"
            accessibilityLabel="BooffIn"
          />
        ) : (
          <Typography
            variant="sectionTitle"
            style={[
              styles.title,
              showBack && { marginLeft: spacing.xs + 2 },
            ]}
            numberOfLines={1}
          >
            {title}
          </Typography>
        )}
        {isRefreshing && (
          <ActivityIndicator size="small" color={colors.textSecondary} style={{ marginLeft: 6 }} />
        )}
      </TouchableOpacity>

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

        {showWorkspace && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="BooffIn Workspace"
            onPress={onWorkspacePress || (() => router.push('/workspace' as any))}
            style={[styles.iconButton, styles.workspaceButton]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="Layers" size="sm" color="#FFFFFF" />
            {workspaceUnread > 0 && (
              <View style={styles.workspaceBadge}>
                <Typography style={styles.workspaceBadgeText}>
                  {workspaceUnread > 99 ? '99+' : workspaceUnread}
                </Typography>
              </View>
            )}
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
  brandLogoImage: {
    width: 108,
    height: 34,
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
  workspaceButton: {
    backgroundColor: '#064E3B',
    borderWidth: 1,
    borderColor: '#047857',
    position: 'relative',
  },
  workspaceBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  workspaceBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
