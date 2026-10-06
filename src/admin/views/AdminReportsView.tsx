// ============================================================================
// BOOFFIN ADMIN PORTAL — TRUST & SAFETY REPORTS WORKBENCH
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
  useWindowDimensions 
} from 'react-native';
import { ADMIN_COLORS, ADMIN_RADII } from '../lib/constants';
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
  Search,
  X,
  FileText
} from 'lucide-react-native';

type CategoryFilter = 'ALL' | 'SCIENTIFIC_INTEGRITY' | 'COPYRIGHT' | 'HARASSMENT' | 'DECEPTIVE_AI' | 'SPAM';

export const AdminReportsView: React.FC = () => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

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
        setActionSuccessMessage(`Report ${selectedReport.id.slice(0, 8)} marked as dismissed.`);
      } else if (selectedAction === 'WARNING') {
        const res = await adminReportService.resolveReport(selectedReport.id, 'RESOLVED', adminRationale || 'Official academic warning issued');
        if (res.error) throw res.error;
        setActionSuccessMessage(`Academic warning recorded and report resolved.`);
      } else if (selectedAction === 'TAKEDOWN') {
        if (selectedReport.post_id) {
          await adminModerationService.removePost(selectedReport.post_id, adminRationale || 'Content takedown following community report violation');
        }
        const res = await adminReportService.resolveReport(selectedReport.id, 'RESOLVED', adminRationale || 'Violating content removed from platform');
        if (res.error) throw res.error;
        setActionSuccessMessage(`Content removed and incident case closed.`);
      } else if (selectedAction === 'SUSPEND') {
        const res = await adminReportService.resolveReport(selectedReport.id, 'RESOLVED', adminRationale || 'Account suspended for repeated violation');
        if (res.error) throw res.error;
        setActionSuccessMessage(`Suspension action recorded to platform audit log.`);
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
      header: 'VIOLATION CATEGORY',
      width: 200,
      render: (r) => (
        <View style={styles.reasonCell}>
          <Flag size={13} color={ADMIN_COLORS.statusDangerText} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.boldText} numberOfLines={1}>{r.reason}</Text>
            <Text style={styles.cellMuted}>ID #{r.id.slice(0, 8)}</Text>
          </View>
        </View>
      ),
    },
    {
      key: 'details',
      header: 'SUBMITTER EVIDENCE',
      width: 280,
      render: (r) => (
        <Text style={styles.cellText} numberOfLines={2}>
          {r.details || 'No specific textual narrative provided.'}
        </Text>
      ),
    },
    {
      key: 'status',
      header: 'STATE',
      width: 120,
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
      header: 'REPORTED',
      width: 120,
      render: (r) => (
        <Text style={styles.cellMuted}>
          {new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
      ),
    },
    {
      key: 'actions',
      header: 'ENFORCEMENT',
      width: 200,
      align: 'right',
      render: (r) => (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionOutlineBtn}
            onPress={() => setSelectedReport(r)}
          >
            <Eye size={11} color={ADMIN_COLORS.textSecondary} />
            <Text style={styles.actionOutlineBtnText}>Inspect</Text>
          </TouchableOpacity>

          {r.status === 'PENDING' ? (
            <>
              <TouchableOpacity
                style={styles.actionEmeraldBtn}
                onPress={() => handleOpenActionModal(r, 'TAKEDOWN')}
              >
                <ShieldAlert size={11} color={ADMIN_COLORS.emeraldPrimary} />
                <Text style={styles.actionEmeraldBtnText}>Enforce</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionDangerBtn}
                onPress={() => handleOpenActionModal(r, 'DISMISS')}
              >
                <XCircle size={11} color={ADMIN_COLORS.statusDangerText} />
                <Text style={styles.actionDangerBtnText}>Dismiss</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.cellMuted}>Resolved</Text>
          )}
        </View>
      ),
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerSection}>
        <View>
          <Text style={styles.pageTitle}>Trust & Safety Queue</Text>
          <Text style={styles.pageSubtitle}>
            Incident triage and enforcement workbench • public.reports ({filteredReports.length} queued)
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

      {/* Unified Search & Status Filter Toolbar */}
      <View style={styles.toolbarCard}>
        {/* Status Segmented Control */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segmentBtn, statusFilter === 'PENDING' && styles.segmentBtnActive]}
            onPress={() => setStatusFilter('PENDING')}
          >
            <Text style={[styles.segmentText, statusFilter === 'PENDING' && styles.segmentTextActive]}>
              Pending Review
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, statusFilter === 'RESOLVED' && styles.segmentBtnActive]}
            onPress={() => setStatusFilter('RESOLVED')}
          >
            <Text style={[styles.segmentText, statusFilter === 'RESOLVED' && styles.segmentTextActive]}>
              Resolved
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, statusFilter === undefined && styles.segmentBtnActive]}
            onPress={() => setStatusFilter(undefined)}
          >
            <Text style={[styles.segmentText, statusFilter === undefined && styles.segmentTextActive]}>
              All
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={styles.searchInputGroup}>
          <Search size={14} color={ADMIN_COLORS.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search report reason, ID, or keywords..."
            placeholderTextColor={ADMIN_COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={13} color={ADMIN_COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.refreshIconBtn} onPress={() => loadReports(statusFilter)}>
          <RefreshCw size={13} color={ADMIN_COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Category Triage Filter Pills */}
      <View style={styles.categoryPillsRow}>
        <TouchableOpacity
          style={[styles.catPill, categoryFilter === 'ALL' && styles.catPillActive]}
          onPress={() => setCategoryFilter('ALL')}
        >
          <Text style={[styles.catPillText, categoryFilter === 'ALL' && styles.catPillTextActive]}>All Queues</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.catPill, categoryFilter === 'SCIENTIFIC_INTEGRITY' && styles.catPillActive]}
          onPress={() => setCategoryFilter('SCIENTIFIC_INTEGRITY')}
        >
          <Text style={[styles.catPillText, categoryFilter === 'SCIENTIFIC_INTEGRITY' && styles.catPillTextActive]}>
            Scientific Integrity
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.catPill, categoryFilter === 'COPYRIGHT' && styles.catPillActive]}
          onPress={() => setCategoryFilter('COPYRIGHT')}
        >
          <Text style={[styles.catPillText, categoryFilter === 'COPYRIGHT' && styles.catPillTextActive]}>
            Copyright & IP
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.catPill, categoryFilter === 'DECEPTIVE_AI' && styles.catPillActive]}
          onPress={() => setCategoryFilter('DECEPTIVE_AI')}
        >
          <Text style={[styles.catPillText, categoryFilter === 'DECEPTIVE_AI' && styles.catPillTextActive]}>
            Deceptive AI
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.catPill, categoryFilter === 'HARASSMENT' && styles.catPillActive]}
          onPress={() => setCategoryFilter('HARASSMENT')}
        >
          <Text style={[styles.catPillText, categoryFilter === 'HARASSMENT' && styles.catPillTextActive]}>
            Harassment
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.catPill, categoryFilter === 'SPAM' && styles.catPillActive]}
          onPress={() => setCategoryFilter('SPAM')}
        >
          <Text style={[styles.catPillText, categoryFilter === 'SPAM' && styles.catPillTextActive]}>
            Spam
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content: Mobile Record Cards vs Desktop Table */}
      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color={ADMIN_COLORS.emeraldPrimary} />
          <Text style={styles.loadingText}>Loading safety queue...</Text>
        </View>
      ) : isMobile ? (
        /* Mobile Structured Record Cards */
        <View style={styles.mobileListContainer}>
          {filteredReports.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Queue is Clean</Text>
              <Text style={styles.emptySub}>No pending incidents match current filters.</Text>
            </View>
          ) : (
            filteredReports.map((r) => (
              <View key={r.id} style={styles.recordCard}>
                <View style={styles.recordHeader}>
                  <View style={styles.recordCategoryGroup}>
                    <Flag size={13} color={ADMIN_COLORS.statusDangerText} />
                    <Text style={styles.boldText}>{r.reason}</Text>
                  </View>
                  <AdminBadge
                    label={r.status}
                    variant={r.status === 'PENDING' ? 'warning' : 'emerald'}
                    size="sm"
                  />
                </View>

                <Text style={styles.recordDetailText} numberOfLines={2}>
                  {r.details || 'No detailed evidence text provided.'}
                </Text>

                <View style={styles.recordFooter}>
                  <Text style={styles.cellMuted}>ID #{r.id.slice(0, 8)}</Text>
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.actionOutlineBtn}
                      onPress={() => setSelectedReport(r)}
                    >
                      <Eye size={11} color={ADMIN_COLORS.textSecondary} />
                      <Text style={styles.actionOutlineBtnText}>Inspect</Text>
                    </TouchableOpacity>

                    {r.status === 'PENDING' && (
                      <TouchableOpacity
                        style={styles.actionEmeraldBtn}
                        onPress={() => handleOpenActionModal(r, 'TAKEDOWN')}
                      >
                        <ShieldAlert size={11} color={ADMIN_COLORS.emeraldPrimary} />
                        <Text style={styles.actionEmeraldBtnText}>Enforce</Text>
                      </TouchableOpacity>
                    )}
                  </View>
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
            data={filteredReports}
            emptyMessage="No reports found matching your criteria."
          />
        </View>
      )}

      {/* Incident Inspector Modal */}
      {selectedReport && !isActionModalOpen && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedReport(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderTitleRow}>
                  <ShieldAlert size={16} color={ADMIN_COLORS.statusDangerText} />
                  <Text style={styles.modalTitle}>Incident Case #{selectedReport.id.slice(0, 8)}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedReport(null)} style={styles.closeBtn}>
                  <X size={16} color={ADMIN_COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.metaGrid}>
                  <View style={styles.metaCard}>
                    <Text style={styles.inspectorLabel}>Status</Text>
                    <AdminBadge label={selectedReport.status} variant={selectedReport.status === 'PENDING' ? 'warning' : 'emerald'} size="sm" />
                  </View>
                  <View style={styles.metaCard}>
                    <Text style={styles.inspectorLabel}>Submitted</Text>
                    <Text style={styles.metaVal}>{new Date(selectedReport.created_at).toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.metaCard}>
                    <Text style={styles.inspectorLabel}>Target Entity</Text>
                    <Text style={styles.metaVal}>
                      {selectedReport.post_id ? `Post #${selectedReport.post_id.slice(0, 8)}` : 'Profile'}
                    </Text>
                  </View>
                </View>

                <View style={styles.incidentSection}>
                  <Text style={styles.inspectorLabel}>Violation Category</Text>
                  <View style={styles.categoryTag}>
                    <Text style={styles.categoryTagText}>{selectedReport.reason}</Text>
                  </View>
                </View>

                <View style={styles.incidentSection}>
                  <Text style={styles.inspectorLabel}>Submitter Narrative & Evidence</Text>
                  <View style={styles.detailsContentBox}>
                    <Text style={styles.detailsContentText}>
                      {selectedReport.details || 'No additional narrative submitted.'}
                    </Text>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.actionOutlineBtn}
                  onPress={() => setSelectedReport(null)}
                >
                  <Text style={styles.actionOutlineBtnText}>Close</Text>
                </TouchableOpacity>
                {selectedReport.status === 'PENDING' && (
                  <TouchableOpacity
                    style={styles.primaryActionBtn}
                    onPress={() => {
                      const rep = selectedReport;
                      setSelectedReport(null);
                      handleOpenActionModal(rep, 'TAKEDOWN');
                    }}
                  >
                    <Text style={styles.primaryActionBtnText}>Take Action</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Enforcement Decision Modal */}
      {isActionModalOpen && selectedReport && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsActionModalOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderTitleRow}>
                  <ShieldAlert size={16} color={ADMIN_COLORS.emeraldPrimary} />
                  <Text style={styles.modalTitle}>Enforce Moderation Action</Text>
                </View>
                <TouchableOpacity onPress={() => setIsActionModalOpen(false)} style={styles.closeBtn}>
                  <X size={16} color={ADMIN_COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.inspectorLabel}>Select Resolution Type</Text>
                <View style={styles.actionTypeGrid}>
                  <TouchableOpacity
                    style={[styles.actionOption, selectedAction === 'DISMISS' && styles.actionOptionActive]}
                    onPress={() => setSelectedAction('DISMISS')}
                  >
                    <Text style={[styles.actionOptionTitle, selectedAction === 'DISMISS' && styles.actionOptionTitleActive]}>
                      Dismiss Report
                    </Text>
                    <Text style={styles.actionOptionSub}>No platform violation identified</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionOption, selectedAction === 'WARNING' && styles.actionOptionActive]}
                    onPress={() => setSelectedAction('WARNING')}
                  >
                    <Text style={[styles.actionOptionTitle, selectedAction === 'WARNING' && styles.actionOptionTitleActive]}>
                      Issue Warning
                    </Text>
                    <Text style={styles.actionOptionSub}>Formal academic warning to user</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionOption, selectedAction === 'TAKEDOWN' && styles.actionOptionActive]}
                    onPress={() => setSelectedAction('TAKEDOWN')}
                  >
                    <Text style={[styles.actionOptionTitle, selectedAction === 'TAKEDOWN' && styles.actionOptionTitleActive]}>
                      Takedown Content
                    </Text>
                    <Text style={styles.actionOptionSub}>Remove post / discussion item</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionOption, selectedAction === 'SUSPEND' && styles.actionOptionActive]}
                    onPress={() => setSelectedAction('SUSPEND')}
                  >
                    <Text style={[styles.actionOptionTitle, selectedAction === 'SUSPEND' && styles.actionOptionTitleActive]}>
                      Suspend Account
                    </Text>
                    <Text style={styles.actionOptionSub}>Disable researcher access</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.inspectorLabel, { marginTop: 12 }]}>Administrative Rationale</Text>
                <TextInput
                  style={styles.rationaleInput}
                  placeholder="State compliance justification for the audit trail..."
                  placeholderTextColor={ADMIN_COLORS.textMuted}
                  value={adminRationale}
                  onChangeText={setAdminRationale}
                  multiline={true}
                  numberOfLines={3}
                />
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.actionOutlineBtn}
                  onPress={() => setIsActionModalOpen(false)}
                >
                  <Text style={styles.actionOutlineBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryActionBtn, isSubmittingAction && { opacity: 0.6 }]}
                  onPress={handleExecuteAction}
                  disabled={isSubmittingAction}
                >
                  {isSubmittingAction ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryActionBtnText}>Execute Action</Text>
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
    marginBottom: 10,
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
  searchInputGroup: {
    flex: 1,
    minWidth: 200,
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
  refreshIconBtn: {
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    backgroundColor: ADMIN_COLORS.bgSurface,
    padding: 7,
    borderRadius: ADMIN_RADII.button,
  },
  categoryPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  catPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: ADMIN_RADII.badge,
    backgroundColor: ADMIN_COLORS.bgSurface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
  },
  catPillActive: {
    backgroundColor: ADMIN_COLORS.bgActive,
    borderColor: ADMIN_COLORS.emeraldBorder,
  },
  catPillText: {
    fontSize: 11,
    fontWeight: '500',
    color: ADMIN_COLORS.textSecondary,
  },
  catPillTextActive: {
    color: ADMIN_COLORS.emeraldPrimary,
    fontWeight: '600',
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
  reasonCell: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  boldText: {
    fontSize: 12,
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
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
    paddingVertical: 7,
    borderRadius: ADMIN_RADII.button,
  },
  primaryActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: ADMIN_COLORS.textInverse,
  },
  // Mobile Card Styles
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
    marginBottom: 6,
  },
  recordCategoryGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  recordDetailText: {
    fontSize: 12,
    color: ADMIN_COLORS.textSecondary,
    lineHeight: 17,
    marginBottom: 8,
  },
  recordFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: ADMIN_COLORS.borderSubtle,
    paddingTop: 8,
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
    marginBottom: 12,
  },
  metaCard: {
    flex: 1,
    minWidth: '30%',
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
  incidentSection: {
    marginBottom: 12,
  },
  categoryTag: {
    backgroundColor: ADMIN_COLORS.statusDangerBg,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.statusDangerBorder,
    borderRadius: ADMIN_RADII.badge,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  categoryTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: ADMIN_COLORS.statusDangerText,
  },
  detailsContentBox: {
    backgroundColor: ADMIN_COLORS.bgCanvas,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.button,
    padding: 10,
    marginTop: 4,
  },
  detailsContentText: {
    fontSize: 12,
    color: ADMIN_COLORS.textSecondary,
    lineHeight: 17,
  },
  actionTypeGrid: {
    gap: 6,
    marginTop: 4,
  },
  actionOption: {
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.button,
    padding: 10,
    backgroundColor: ADMIN_COLORS.bgCanvas,
  },
  actionOptionActive: {
    borderColor: ADMIN_COLORS.emeraldPrimary,
    backgroundColor: ADMIN_COLORS.bgActive,
  },
  actionOptionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
  },
  actionOptionTitleActive: {
    color: ADMIN_COLORS.emeraldPrimary,
  },
  actionOptionSub: {
    fontSize: 11,
    color: ADMIN_COLORS.textSecondary,
    marginTop: 1,
  },
  rationaleInput: {
    backgroundColor: ADMIN_COLORS.bgCanvas,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.input,
    padding: 8,
    fontSize: 12,
    color: ADMIN_COLORS.textPrimary,
    marginTop: 4,
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
