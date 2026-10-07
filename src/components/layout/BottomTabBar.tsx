import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors, layout } from '../../theme';
import { Icon, IconName } from '../core/Icon';
import { Typography } from '../core/Typography';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

export interface BottomTabBarProps {
  state: {
    index: number;
    routes: {
      key: string;
      name: string;
      params?: any;
    }[];
    [key: string]: any;
  };
  descriptors: {
    [key: string]: {
      options?: {
        tabBarAccessibilityLabel?: string;
        [key: string]: any;
      };
      [key: string]: any;
    };
  };
  navigation: {
    emit: (options: any) => any;
    navigate: (name: string, params?: any) => void;
    [key: string]: any;
  };
  insets?: any;
}

const tabIconMap: Record<string, { name: IconName; label: string }> = {
  index: { name: 'Home', label: 'Home' },
  explore: { name: 'Compass', label: 'Explore' },
  create: { name: 'PlusCircle', label: 'Post' },
  notifications: { name: 'Bell', label: 'Notifications' },
  profile: { name: 'User', label: 'Profile' },
};

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const { isDesktop } = useResponsiveLayout();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom || 0;

  // On desktop web, navigation is handled by the left sidebar
  if (isDesktop) {
    return null;
  }

  return (
    <View
      style={[
        styles.tabBarContainer,
        {
          paddingBottom: bottomInset > 0 ? bottomInset + 2 : 6,
          height: layout.tabBarHeight + (bottomInset > 0 ? bottomInset - 4 : 0),
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const descriptor = descriptors[route.key] || { options: {} };
        const options = descriptor.options || {};
        const isFocused = state.index === index;
        const meta = tabIconMap[route.name] || { name: 'Home', label: route.name };

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            try {
              Haptics.selectionAsync();
            } catch {}
            navigation.navigate(route.name);
          }
        };

        const isCreate = route.name === 'create';
        const isNotifications = route.name === 'notifications';

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel || meta.label}
            onPress={onPress}
            style={styles.tabItem}
            activeOpacity={0.72}
          >
            <View style={styles.iconWrapper}>
              <Icon
                name={meta.name}
                size={isCreate ? 26 : 22}
                color={isFocused ? colors.black : '#374151'}
                strokeWidth={isFocused ? 2.5 : 2.1}
              />
              {isNotifications && unreadCount > 0 && (
                <View style={styles.badge}>
                  <Typography variant="micro" color={colors.white} style={styles.badgeText}>
                    {unreadCount}
                  </Typography>
                </View>
              )}
            </View>
            <Typography
              variant="micro"
              color={isFocused ? colors.black : '#374151'}
              style={[styles.label, isFocused && styles.labelFocused]}
              numberOfLines={1}
            >
              {meta.label}
            </Typography>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderTopWidth: 1.5,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: layout.touchTargetMin,
    paddingHorizontal: 2,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -9,
    backgroundColor: colors.black,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.white,
  },
  label: {
    marginTop: 2,
    fontSize: 10,
    letterSpacing: -0.2,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  labelFocused: {
    fontWeight: '700',
    color: colors.black,
  },
});
