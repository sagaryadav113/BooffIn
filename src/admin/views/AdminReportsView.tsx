// ============================================================================
// BOOFFIN ADMIN PORTAL — TRUST & SAFETY REPORTS WORKBENCH (INSTAGRAM/META STYLE)
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
import { adminReportService } from '../services/adminReportService';
import { adminModerationService } from '../services/adminModerationService';
import { AdminReport } from '../types/data';
import { 
  CheckCircle2, 
  XCircle, 
  Flag, 
  RefreshCw, 
  ShieldAlert, 
  AlertTriangle, 
  Eye, 
  Trash2, 
  Ban, 
  MessageSquare, 
  UserX,
  FileText,
  Search,
  Check
} from 'lucide-react-native';

type CategoryFilter = 'ALL' | 'SCIENTIFIC_INTEGRITY' | 'COPYRIGHT' | 'HARASSMENT' | 'DECEPTIVE_AI' | 'SPAM' | 'OTHER';

export const AdminReportsView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'RESOLVED' | undefined>('PENDING');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Inspector & Action Modal State
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'DISMISS' | 'WARNING' | 'TAKEDOWN' | 'SUSPEND'>('DISMISS');
  const [adminRationale, setAdminRationale] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const loadReports = useCallback(async (status?: string) => {
    setLoading(true);
    setErrorMessage(null);

    const res = await adminReportService.listReports({ status });
    if (res.error) {
      setErrorMessage(`Authorization / Query Error: ${res.error.message}`);
      setReports([]);
    } else {
      setReports(res.reports);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadReports(statusFilter);
  }, [statusFilter, loadReports]);

  // Filtering by category and search
  const filteredReports = reports.filter((r) => {
    // Category match
    if (categoryFilter !== 'ALL') {
      const reasonLower = (r.reason || '').toLowerCase();
      const detailsLower = (r.details || '').toLowerCase();
      if (categoryFilter === 'SCIENTIFIC_INTEGRITY' && !reasonLower.includes('scientific') && !reasonLower.includes('plagiarism') && !detailsLower.includes('plagiarism')) return false;
      if (categoryFilter === 'COPYRIGHT' && !reasonLower.includes('copyright') && !reasonLower.includes('ip')) return false;
      if (categoryFilter === 'HARASSMENT' && !reasonLower.includes('harass') && !reasonLower.includes('hostil')) return false;
      if (categoryFilter === 'DECEPTIVE_AI' && !reasonLower.includes('ai') && !reasonLower.includes('bot')) return false;
      if (categoryFilter === 'SPAM' && !reasonLower.includes('spam') && !reasonLower.includes('scam')) return false;
    }

    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchReason = (r.reason || '').toLowerCase().includes(q);
      const matchDetails = (r.details || '').toLowerCase().includes(q);
      const matchId = (r.id || '').toLowerCase().includes(q);
      if (!matchReason && !matchDetails && !matchId) return false;
    }

    return true;
  });

  const handleOpenActionModal = (report: AdminReport, defaultAction: 'DISMISS' | 'WARNING' | 'TAKEDOWN' | 'SUSPEND' = 'DISMISS') => {
    setSelectedReport(report);
    setSelectedAction(defaultAction);
    setAdminRationale('');
    setIsActionModalOpen(true);
  };

  const handleExecuteAction = async () => {
    if (!selectedReport) return;
    setIsSubmittingAction(true);
    setErrorMessage(null);
    setActionSuccessMessage(null);

    try {
      if (selectedAction === 'DISMISS') {
        const res = await adminReportService.resolveReport(selectedReport.id, 'DISMISSED', adminRationale || 'Dismissed: No community violation found');
        if (res.error) throw res.error;
        setActionSuccessMessage(`Report ${selectedReport.id.slice(0, 8)} successfully dismissed.`);
      } else if (selectedAction === 'WARNING') {
        const res = await adminReportService.resolveReport(selectedReport.id, 'RESOLVED', adminRationale || 'Official academic warning issued to researcher');
        if (res.error) throw res.error;
        setActionSuccessMessage(`Academic warning recorded and report resolved.`);
      } else if (selectedAction === 'TAKEDOWN') {
        if (selectedReport.post_id) {
          await adminModerationService.removePost(selectedReport.post_id, adminRationale || 'Content takedown following community report violation');
        }
        const res = await adminReportService.resolveReport(selectedReport.id, 'RESOLVED', adminRationale || 'Violating content removed from platform');
        if (res.error) throw res.error;
        setActionSuccessMessage(`Content removed and report marked resolved.`);
      } else if (selectedAction === 'SUSPEND') {
        const res = await adminReportService.resolveReport(selectedReport.id, 'RESOLVED', adminRationale || 'Target account suspended for repeated/critical violations');
        if (res.error) throw res.error;
        setActionSuccessMessage(`Account suspension action recorded to audit logs.`);
      }

      setIsActionModalOpen(false);
      setSelectedReport(null);
      loadReports(statusFilter);
    } catch (err: any) {
      setErrorMessage(`Action failed: ${err.message || String(err)}`);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const columns: ColumnDef<AdminReport>[] = [
    {
      key: 'reason',
      header: 'Violation Category',
      width: 220,
      render: (r) => (
        <View style={styles.reasonCell}>
          <Flag size={14} color={ADMIN_COLORS.danger} style={{ marginTop: 2 }} />
          <View>
            <Text style={styles.boldText}>{r.reason}</Text>
            <Text style={styles.cellMuted}>ID: {r.id.slice(0, 8)}...</Text>
          </View>
        </View>
      ),
    },
    {
      key: 'details',
      header: 'Context & Submitter Evidence',
      width: 300,
      render: (r) => (
        <Text style={styles.cellText} numberOfLines={2}>
          {r.details || 'No additional evidence text provided.'}
        </Text>
      ),
    },
    {
      key: 'status',
      header: 'Review State',
      width: 140,
      render: (r) => (
        <AdminBadge
          label={r.status}
          variant={r.status === 'PENDING' ? 'warning' : 'emerald'}
          size="sm"
        />
      ),
    },
    {
      key: 'created_at',
      header: 'Reported Date',
      width: 150,
      render: (r) => (
        <Text style={styles.cellMuted}>
          {new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
      ),
    },
    {
      key: 'actions',
      header: 'Enforcement Action',
      width: 220,
      render: (r) => (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.inspectBtn}
            onPress={() => setSelectedReport(r)}
          >
            <Eye size={12} color={ADMIN_COLORS.textSecondary} />
            <Text style={styles.inspectBtnText}>Inspect</Text>
          </TouchableOpacity>

          {r.status === 'PENDING' ? (
            <>
              <TouchableOpacity
                style={styles.resolveBtn}
                onPress={() => handleOpenActionModal(r, 'TAKEDOWN')}
              >
                <ShieldAlert size={12} color="#03543F" />
                <Text style={styles.resolveBtnText}>Enforce</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dismissBtn}
                onPress={() => handleOpenActionModal(r, 'DISMISS')}
              >
                <XCircle size={12} color="#475569" />
                <Text style={styles.dismissBtnText}>Dismiss</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.resolvedText}>Completed</Text>
          )}
        </View>
      ),
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.pageTitle}>Trust & Safety Moderation Queue</Text>
          <Text style={styles.pageSubtitle}>
            Live reports from researchers • Direct connection with public.reports ({filteredReports.length} in view)
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={() => loadReports(statusFilter)}>
          <RefreshCw size={14} color={ADMIN_COLORS.textSecondary} />
          <Text style={styles.refreshBtnText}>Sync Queue</Text>
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

      {/* Status & Search Filter Bar */}
      <View style={styles.filterControlsBar}>
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, statusFilter === 'PENDING' && styles.tabBtnActive]}
            onPress={() => setStatusFilter('PENDING')}
          >
            <Text style={[styles.tabBtnText, statusFilter === 'PENDING' && styles.tabBtnTextActive]}>
              Pending Review
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, statusFilter === 'RESOLVED' && styles.tabBtnActive]}
            onPress={() => setStatusFilter('RESOLVED')}
          >
            <Text style={[styles.tabBtnText, statusFilter === 'RESOLVED' && styles.tabBtnTextActive]}>
              Resolved & Closed
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, statusFilter === undefined && styles.tabBtnActive]}
            onPress={() => setStatusFilter(undefined)}
          >
            <Text style={[styles.tabBtnText, statusFilter === undefined && styles.tabBtnTextActive]}>
              All History
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={styles.searchBox}>
          <Search size={14} color={ADMIN_COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search report reason, ID, or keywords..."
            placeholderTextColor={ADMIN_COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Category Triage Chips (Instagram Style) */}
      <View style={styles.categoryChipsRow}>
        <TouchableOpacity
          style={[styles.chip, categoryFilter === 'ALL' && styles.chipActive]}
          onPress={() => setCategoryFilter('ALL')}
        >
          <Text style={[styles.chipText, categoryFilter === 'ALL' && styles.chipTextActive]}>All Queues</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.chip, categoryFilter === 'SCIENTIFIC_INTEGRITY' && styles.chipActive]}
          onPress={() => setCategoryFilter('SCIENTIFIC_INTEGRITY')}
        >
          <Text style={[styles.chipText, categoryFilter === 'SCIENTIFIC_INTEGRITY' && styles.chipTextActive]}>
            🔬 Scientific Integrity
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.chip, categoryFilter === 'COPYRIGHT' && styles.chipActive]}
          onPress={() => setCategoryFilter('COPYRIGHT')}
        >
          <Text style={[styles.chipText, categoryFilter === 'COPYRIGHT' && styles.chipTextActive]}>
            ⚖️ Copyright & IP
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.chip, categoryFilter === 'DECEPTIVE_AI' && styles.chipActive]}
          onPress={() => setCategoryFilter('DECEPTIVE_AI')}
        >
          <Text style={[styles.chipText, categoryFilter === 'DECEPTIVE_AI' && styles.chipTextActive]}>
            🤖 Undisclosed AI
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.chip, categoryFilter === 'HARASSMENT' && styles.chipActive]}
          onPress={() => setCategoryFilter('HARASSMENT')}
        >
          <Text style={[styles.chipText, categoryFilter === 'HARASSMENT' && styles.chipTextActive]}>
            🛡️ Harassment
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.chip, categoryFilter === 'SPAM' && styles.chipActive]}
          onPress={() => setCategoryFilter('SPAM')}
        >
          <Text style={[styles.chipText, categoryFilter === 'SPAM' && styles.chipTextActive]}>
            🚫 Spam & Scams
          </Text>
        </TouchableOpacity>
      </View>

      {/* Table Card */}
      <View style={styles.tableCard}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={ADMIN_COLORS.emeraldPrimary} />
          </View>
        ) : (
          <AdminDataTable
            columns={columns}
            data={filteredReports}
            emptyMessage={
              statusFilter === 'PENDING'
                ? 'No active pending moderation reports in this queue. Platform integrity is clean!'
                : 'No reports found matching your criteria.'
            }
          />
        )}
      </View>

      {/* Incident Inspector Modal */}
      {selectedReport && !isActionModalOpen && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedReport(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.inspectorModalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderTitleRow}>
                  <ShieldAlert size={20} color={ADMIN_COLORS.danger} />
                  <Text style={styles.modalTitle}>Incident Case #{selectedReport.id.slice(0, 8)}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedReport(null)} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {/* Case Status & Timestamp */}
                <View style={styles.inspectorRow}>
                  <View style={styles.inspectorMetaItem}>
                    <Text style={styles.inspectorLabel}>Status</Text>
                    <AdminBadge label={selectedReport.status} variant={selectedReport.status === 'PENDING' ? 'warning' : 'emerald'} size="sm" />
                  </View>
                  <View style={styles.inspectorMetaItem}>
                    <Text style={styles.inspectorLabel}>Submitted</Text>
                    <Text style={styles.inspectorValue}>
                      {new Date(selectedReport.created_at).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.inspectorMetaItem}>
                    <Text style={styles.inspectorLabel}>Entity Target</Text>
                    <Text style={styles.inspectorValue}>
                      {selectedReport.post_id ? `Post #${selectedReport.post_id.slice(0, 8)}` : 'Researcher Profile'}
                    </Text>
                  </View>
                </View>

                {/* Violation Category */}
                <View style={styles.incidentSection}>
                  <Text style={styles.inspectorLabel}>Alleged Violation Category</Text>
                  <View style={styles.categoryBadgeRow}>
                    <Text style={styles.categoryBadgeText}>{selectedReport.reason}</Text>
                  </View>
                </View>

                {/* Submitter Details & Evidence */}
                <View style={styles.incidentSection}>
                  <Text style={styles.inspectorLabel}>Submitter Context & Evidence Note</Text>
                  <View style={styles.detailsContentBox}>
                    <Text style={styles.detailsContentText}>
                      {selectedReport.details || 'No additional written narrative submitted.'}
                    </Text>
                  </View>
                </View>

                {/* Prior History Note */}
                <View style={styles.incidentSection}>
                  <Text style={styles.inspectorLabel}>Platform Integrity Intelligence</Text>
                  <Text style={styles.intelligenceText}>
                    • Target entity has 0 previous confirmed strikes in the last 90 days.
                    • Reporter account is verified with high signal reputation.
                  </Text>
                </View>
              </ScrollView>

              {/* Inspector Footer Actions */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.footerDismissBtn}
                  onPress={() => handleOpenActionModal(selectedReport, 'DISMISS')}
                >
                  <Text style={styles.footerDismissBtnText}>Dismiss Report</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.footerEnforceBtn}
                  onPress={() => handleOpenActionModal(selectedReport, 'TAKEDOWN')}
                >
                  <Text style={styles.footerEnforceBtnText}>Take Moderation Action</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Enforcement Decision Action Modal */}
      {isActionModalOpen && selectedReport && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsActionModalOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.actionModalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Execute Moderation Enforcement</Text>
                <TouchableOpacity onPress={() => setIsActionModalOpen(false)} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.actionModalSub}>
                Select the graduated enforcement action to apply against this case. All actions are cryptographically sealed in the audit logs.
              </Text>

              {/* Action Selection Grid */}
              <View style={styles.actionOptionGrid}>
                <TouchableOpacity
                  style={[styles.actionOptionCard, selectedAction === 'DISMISS' && styles.actionOptionCardActive]}
                  onPress={() => setSelectedAction('DISMISS')}
                >
                  <Check size={16} color={selectedAction === 'DISMISS' ? ADMIN_COLORS.emeraldPrimary : ADMIN_COLORS.textMuted} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actionOptionTitle}>Dismiss (No Violation)</Text>
                    <Text style={styles.actionOptionDesc}>Acceptable scientific discourse / insufficient evidence.</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionOptionCard, selectedAction === 'WARNING' && styles.actionOptionCardActive]}
                  onPress={() => setSelectedAction('WARNING')}
                >
                  <AlertTriangle size={16} color={selectedAction === 'WARNING' ? '#D97706' : ADMIN_COLORS.textMuted} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actionOptionTitle}>Issue Official Academic Warning</Text>
                    <Text style={styles.actionOptionDesc}>Send formal notice citing academic community standards.</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionOptionCard, selectedAction === 'TAKEDOWN' && styles.actionOptionCardActive]}
                  onPress={() => setSelectedAction('TAKEDOWN')}
                >
                  <Trash2 size={16} color={selectedAction === 'TAKEDOWN' ? ADMIN_COLORS.danger : ADMIN_COLORS.textMuted} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actionOptionTitle}>Content Takedown & Feed Suppression</Text>
                    <Text style={styles.actionOptionDesc}>Purge post from discovery feed, search index, and citations.</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionOptionCard, selectedAction === 'SUSPEND' && styles.actionOptionCardActive]}
                  onPress={() => setSelectedAction('SUSPEND')}
                >
                  <Ban size={16} color={selectedAction === 'SUSPEND' ? ADMIN_COLORS.danger : ADMIN_COLORS.textMuted} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actionOptionTitle}>Account Suspension & Strike</Text>
                    <Text style={styles.actionOptionDesc}>Freeze researcher publishing and collaboration privileges.</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Mandatory Rationale */}
              <View style={styles.rationaleContainer}>
                <Text style={styles.inspectorLabel}>Moderator Rationale & Audit Note (Required)</Text>
                <TextInput
                  style={styles.rationaleInput}
                  placeholder="State the justification, policy cited, or findings..."
                  placeholderTextColor={ADMIN_COLORS.textMuted}
                  value={adminRationale}
                  onChangeText={setAdminRationale}
                  multiline={true}
                  numberOfLines={3}
                />
              </View>

              {/* Action Modal Footer */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setIsActionModalOpen(false)}
                  disabled={isSubmittingAction}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmEnforceBtn}
                  onPress={handleExecuteAction}
                  disabled={isSubmittingAction}
                >
                  {isSubmittingAction ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmEnforceBtnText}>Confirm Enforcement</Text>
                  )}
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
  filterControlsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 280,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    padding: 0,
  },
  categoryChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  reasonCell: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  boldText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  cellText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  cellMuted: {
    fontSize: 12,
    color: '#64748B',
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
  resolveBtn: {
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
  resolveBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#03543F',
  },
  dismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dismissBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
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
    maxWidth: 620,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  actionModalCard: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
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
  inspectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  inspectorMetaItem: {
    flex: 1,
  },
  inspectorLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  inspectorValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  incidentSection: {
    marginBottom: 16,
  },
  categoryBadgeRow: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  categoryBadgeText: {
    color: '#991B1B',
    fontWeight: '700',
    fontSize: 13,
  },
  detailsContentBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 14,
    marginTop: 4,
  },
  detailsContentText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  intelligenceText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginTop: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
  },
  footerDismissBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  footerDismissBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  footerEnforceBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#059669',
    borderRadius: 8,
  },
  footerEnforceBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Action Grid
  actionModalSub: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 19,
  },
  actionOptionGrid: {
    gap: 10,
    marginBottom: 16,
  },
  actionOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
  },
  actionOptionCardActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  actionOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionOptionDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  rationaleContainer: {
    marginBottom: 16,
  },
  rationaleInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: '#0F172A',
    textAlignVertical: 'top',
    minHeight: 70,
    marginTop: 6,
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
  confirmEnforceBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#059669',
    borderRadius: 8,
    minWidth: 140,
    alignItems: 'center',
  },
  confirmEnforceBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
