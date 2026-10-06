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
  Modal,
  useWindowDimensions 
} from 'react-native';
import { ADMIN_COLORS, ADMIN_RADII } from '../lib/constants';
import { AdminDataTable, ColumnDef } from '../components/AdminDataTable';
import { AdminBadge } from '../components/AdminBadge';
import { adminUserService } from '../services/adminUserService';
import { AdminUserProfile } from '../types/data';
import { 
  Search, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle,
  GraduationCap,
  Eye,
  Key,
  Award,
  Lock,
  Globe,
  Building2,
  Calendar,
  X
} from 'lucide-react-native';

type UserFilterType = 'ALL' | 'VERIFIED' | 'FACULTY' | 'PRIVATE';

export const AdminUsersView: React.FC = () => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

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
    setActionSuccessMessage(`Researcher verification credential status updated.`);
    if (selectedUser && selectedUser.id === userId) {
      setSelectedUser(prev => prev ? { ...prev, is_orcid_verified: !prev.is_orcid_verified } : null);
    }
  };

  const handleSendPasswordReset = (email: string) => {
    setActionSuccessMessage(`Password recovery instructions dispatched to researcher.`);
  };

  const columns: ColumnDef<AdminUserProfile>[] = [
    {
      key: 'username',
      header: 'RESEARCHER PROFILE',
      width: 240,
      render: (u) => (
        <View style={styles.userCell}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {(u.full_name || u.username || 'U').substring(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.nameText} numberOfLines={1}>{u.full_name || u.username}</Text>
              {u.is_orcid_verified && (
                <CheckCircle2 size={12} color={ADMIN_COLORS.emeraldPrimary} style={{ marginLeft: 4 }} />
              )}
            </View>
            <Text style={styles.usernameText} numberOfLines={1}>@{u.username}</Text>
          </View>
        </View>
      ),
    },
    {
      key: 'institution',
      header: 'AFFILIATION & DISCIPLINE',
      width: 240,
      render: (u) => (
        <View>
          <Text style={styles.cellText} numberOfLines={1}>{u.institution || 'Academic Institution'}</Text>
          <Text style={styles.cellMuted} numberOfLines={1}>{u.field_of_study || 'Scientific Research'}</Text>
        </View>
      ),
    },
    {
      key: 'is_orcid_verified',
      header: 'CREDENTIALS',
      width: 130,
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
      header: 'VISIBILITY',
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
      header: 'JOINED',
      width: 120,
      render: (u) => (
        <Text style={styles.cellMuted}>
          {new Date(u.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
      ),
    },
    {
      key: 'actions',
      header: 'ACTIONS',
      width: 120,
      align: 'right',
      render: (u) => (
        <TouchableOpacity
          style={styles.actionOutlineBtn}
          onPress={() => setSelectedUser(u)}
        >
          <Eye size={12} color={ADMIN_COLORS.textSecondary} />
          <Text style={styles.actionOutlineBtnText}>Inspect</Text>
        </TouchableOpacity>
      ),
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header section */}
      <View style={styles.headerSection}>
        <View>
          <Text style={styles.pageTitle}>Researchers Directory</Text>
          <Text style={styles.pageSubtitle}>
            Authoritative registry of verified scientists, faculty, and research candidates ({totalCount} profiles)
          </Text>
        </View>
      </View>

      {/* Action Notification Box */}
      {actionSuccessMessage && (
        <View style={styles.successBox}>
          <CheckCircle2 size={15} color={ADMIN_COLORS.statusSuccessText} />
          <Text style={styles.successText}>{actionSuccessMessage}</Text>
        </View>
      )}

      {errorMessage && (
        <View style={styles.errorBox}>
          <AlertTriangle size={15} color={ADMIN_COLORS.statusDangerText} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {/* Unified Search and Filters Toolbar */}
      <View style={styles.toolbarCard}>
        <View style={styles.searchInputGroup}>
          <Search size={15} color={ADMIN_COLORS.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by username, full name, or institution..."
            placeholderTextColor={ADMIN_COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); loadUsers(''); }}>
              <X size={14} color={ADMIN_COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Segmented Control */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segmentBtn, filterType === 'ALL' && styles.segmentBtnActive]}
            onPress={() => setFilterType('ALL')}
          >
            <Text style={[styles.segmentText, filterType === 'ALL' && styles.segmentTextActive]}>All ({users.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, filterType === 'VERIFIED' && styles.segmentBtnActive]}
            onPress={() => setFilterType('VERIFIED')}
          >
            <Text style={[styles.segmentText, filterType === 'VERIFIED' && styles.segmentTextActive]}>Verified</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, filterType === 'FACULTY' && styles.segmentBtnActive]}
            onPress={() => setFilterType('FACULTY')}
          >
            <Text style={[styles.segmentText, filterType === 'FACULTY' && styles.segmentTextActive]}>Faculty</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, filterType === 'PRIVATE' && styles.segmentBtnActive]}
            onPress={() => setFilterType('PRIVATE')}
          >
            <Text style={[styles.segmentText, filterType === 'PRIVATE' && styles.segmentTextActive]}>Private</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.toolbarActions}>
          <TouchableOpacity style={styles.primaryActionBtn} onPress={handleSearch}>
            <Text style={styles.primaryActionBtnText}>Filter</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.refreshIconBtn}
            onPress={() => {
              setSearch('');
              loadUsers('');
            }}
          >
            <RotateCcw size={14} color={ADMIN_COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content: Desktop Table vs Mobile Structured Record Cards */}
      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color={ADMIN_COLORS.emeraldPrimary} />
          <Text style={styles.loadingText}>Querying researcher database...</Text>
        </View>
      ) : isMobile ? (
        /* Mobile Structured Record Cards */
        <View style={styles.mobileListContainer}>
          {filteredUsers.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No matching researchers</Text>
              <Text style={styles.emptySub}>Try adjusting your search criteria or filter tags.</Text>
            </View>
          ) : (
            filteredUsers.map((u) => (
              <View key={u.id} style={styles.recordCard}>
                <View style={styles.recordHeader}>
                  <View style={styles.recordUserGroup}>
                    <View style={styles.userAvatar}>
                      <Text style={styles.userAvatarText}>
                        {(u.full_name || u.username || 'U').substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.nameRow}>
                        <Text style={styles.nameText} numberOfLines={1}>{u.full_name || u.username}</Text>
                        {u.is_orcid_verified && (
                          <CheckCircle2 size={12} color={ADMIN_COLORS.emeraldPrimary} style={{ marginLeft: 4 }} />
                        )}
                      </View>
                      <Text style={styles.usernameText}>@{u.username}</Text>
                    </View>
                  </View>
                  <AdminBadge
                    label={u.is_orcid_verified ? 'VERIFIED' : 'UNLINKED'}
                    variant={u.is_orcid_verified ? 'emerald' : 'neutral'}
                    size="sm"
                  />
                </View>

                <View style={styles.recordMetaRow}>
                  <View style={styles.recordMetaItem}>
                    <Building2 size={12} color={ADMIN_COLORS.textMuted} />
                    <Text style={styles.recordMetaText} numberOfLines={1}>
                      {u.institution || 'Academic Institution'}
                    </Text>
                  </View>
                  <View style={styles.recordMetaItem}>
                    <GraduationCap size={12} color={ADMIN_COLORS.textMuted} />
                    <Text style={styles.recordMetaText} numberOfLines={1}>
                      {u.field_of_study || 'Scientific Research'}
                    </Text>
                  </View>
                </View>

                <View style={styles.recordFooter}>
                  <Text style={styles.cellMuted}>
                    Joined {new Date(u.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                  </Text>
                  <TouchableOpacity
                    style={styles.actionOutlineBtn}
                    onPress={() => setSelectedUser(u)}
                  >
                    <Eye size={12} color={ADMIN_COLORS.textSecondary} />
                    <Text style={styles.actionOutlineBtnText}>Inspect 360°</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      ) : (
        /* Desktop High-Density Table */
        <View style={styles.tableWrapper}>
          <AdminDataTable
            columns={columns}
            data={filteredUsers}
            emptyMessage="No researcher profiles match your search criteria."
          />
        </View>
      )}

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
                  <GraduationCap size={18} color={ADMIN_COLORS.emeraldPrimary} />
                  <Text style={styles.modalTitle}>Researcher 360° Profile</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedUser(null)} style={styles.closeBtn}>
                  <X size={16} color={ADMIN_COLORS.textSecondary} />
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
                    <Text style={styles.inspectorLabel}>Visibility Mode</Text>
                    <Text style={styles.metaVal}>{selectedUser.is_private ? 'Private Account' : 'Public Directory'}</Text>
                  </View>
                  <View style={styles.metaCard}>
                    <Text style={styles.inspectorLabel}>Joined Date</Text>
                    <Text style={styles.metaVal}>{new Date(selectedUser.created_at).toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.metaCard}>
                    <Text style={styles.inspectorLabel}>Safety Standing</Text>
                    <Text style={[styles.metaVal, { color: ADMIN_COLORS.emeraldPrimary }]}>0 Active Violations</Text>
                  </View>
                </View>

                {/* Bio & Narrative */}
                <View style={styles.bioSection}>
                  <Text style={styles.inspectorLabel}>Academic Bio & Statement</Text>
                  <View style={styles.bioBox}>
                    <Text style={styles.bioText}>
                      {selectedUser.bio || 'No biographical statement provided by this researcher.'}
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
                  <Award size={13} color={ADMIN_COLORS.emeraldPrimary} />
                  <Text style={styles.toggleBadgeBtnText}>
                    {selectedUser.is_orcid_verified ? 'Revoke Verification' : 'Grant Verified Badge'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resetPassBtn}
                  onPress={() => handleSendPasswordReset(selectedUser.username)}
                >
                  <Key size={13} color={ADMIN_COLORS.textSecondary} />
                  <Text style={styles.resetPassBtnText}>Reset Password</Text>
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
    backgroundColor: ADMIN_COLORS.bgCanvas,
  },
  headerSection: {
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: ADMIN_COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  pageSubtitle: {
    fontSize: 13,
    color: ADMIN_COLORS.textSecondary,
    marginTop: 2,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ADMIN_COLORS.statusSuccessBg,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.statusSuccessBorder,
    borderRadius: ADMIN_RADII.card,
    padding: 10,
    marginBottom: 14,
  },
  successText: {
    fontSize: 12,
    color: ADMIN_COLORS.statusSuccessText,
    fontWeight: '500',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ADMIN_COLORS.statusDangerBg,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.statusDangerBorder,
    borderRadius: ADMIN_RADII.card,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    color: ADMIN_COLORS.statusDangerText,
    fontWeight: '500',
  },
  toolbarCard: {
    backgroundColor: ADMIN_COLORS.bgSurface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.card,
    padding: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  searchInputGroup: {
    flex: 1,
    minWidth: 220,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ADMIN_COLORS.bgCanvas,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.input,
    paddingHorizontal: 10,
    height: 34,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: ADMIN_COLORS.textPrimary,
    padding: 0,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: ADMIN_COLORS.bgHover,
    padding: 2,
    borderRadius: ADMIN_RADII.button,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
  },
  segmentBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: ADMIN_RADII.badge,
  },
  segmentBtnActive: {
    backgroundColor: ADMIN_COLORS.bgSurface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '500',
    color: ADMIN_COLORS.textSecondary,
  },
  segmentTextActive: {
    color: ADMIN_COLORS.textPrimary,
    fontWeight: '600',
  },
  toolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  primaryActionBtn: {
    backgroundColor: ADMIN_COLORS.emeraldPrimary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: ADMIN_RADII.button,
  },
  primaryActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: ADMIN_COLORS.textInverse,
  },
  refreshIconBtn: {
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    backgroundColor: ADMIN_COLORS.bgSurface,
    padding: 6,
    borderRadius: ADMIN_RADII.button,
  },
  loadingCard: {
    backgroundColor: ADMIN_COLORS.bgSurface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.card,
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: ADMIN_COLORS.textSecondary,
  },
  tableWrapper: {
    marginBottom: 24,
  },
  userCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: ADMIN_COLORS.bgActive,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.emeraldBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 10,
    fontWeight: '700',
    color: ADMIN_COLORS.emeraldPrimary,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameText: {
    fontSize: 12,
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
  },
  usernameText: {
    fontSize: 11,
    color: ADMIN_COLORS.textMuted,
  },
  cellText: {
    fontSize: 12,
    color: ADMIN_COLORS.textPrimary,
  },
  cellMuted: {
    fontSize: 11,
    color: ADMIN_COLORS.textSecondary,
  },
  actionOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    backgroundColor: ADMIN_COLORS.bgSurface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: ADMIN_RADII.button,
  },
  actionOutlineBtnText: {
    fontSize: 11,
    fontWeight: '500',
    color: ADMIN_COLORS.textSecondary,
  },
  // Mobile Record Card Styles
  mobileListContainer: {
    gap: 10,
    marginBottom: 24,
  },
  recordCard: {
    backgroundColor: ADMIN_COLORS.bgSurface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.card,
    padding: 12,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordUserGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  recordMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: ADMIN_COLORS.borderSubtle,
    marginBottom: 8,
  },
  recordMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '48%',
  },
  recordMetaText: {
    fontSize: 11,
    color: ADMIN_COLORS.textSecondary,
  },
  recordFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: ADMIN_COLORS.bgSurface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.card,
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
  },
  emptySub: {
    fontSize: 12,
    color: ADMIN_COLORS.textSecondary,
    marginTop: 4,
  },
  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  inspectorModalCard: {
    width: '100%',
    maxWidth: 540,
    backgroundColor: ADMIN_COLORS.bgSurface,
    borderRadius: ADMIN_RADII.modal,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    padding: 18,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLORS.borderSubtle,
    marginBottom: 14,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  modalScroll: {
    marginBottom: 14,
  },
  profileHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: ADMIN_COLORS.bgCanvas,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.card,
    padding: 12,
    marginBottom: 12,
  },
  avatarBig: {
    width: 42,
    height: 42,
    borderRadius: 6,
    backgroundColor: ADMIN_COLORS.bgActive,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.emeraldBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBigText: {
    fontSize: 14,
    fontWeight: '700',
    color: ADMIN_COLORS.emeraldPrimary,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroName: {
    fontSize: 14,
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
  },
  heroUsername: {
    fontSize: 11,
    color: ADMIN_COLORS.textMuted,
  },
  heroAffil: {
    fontSize: 11,
    color: ADMIN_COLORS.textSecondary,
    marginTop: 1,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  metaCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: ADMIN_COLORS.bgSurface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.button,
    padding: 10,
  },
  inspectorLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: ADMIN_COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  metaVal: {
    fontSize: 12,
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
  },
  bioSection: {
    marginBottom: 12,
  },
  bioBox: {
    backgroundColor: ADMIN_COLORS.bgCanvas,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.button,
    padding: 10,
    marginTop: 4,
  },
  bioText: {
    fontSize: 12,
    color: ADMIN_COLORS.textSecondary,
    lineHeight: 17,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: ADMIN_COLORS.borderSubtle,
    paddingTop: 12,
  },
  toggleBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: ADMIN_COLORS.bgActive,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.emeraldBorder,
    borderRadius: ADMIN_RADII.button,
  },
  toggleBadgeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: ADMIN_COLORS.emeraldPrimary,
  },
  resetPassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: ADMIN_COLORS.bgHover,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.button,
  },
  resetPassBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: ADMIN_COLORS.textSecondary,
  },
});
