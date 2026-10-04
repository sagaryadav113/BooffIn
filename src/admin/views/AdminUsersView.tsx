// ============================================================================
// BOOFFIN ADMIN PORTAL — USERS DIRECTORY VIEW (LIGHT SAAS METIS STYLE)
// ============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { ADMIN_COLORS } from '../lib/constants';
import { AdminDataTable, ColumnDef } from '../components/AdminDataTable';
import { AdminBadge } from '../components/AdminBadge';
import { adminUserService } from '../services/adminUserService';
import { AdminUserProfile } from '../types/data';
import { Search, RotateCcw, UserCheck, Shield, Lock, Award, Mail } from 'lucide-react-native';

export const AdminUsersView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadUsers = useCallback(async (query?: string) => {
    setLoading(true);
    setErrorMessage(null);

    const res = await adminUserService.listUsers({ search: query, limit: 50 });
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
    {
      key: 'username',
      header: 'Researcher Profile',
      width: 220,
      render: (u) => (
        <View style={styles.userCell}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {(u.full_name || u.username || 'U').substring(0, 2).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.nameText}>{u.full_name || u.username}</Text>
            <Text style={styles.usernameText}>@{u.username}</Text>
          </View>
        </View>
      ),
    },
    {
      key: 'institution',
      header: 'Institution',
      width: 180,
      render: (u) => <Text style={styles.cellText}>{u.institution || '—'}</Text>,
    },
    {
      key: 'field_of_study',
      header: 'Field of Study',
      width: 180,
      render: (u) => <Text style={styles.cellText}>{u.field_of_study || '—'}</Text>,
    },
    {
      key: 'is_orcid_verified',
      header: 'ORCID Verified',
      width: 140,
      render: (u) => (
        <AdminBadge
          label={u.is_orcid_verified ? 'VERIFIED' : 'UNLINKED'}
          variant={u.is_orcid_verified ? 'emerald' : 'neutral'}
          size="sm"
        />
      ),
    },
    {
      key: 'is_private',
      header: 'Privacy',
      width: 110,
      render: (u) => (
        <AdminBadge
          label={u.is_private ? 'PRIVATE' : 'PUBLIC'}
          variant={u.is_private ? 'warning' : 'info'}
          size="sm"
        />
      ),
    },
    {
      key: 'created_at',
      header: 'Registered At',
      width: 130,
      render: (u) => (
        <Text style={styles.cellMuted}>
          {new Date(u.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
      ),
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header section */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.pageTitle}>Researchers Directory</Text>
          <Text style={styles.pageSubtitle}>Authoritative profiles from public.profiles ({totalCount} total)</Text>
        </View>
      </View>

      {/* Search and Filters Bar */}
      <View style={styles.searchCard}>
        <View style={styles.searchInputGroup}>
          <Search size={16} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search researchers by username or full name..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
          />
        </View>

        <View style={styles.buttonGroup}>
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() => {
              setSearch('');
              loadUsers('');
            }}
          >
            <RotateCcw size={14} color="#475569" />
            <Text style={styles.resetBtnText}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>

      {errorMessage ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {/* Table Section */}
      <View style={styles.tableCard}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#059669" />
          </View>
        ) : (
          <AdminDataTable
            columns={columns}
            data={users}
            emptyMessage="No researcher profiles match your search."
          />
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerRow: {
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  searchCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
  },
  searchInputGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    padding: 0,
    outlineStyle: 'none' as any,
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  searchBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
  },
  centerContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DEF7EC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BCF0DA',
  },
  userAvatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#03543F',
  },
  nameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  usernameText: {
    fontSize: 11,
    color: '#64748B',
  },
  cellText: {
    fontSize: 13,
    color: '#334155',
  },
  cellMuted: {
    fontSize: 12,
    color: '#64748B',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 12,
    color: '#991B1B',
    fontWeight: '500',
  },
});
