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
  Linking,
  useWindowDimensions,
} from 'react-native';
import { ADMIN_COLORS } from '../lib/constants';
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
  Clock,
  AlertTriangle,
  Mail,
  UserCheck,
  Filter,
  FileText,
  Send,
  ExternalLink,
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

    const assignedMember = teamMembers.find((m) => m.user_id === selectedAssignee);
    const assignedName = assignedMember?.fullName || assignedMember?.full_name || (selectedAssignee ? 'Co-Admin' : null);

    const res = await adminSupportService.updateTicket({
      ticketId: selectedTicket.id,
      status: newStatus || selectedTicket.status,
      assignedTo: selectedAssignee || null,
      assignedName: assignedName,
      resolutionNotes: resolutionNotes.trim() || undefined,
    });

    setUpdating(false);

    if (res.error) {
      setErrorMessage(`Update Failed: ${res.error.message}`);
    } else {
      setActionSuccessMessage(`Ticket ${selectedTicket.ticket_number} updated successfully.`);
      setSelectedTicket(null);
      loadTickets();
    }
  };

  const handleEmailReply = (email: string, ticketNum: string, subject: string) => {
    const mailtoUrl = `mailto:${email}?subject=Re: [${ticketNum}] ${encodeURIComponent(subject)}&body=Dear Researcher,%0D%0A%0D%0AThank you for contacting BooffIn Support.%0D%0A%0D%0A`;
    Linking.openURL(mailtoUrl);
  };

  // Table Columns
  const columns: ColumnDef<SupportTicket>[] = [
    {
      key: 'ticket_number',
      header: 'Ticket #',
      width: 120,
      render: (t) => (
        <View style={styles.ticketNumPill}>
          <Text style={styles.ticketNumText}>{t.ticket_number}</Text>
        </View>
      ),
    },
    {
      key: 'subject',
      header: 'Subject & Inquiry',
      width: 260,
      render: (t) => (
        <View>
          <Text style={styles.boldText} numberOfLines={1}>{t.subject}</Text>
          <Text style={styles.cellMuted} numberOfLines={1}>{t.message_body}</Text>
        </View>
      ),
    },
    {
      key: 'sender_email',
      header: 'Sender / Researcher',
      width: 200,
      render: (t) => (
        <View>
          <Text style={styles.cellText}>{t.sender_name || 'Researcher'}</Text>
          <Text style={styles.emailText}>{t.sender_email}</Text>
        </View>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      width: 130,
      render: (t) => (
        <AdminBadge
          label={t.category}
          variant="neutral"
          size="sm"
        />
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      width: 110,
      render: (t) => (
        <AdminBadge
          label={t.priority}
          variant={
            t.priority === 'URGENT'
              ? 'danger'
              : t.priority === 'HIGH'
              ? 'warning'
              : t.priority === 'LOW'
              ? 'neutral'
              : 'info'
          }
          size="sm"
        />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 120,
      render: (t) => (
        <AdminBadge
          label={t.status}
          variant={
            t.status === 'NEW'
              ? 'warning'
              : t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED'
              ? 'info'
              : 'emerald'
          }
          size="sm"
        />
      ),
    },
    {
      key: 'assigned_name',
      header: 'Assignee',
      width: 140,
      render: (t) => (
        <Text style={styles.cellText}>{t.assigned_name || '— Unassigned'}</Text>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 120,
      render: (t) => (
        <TouchableOpacity
          style={styles.inspectBtn}
          onPress={() => handleOpenTicket(t)}
        >
          <Eye size={12} color={ADMIN_COLORS.textSecondary} />
          <Text style={styles.inspectBtnText}>Manage</Text>
        </TouchableOpacity>
      ),
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={[styles.headerRow, isMobile && styles.headerRowMobile]}>
        <View>
          <Text style={styles.pageTitle}>Support & Email Inquiries Desk</Text>
          <Text style={styles.pageSubtitle}>
            Official support inbox (support@letsbooffin.com) • In-app researcher problem reports
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={loadTickets}>
          <RefreshCw size={14} color={ADMIN_COLORS.textSecondary} />
          <Text style={styles.refreshBtnText}>Refresh Inbox</Text>
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

      {/* Filter Tabs */}
      <ScrollView horizontal={isMobile} showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
        <View style={styles.tabsRow}>
          {(['ALL', 'NEW', 'IN_PROGRESS', 'RESOLVED'] as const).map((st) => (
            <TouchableOpacity
              key={st}
              style={[styles.tabBtn, statusFilter === st && styles.tabBtnActive]}
              onPress={() => setStatusFilter(st)}
            >
              <Text style={[styles.tabBtnText, statusFilter === st && styles.tabBtnTextActive]}>
                {st === 'ALL' ? 'All Inquiries' : st === 'NEW' ? 'New / Open' : st === 'IN_PROGRESS' ? 'In Progress' : 'Resolved'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Search & Category Filter Bar */}
      <View style={[styles.searchBarRow, isMobile && styles.searchBarRowMobile]}>
        <View style={styles.searchWrapper}>
          <Search size={15} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search ticket #, email, or keyword..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={loadTickets}
          />
        </View>

        <TouchableOpacity style={styles.searchBtn} onPress={loadTickets}>
          <Text style={styles.searchBtnText}>Filter</Text>
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
            data={tickets}
            emptyMessage="No support tickets matching current filters. All researcher inquiries are resolved."
          />
        )}
      </View>

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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Inbox size={18} color={ADMIN_COLORS.emeraldPrimary} />
                  <Text style={styles.modalTitle}>Ticket {selectedTicket.ticket_number}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedTicket(null)} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {/* Inquiry Details Card */}
                <View style={styles.ticketDetailBox}>
                  <View style={styles.metaRow}>
                    <Text style={styles.ticketSubject}>{selectedTicket.subject}</Text>
                    <AdminBadge label={selectedTicket.priority} variant={selectedTicket.priority === 'URGENT' ? 'danger' : 'info'} size="sm" />
                  </View>

                  <Text style={styles.senderSub}>
                    From: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{selectedTicket.sender_name || 'Researcher'}</Text> ({selectedTicket.sender_email})
                  </Text>
                  <Text style={styles.submittedAt}>Received: {new Date(selectedTicket.created_at).toLocaleString()}</Text>

                  <View style={styles.messageBox}>
                    <Text style={styles.messageBodyText}>{selectedTicket.message_body}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.replyEmailBtn}
                    onPress={() => handleEmailReply(selectedTicket.sender_email, selectedTicket.ticket_number, selectedTicket.subject)}
                  >
                    <Mail size={14} color="#059669" />
                    <Text style={styles.replyEmailBtnText}>Open Email Reply (to {selectedTicket.sender_email})</Text>
                    <ExternalLink size={12} color="#059669" />
                  </TouchableOpacity>
                </View>

                {/* Assignment Section */}
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionLabel}>Assign to Team Member</Text>
                  <View style={styles.assigneeList}>
                    {teamMembers.map((m) => (
                      <TouchableOpacity
                        key={m.user_id}
                        style={[styles.assigneeChip, selectedAssignee === m.user_id && styles.assigneeChipActive]}
                        onPress={() => setSelectedAssignee(m.user_id)}
                      >
                        <Text style={[styles.assigneeChipText, selectedAssignee === m.user_id && styles.assigneeChipTextActive]}>
                          {m.fullName || m.full_name || m.email?.split('@')[0]} ({m.role})
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Resolution Notes Section */}
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionLabel}>Internal Resolution Notes / Action Taken</Text>
                  <TextInput
                    style={styles.notesInput}
                    placeholder="Log internal notes on how this inquiry was addressed..."
                    placeholderTextColor="#94A3B8"
                    value={resolutionNotes}
                    onChangeText={setResolutionNotes}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </ScrollView>

              {/* Modal Footer Actions */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setSelectedTicket(null)}
                >
                  <Text style={styles.cancelBtnText}>Close</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.inProgressBtn}
                  onPress={() => handleUpdateTicket('IN_PROGRESS')}
                  disabled={updating}
                >
                  <Text style={styles.inProgressBtnText}>Mark In Progress</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resolveBtn}
                  onPress={() => handleUpdateTicket('RESOLVED')}
                  disabled={updating}
                >
                  <Text style={styles.resolveBtnText}>✓ Mark Resolved</Text>
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
  headerRowMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 10,
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
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successText: {
    color: '#065F46',
    fontSize: 13,
    fontWeight: '600',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '600',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
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
  searchBarRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  searchBarRowMobile: {
    flexDirection: 'column',
    gap: 8,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
  },
  searchBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
  },
  centerContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ticketNumPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  ticketNumText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E293B',
    fontFamily: 'monospace',
  },
  boldText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  cellText: {
    fontSize: 13,
    color: '#334155',
  },
  cellMuted: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  emailText: {
    fontSize: 12,
    color: '#059669',
    marginTop: 1,
  },
  inspectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  inspectBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 22,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
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
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '700',
  },
  modalScroll: {
    marginBottom: 16,
  },
  ticketDetailBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  ticketSubject: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  senderSub: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 2,
  },
  submittedAt: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 10,
  },
  messageBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  messageBodyText: {
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 20,
  },
  replyEmailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  replyEmailBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  sectionBox: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  assigneeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  assigneeChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  assigneeChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  assigneeChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  assigneeChipTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  notesInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: '#0F172A',
    textAlignVertical: 'top',
    minHeight: 60,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 14,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  inProgressBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 6,
  },
  inProgressBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  resolveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#059669',
    borderRadius: 6,
  },
  resolveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
