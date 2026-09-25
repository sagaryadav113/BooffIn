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
import { colors, spacing, typography } from '../../theme';

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
    paddingVertical: spacing.sm + 2,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemActive: {},
  tabText: {
    ...typography.captionMedium,
    fontSize: 14,
  },
  tabTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  tabTextInactive: {
    color: colors.textSecondary,
    fontWeight: '400',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.black,
    borderRadius: 1,
  },
});
