// ============================================================================
// BOOFFIN ADMIN PORTAL — USERS DIRECTORY VIEW (STAGE 2)
// ============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { ADMIN_COLORS } from '../lib/constants';
import { AdminDataTable, ColumnDef } from '../components/AdminDataTable';
import { AdminBadge } from '../components/AdminBadge';
import { adminUserService } from '../services/adminUserService';
import { AdminUserProfile } from '../types/data';

export const AdminUsersView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadUsers = useCallback(async (query?: string) => {
    setLoading(true);
    setErrorMessage(null);

    const res = await adminUserService.listUsers({ search: query, limit: 25 });
    if (res.error) {
      setErrorMessage(`Authorization / Query Error: ${res.error.message}`);
      setUsers([]);
      setTotalCount(0);
    } else {
      setUsers(res.users);
      setTotalCount(res.count);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearch = () => {
    loadUsers(search.trim());
  };

  const columns: ColumnDef<AdminUserProfile>[] = [
    { key: 'username', header: 'User', width: 180, render: (u) => (
      <View>
        <Text style={styles.usernameText}>@{u.username}</Text>
        <Text style={styles.nameText}>{u.display_name || 'No Name'}</Text>
      </View>
    )},
    { key: 'institution', header: 'Institution', width: 160, render: (u) => (
      <Text style={styles.cellText}>{u.institution || '—'}</Text>
    )},
    { key: 'field_of_study', header: 'Field of Study', width: 160, render: (u) => (
      <Text style={styles.cellText}>{u.field_of_study || '—'}</Text>
    )},
    { key: 'is_orcid_verified', header: 'ORCID Verified', width: 130, render: (u) => (
      <AdminBadge
        label={u.is_orcid_verified ? 'VERIFIED' : 'UNLINKED'}
        variant={u.is_orcid_verified ? 'emerald' : 'neutral'}
        size="sm"
      />
    )},
    { key: 'is_private', header: 'Privacy', width: 100, render: (u) => (
      <AdminBadge
        label={u.is_private ? 'PRIVATE' : 'PUBLIC'}
        variant={u.is_private ? 'warning' : 'info'}
        size="sm"
      />
    )},
    { key: 'created_at', header: 'Registered', width: 120, render: (u) => (
      <Text style={styles.cellMuted}>{new Date(u.created_at).toLocaleDateString()}</Text>
    )},
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Search and Filters */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username or display name..."
          placeholderTextColor={ADMIN_COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.resetBtn} onPress={() => { setSearch(''); loadUsers(''); }}>
          <Text style={styles.resetBtnText}>Reset</Text>
        </TouchableOpacity>
      </View>

      {errorMessage ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {/* Summary Header */}
      <View style={styles.headerInfo}>
        <Text style={styles.headerTitle}>Platform Users ({totalCount})</Text>
        <Text style={styles.headerSubtitle}>Authoritative data from public.profiles</Text>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={ADMIN_COLORS.emeraldPrimary} />
        </View>
      ) : (
        <AdminDataTable columns={columns} data={users} emptyMessage={errorMessage ? 'Data inaccessible due to authorization error.' : 'No matching users found in database.'} />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    backgroundColor: ADMIN_COLORS.bgCard,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.borderSubtle,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: ADMIN_COLORS.textPrimary,
    fontSize: 13,
  },
  searchBtn: {
    backgroundColor: ADMIN_COLORS.emeraldPrimary,
    paddingHorizontal: 18,
    borderRadius: 6,
    justifyContent: 'center',
  },
  searchBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  resetBtn: {
    backgroundColor: ADMIN_COLORS.bgHover,
    borderColor: ADMIN_COLORS.borderStrong,
    borderWidth: 1,
    paddingHorizontal: 14,
    borderRadius: 6,
    justifyContent: 'center',
  },
  resetBtnText: {
    color: ADMIN_COLORS.textSecondary,
    fontSize: 12,
  },
  errorBox: {
    backgroundColor: ADMIN_COLORS.dangerBg,
    borderColor: ADMIN_COLORS.dangerBorder,
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
  },
  errorText: {
    color: ADMIN_COLORS.danger,
    fontSize: 12,
  },
  headerInfo: {
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: ADMIN_COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: ADMIN_COLORS.textMuted,
    marginTop: 2,
  },
  usernameText: {
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
    fontSize: 13,
  },
  nameText: {
    color: ADMIN_COLORS.textSecondary,
    fontSize: 12,
  },
  cellText: {
    color: ADMIN_COLORS.textPrimary,
    fontSize: 13,
  },
  cellMuted: {
    color: ADMIN_COLORS.textMuted,
    fontSize: 12,
  },
  loader: {
    padding: 40,
    alignItems: 'center',
  },
});
