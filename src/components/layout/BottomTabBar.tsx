import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, layout, spacing } from '../../theme';
import { Icon, IconName } from '../core/Icon';
import { Typography } from '../core/Typography';
import { useNotificationStore } from '../../store/useNotificationStore';

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
  const unreadCount = useNotificationStore((s) => s.unreadCount());

  return (
    <View style={styles.tabBarContainer}>
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
                color={isFocused ? colors.black : colors.textSecondary}
                strokeWidth={isFocused ? 2.3 : 1.9}
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
              color={isFocused ? colors.black : colors.textSecondary}
              style={[styles.label, isFocused && styles.labelFocused]}
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
    height: layout.tabBarHeight,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingBottom: 6,
    paddingTop: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: layout.touchTargetMin,
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
    marginTop: 3,
    fontSize: 11.5,
    fontWeight: '500',
  },
  labelFocused: {
    fontWeight: '700',
    color: colors.black,
  },
});
