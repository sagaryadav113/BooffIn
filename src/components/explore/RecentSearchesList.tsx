import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Clock, X } from 'lucide-react-native';
import { radii, spacing, typography, useColors, useIsDark } from '../../theme';

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
  const colors = useColors();
  const isDark = useIsDark();

  if (searches.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: colors.textSecondary }]}>
          RECENT SEARCHES
        </Text>
        <TouchableOpacity
          onPress={onClearAll}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.clearBtn}
        >
          <Text
            style={[
              styles.clearBtnText,
              { color: isDark ? colors.brandGreen : colors.textSecondary },
            ]}
          >
            Clear All
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.list}>
        {searches.map((term) => (
          <View
            key={term}
            style={[
              styles.itemRow,
              { borderBottomColor: isDark ? colors.border : colors.borderLight },
            ]}
          >
            <TouchableOpacity
              style={styles.itemMain}
              onPress={() => onSelectSearch(term)}
              activeOpacity={0.7}
            >
              <Clock
                size={15}
                color={isDark ? colors.textSecondary : colors.textMuted}
              />
              <Text
                style={[styles.itemText, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {term}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onRemoveSearch(term)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.removeBtn}
              accessibilityLabel={`Remove ${term} from search history`}
            >
              <X
                size={14}
                color={isDark ? colors.textSecondary : colors.textMuted}
              />
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
    letterSpacing: 0.5,
  },
  clearBtn: {
    paddingVertical: 2,
  },
  clearBtnText: {
    ...typography.captionMedium,
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
    fontSize: 14,
    fontWeight: '500',
  },
  removeBtn: {
    padding: spacing.xs,
  },
});

