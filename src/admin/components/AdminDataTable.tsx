// ============================================================================
// BOOFFIN ADMIN PORTAL — HIGH-DENSITY DATA TABLE (LIGHT SAAS THEME)
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
    borderColor: '#E2E8F0',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
  },
  table: {
    minWidth: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerCell: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  bodyRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  alternateRow: {
    backgroundColor: '#FAFAFA',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  bodyCell: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '500',
  },
  emptyContainer: {
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'normal',
    fontWeight: '500',
  },
});
