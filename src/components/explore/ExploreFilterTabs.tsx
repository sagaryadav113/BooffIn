import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { FileText, Users, Hash, Compass } from 'lucide-react-native';
import { SearchFilterCategory } from '../../api/search/types';
import { colors, radii, spacing, typography } from '../../theme';

interface ExploreFilterTabsProps {
  activeCategory: SearchFilterCategory;
  onSelectCategory: (cat: SearchFilterCategory) => void;
  counts?: {
    papers?: number;
    researchers?: number;
    topics?: number;
  };
}

export const ExploreFilterTabs: React.FC<ExploreFilterTabsProps> = ({
  activeCategory,
  onSelectCategory,
  counts,
}) => {
  const tabs: { id: SearchFilterCategory; label: string; icon: React.ReactNode; count?: number }[] = [
    {
      id: 'all',
      label: 'All',
      icon: <Compass size={14} color={activeCategory === 'all' ? colors.white : colors.textSecondary} />,
    },
    {
      id: 'papers',
      label: 'Papers',
      icon: <FileText size={14} color={activeCategory === 'papers' ? colors.white : colors.textSecondary} />,
      count: counts?.papers,
    },
    {
      id: 'researchers',
      label: 'Researchers',
      icon: <Users size={14} color={activeCategory === 'researchers' ? colors.white : colors.textSecondary} />,
      count: counts?.researchers,
    },
    {
      id: 'topics',
      label: 'Topics',
      icon: <Hash size={14} color={activeCategory === 'topics' ? colors.white : colors.textSecondary} />,
      count: counts?.topics,
    },
  ];

  const handleTabPress = (cat: SearchFilterCategory) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    onSelectCategory(cat);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tabs.map((tab) => {
          const isActive = activeCategory === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              activeOpacity={0.75}
              onPress={() => handleTabPress(tab.id)}
              style={[styles.tabBtn, isActive && styles.tabBtnActive]}
            >
              {tab.icon}
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {tab.count !== undefined && tab.count > 0 && (
                <View style={[styles.badge, isActive && styles.badgeActive]}>
                  <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>
                    {tab.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs + 2,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  tabBtnActive: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  tabText: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    fontSize: 13,
  },
  tabTextActive: {
    ...typography.captionBold,
    color: colors.white,
  },
  badge: {
    backgroundColor: colors.backgroundTertiary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.full,
  },
  badgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  badgeText: {
    ...typography.microBold,
    color: colors.textSecondary,
    fontSize: 11,
  },
  badgeTextActive: {
    color: colors.white,
  },
});
