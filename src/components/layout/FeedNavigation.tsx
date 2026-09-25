import React from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography, layout } from '../../theme';

export interface FeedNavigationProps {
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  style?: ViewStyle;
}

export const FeedNavigation: React.FC<FeedNavigationProps> = ({
  tabs,
  activeTab,
  onTabChange,
  style,
}) => {
  const handlePress = (tab: string) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    onTabChange(tab);
  };

  return (
    <View style={[styles.wrapper, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              accessibilityRole="tab"
              accessibilityLabel={`${tab} feed tab`}
              accessibilityState={{ selected: isActive }}
              activeOpacity={0.8}
              onPress={() => handlePress(tab)}
              style={[styles.tabItem, isActive && styles.tabItemActive]}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            >
              <Text
                style={[
                  styles.tabText,
                  isActive ? styles.tabTextActive : styles.tabTextInactive,
                ]}
              >
                {tab}
              </Text>
              {isActive && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    gap: spacing.xl,
    alignItems: 'center',
  },
  tabItem: {
    minHeight: layout.touchTargetMin - 4,
    paddingVertical: spacing.sm + 2,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemActive: {},
  tabText: {
    ...typography.label,
    fontSize: 14.5,
  },
  tabTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  tabTextInactive: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: colors.black,
    borderRadius: 1.5,
  },
});
