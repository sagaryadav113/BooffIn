import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Clock, X, Trash2 } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';

interface RecentSearchesListProps {
  searches: string[];
  onSelectSearch: (term: string) => void;
  onRemoveSearch: (term: string) => void;
  onClearAll: () => void;
}

export const RecentSearchesList: React.FC<RecentSearchesListProps> = ({
  searches,
  onSelectSearch,
  onRemoveSearch,
  onClearAll,
}) => {
  if (searches.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>RECENT SEARCHES</Text>
        <TouchableOpacity
          onPress={onClearAll}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.clearBtn}
        >
          <Text style={styles.clearBtnText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.list}>
        {searches.map((term) => (
          <View key={term} style={styles.itemRow}>
            <TouchableOpacity
              style={styles.itemMain}
              onPress={() => onSelectSearch(term)}
              activeOpacity={0.7}
            >
              <Clock size={14} color={colors.textSecondary} />
              <Text style={styles.itemText} numberOfLines={1}>
                {term}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onRemoveSearch(term)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.removeBtn}
            >
              <X size={13} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs + 2,
  },
  headerTitle: {
    ...typography.microBold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  clearBtn: {
    paddingVertical: 2,
  },
  clearBtnText: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    fontSize: 12,
  },
  list: {
    marginTop: spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  itemMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    paddingRight: spacing.sm,
  },
  itemText: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 14,
  },
  removeBtn: {
    padding: spacing.xs,
  },
});
