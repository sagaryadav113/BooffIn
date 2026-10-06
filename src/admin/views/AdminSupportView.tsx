// ============================================================================
// BOOFFIN ADMIN PORTAL — RESEARCHER SUPPORT DESK & TICKETS
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
  useWindowDimensions,
} from 'react-native';
import { ADMIN_COLORS, ADMIN_RADII } from '../lib/constants';
import { AdminDataTable, ColumnDef } from '../components/AdminDataTable';
import { AdminBadge } from '../components/AdminBadge';
import { adminSupportService } from '../services/adminSupportService';
import { adminSecurityService } from '../services/adminSecurityService';
import { SupportTicket, SupportStatus, SupportPriority, SupportCategory } from '../types/support';
import {
  Inbox,
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Mail,
  UserCheck,
  Send,
  X
} from 'lucide-react-native';

export const AdminSupportView: React.FC = () => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<SupportStatus | 'ALL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<SupportCategory | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Selected ticket for inspection / resolution
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [updating, setUpdating] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const [ticketRes, teamRes] = await Promise.all([
      adminSupportService.listTickets({
        status: statusFilter,
        category: categoryFilter,
        search: search.trim() || undefined,
        limit: 50,
      }),
      adminSecurityService.listAdminMembers(),
    ]);

    if (ticketRes.error) {
      setErrorMessage(`Failed to load support tickets: ${ticketRes.error.message}`);
      setTickets([]);
      setTotalCount(0);
    } else {
      setTickets(ticketRes.tickets);
      setTotalCount(ticketRes.count);
    }

    if (!teamRes.error && teamRes.members) {
      setTeamMembers(teamRes.members);
    }

    setLoading(false);
  }, [statusFilter, categoryFilter, search]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleOpenTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setResolutionNotes(ticket.resolution_notes || '');
    setSelectedAssignee(ticket.assigned_to || '');
  };

  const handleUpdateTicket = async (newStatus?: SupportStatus) => {
    if (!selectedTicket) return;
    setUpdating(true);
    setActionSuccessMessage(null);
    setErrorMessage(null);

    const res = await adminSupportService.updateTicket({
      ticketId: selectedTicket.id,
      status: newStatus || selectedTicket.status,
      assignedTo: selectedAssignee || undefined,
      resolutionNotes: resolutionNotes.trim() || undefined,
    });

    setUpdating(false);

    if (res.error) {
      setErrorMessage(`Update failed: ${res.error.message}`);
    } else {
      setActionSuccessMessage(`Ticket #${selectedTicket.ticket_number} updated successfully.`);
      setSelectedTicket(null);
      loadTickets();
    }
  };

  const columns: ColumnDef<SupportTicket>[] = [
    {
      key: 'ticket_number',
      header: 'TICKET #',
      width: 110,
      render: (t) => (
        <Text style={styles.monoNumber}>#{t.ticket_number}</Text>
      ),
    },
    {
      key: 'subject',
      header: 'INQUIRY SUBJECT',
      width: 260,
      render: (t) => (
        <View>
          <Text style={styles.boldText} numberOfLines={1}>{t.subject}</Text>
          <Text style={styles.cellMuted} numberOfLines={1}>{t.sender_name || t.sender_email || 'Researcher'}</Text>
        </View>
      ),
    },
    {
      key: 'category',
      header: 'CATEGORY',
      width: 140,
      render: (t) => (
        <View style={styles.tag}>
          <Text style={styles.tagText}>{t.category.replace('_', ' ')}</Text>
        </View>
      ),
    },
    {
      key: 'priority',
      header: 'PRIORITY',
      width: 110,
      render: (t) => (
        <AdminBadge
          label={t.priority}
          variant={t.priority === 'URGENT' || t.priority === 'HIGH' ? 'danger' : t.priority === 'NORMAL' ? 'warning' : 'neutral'}
          size="sm"
        />
      ),
    },
    {
      key: 'status',
      header: 'STATUS',
      width: 120,
      render: (t) => (
        <AdminBadge
          label={t.status.replace('_', ' ')}
          variant={t.status === 'RESOLVED' || t.status === 'CLOSED' ? 'emerald' : t.status === 'IN_PROGRESS' ? 'info' : 'warning'}
          size="sm"
        />
      ),
    },
    {
      key: 'created_at',
      header: 'FILED',
      width: 110,
      render: (t) => (
        <Text style={styles.cellMuted}>
          {new Date(t.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </Text>
      ),
    },
    {
      key: 'actions',
      header: 'ACTION',
      width: 110,
      align: 'right',
      render: (t) => (
        <TouchableOpacity
          style={styles.actionOutlineBtn}
          onPress={() => handleOpenTicket(t)}
        >
          <Eye size={11} color={ADMIN_COLORS.textSecondary} />
          <Text style={styles.actionOutlineBtnText}>Review</Text>
        </TouchableOpacity>
      ),
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerSection}>
        <View>
          <Text style={styles.pageTitle}>Support Desk & Inquiries</Text>
          <Text style={styles.pageSubtitle}>
            Direct researcher assistance, bug reports, and credential triage ({totalCount} total tickets)
          </Text>
        </View>
      </View>

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

      {/* Unified Toolbar */}
      <View style={styles.toolbarCard}>
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segmentBtn, statusFilter === 'ALL' && styles.segmentBtnActive]}
            onPress={() => setStatusFilter('ALL')}
          >
            <Text style={[styles.segmentText, statusFilter === 'ALL' && styles.segmentTextActive]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, statusFilter === 'NEW' && styles.segmentBtnActive]}
            onPress={() => setStatusFilter('NEW')}
          >
            <Text style={[styles.segmentText, statusFilter === 'NEW' && styles.segmentTextActive]}>New</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, statusFilter === 'IN_PROGRESS' && styles.segmentBtnActive]}
            onPress={() => setStatusFilter('IN_PROGRESS')}
          >
            <Text style={[styles.segmentText, statusFilter === 'IN_PROGRESS' && styles.segmentTextActive]}>In Progress</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, statusFilter === 'RESOLVED' && styles.segmentBtnActive]}
            onPress={() => setStatusFilter('RESOLVED')}
          >
            <Text style={[styles.segmentText, statusFilter === 'RESOLVED' && styles.segmentTextActive]}>Resolved</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchInputGroup}>
          <Search size={14} color={ADMIN_COLORS.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tickets by subject, user, or #number..."
            placeholderTextColor={ADMIN_COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={loadTickets}
          />
        </View>

        <TouchableOpacity style={styles.refreshIconBtn} onPress={loadTickets}>
          <RefreshCw size={13} color={ADMIN_COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color={ADMIN_COLORS.emeraldPrimary} />
          <Text style={styles.loadingText}>Loading support tickets...</Text>
        </View>
      ) : isMobile ? (
        <View style={styles.mobileListContainer}>
          {tickets.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Support Inbox Clear</Text>
              <Text style={styles.emptySub}>No support requests match your active filters.</Text>
            </View>
          ) : (
            tickets.map((t) => (
              <View key={t.id} style={styles.recordCard}>
                <View style={styles.recordHeader}>
                  <Text style={styles.monoNumber}>#{t.ticket_number}</Text>
                  <AdminBadge
                    label={t.status.replace('_', ' ')}
                    variant={t.status === 'RESOLVED' || t.status === 'CLOSED' ? 'emerald' : t.status === 'IN_PROGRESS' ? 'info' : 'warning'}
                    size="sm"
                  />
                </View>
                <Text style={styles.boldText} numberOfLines={1}>{t.subject}</Text>
                <Text style={styles.cellMuted}>{t.sender_name || t.sender_email || 'Researcher'}</Text>

                <View style={styles.recordFooter}>
                  <AdminBadge
                    label={t.priority}
                    variant={t.priority === 'URGENT' || t.priority === 'HIGH' ? 'danger' : t.priority === 'NORMAL' ? 'warning' : 'neutral'}
                    size="sm"
                  />
                  <TouchableOpacity
                    style={styles.actionOutlineBtn}
                    onPress={() => handleOpenTicket(t)}
                  >
                    <Eye size={11} color={ADMIN_COLORS.textSecondary} />
                    <Text style={styles.actionOutlineBtnText}>Review Ticket</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      ) : (
        <View style={styles.tableWrapper}>
          <AdminDataTable
            columns={columns}
            data={tickets}
            emptyMessage="No support tickets match the selected filter."
          />
        </View>
      )}

      {/* Ticket Details & Resolution Modal */}
      {selectedTicket && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedTicket(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Ticket #{selectedTicket.ticket_number}</Text>
                  <Text style={styles.cellMuted}>{selectedTicket.subject}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedTicket(null)} style={styles.closeBtn}>
                  <X size={16} color={ADMIN_COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.metaGrid}>
                  <View style={styles.metaCard}>
                    <Text style={styles.inspectorLabel}>Submitter</Text>
                    <Text style={styles.metaVal}>{selectedTicket.sender_name || 'Anonymous'}</Text>
                    <Text style={styles.cellMuted}>{selectedTicket.sender_email || 'No email'}</Text>
                  </View>
                  <View style={styles.metaCard}>
                    <Text style={styles.inspectorLabel}>Priority</Text>
                    <AdminBadge label={selectedTicket.priority} variant={selectedTicket.priority === 'HIGH' || selectedTicket.priority === 'URGENT' ? 'danger' : 'warning'} size="sm" />
                  </View>
                  <View style={styles.metaCard}>
                    <Text style={styles.inspectorLabel}>Category</Text>
                    <Text style={styles.metaVal}>{selectedTicket.category.replace('_', ' ')}</Text>
                  </View>
                </View>

                <Text style={[styles.inspectorLabel, { marginTop: 8 }]}>Inquiry Narrative</Text>
                <View style={styles.narrativeBox}>
                  <Text style={styles.narrativeText}>{selectedTicket.message_body}</Text>
                </View>

                <Text style={[styles.inspectorLabel, { marginTop: 12 }]}>Resolution Notes & Actions</Text>
                <TextInput
                  style={styles.rationaleInput}
                  placeholder="Record resolution notes, outreach details, or diagnosis..."
                  placeholderTextColor={ADMIN_COLORS.textMuted}
                  value={resolutionNotes}
                  onChangeText={setResolutionNotes}
                  multiline={true}
                  numberOfLines={3}
                />
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.actionOutlineBtn}
                  onPress={() => setSelectedTicket(null)}
                >
                  <Text style={styles.actionOutlineBtnText}>Close</Text>
                </TouchableOpacity>

                {selectedTicket.status !== 'RESOLVED' && (
                  <TouchableOpacity
                    style={styles.actionEmeraldBtn}
                    onPress={() => handleUpdateTicket('RESOLVED')}
                    disabled={updating}
                  >
                    <CheckCircle2 size={12} color={ADMIN_COLORS.emeraldPrimary} />
                    <Text style={styles.actionEmeraldBtnText}>Mark Resolved</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.primaryActionBtn}
                  onPress={() => handleUpdateTicket()}
                  disabled={updating}
                >
                  {updating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryActionBtnText}>Save Updates</Text>
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
  monoNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: ADMIN_COLORS.emeraldPrimary,
    fontFamily: 'monospace',
  },
  boldText: {
    fontSize: 12,
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
  },
  cellMuted: {
    fontSize: 11,
    color: ADMIN_COLORS.textMuted,
  },
  tag: {
    backgroundColor: ADMIN_COLORS.bgCanvas,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.badge,
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
    color: ADMIN_COLORS.textSecondary,
    textTransform: 'uppercase',
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: ADMIN_RADII.button,
  },
  actionEmeraldBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: ADMIN_COLORS.emeraldPrimary,
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
  narrativeBox: {
    backgroundColor: ADMIN_COLORS.bgCanvas,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.button,
    padding: 10,
    marginTop: 4,
  },
  narrativeText: {
    fontSize: 12,
    color: ADMIN_COLORS.textSecondary,
    lineHeight: 17,
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
