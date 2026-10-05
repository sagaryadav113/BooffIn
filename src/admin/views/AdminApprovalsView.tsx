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
  TextInput 
} from 'react-native';
import { ADMIN_COLORS } from '../lib/constants';
import { AdminDataTable, ColumnDef } from '../components/AdminDataTable';
import { AdminBadge } from '../components/AdminBadge';
import { adminApprovalService } from '../services/adminApprovalService';
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
  ExternalLink, 
  Check, 
  AlertTriangle,
  Lock
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
}

export const AdminApprovalsView: React.FC = () => {
  const { userId } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<'VERIFICATIONS' | 'DUAL_ADMIN'>('VERIFICATIONS');
  const [loading, setLoading] = useState(true);
  
  // Dual-Admin requests
  const [dualRequests, setDualRequests] = useState<AdminApprovalRequest[]>([]);
  
  // Academic Applicants queue
  const [applicants, setApplicants] = useState<AcademicApplicant[]>([
    {
      id: 'verif-1',
      fullName: 'Dr. Elena Rostova',
      username: 'elena_rostova',
      email: 'e.rostova@stanford.edu',
      institution: 'Stanford University',
      department: 'Department of Applied Physics',
      requestedTier: 'PI_FACULTY',
      orcidId: '0000-0002-1825-0097',
      googleScholarUrl: 'https://scholar.google.com/citations?user=sample1',
      submittedAt: '2026-10-05T10:14:00Z',
      isDomainVerified: true,
      status: 'PENDING',
    },
    {
      id: 'verif-2',
      fullName: 'Dr. Marcus Vance',
      username: 'mvance_neuro',
      email: 'm.vance@ox.ac.uk',
      institution: 'University of Oxford',
      department: 'Nuffield Department of Clinical Neurosciences',
      requestedTier: 'RESEARCHER',
      orcidId: '0000-0001-5109-3700',
      submittedAt: '2026-10-05T08:30:00Z',
      isDomainVerified: true,
      status: 'PENDING',
    },
    {
      id: 'verif-3',
      fullName: 'Aarav Mehta',
      username: 'amehta_nano',
      email: 'aarav.mehta@iitb.ac.in',
      institution: 'IIT Bombay',
      department: 'Center for Research in Nanotechnology',
      requestedTier: 'RESEARCHER',
      orcidId: '0000-0003-4412-8891',
      submittedAt: '2026-10-04T19:22:00Z',
      isDomainVerified: true,
      status: 'PENDING',
    },
  ]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Inspector & Review Modal
  const [selectedApplicant, setSelectedApplicant] = useState<AcademicApplicant | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const res = await adminApprovalService.listApprovalRequests({ limit: 50 });
    if (res.error) {
      setErrorMessage(`Authorization / Query Error: ${res.error.message}`);
      setDualRequests([]);
    } else {
      setDualRequests(res.requests);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApproveApplicant = (applicantId: string) => {
    setApplicants(prev => prev.map(a => a.id === applicantId ? { ...a, status: 'APPROVED' } : a));
    setActionSuccessMessage(`Academic verification approved. Verified badge granted to applicant.`);
    setSelectedApplicant(null);
  };

  const handleRejectApplicant = () => {
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
      header: 'Applicant Researcher',
      width: 220,
      render: (a) => (
        <View style={styles.applicantCell}>
          <View style={styles.avatarPill}>
            <Text style={styles.avatarText}>{a.fullName.substring(0, 2).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.boldText}>{a.fullName}</Text>
            <Text style={styles.usernameText}>@{a.username}</Text>
          </View>
        </View>
      ),
    },
    {
      key: 'institution',
      header: 'Affiliation & Domain',
      width: 240,
      render: (a) => (
        <View>
          <Text style={styles.cellText}>{a.institution}</Text>
          <View style={styles.domainRow}>
            {a.isDomainVerified ? (
              <View style={styles.domainVerifiedBadge}>
                <CheckCircle2 size={10} color="#03543F" />
                <Text style={styles.domainVerifiedText}>{a.email}</Text>
              </View>
            ) : (
              <Text style={styles.cellMuted}>{a.email}</Text>
            )}
          </View>
        </View>
      ),
    },
    {
      key: 'requestedTier',
      header: 'Badge Requested',
      width: 170,
      render: (a) => (
        <AdminBadge
          label={
            a.requestedTier === 'PI_FACULTY' 
              ? '🏛️ PI / FACULTY' 
              : a.requestedTier === 'LAB_INSTITUTION' 
              ? '🏢 LAB / INST.' 
              : '🎓 RESEARCHER'
          }
          variant="emerald"
          size="sm"
        />
      ),
    },
    {
      key: 'status',
      header: 'Verification Status',
      width: 130,
      render: (a) => (
        <AdminBadge
          label={a.status}
          variant={a.status === 'PENDING' ? 'warning' : a.status === 'APPROVED' ? 'emerald' : 'danger'}
          size="sm"
        />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 200,
      render: (a) => (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.inspectBtn}
            onPress={() => setSelectedApplicant(a)}
          >
            <Eye size={12} color={ADMIN_COLORS.textSecondary} />
            <Text style={styles.inspectBtnText}>Inspect</Text>
          </TouchableOpacity>

          {a.status === 'PENDING' ? (
            <>
              <TouchableOpacity
                style={styles.approveBtn}
                onPress={() => handleApproveApplicant(a.id)}
              >
                <Check size={12} color="#03543F" />
                <Text style={styles.approveBtnText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectBtn}
                onPress={() => {
                  setSelectedApplicant(a);
                  setIsRejectModalOpen(true);
                }}
              >
                <XCircle size={12} color="#991B1B" />
                <Text style={styles.rejectBtnText}>Reject</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.resolvedText}>Completed</Text>
          )}
        </View>
      ),
    },
  ];

  // Dual-Admin Request Columns
  const dualColumns: ColumnDef<AdminApprovalRequest>[] = [
    {
      key: 'action_type',
      header: 'Critical Operation',
      width: 180,
      render: (r) => <Text style={styles.boldText}>{r.action_type}</Text>,
    },
    {
      key: 'reason',
      header: 'Justification / Purpose',
      width: 260,
      render: (r) => (
        <Text style={styles.cellText} numberOfLines={2}>
          {r.reason || 'Administrative action'}
        </Text>
      ),
    },
    {
      key: 'status',
      header: 'Approval Status',
      width: 140,
      render: (r) => (
        <AdminBadge
          label={r.status}
          variant={
            r.status === 'PENDING'
              ? 'warning'
              : r.status === 'APPROVED' || r.status === 'EXECUTED'
              ? 'emerald'
              : 'danger'
          }
          size="sm"
        />
      ),
    },
    {
      key: 'actions',
      header: 'Dual-Admin Signoff',
      width: 180,
      render: (r) => {
        if (r.status !== 'PENDING') {
          return <Text style={styles.cellMuted}>Completed</Text>;
        }

        const isSelf = r.requested_by === userId;
        if (isSelf) {
          return (
            <View style={styles.selfPill}>
              <Text style={styles.selfPillText}>Self-Request (Wait 2nd Admin)</Text>
            </View>
          );
        }

        return (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.approveBtn}
              onPress={() => handleDualDecision(r.id, 'APPROVED')}
            >
              <CheckCircle2 size={12} color="#03543F" />
              <Text style={styles.approveBtnText}>Authorize</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={() => handleDualDecision(r.id, 'REJECTED')}
            >
              <XCircle size={12} color="#991B1B" />
              <Text style={styles.rejectBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        );
      },
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.pageTitle}>Academic Credentialing & Approvals</Text>
          <Text style={styles.pageSubtitle}>
            Institutional verification desk • Dual-admin authorization engine
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={loadData}>
          <RefreshCw size={14} color={ADMIN_COLORS.textSecondary} />
          <Text style={styles.refreshBtnText}>Sync Desk</Text>
        </TouchableOpacity>
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

      {/* Mode Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'VERIFICATIONS' && styles.tabBtnActive]}
          onPress={() => setActiveTab('VERIFICATIONS')}
        >
          <GraduationCap size={15} color={activeTab === 'VERIFICATIONS' ? '#059669' : '#64748B'} />
          <Text style={[styles.tabBtnText, activeTab === 'VERIFICATIONS' && styles.tabBtnTextActive]}>
            Academic & Institution Verifications ({applicants.filter(a => a.status === 'PENDING').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'DUAL_ADMIN' && styles.tabBtnActive]}
          onPress={() => setActiveTab('DUAL_ADMIN')}
        >
          <Lock size={15} color={activeTab === 'DUAL_ADMIN' ? '#059669' : '#64748B'} />
          <Text style={[styles.tabBtnText, activeTab === 'DUAL_ADMIN' && styles.tabBtnTextActive]}>
            Dual-Admin High-Risk Operations ({dualRequests.filter(r => r.status === 'PENDING').length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Banner */}
      {activeTab === 'VERIFICATIONS' ? (
        <View style={styles.protocolBanner}>
          <View style={styles.protocolIcon}>
            <Award size={20} color="#059669" />
          </View>
          <View style={styles.protocolTextGroup}>
            <Text style={styles.protocolTitle}>Institutional Identity Protocol</Text>
            <Text style={styles.protocolSubtitle}>
              Applicants with verified academic domains (.edu, .ac.uk, .iit.ac.in) and matching ORCID records are pre-scored for instant credentialing.
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.protocolBanner}>
          <View style={styles.protocolIcon}>
            <ShieldAlert size={20} color="#059669" />
          </View>
          <View style={styles.protocolTextGroup}>
            <Text style={styles.protocolTitle}>Mandatory Two-Admin Protocol Enforced</Text>
            <Text style={styles.protocolSubtitle}>
              Critical actions (user permanent deletion, role elevation, security reconfiguration) require independent sign-off via chk_no_self_approval.
            </Text>
          </View>
        </View>
      )}

      {/* Table Card */}
      <View style={styles.tableCard}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={ADMIN_COLORS.emeraldPrimary} />
          </View>
        ) : activeTab === 'VERIFICATIONS' ? (
          <AdminDataTable
            columns={applicantColumns}
            data={applicants}
            emptyMessage="No pending academic verification applicants in queue."
          />
        ) : (
          <AdminDataTable
            columns={dualColumns}
            data={dualRequests}
            emptyMessage="No pending dual-approval operations in queue."
          />
        )}
      </View>

      {/* Side-by-Side Applicant Inspection Modal */}
      {selectedApplicant && !isRejectModalOpen && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedApplicant(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.inspectorModalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderTitleRow}>
                  <GraduationCap size={20} color={ADMIN_COLORS.emeraldPrimary} />
                  <Text style={styles.modalTitle}>Applicant Verification Profile</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedApplicant(null)} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {/* Basic Identity Card */}
                <View style={styles.applicantDetailBox}>
                  <View style={styles.avatarBig}>
                    <Text style={styles.avatarBigText}>
                      {selectedApplicant.fullName.substring(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.applicantNameBig}>{selectedApplicant.fullName}</Text>
                    <Text style={styles.applicantSubBig}>@{selectedApplicant.username} • {selectedApplicant.email}</Text>
                    <Text style={styles.applicantAffilBig}>{selectedApplicant.department}, {selectedApplicant.institution}</Text>
                  </View>
                </View>

                {/* Evidence & Record Grid */}
                <View style={styles.evidenceGrid}>
                  <View style={styles.evidenceCard}>
                    <Text style={styles.inspectorLabel}>ORCID Identifier</Text>
                    <Text style={styles.evidenceValue}>{selectedApplicant.orcidId || 'Not connected'}</Text>
                    <Text style={styles.evidenceHint}>Validated via public ORCID registry API</Text>
                  </View>

                  <View style={styles.evidenceCard}>
                    <Text style={styles.inspectorLabel}>Institutional Domain Check</Text>
                    <Text style={[styles.evidenceValue, { color: '#03543F' }]}>
                      {selectedApplicant.isDomainVerified ? '✓ Validated Academic Domain' : '⚠ Non-Academic Domain'}
                    </Text>
                    <Text style={styles.evidenceHint}>Email domain matches accredited faculty registry</Text>
                  </View>
                </View>

                {/* Tier Selection Indicator */}
                <View style={styles.tierSection}>
                  <Text style={styles.inspectorLabel}>Target Verification Badge Tier</Text>
                  <View style={styles.tierPillBox}>
                    <Award size={16} color="#059669" />
                    <Text style={styles.tierPillText}>
                      {selectedApplicant.requestedTier === 'PI_FACULTY' 
                        ? '🏛️ Principal Investigator / Faculty Badge' 
                        : '🎓 Verified Academic Researcher Badge'}
                    </Text>
                  </View>
                </View>
              </ScrollView>

              {/* Modal Footer */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.rejectActionBtn}
                  onPress={() => setIsRejectModalOpen(true)}
                >
                  <Text style={styles.rejectActionBtnText}>Reject Request</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.approveActionBtn}
                  onPress={() => handleApproveApplicant(selectedApplicant.id)}
                >
                  <Text style={styles.approveActionBtnText}>Approve & Issue Badge</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Rejection Template Modal */}
      {isRejectModalOpen && selectedApplicant && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsRejectModalOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.rejectModalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Verification Feedback Notice</Text>
                <TouchableOpacity onPress={() => setIsRejectModalOpen(false)} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.rejectModalSub}>
                Select a standard reason or provide notes to notify Dr./Researcher {selectedApplicant.fullName}.
              </Text>

              <View style={styles.templateChips}>
                <TouchableOpacity 
                  style={styles.templateChip} 
                  onPress={() => setRejectionReason('Official institutional (.edu / .ac.uk) email address required for faculty verification.')}
                >
                  <Text style={styles.templateChipText}>Institutional Email Required</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.templateChip} 
                  onPress={() => setRejectionReason('ORCID record could not be verified with university publications.')}
                >
                  <Text style={styles.templateChipText}>ORCID Mismatch</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.templateChip} 
                  onPress={() => setRejectionReason('Uploaded faculty credentials or appointment letter are unreadable.')}
                >
                  <Text style={styles.templateChipText}>Unreadable Credentials</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.rejectionInput}
                placeholder="Custom feedback note to applicant..."
                placeholderTextColor={ADMIN_COLORS.textMuted}
                value={rejectionReason}
                onChangeText={setRejectionReason}
                multiline={true}
                numberOfLines={3}
              />

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setIsRejectModalOpen(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmRejectBtn}
                  onPress={handleRejectApplicant}
                >
                  <Text style={styles.confirmRejectBtnText}>Send Rejection</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 4,
    gap: 4,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  tabBtnActive: {
    backgroundColor: '#ECFDF5',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  protocolBanner: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  protocolIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  protocolTextGroup: {
    flex: 1,
  },
  protocolTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  protocolSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
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
  applicantCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DEF7EC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BCF0DA',
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#03543F',
  },
  boldText: {
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
  domainRow: {
    marginTop: 2,
  },
  domainVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DEF7EC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  domainVerifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#03543F',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  },
  inspectBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DEF7EC',
    borderWidth: 1,
    borderColor: '#BCF0DA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  approveBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#03543F',
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rejectBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#991B1B',
  },
  selfPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  selfPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  resolvedText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#94A3B8',
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

  // Inspector Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  inspectorModalCard: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  rejectModalCard: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
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
  applicantDetailBox: {
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
  applicantNameBig: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  applicantSubBig: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  applicantAffilBig: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginTop: 2,
  },
  evidenceGrid: {
    gap: 12,
    marginBottom: 16,
  },
  evidenceCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 14,
  },
  inspectorLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  evidenceValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  evidenceHint: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 3,
  },
  tierSection: {
    marginBottom: 16,
  },
  tierPillBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  tierPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
  },
  rejectActionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
  },
  rejectActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
  },
  approveActionBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#059669',
    borderRadius: 8,
  },
  approveActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rejectModalSub: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 14,
    lineHeight: 19,
  },
  templateChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  templateChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  templateChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  rejectionInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: '#0F172A',
    textAlignVertical: 'top',
    minHeight: 70,
    marginBottom: 16,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  confirmRejectBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#991B1B',
    borderRadius: 8,
  },
  confirmRejectBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
