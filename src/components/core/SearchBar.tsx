import React from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { Icon } from './Icon';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  onSubmitEditing?: () => void;
  onFilterPress?: () => void;
  showFilter?: boolean;
  showFilterButton?: boolean;
  autoFocus?: boolean;
  style?: ViewStyle;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search papers, topics, people...',
  onClear,
  onSubmitEditing,
  onFilterPress,
  showFilter = false,
  showFilterButton,
  autoFocus = false,
  style,
}) => {
  const isFilterVisible = showFilterButton !== undefined ? showFilterButton : showFilter;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.inputWrapper}>
        <Icon name="Search" size="xs" color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          autoFocus={autoFocus}
          onSubmitEditing={onSubmitEditing}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {value.length > 0 && (
          <TouchableOpacity
            onPress={onClear || (() => onChangeText(''))}
            style={styles.clearButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="X" size="xs" color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {isFilterVisible && onFilterPress && (
        <TouchableOpacity
          onPress={onFilterPress}
          style={styles.filterButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="SlidersHorizontal" size="sm" color={colors.textPrimary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 42,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
    fontSize: 14,
    color: colors.textPrimary,
    padding: 0,
  },
  clearButton: {
    padding: spacing.xxs,
  },
  filterButton: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
