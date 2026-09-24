import React from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';

export interface FilterPillsProps {
  options?: string[];
  tabs?: string[];
  items?: string[];
  selected?: string;
  activeTab?: string;
  onSelect?: (option: string) => void;
  onTabChange?: (tab: string) => void;
  style?: ViewStyle;
}

export const FilterPills: React.FC<FilterPillsProps> = ({
  options,
  tabs,
  items,
  selected,
  activeTab,
  onSelect,
  onTabChange,
  style,
}) => {
  const list = options || tabs || items || [];
  const currentSelected = selected || activeTab || (list.length > 0 ? list[0] : '');
  const handleSelection = onSelect || onTabChange || (() => {});

  const handlePress = (item: string) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    handleSelection(item);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.container, style]}
    >
      {list.map((item) => {
        const isSelected = currentSelected === item;
        return (
          <TouchableOpacity
            key={item}
            activeOpacity={0.8}
            onPress={() => handlePress(item)}
            style={[
              styles.pill,
              isSelected ? styles.pillSelected : styles.pillUnselected,
            ]}
          >
            <Text
              style={[
                styles.pillText,
                isSelected ? styles.pillTextSelected : styles.pillTextUnselected,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    flexDirection: 'row',
  },
  pill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + 3,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  pillSelected: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  pillUnselected: {
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.borderLight,
  },
  pillText: {
    ...typography.captionMedium,
  },
  pillTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },
  pillTextUnselected: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
