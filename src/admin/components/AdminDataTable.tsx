// ============================================================================
// BOOFFIN ADMIN PORTAL — ENTERPRISE DATA TABLE
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { ADMIN_COLORS, ADMIN_RADII } from '../lib/constants';

export interface ColumnDef<T> {
  key: string;
  header: string;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
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
          {/* Table Header (Sleek 36px height) */}
          <View style={styles.headerRow}>
            {columns.map((col) => (
              <View
                key={col.key}
                style={[
                  styles.headerCell,
                  typeof col.width === 'number' ? { width: col.width } : { flex: 1, minWidth: 120 },
                  col.align === 'right' ? { alignItems: 'flex-end' } : col.align === 'center' ? { alignItems: 'center' } : { alignItems: 'flex-start' },
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
                  rowIndex === data.length - 1 && styles.lastRow,
                  rowIndex % 2 === 1 && styles.alternateRow,
                ]}
              >
                {columns.map((col) => (
                  <View
                    key={col.key}
                    style={[
                      styles.bodyCell,
                      typeof col.width === 'number' ? { width: col.width } : { flex: 1, minWidth: 120 },
                      col.align === 'right' ? { alignItems: 'flex-end' } : col.align === 'center' ? { alignItems: 'center' } : { alignItems: 'flex-start' },
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.card,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
  },
  table: {
    minWidth: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLORS.border,
    height: 36,
  },
  headerCell: {
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 11,
    fontWeight: '600',
    color: ADMIN_COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  bodyRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLORS.borderSubtle,
    minHeight: 48,
  },
  alternateRow: {
    backgroundColor: '#FAFAFA',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  bodyCell: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 12.5,
    color: ADMIN_COLORS.textPrimary,
    fontWeight: '500',
  },
  emptyContainer: {
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 12.5,
    color: ADMIN_COLORS.textMuted,
    fontWeight: '500',
  },
});

