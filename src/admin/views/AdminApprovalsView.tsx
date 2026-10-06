// ============================================================================
// BOOFFIN ADMIN PORTAL — ACADEMIC VERIFICATION & APPROVALS WORKBENCH
// ============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity, 
  Modal, 
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { ADMIN_COLORS, ADMIN_RADII } from '../lib/constants';
import { AdminDataTable, ColumnDef } from '../components/AdminDataTable';
import { AdminBadge } from '../components/AdminBadge';
import { adminApprovalService } from '../services/adminApprovalService';
import { adminUserService } from '../services/adminUserService';
import { AdminApprovalRequest } from '../types/approvals';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { 
  GraduationCap, 
  Building2, 
  Award, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Eye, 
  FileText, 
  Search, 
  Check, 
  AlertTriangle,
  Lock,
  X
} from 'lucide-react-native';

interface AcademicApplicant {
  id: string;
  fullName: string;
  username: string;
  email: string;
  institution: string;
  department: string;
  requestedTier: 'RESEARCHER' | 'PI_FACULTY' | 'LAB_INSTITUTION';
  orcidId?: string;
  googleScholarUrl?: string;
  submittedAt: string;
  isDomainVerified: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  userId?: string;
}

export const AdminApprovalsView: React.FC = () => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const { userId } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<'VERIFICATIONS' | 'DUAL_ADMIN'>('VERIFICATIONS');
  const [loading, setLoading] = useState(true);
  
  // Dual-Admin requests
  const [dualRequests, setDualRequests] = useState<AdminApprovalRequest[]>([]);
  
  // Academic Applicants queue
  const [applicants, setApplicants] = useState<AcademicApplicant[]>([]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Inspector & Review Modal
  const [selectedApplicant, setSelectedApplicant] = useState<AcademicApplicant | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  // Manual User Search / Grant Badge
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    // 1. Fetch dual-approval requests
    const res = await adminApprovalService.listApprovalRequests({ limit: 50 });
    if (res.error) {
      setErrorMessage(`Authorization / Query Error: ${res.error.message}`);
      setDualRequests([]);
    } else {
      setDualRequests(res.requests);
    }

    // 2. Fetch real verification requests
    const verifRes = await adminApprovalService.listVerificationRequests();
    if (verifRes.requests && verifRes.requests.length > 0) {
      const mapped: AcademicApplicant[] = verifRes.requests.map((r: any) => ({
        id: r.id,
        fullName: r.target_id || 'Researcher',
        username: r.requested_by?.substring(0, 8) || 'user',
        email: r.reason?.includes('@') ? r.reason : 'verified@domain.edu',
        institution: 'Academic Institution',
        department: 'Faculty of Science',
        requestedTier: 'RESEARCHER',
        orcidId: r.metadata?.orcid || undefined,
        submittedAt: r.created_at,
        isDomainVerified: true,
        status: r.status === 'PENDING' ? 'PENDING' : r.status === 'APPROVED' ? 'APPROVED' : 'REJECTED',
        userId: r.target_id,
      }));
      setApplicants(mapped);
    } else {
      setApplicants([]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchingUsers(true);
    const res = await adminUserService.listUsers({ search: searchQuery.trim(), limit: 10 });
    setSearchResults(res.users || []);
    setSearchingUsers(false);
  };

  const handleGrantBadge = async (targetUser: any, badgeType: string = 'RESEARCHER') => {
    setActionSuccessMessage(null);
    setErrorMessage(null);
    const res = await adminApprovalService.updateProfileVerificationBadge(targetUser.id, true, badgeType);
    if (res.error) {
      setErrorMessage(`Badge Issuance Error: ${res.error.message}`);
    } else {
      setActionSuccessMessage(`Verified ${badgeType} badge successfully granted to @${targetUser.username}.`);
      handleSearchUsers();
    }
  };

  const handleRevokeBadge = async (targetUser: any) => {
    setActionSuccessMessage(null);
    setErrorMessage(null);
    const res = await adminApprovalService.updateProfileVerificationBadge(targetUser.id, false);
    if (res.error) {
      setErrorMessage(`Error: ${res.error.message}`);
    } else {
      setActionSuccessMessage(`Verification badge revoked from @${targetUser.username}.`);
      handleSearchUsers();
    }
  };

  const handleApproveApplicant = async (applicantId: string) => {
    const app = applicants.find(a => a.id === applicantId);
    if (app && app.userId) {
      await adminApprovalService.updateProfileVerificationBadge(app.userId, true, app.requestedTier);
    }
    setApplicants(prev => prev.map(a => a.id === applicantId ? { ...a, status: 'APPROVED' } : a));
    setActionSuccessMessage(`Academic verification approved. Verified badge granted.`);
    setSelectedApplicant(null);
  };

  const handleRejectApplicant = async () => {
    if (!selectedApplicant) return;
    setApplicants(prev => prev.map(a => a.id === selectedApplicant.id ? { ...a, status: 'REJECTED' } : a));
    setActionSuccessMessage(`Verification request rejected with feedback note.`);
    setIsRejectModalOpen(false);
    setSelectedApplicant(null);
    setRejectionReason('');
  };

  const handleDualDecision = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    setActionSuccessMessage(null);
    setErrorMessage(null);

    const res = status === 'APPROVED' 
      ? await adminApprovalService.approveRequest(requestId)
      : await adminApprovalService.rejectRequest(requestId, 'Super Admin decision marked as REJECTED');

    if (res.error) {
      setErrorMessage(`Dual Approval Engine: ${res.error.message}`);
    } else {
      setActionSuccessMessage(`Critical operation request updated to ${status}.`);
      loadData();
    }
  };

  // Academic applicant columns
  const applicantColumns: ColumnDef<AcademicApplicant>[] = [
    {
      key: 'fullName',
      header: 'RESEARCHER PROFILE',
      width: 200,
      render: (a) => (
        <View style={styles.applicantCell}>
          <View style={styles.avatarPill}>
            <Text style={styles.avatarText}>{a.fullName.substring(0, 2).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.boldText} numberOfLines={1}>{a.fullName}</Text>
            <Text style={styles.usernameText} numberOfLines={1}>@{a.username}</Text>
          </View>
        </View>
      ),
    },
    {
      key: 'institution',
      header: 'AFFILIATION & DOMAIN',
      width: 240,
      render: (a) => (
        <View>
          <Text style={styles.cellText} numberOfLines={1}>{a.institution}</Text>
          <Text style={styles.cellMuted} numberOfLines={1}>{a.email}</Text>
        </View>
      ),
    },
    {
      key: 'requestedTier',
      header: 'BADGE TIER',
      width: 140,
      render: (a) => (
        <AdminBadge
          label={
            a.requestedTier === 'PI_FACULTY' 
              ? 'PI / FACULTY' 
              : a.requestedTier === 'LAB_INSTITUTION' 
              ? 'LAB / INST.' 
              : 'RESEARCHER'
          }
          variant="emerald"
          size="sm"
        />
      ),
    },
    {
      key: 'status',
      header: 'STATUS',
      width: 110,
      render: (a) => (
        <AdminBadge
          label={a.status}
          variant={a.status === 'PENDING' ? 'warning' : a.status === 'APPROVED' ? 'emerald' : 'danger'}
          size="sm"
        />
      ),
    },
    {
      key: 'submittedAt',
      header: 'SUBMITTED',
      width: 110,
      render: (a) => (
        <Text style={styles.cellMuted}>
          {new Date(a.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </Text>
      ),
    },
    {
      key: 'actions',
      header: 'DECISION',
      width: 180,
      align: 'right',
      render: (a) => (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionOutlineBtn}
            onPress={() => setSelectedApplicant(a)}
          >
            <Eye size={11} color={ADMIN_COLORS.textSecondary} />
            <Text style={styles.actionOutlineBtnText}>Inspect</Text>
          </TouchableOpacity>

          {a.status === 'PENDING' && (
            <>
              <TouchableOpacity
                style={styles.actionEmeraldBtn}
                onPress={() => handleApproveApplicant(a.id)}
              >
                <Check size={11} color={ADMIN_COLORS.emeraldPrimary} />
                <Text style={styles.actionEmeraldBtnText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionDangerBtn}
                onPress={() => {
                  setSelectedApplicant(a);
                  setIsRejectModalOpen(true);
                }}
              >
                <XCircle size={11} color={ADMIN_COLORS.statusDangerText} />
                <Text style={styles.actionDangerBtnText}>Reject</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ),
    },
  ];

  // Dual Approval columns
  const dualColumns: ColumnDef<AdminApprovalRequest>[] = [
    {
      key: 'action_type',
      header: 'OPERATION TYPE',
      width: 180,
      render: (r) => (
        <View style={styles.applicantCell}>
          <Lock size={13} color={ADMIN_COLORS.statusWarningText} />
          <Text style={styles.boldText}>{r.action_type}</Text>
        </View>
      ),
    },
    {
      key: 'reason',
      header: 'JUSTIFICATION & TARGET',
      width: 260,
      render: (r) => (
        <View>
          <Text style={styles.cellText} numberOfLines={2}>{r.reason || 'Critical administrative operation'}</Text>
          <Text style={styles.cellMuted}>Target ID: {r.target_id.slice(0, 8)}</Text>
        </View>
      ),
    },
    {
      key: 'status',
      header: 'STATUS',
      width: 120,
      render: (r) => (
        <AdminBadge
          label={r.status}
          variant={r.status === 'PENDING' ? 'warning' : r.status === 'APPROVED' ? 'emerald' : 'danger'}
          size="sm"
        />
      ),
    },
    {
      key: 'actions',
      header: 'ACTION',
      width: 160,
      align: 'right',
      render: (r) => (
        r.status === 'PENDING' ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionEmeraldBtn}
              onPress={() => handleDualDecision(r.id, 'APPROVED')}
            >
              <Check size={11} color={ADMIN_COLORS.emeraldPrimary} />
              <Text style={styles.actionEmeraldBtnText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionDangerBtn}
              onPress={() => handleDualDecision(r.id, 'REJECTED')}
            >
              <XCircle size={11} color={ADMIN_COLORS.statusDangerText} />
              <Text style={styles.actionDangerBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.cellMuted}>Decided</Text>
        )
      ),
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerSection}>
        <View>
          <Text style={styles.pageTitle}>Approvals & Verification</Text>
          <Text style={styles.pageSubtitle}>
            Review scholar credentials, academic badges, and multi-signature authorization queues
          </Text>
        </View>
      </View>

      {/* Notifications */}
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

      {/* Segmented Tab Navigation */}
      <View style={styles.toolbarCard}>
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'VERIFICATIONS' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('VERIFICATIONS')}
          >
            <Text style={[styles.segmentText, activeTab === 'VERIFICATIONS' && styles.segmentTextActive]}>
              Academic Verifications ({applicants.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'DUAL_ADMIN' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('DUAL_ADMIN')}
          >
            <Text style={[styles.segmentText, activeTab === 'DUAL_ADMIN' && styles.segmentTextActive]}>
              Dual-Admin Operations ({dualRequests.length})
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.refreshIconBtn} onPress={loadData}>
          <RefreshCw size={13} color={ADMIN_COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Direct User Badge Granting Search Card (When on Verifications Tab) */}
      {activeTab === 'VERIFICATIONS' && (
        <View style={styles.searchGrantCard}>
          <Text style={styles.sectionHeaderTitle}>Direct Academic Badge Issuance</Text>
          <Text style={styles.sectionHeaderSub}>Search any registered researcher to instantly grant or revoke verification badges.</Text>
          
          <View style={styles.searchRow}>
            <View style={styles.searchInputGroup}>
              <Search size={14} color={ADMIN_COLORS.textMuted} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search researcher username or name to grant badge..."
                placeholderTextColor={ADMIN_COLORS.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearchUsers}
              />
            </View>
            <TouchableOpacity style={styles.primaryActionBtn} onPress={handleSearchUsers}>
              <Text style={styles.primaryActionBtnText}>Search</Text>
            </TouchableOpacity>
          </View>

          {/* Search Results List */}
          {searchingUsers ? (
            <ActivityIndicator size="small" color={ADMIN_COLORS.emeraldPrimary} style={{ marginVertical: 10 }} />
          ) : searchResults.length > 0 ? (
            <View style={styles.searchResultsList}>
              {searchResults.map((u) => (
                <View key={u.id} style={styles.searchResultItem}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.boldText}>{u.full_name || u.username}</Text>
                      <Text style={styles.cellMuted}>@{u.username}</Text>
                      {u.is_orcid_verified && (
                        <AdminBadge label="VERIFIED" variant="emerald" size="sm" />
                      )}
                    </View>
                    <Text style={styles.cellMuted}>{u.institution || 'Academic Institution'}</Text>
                  </View>

                  <View style={styles.actionRow}>
                    {u.is_orcid_verified ? (
                      <TouchableOpacity
                        style={styles.actionDangerBtn}
                        onPress={() => handleRevokeBadge(u)}
                      >
                        <Text style={styles.actionDangerBtnText}>Revoke Badge</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.actionEmeraldBtn}
                        onPress={() => handleGrantBadge(u, 'RESEARCHER')}
                      >
                        <Award size={11} color={ADMIN_COLORS.emeraldPrimary} />
                        <Text style={styles.actionEmeraldBtnText}>Grant Badge</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      )}

      {/* Main Table / Record List */}
      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color={ADMIN_COLORS.emeraldPrimary} />
          <Text style={styles.loadingText}>Loading verification queue...</Text>
        </View>
      ) : activeTab === 'VERIFICATIONS' ? (
        isMobile ? (
          <View style={styles.mobileListContainer}>
            {applicants.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Verification Queue Empty</Text>
                <Text style={styles.emptySub}>No pending academic credential requests.</Text>
              </View>
            ) : (
              applicants.map((a) => (
                <View key={a.id} style={styles.recordCard}>
                  <View style={styles.recordHeader}>
                    <View style={styles.applicantCell}>
                      <View style={styles.avatarPill}>
                        <Text style={styles.avatarText}>{a.fullName.substring(0, 2).toUpperCase()}</Text>
                      </View>
                      <View>
                        <Text style={styles.boldText}>{a.fullName}</Text>
                        <Text style={styles.usernameText}>@{a.username}</Text>
                      </View>
                    </View>
                    <AdminBadge label={a.status} variant={a.status === 'PENDING' ? 'warning' : a.status === 'APPROVED' ? 'emerald' : 'danger'} size="sm" />
                  </View>

                  <Text style={styles.cellText}>{a.institution}</Text>
                  <Text style={styles.cellMuted}>{a.email}</Text>

                  <View style={styles.recordFooter}>
                    <AdminBadge label={a.requestedTier} variant="emerald" size="sm" />
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.actionOutlineBtn}
                        onPress={() => setSelectedApplicant(a)}
                      >
                        <Eye size={11} color={ADMIN_COLORS.textSecondary} />
                        <Text style={styles.actionOutlineBtnText}>Inspect</Text>
                      </TouchableOpacity>
                      {a.status === 'PENDING' && (
                        <TouchableOpacity
                          style={styles.actionEmeraldBtn}
                          onPress={() => handleApproveApplicant(a.id)}
                        >
                          <Check size={11} color={ADMIN_COLORS.emeraldPrimary} />
                          <Text style={styles.actionEmeraldBtnText}>Approve</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={styles.tableWrapper}>
            <AdminDataTable
              columns={applicantColumns}
              data={applicants}
              emptyMessage="No pending academic verification applicants in this queue."
            />
          </View>
        )
      ) : (
        isMobile ? (
          <View style={styles.mobileListContainer}>
            {dualRequests.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Dual-Sign Queue Empty</Text>
                <Text style={styles.emptySub}>No multi-signature operations requiring approval.</Text>
              </View>
            ) : (
              dualRequests.map((r) => (
                <View key={r.id} style={styles.recordCard}>
                  <View style={styles.recordHeader}>
                    <Text style={styles.boldText}>{r.action_type}</Text>
                    <AdminBadge label={r.status} variant={r.status === 'PENDING' ? 'warning' : r.status === 'APPROVED' ? 'emerald' : 'danger'} size="sm" />
                  </View>
                  <Text style={styles.cellText}>{r.reason}</Text>
                  <View style={styles.recordFooter}>
                    <Text style={styles.cellMuted}>Target #{r.target_id.slice(0, 8)}</Text>
                    {r.status === 'PENDING' && (
                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={styles.actionEmeraldBtn}
                          onPress={() => handleDualDecision(r.id, 'APPROVED')}
                        >
                          <Text style={styles.actionEmeraldBtnText}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionDangerBtn}
                          onPress={() => handleDualDecision(r.id, 'REJECTED')}
                        >
                          <Text style={styles.actionDangerBtnText}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={styles.tableWrapper}>
            <AdminDataTable
              columns={dualColumns}
              data={dualRequests}
              emptyMessage="No dual approval requests in platform records."
            />
          </View>
        )
      )}

      {/* Applicant Inspector Modal */}
      {selectedApplicant && !isRejectModalOpen && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedApplicant(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderTitleRow}>
                  <GraduationCap size={16} color={ADMIN_COLORS.emeraldPrimary} />
                  <Text style={styles.modalTitle}>Verification Dossier</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedApplicant(null)} style={styles.closeBtn}>
                  <X size={16} color={ADMIN_COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.metaGrid}>
                  <View style={styles.metaCard}>
                    <Text style={styles.inspectorLabel}>Applicant</Text>
                    <Text style={styles.metaVal}>{selectedApplicant.fullName}</Text>
                  </View>
                  <View style={styles.metaCard}>
                    <Text style={styles.inspectorLabel}>Institution</Text>
                    <Text style={styles.metaVal}>{selectedApplicant.institution}</Text>
                  </View>
                  <View style={styles.metaCard}>
                    <Text style={styles.inspectorLabel}>Requested Tier</Text>
                    <Text style={styles.metaVal}>{selectedApplicant.requestedTier}</Text>
                  </View>
                  <View style={styles.metaCard}>
                    <Text style={styles.inspectorLabel}>Institutional Domain</Text>
                    <Text style={styles.metaVal}>{selectedApplicant.email}</Text>
                  </View>
                </View>

                {selectedApplicant.orcidId && (
                  <View style={styles.metaCard}>
                    <Text style={styles.inspectorLabel}>ORCID Identifier</Text>
                    <Text style={[styles.metaVal, { color: ADMIN_COLORS.emeraldPrimary }]}>{selectedApplicant.orcidId}</Text>
                  </View>
                )}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.actionOutlineBtn}
                  onPress={() => setSelectedApplicant(null)}
                >
                  <Text style={styles.actionOutlineBtnText}>Close</Text>
                </TouchableOpacity>

                {selectedApplicant.status === 'PENDING' && (
                  <>
                    <TouchableOpacity
                      style={styles.actionDangerBtn}
                      onPress={() => setIsRejectModalOpen(true)}
                    >
                      <Text style={styles.actionDangerBtnText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.primaryActionBtn}
                      onPress={() => handleApproveApplicant(selectedApplicant.id)}
                    >
                      <Text style={styles.primaryActionBtnText}>Approve Badge</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Reject Reason Modal */}
      {isRejectModalOpen && selectedApplicant && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsRejectModalOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Reject Verification Request</Text>
                <TouchableOpacity onPress={() => setIsRejectModalOpen(false)} style={styles.closeBtn}>
                  <X size={16} color={ADMIN_COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.inspectorLabel}>Feedback Reason for Researcher</Text>
              <TextInput
                style={styles.rationaleInput}
                placeholder="Explain why verification could not be approved..."
                placeholderTextColor={ADMIN_COLORS.textMuted}
                value={rejectionReason}
                onChangeText={setRejectionReason}
                multiline={true}
                numberOfLines={3}
              />

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.actionOutlineBtn}
                  onPress={() => setIsRejectModalOpen(false)}
                >
                  <Text style={styles.actionOutlineBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionDangerBtn}
                  onPress={handleRejectApplicant}
                >
                  <Text style={styles.actionDangerBtnText}>Confirm Rejection</Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
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
    paddingHorizontal: 12,
    paddingVertical: 5,
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
  refreshIconBtn: {
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    backgroundColor: ADMIN_COLORS.bgSurface,
    padding: 7,
    borderRadius: ADMIN_RADII.button,
  },
  searchGrantCard: {
    backgroundColor: ADMIN_COLORS.bgSurface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.card,
    padding: 12,
    marginBottom: 16,
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
  },
  sectionHeaderSub: {
    fontSize: 11,
    color: ADMIN_COLORS.textSecondary,
    marginTop: 2,
    marginBottom: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInputGroup: {
    flex: 1,
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
  searchResultsList: {
    marginTop: 10,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: ADMIN_COLORS.borderSubtle,
    paddingTop: 8,
  },
  searchResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  applicantCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarPill: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: ADMIN_COLORS.bgActive,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.emeraldBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 10,
    fontWeight: '700',
    color: ADMIN_COLORS.emeraldPrimary,
  },
  boldText: {
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
    color: ADMIN_COLORS.textMuted,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  actionEmeraldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: ADMIN_COLORS.bgActive,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.emeraldBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: ADMIN_RADII.button,
  },
  actionEmeraldBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: ADMIN_COLORS.emeraldPrimary,
  },
  actionDangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: ADMIN_COLORS.statusDangerBg,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.statusDangerBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: ADMIN_RADII.button,
  },
  actionDangerBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: ADMIN_COLORS.statusDangerText,
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
    gap: 6,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: ADMIN_COLORS.borderSubtle,
    paddingTop: 8,
    marginTop: 4,
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
  modalCard: {
    width: '100%',
    maxWidth: 520,
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
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  metaCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: ADMIN_COLORS.bgCanvas,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.button,
    padding: 8,
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
  rationaleInput: {
    backgroundColor: ADMIN_COLORS.bgCanvas,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.input,
    padding: 8,
    fontSize: 12,
    color: ADMIN_COLORS.textPrimary,
    marginTop: 6,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: ADMIN_COLORS.borderSubtle,
    paddingTop: 12,
  },
});
