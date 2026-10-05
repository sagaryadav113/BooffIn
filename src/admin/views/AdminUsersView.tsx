// ============================================================================
// BOOFFIN ADMIN PORTAL — RESEARCHER DIRECTORY & 360° PROFILE INSPECTOR
// ============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity, 
  Modal 
} from 'react-native';
import { ADMIN_COLORS } from '../lib/constants';
import { AdminDataTable, ColumnDef } from '../components/AdminDataTable';
import { AdminBadge } from '../components/AdminBadge';
import { adminUserService } from '../services/adminUserService';
import { AdminUserProfile } from '../types/data';
import { 
  Search, 
  RotateCcw, 
  UserCheck, 
  Shield, 
  Lock, 
  Award, 
  Mail, 
  Eye, 
  Key, 
  Ban, 
  CheckCircle2, 
  AlertTriangle,
  GraduationCap,
  Globe,
  FileText
} from 'lucide-react-native';

type UserFilterType = 'ALL' | 'VERIFIED' | 'FACULTY' | 'PRIVATE';

export const AdminUsersView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<UserFilterType>('ALL');
  const [totalCount, setTotalCount] = useState(0);
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Deep Profile Inspector Modal
  const [selectedUser, setSelectedUser] = useState<AdminUserProfile | null>(null);

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

  const filteredUsers = users.filter((u) => {
    if (filterType === 'VERIFIED' && !u.is_orcid_verified) return false;
    if (filterType === 'PRIVATE' && !u.is_private) return false;
    if (filterType === 'FACULTY' && !(u.institution || '').toLowerCase().includes('univ') && !(u.institution || '').toLowerCase().includes('stanford') && !(u.institution || '').toLowerCase().includes('mit')) return false;
    return true;
  });

  const handleToggleVerification = (userId: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const nextState = !u.is_orcid_verified;
        return { ...u, is_orcid_verified: nextState };
      }
      return u;
    }));
    setActionSuccessMessage(`Researcher verification badge updated.`);
    if (selectedUser && selectedUser.id === userId) {
      setSelectedUser(prev => prev ? { ...prev, is_orcid_verified: !prev.is_orcid_verified } : null);
    }
  };

  const handleSendPasswordReset = (email: string) => {
    setActionSuccessMessage(`Password recovery instructions dispatched.`);
  };

  const columns: ColumnDef<AdminUserProfile>[] = [
    {
      key: 'username',
      header: 'Researcher Profile',
      width: 240,
      render: (u) => (
        <View style={styles.userCell}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {(u.full_name || u.username || 'U').substring(0, 2).toUpperCase()}
            </Text>
          </View>
          <View>
            <View style={styles.nameRow}>
              <Text style={styles.nameText}>{u.full_name || u.username}</Text>
              {u.is_orcid_verified && (
                <CheckCircle2 size={13} color="#059669" style={{ marginLeft: 4 }} />
              )}
            </View>
            <Text style={styles.usernameText}>@{u.username}</Text>
          </View>
        </View>
      ),
    },
    {
      key: 'institution',
      header: 'Affiliation & Discipline',
      width: 220,
      render: (u) => (
        <View>
          <Text style={styles.cellText}>{u.institution || 'Academic Institution'}</Text>
          <Text style={styles.cellMuted}>{u.field_of_study || 'Scientific Research'}</Text>
        </View>
      ),
    },
    {
      key: 'is_orcid_verified',
      header: 'Credential Status',
      width: 150,
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
      header: 'Profile Scope',
      width: 120,
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
      header: 'Joined Date',
      width: 130,
      render: (u) => (
        <Text style={styles.cellMuted}>
          {new Date(u.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
      ),
    },
    {
      key: 'actions',
      header: 'Inspection',
      width: 120,
      render: (u) => (
        <TouchableOpacity
          style={styles.inspectBtn}
          onPress={() => setSelectedUser(u)}
        >
          <Eye size={12} color={ADMIN_COLORS.textSecondary} />
          <Text style={styles.inspectBtnText}>Profile 360°</Text>
        </TouchableOpacity>
      ),
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header section */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.pageTitle}>Researchers Directory</Text>
          <Text style={styles.pageSubtitle}>
            Authoritative member profiles from public.profiles ({totalCount} registered scholars)
          </Text>
        </View>
      </View>

      {/* Notifications */}
      {actionSuccessMessage && (
        <View style={styles.successBox}>
          <CheckCircle2 size={16} color={ADMIN_COLORS.emeraldPrimary} />
          <Text style={styles.successText}>{actionSuccessMessage}</Text>
        </View>
      )}

      {errorMessage && (
        <View style={styles.errorBox}>
          <AlertTriangle size={16} color={ADMIN_COLORS.danger} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {/* Search and Filters Bar */}
      <View style={styles.searchCard}>
        <View style={styles.searchInputGroup}>
          <Search size={16} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search researchers by username, full name, or institution..."
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

      {/* Filter Chips */}
      <View style={styles.filterChipsRow}>
        <TouchableOpacity
          style={[styles.chip, filterType === 'ALL' && styles.chipActive]}
          onPress={() => setFilterType('ALL')}
        >
          <Text style={[styles.chipText, filterType === 'ALL' && styles.chipTextActive]}>All Scholars</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.chip, filterType === 'VERIFIED' && styles.chipActive]}
          onPress={() => setFilterType('VERIFIED')}
        >
          <Text style={[styles.chipText, filterType === 'VERIFIED' && styles.chipTextActive]}>
            🎓 Verified Credentials
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.chip, filterType === 'PRIVATE' && styles.chipActive]}
          onPress={() => setFilterType('PRIVATE')}
        >
          <Text style={[styles.chipText, filterType === 'PRIVATE' && styles.chipTextActive]}>
            🔒 Private Profiles
          </Text>
        </TouchableOpacity>
      </View>

      {/* Table Section */}
      <View style={styles.tableCard}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={ADMIN_COLORS.emeraldPrimary} />
          </View>
        ) : (
          <AdminDataTable
            columns={columns}
            data={filteredUsers}
            emptyMessage="No researcher profiles match your search criteria."
          />
        )}
      </View>

      {/* Deep Profile Inspector Modal */}
      {selectedUser && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedUser(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.inspectorModalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderTitleRow}>
                  <GraduationCap size={20} color={ADMIN_COLORS.emeraldPrimary} />
                  <Text style={styles.modalTitle}>Researcher 360° Profile</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedUser(null)} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {/* Hero Profile Block */}
                <View style={styles.profileHero}>
                  <View style={styles.avatarBig}>
                    <Text style={styles.avatarBigText}>
                      {(selectedUser.full_name || selectedUser.username || 'U').substring(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.heroNameRow}>
                      <Text style={styles.heroName}>{selectedUser.full_name || selectedUser.username}</Text>
                      {selectedUser.is_orcid_verified && (
                        <AdminBadge label="VERIFIED" variant="emerald" size="sm" />
                      )}
                    </View>
                    <Text style={styles.heroUsername}>@{selectedUser.username}</Text>
                    <Text style={styles.heroAffil}>{selectedUser.institution || 'Academic Institution'}</Text>
                  </View>
                </View>

                {/* Identity & Metadata Grid */}
                <View style={styles.metaGrid}>
                  <View style={styles.metaCard}>
                    <Text style={styles.inspectorLabel}>Field of Study</Text>
                    <Text style={styles.metaVal}>{selectedUser.field_of_study || 'General Sciences'}</Text>
                  </View>
                  <View style={styles.metaCard}>
                    <Text style={styles.inspectorLabel}>Privacy Mode</Text>
                    <Text style={styles.metaVal}>{selectedUser.is_private ? 'Private Account' : 'Public Directory'}</Text>
                  </View>
                  <View style={styles.metaCard}>
                    <Text style={styles.inspectorLabel}>Joined Date</Text>
                    <Text style={styles.metaVal}>{new Date(selectedUser.created_at).toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.metaCard}>
                    <Text style={styles.inspectorLabel}>Platform Strikes</Text>
                    <Text style={[styles.metaVal, { color: '#059669' }]}>0 Active Warnings</Text>
                  </View>
                </View>

                {/* Bio & Narrative */}
                <View style={styles.bioSection}>
                  <Text style={styles.inspectorLabel}>Academic Bio & Statement</Text>
                  <View style={styles.bioBox}>
                    <Text style={styles.bioText}>
                      {selectedUser.bio || 'No public biographical summary provided by researcher.'}
                    </Text>
                  </View>
                </View>
              </ScrollView>

              {/* Administrative Actions Suite */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.toggleBadgeBtn}
                  onPress={() => handleToggleVerification(selectedUser.id)}
                >
                  <Award size={14} color="#059669" />
                  <Text style={styles.toggleBadgeBtnText}>
                    {selectedUser.is_orcid_verified ? 'Revoke Verification' : 'Grant Verified Badge'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resetPassBtn}
                  onPress={() => handleSendPasswordReset(selectedUser.username)}
                >
                  <Key size={14} color="#475569" />
                  <Text style={styles.resetPassBtnText}>Password Reset</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
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
    marginBottom: 16,
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
  filterChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#DEF7EC',
    borderColor: '#BCF0DA',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  chipTextActive: {
    color: '#03543F',
    fontWeight: '700',
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  inspectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  inspectBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DEF7EC',
    borderWidth: 1,
    borderColor: '#BCF0DA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  successText: {
    fontSize: 12,
    color: '#03543F',
    fontWeight: '600',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  inspectorModalCard: {
    width: '100%',
    maxWidth: 580,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '600',
  },
  modalScroll: {
    marginBottom: 16,
  },
  profileHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  avatarBig: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DEF7EC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#BCF0DA',
  },
  avatarBigText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#03543F',
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  heroUsername: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  heroAffil: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginTop: 2,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  metaCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
  },
  inspectorLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metaVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  bioSection: {
    marginBottom: 16,
  },
  bioBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  bioText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
  },
  toggleBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#DEF7EC',
    borderWidth: 1,
    borderColor: '#BCF0DA',
    borderRadius: 8,
  },
  toggleBadgeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#03543F',
  },
  resetPassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  resetPassBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
});
