// ============================================================================
// BOOFFIN ADMIN PORTAL — HIGH-DENSITY DATA TABLE COMPONENT
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { ADMIN_COLORS } from '../lib/constants';

export interface ColumnDef<T> {
  key: string;
  header: string;
  width?: number | string;
  render?: (item: T) => React.ReactNode;
}

interface AdminDataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  emptyMessage?: string;
}

export function AdminDataTable<T extends Record<string, any>>({
  columns,
  data,
  emptyMessage = 'No records found.',
}: AdminDataTableProps<T>) {
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.headerRow}>
            {columns.map((col) => (
              <View
                key={col.key}
                style={[
                  styles.headerCell,
                  typeof col.width === 'number' ? { width: col.width } : { flex: 1, minWidth: 120 },
                ]}
              >
                <Text style={styles.headerText}>{col.header}</Text>
              </View>
            ))}
          </View>

          {/* Table Body */}
          {data.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{emptyMessage}</Text>
            </View>
          ) : (
            data.map((item, rowIndex) => (
              <View
                key={item.id ?? rowIndex}
                style={[
                  styles.bodyRow,
                  rowIndex % 2 === 1 && styles.alternateRow,
                ]}
              >
                {columns.map((col) => (
                  <View
                    key={col.key}
                    style={[
                      styles.bodyCell,
                      typeof col.width === 'number' ? { width: col.width } : { flex: 1, minWidth: 120 },
                    ]}
                  >
                    {col.render ? (
                      col.render(item)
                    ) : (
                      <Text style={styles.cellText} numberOfLines={1}>
                        {String(item[col.key] ?? '—')}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: ADMIN_COLORS.bgCard,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.borderSubtle,
    borderRadius: 8,
    overflow: 'hidden',
  },
  table: {
    minWidth: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: ADMIN_COLORS.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLORS.borderSubtle,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  headerCell: {
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 11,
    fontWeight: '700',
    color: ADMIN_COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bodyRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLORS.borderSubtle,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  alternateRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
  },
  bodyCell: {
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 13,
    color: ADMIN_COLORS.textPrimary,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: ADMIN_COLORS.textMuted,
  },
});
