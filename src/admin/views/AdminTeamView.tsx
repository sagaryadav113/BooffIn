// ============================================================================
// BOOFFIN ADMIN PORTAL — TEAM MANAGEMENT & CO-ADMIN PROVISIONING WORKBENCH
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
import { adminSecurityService, ProvisionResult } from '../services/adminSecurityService';
import { AdminMember, AdminRole, AdminStatus } from '../types/roles';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { 
  UserPlus, 
  RefreshCw, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Key, 
  Copy, 
  Eye, 
  EyeOff, 
  Lock, 
  Crown, 
  Award, 
  UserX, 
  UserCheck,
  Check
} from 'lucide-react-native';

export const AdminTeamView: React.FC = () => {
  const { userId: currentUserId, role: currentUserRole } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<(AdminMember & { email?: string; fullName?: string })[]>([]);
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // 1. Provisioning Modal State
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [provisionFullName, setProvisionFullName] = useState('');
  const [provisionUsername, setProvisionUsername] = useState('');
  const [provisionRole, setProvisionRole] = useState<AdminRole>('SUPER_ADMIN');
  const [adminPassword, setAdminPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [isSubmittingProvision, setIsSubmittingProvision] = useState(false);

  // 2. Credentials Success Card State
  const [credentialsResult, setCredentialsResult] = useState<ProvisionResult | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // 3. Member Authority & Role Edit Modal State
  const [selectedMember, setSelectedMember] = useState<(AdminMember & { email?: string; fullName?: string }) | null>(null);
  const [editRole, setEditRole] = useState<AdminRole>('ADMIN');
  const [isSubmittingRoleChange, setIsSubmittingRoleChange] = useState(false);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const res = await adminSecurityService.listAdminMembers();
    if (res.error) {
      setErrorMessage(`Authorization / Query Error: ${res.error.message}`);
      setMembers([]);
    } else {
      setMembers(res.members);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleOpenProvisionModal = () => {
    setProvisionFullName('');
    setProvisionUsername('');
    setProvisionRole('SUPER_ADMIN');
    setAdminPassword('');
    setMfaCode('');
    setErrorMessage(null);
    setIsProvisionModalOpen(true);
  };

  const handleExecuteProvision = async () => {
    if (!provisionFullName.trim() || !provisionUsername.trim()) {
      setErrorMessage('Full name and username handle are required.');
      return;
    }

    setIsSubmittingProvision(true);
    setErrorMessage(null);

    const res = await adminSecurityService.provisionTeamMember({
      fullName: provisionFullName,
      username: provisionUsername,
      role: provisionRole,
    });

    setIsSubmittingProvision(false);

    if (res.error) {
      setErrorMessage(`Provisioning failed: ${res.error.message}`);
    } else if (res.result) {
      setIsProvisionModalOpen(false);
      setCredentialsResult(res.result);
      setActionSuccessMessage(`Team member ${res.result.fullName} provisioned successfully!`);
      loadMembers();
    }
  };

  const handleOpenEditModal = (member: AdminMember & { email?: string; fullName?: string }) => {
    setSelectedMember(member);
    setEditRole(member.role);
    setErrorMessage(null);
  };

  const handleExecuteRoleChange = async () => {
    if (!selectedMember || !currentUserId) return;
    setIsSubmittingRoleChange(true);
    setErrorMessage(null);

    const res = await adminSecurityService.updateAdminRole({
      memberId: selectedMember.id,
      targetUserId: selectedMember.user_id,
      newRole: editRole,
      currentUserId,
    });

    setIsSubmittingRoleChange(false);

    if (res.error) {
      setErrorMessage(res.error.message);
    } else {
      setActionSuccessMessage(`Role updated to ${editRole} for ${selectedMember.fullName || 'member'}.`);
      setSelectedMember(null);
      loadMembers();
    }
  };

  const handleToggleMemberStatus = async (member: AdminMember & { email?: string; fullName?: string }) => {
    if (!currentUserId) return;
    const nextStatus: AdminStatus = member.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE';

    const res = await adminSecurityService.updateAdminStatus({
      memberId: member.id,
      targetUserId: member.user_id,
      newStatus: nextStatus,
      currentUserId,
    });

    if (res.error) {
      setErrorMessage(res.error.message);
    } else {
      setActionSuccessMessage(`Admin access ${nextStatus === 'ACTIVE' ? 'activated' : 'deactivated'} for ${member.fullName || 'member'}.`);
      setSelectedMember(null);
      loadMembers();
    }
  };

  const columns: ColumnDef<AdminMember & { email?: string; fullName?: string }>[] = [
    {
      key: 'user_id',
      header: 'Team Member / Co-Admin',
      width: 260,
      render: (m) => (
        <View style={styles.memberCell}>
          <View style={[styles.memberAvatar, m.role === 'SUPER_ADMIN' && styles.superAdminAvatar]}>
            <Text style={[styles.memberAvatarText, m.role === 'SUPER_ADMIN' && styles.superAdminAvatarText]}>
              {(m.fullName || 'SA').substring(0, 2).toUpperCase()}
            </Text>
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.nameText}>{m.fullName || 'Administrator'}</Text>
              {m.role === 'SUPER_ADMIN' && <Crown size={12} color="#D97706" />}
            </View>
            <Text style={styles.emailText}>{m.email || `${m.user_id.slice(0, 10)}...`}</Text>
          </View>
        </View>
      ),
    },
    {
      key: 'role',
      header: 'Assigned Role & Authority',
      width: 190,
      render: (m) => (
        <AdminBadge
          label={m.role === 'SUPER_ADMIN' ? '👑 CO-ADMIN / SUPER' : m.role === 'ADMIN' ? '🛡️ ADMIN' : '👮 MODERATOR'}
          variant={m.role === 'SUPER_ADMIN' ? 'emerald' : m.role === 'ADMIN' ? 'info' : 'warning'}
          size="sm"
        />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 120,
      render: (m) => (
        <AdminBadge
          label={m.status}
          variant={m.status === 'ACTIVE' ? 'emerald' : 'danger'}
          size="sm"
        />
      ),
    },
    {
      key: 'created_at',
      header: 'Provisioned Date',
      width: 150,
      render: (m) => (
        <Text style={styles.cellMuted}>
          {new Date(m.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
      ),
    },
    {
      key: 'actions',
      header: 'Manage Authority',
      width: 160,
      render: (m) => (
        <TouchableOpacity
          style={styles.manageBtn}
          onPress={() => handleOpenEditModal(m)}
        >
          <Key size={12} color={ADMIN_COLORS.textSecondary} />
          <Text style={styles.manageBtnText}>Edit Authority</Text>
        </TouchableOpacity>
      ),
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.pageTitle}>Administrative Team & Access Control</Text>
          <Text style={styles.pageSubtitle}>
            Co-Admin provisioning, Role-Based Access Control (RBAC), and team credential governance
          </Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.provisionBtn} onPress={handleOpenProvisionModal}>
            <UserPlus size={15} color="#FFFFFF" />
            <Text style={styles.provisionBtnText}>+ Provision Co-Admin / Member</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.refreshBtn} onPress={loadMembers}>
            <RefreshCw size={14} color="#475569" />
          </TouchableOpacity>
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

      {/* Credentials Output Banner (Shown immediately after provisioning) */}
      {credentialsResult && (
        <View style={styles.credentialsCard}>
          <View style={styles.credentialsHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={18} color="#059669" />
              <Text style={styles.credentialsTitle}>
                Account Provisioned for {credentialsResult.fullName}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setCredentialsResult(null)} style={styles.closeCredsBtn}>
              <Text style={styles.closeCredsText}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.credentialsSub}>
            Share these generated credentials with your team member. On first login, they will be prompted to scan their Google Authenticator QR code.
          </Text>

          <View style={styles.credRowsBox}>
            {/* Email */}
            <View style={styles.credRow}>
              <Text style={styles.credLabel}>Login Work Email:</Text>
              <Text style={styles.credValue}>{credentialsResult.email}</Text>
              <TouchableOpacity
                style={styles.copyBtn}
                onPress={() => {
                  setCopiedEmail(true);
                  setTimeout(() => setCopiedEmail(false), 2000);
                }}
              >
                {copiedEmail ? <Check size={12} color="#059669" /> : <Copy size={12} color="#475569" />}
                <Text style={styles.copyBtnText}>{copiedEmail ? 'Copied' : 'Copy'}</Text>
              </TouchableOpacity>
            </View>

            {/* Password */}
            <View style={styles.credRow}>
              <Text style={styles.credLabel}>Temporary Password:</Text>
              <Text style={styles.credValue}>
                {showPassword ? credentialsResult.password : '••••••••••••••••'}
              </Text>
              <TouchableOpacity
                style={styles.revealBtn}
                onPress={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={12} color="#475569" /> : <Eye size={12} color="#475569" />}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.copyBtn}
                onPress={() => {
                  setCopiedPassword(true);
                  setTimeout(() => setCopiedPassword(false), 2000);
                }}
              >
                {copiedPassword ? <Check size={12} color="#059669" /> : <Copy size={12} color="#475569" />}
                <Text style={styles.copyBtnText}>{copiedPassword ? 'Copied' : 'Copy'}</Text>
              </TouchableOpacity>
            </View>

            {/* Role */}
            <View style={styles.credRow}>
              <Text style={styles.credLabel}>Assigned Authority:</Text>
              <AdminBadge label={credentialsResult.role} variant="emerald" size="sm" />
            </View>
          </View>
        </View>
      )}

      {/* Team Table Card */}
      <View style={styles.tableCard}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#059669" />
          </View>
        ) : (
          <AdminDataTable
            columns={columns}
            data={members}
            emptyMessage="No administrators configured in system."
          />
        )}
      </View>

      {/* Modal 1: Provision Co-Admin / Member */}
      {isProvisionModalOpen && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsProvisionModalOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <UserPlus size={18} color="#059669" />
                  <Text style={styles.modalTitle}>Provision New Team Member / Co-Admin</Text>
                </View>
                <TouchableOpacity onPress={() => setIsProvisionModalOpen(false)} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ marginBottom: 16 }} showsVerticalScrollIndicator={false}>
                {/* Full Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Syed Ahmed"
                    placeholderTextColor="#94A3B8"
                    value={provisionFullName}
                    onChangeText={setProvisionFullName}
                  />
                </View>

                {/* Handle & Domain Preview */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Work Handle (Auto-formatted)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. syed"
                    placeholderTextColor="#94A3B8"
                    value={provisionUsername}
                    onChangeText={setProvisionUsername}
                    autoCapitalize="none"
                  />
                  <Text style={styles.domainPreviewText}>
                    Assigned Email: <Text style={{ fontWeight: '700', color: '#059669' }}>
                      {provisionUsername ? `${provisionUsername.trim().toLowerCase()}@letsbooffin.com` : 'username@letsbooffin.com'}
                    </Text>
                  </Text>
                </View>

                {/* Role Selection */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Select Authority Level</Text>
                  <View style={styles.roleOptionGrid}>
                    <TouchableOpacity
                      style={[styles.roleOptionCard, provisionRole === 'SUPER_ADMIN' && styles.roleOptionCardActive]}
                      onPress={() => setProvisionRole('SUPER_ADMIN')}
                    >
                      <Crown size={16} color={provisionRole === 'SUPER_ADMIN' ? '#059669' : '#64748B'} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.roleOptionTitle}>Co-Admin (SUPER_ADMIN)</Text>
                        <Text style={styles.roleOptionDesc}>Full authority across all modules, team provisioning, and security.</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.roleOptionCard, provisionRole === 'ADMIN' && styles.roleOptionCardActive]}
                      onPress={() => setProvisionRole('ADMIN')}
                    >
                      <ShieldCheck size={16} color={provisionRole === 'ADMIN' ? '#059669' : '#64748B'} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.roleOptionTitle}>Administrator (ADMIN)</Text>
                        <Text style={styles.roleOptionDesc}>Full access to reports, verifications, user directory, and observability.</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.roleOptionCard, provisionRole === 'MODERATOR' && styles.roleOptionCardActive]}
                      onPress={() => setProvisionRole('MODERATOR')}
                    >
                      <Award size={16} color={provisionRole === 'MODERATOR' ? '#059669' : '#64748B'} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.roleOptionTitle}>Moderator (MODERATOR)</Text>
                        <Text style={styles.roleOptionDesc}>Queue management only (Trust & Safety reports & verification desk).</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Security Re-Auth Check */}
                <View style={styles.securityBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Lock size={14} color="#059669" />
                    <Text style={styles.securityBoxTitle}>Super Admin Authorization</Text>
                  </View>
                  <Text style={styles.securityBoxText}>
                    A high-entropy 16-character password will be cryptographically generated upon confirmation and logged into the compliance audit trail.
                  </Text>
                </View>
              </ScrollView>

              {/* Modal Footer */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setIsProvisionModalOpen(false)}
                  disabled={isSubmittingProvision}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmProvisionBtn}
                  onPress={handleExecuteProvision}
                  disabled={isSubmittingProvision}
                >
                  {isSubmittingProvision ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmProvisionBtnText}>Generate Credentials & Provision</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Modal 2: Edit Authority & Role */}
      {selectedMember && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedMember(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Key size={18} color="#059669" />
                  <Text style={styles.modalTitle}>Manage Authority: {selectedMember.fullName || 'Member'}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedMember(null)} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.editMemberSub}>
                Update role permissions or toggle active access. Changes take effect in real time.
              </Text>

              {/* Role Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Assigned Authority Level</Text>
                <View style={styles.roleOptionGrid}>
                  <TouchableOpacity
                    style={[styles.roleOptionCard, editRole === 'SUPER_ADMIN' && styles.roleOptionCardActive]}
                    onPress={() => setEditRole('SUPER_ADMIN')}
                  >
                    <Crown size={16} color={editRole === 'SUPER_ADMIN' ? '#059669' : '#64748B'} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.roleOptionTitle}>Co-Admin (SUPER_ADMIN)</Text>
                      <Text style={styles.roleOptionDesc}>Full Super Admin privileges.</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.roleOptionCard, editRole === 'ADMIN' && styles.roleOptionCardActive]}
                    onPress={() => setEditRole('ADMIN')}
                  >
                    <ShieldCheck size={16} color={editRole === 'ADMIN' ? '#059669' : '#64748B'} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.roleOptionTitle}>Administrator (ADMIN)</Text>
                      <Text style={styles.roleOptionDesc}>Standard operational authority.</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.roleOptionCard, editRole === 'MODERATOR' && styles.roleOptionCardActive]}
                    onPress={() => setEditRole('MODERATOR')}
                  >
                    <Award size={16} color={editRole === 'MODERATOR' ? '#059669' : '#64748B'} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.roleOptionTitle}>Moderator (MODERATOR)</Text>
                      <Text style={styles.roleOptionDesc}>Review and moderation access only.</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Status Toggle & Actions */}
              <View style={styles.statusActionBox}>
                <View>
                  <Text style={styles.statusActionTitle}>Account Access State</Text>
                  <Text style={styles.statusActionSub}>
                    Current status: <Text style={{ fontWeight: '700' }}>{selectedMember.status}</Text>
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.toggleStatusBtn,
                    selectedMember.status === 'ACTIVE' ? styles.deactivateBtn : styles.activateBtn
                  ]}
                  onPress={() => handleToggleMemberStatus(selectedMember)}
                >
                  {selectedMember.status === 'ACTIVE' ? (
                    <Text style={styles.deactivateBtnText}>Deactivate Access</Text>
                  ) : (
                    <Text style={styles.activateBtnText}>Re-Activate Access</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Modal Footer */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setSelectedMember(null)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmProvisionBtn}
                  onPress={handleExecuteRoleChange}
                  disabled={isSubmittingRoleChange}
                >
                  {isSubmittingRoleChange ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmProvisionBtnText}>Save Role Authority</Text>
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
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  provisionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  provisionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
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
  credentialsCard: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 18,
    marginBottom: 20,
  },
  credentialsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  credentialsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#065F46',
  },
  closeCredsBtn: {
    padding: 4,
  },
  closeCredsText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  credentialsSub: {
    fontSize: 12,
    color: '#047857',
    marginBottom: 14,
    lineHeight: 18,
  },
  credRowsBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  credRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  credLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    width: 150,
  },
  credValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'monospace',
    flex: 1,
  },
  copyBtn: {
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
  copyBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  revealBtn: {
    padding: 4,
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
  memberCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#DEF7EC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BCF0DA',
  },
  superAdminAvatar: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  memberAvatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#03543F',
  },
  superAdminAvatarText: {
    color: '#92400E',
  },
  nameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  emailText: {
    fontSize: 11,
    color: '#64748B',
  },
  cellMuted: {
    fontSize: 12,
    color: '#64748B',
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  manageBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    maxHeight: '90%',
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
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 16,
    color: '#94A3B8',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  domainPreviewText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  roleOptionGrid: {
    gap: 8,
  },
  roleOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
  },
  roleOptionCardActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  roleOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  roleOptionDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  securityBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    marginTop: 6,
  },
  securityBoxTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#03543F',
  },
  securityBoxText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
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
  confirmProvisionBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#059669',
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmProvisionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  editMemberSub: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
  },
  statusActionBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    marginBottom: 16,
  },
  statusActionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusActionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  toggleStatusBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deactivateBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deactivateBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#991B1B',
  },
  activateBtn: {
    backgroundColor: '#DEF7EC',
    borderWidth: 1,
    borderColor: '#BCF0DA',
  },
  activateBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#03543F',
  },
});
