import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { FileText, Users, Hash, Compass } from 'lucide-react-native';
import { SearchFilterCategory } from '../../api/search/types';
import { colors as staticColors, radii, spacing, typography, useColors, useIsDark } from '../../theme';

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
  const colors = useColors();
  const isDark = useIsDark();

  const tabs: { id: SearchFilterCategory; label: string; icon: React.ReactNode; count?: number }[] = [
    {
      id: 'all',
      label: 'All',
      icon: <Compass size={14} color={activeCategory === 'all' ? '#FFFFFF' : colors.textSecondary} />,
    },
    {
      id: 'papers',
      label: 'Papers',
      icon: <FileText size={14} color={activeCategory === 'papers' ? '#FFFFFF' : colors.textSecondary} />,
      count: counts?.papers,
    },
    {
      id: 'researchers',
      label: 'Researchers',
      icon: <Users size={14} color={activeCategory === 'researchers' ? '#FFFFFF' : colors.textSecondary} />,
      count: counts?.researchers,
    },
    {
      id: 'topics',
      label: 'Topics',
      icon: <Hash size={14} color={activeCategory === 'topics' ? '#FFFFFF' : colors.textSecondary} />,
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
    <View style={[styles.container, { backgroundColor: colors.background, borderBottomColor: colors.borderLight }]}>
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
              style={[
                styles.tabBtn,
                {
                  backgroundColor: isDark ? colors.cardBackground : colors.backgroundSecondary,
                  borderColor: colors.borderLight,
                },
                isActive && {
                  backgroundColor: isDark ? '#10B981' : staticColors.black,
                  borderColor: isDark ? '#10B981' : staticColors.black,
                },
              ]}
            >
              {tab.icon}
              <Text
                style={[
                  styles.tabText,
                  { color: colors.textSecondary },
                  isActive && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
              {tab.count !== undefined && tab.count > 0 && (
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: isDark ? '#1F2636' : colors.backgroundTertiary },
                    isActive && styles.badgeActive,
                  ]}
                >
                  <Text style={[styles.badgeText, { color: colors.textSecondary }, isActive && styles.badgeTextActive]}>
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
    borderBottomColor: staticColors.borderLight,
    backgroundColor: staticColors.background,
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
    backgroundColor: staticColors.backgroundSecondary,
    borderWidth: 1,
    borderColor: staticColors.borderLight,
  },
  tabBtnActive: {
    backgroundColor: staticColors.black,
    borderColor: staticColors.black,
  },
  tabText: {
    ...typography.captionMedium,
    color: staticColors.textSecondary,
    fontSize: 13,
  },
  tabTextActive: {
    ...typography.captionBold,
    color: '#FFFFFF',
  },
  badge: {
    backgroundColor: staticColors.backgroundTertiary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.full,
  },
  badgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  badgeText: {
    ...typography.microBold,
    color: staticColors.textSecondary,
    fontSize: 11,
  },
  badgeTextActive: {
    color: '#FFFFFF',
  },
});
