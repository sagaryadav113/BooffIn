// ============================================================================
// BOOFFIN ADMIN PORTAL — TEAM & ACCESS CONTROL (RBAC)
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
import { adminSecurityService, ProvisionResult } from '../services/adminSecurityService';
import { AdminMember, AdminRole, AdminStatus } from '../types/roles';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { 
  UserPlus, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Key, 
  Copy, 
  Eye, 
  EyeOff, 
  Lock, 
  X,
  Check,
  Shield
} from 'lucide-react-native';

export const AdminTeamView: React.FC = () => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const { userId: currentUserId } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<(AdminMember & { email?: string; fullName?: string })[]>([]);
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // 1. Provisioning Modal State
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [provisionFullName, setProvisionFullName] = useState('');
  const [provisionUsername, setProvisionUsername] = useState('');
  const [provisionRole, setProvisionRole] = useState<AdminRole>('SUPER_ADMIN');
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

  // 4. View / Reset Credentials Recovery Modal State
  const [recoveryMember, setRecoveryMember] = useState<(AdminMember & { email?: string; fullName?: string }) | null>(null);
  const [generatedRecoveryPassword, setGeneratedRecoveryPassword] = useState<string | null>(null);
  const [showRecoveryPassword, setShowRecoveryPassword] = useState(false);
  const [copiedRecoveryEmail, setCopiedRecoveryEmail] = useState(false);
  const [copiedRecoveryPassword, setCopiedRecoveryPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [recoveryModalError, setRecoveryModalError] = useState<string | null>(null);

  // Cross-platform Clipboard Copy Helper
  const copyTextToClipboard = async (text: string, type: 'email' | 'password' | 'recEmail' | 'recPass') => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else if (typeof document !== 'undefined') {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.warn('Clipboard write warning:', err);
    }

    if (type === 'email') {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } else if (type === 'password') {
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    } else if (type === 'recEmail') {
      setCopiedRecoveryEmail(true);
      setTimeout(() => setCopiedRecoveryEmail(false), 2000);
    } else if (type === 'recPass') {
      setCopiedRecoveryPassword(true);
      setTimeout(() => setCopiedRecoveryPassword(false), 2000);
    }
  };

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

  const handleOpenRecoveryModal = (member: AdminMember & { email?: string; fullName?: string }) => {
    setRecoveryMember(member);
    setGeneratedRecoveryPassword(null);
    setShowRecoveryPassword(false);
    setCopiedRecoveryEmail(false);
    setCopiedRecoveryPassword(false);
    setIsResettingPassword(false);
    setRecoveryModalError(null);
    setErrorMessage(null);
  };

  const handleGenerateNewPassword = async () => {
    if (!recoveryMember) return;
    setIsResettingPassword(true);
    setRecoveryModalError(null);
    setErrorMessage(null);

    try {
      const res = await adminSecurityService.resetMemberPassword({
        targetUserId: recoveryMember.user_id,
        targetEmail: recoveryMember.email || `${recoveryMember.user_id}@letsbooffin.com`,
        targetFullName: recoveryMember.fullName || 'Team Member',
      });

      setIsResettingPassword(false);

      if (res.error) {
        setRecoveryModalError(`Failed to reset password: ${res.error.message}`);
      } else if (res.newPassword) {
        setGeneratedRecoveryPassword(res.newPassword);
        setShowRecoveryPassword(true);
        setActionSuccessMessage(`New temporary password generated for ${recoveryMember.fullName || 'member'}.`);
      }
    } catch (err: any) {
      setIsResettingPassword(false);
      setRecoveryModalError(err?.message || 'An unexpected error occurred while generating password.');
    }
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
      header: 'OPERATIONS SPECIALIST',
      width: 240,
      render: (m) => (
        <View style={styles.memberCell}>
          <View style={styles.memberAvatar}>
            <Text style={styles.memberAvatarText}>
              {(m.fullName || 'SA').substring(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.boldText} numberOfLines={1}>{m.fullName || 'Admin'}</Text>
            <Text style={styles.cellMuted} numberOfLines={1}>{m.email || 'operator@letsbooffin.com'}</Text>
          </View>
        </View>
      ),
    },
    {
      key: 'role',
      header: 'ASSIGNED ROLE',
      width: 140,
      render: (m) => (
        <View style={styles.roleTag}>
          <Text style={styles.roleTagText}>{m.role.replace('_', ' ')}</Text>
        </View>
      ),
    },
    {
      key: 'status',
      header: 'ACCESS STATE',
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
      key: 'user_id',
      header: '2FA ENFORCED',
      width: 120,
      render: (m) => (
        <AdminBadge
          label={m.status === 'ACTIVE' ? 'ENABLED' : 'OPTIONAL'}
          variant={m.status === 'ACTIVE' ? 'emerald' : 'neutral'}
          size="sm"
        />
      ),
    },
    {
      key: 'actions',
      header: 'SECURITY & RBAC',
      width: 240,
      align: 'right',
      render: (m) => (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionOutlineBtn}
            onPress={() => handleOpenEditModal(m)}
          >
            <Text style={styles.actionOutlineBtnText}>Edit Role</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionOutlineBtn}
            onPress={() => handleOpenRecoveryModal(m)}
          >
            <Key size={11} color={ADMIN_COLORS.textSecondary} />
            <Text style={styles.actionOutlineBtnText}>Credentials</Text>
          </TouchableOpacity>
        </View>
      ),
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <View>
          <Text style={styles.pageTitle}>Team & Access Control (RBAC)</Text>
          <Text style={styles.pageSubtitle}>
            Authoritative console permissions, operator accounts, and credentials management ({members.length} team members)
          </Text>
        </View>

        <TouchableOpacity style={styles.primaryActionBtn} onPress={handleOpenProvisionModal}>
          <UserPlus size={13} color={ADMIN_COLORS.textInverse} />
          <Text style={styles.primaryActionBtnText}>Provision Admin</Text>
        </TouchableOpacity>
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

      {/* Credentials Banner (after provisioning) */}
      {credentialsResult && (
        <View style={styles.credentialsBanner}>
          <View style={styles.credentialsBannerHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Key size={15} color={ADMIN_COLORS.emeraldPrimary} />
              <Text style={styles.credentialsBannerTitle}>New Administrator Credentials Issued</Text>
            </View>
            <TouchableOpacity onPress={() => setCredentialsResult(null)}>
              <X size={14} color={ADMIN_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.credentialsBannerSub}>
            Share these temporary credentials securely with {credentialsResult.fullName}.
          </Text>

          <View style={styles.credRow}>
            <Text style={styles.credLabel}>Login Email:</Text>
            <Text style={styles.credValue}>{credentialsResult.email}</Text>
            <TouchableOpacity style={styles.copyBtn} onPress={() => copyTextToClipboard(credentialsResult.email, 'email')}>
              <Text style={styles.copyBtnText}>{copiedEmail ? 'Copied' : 'Copy'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.credRow}>
            <Text style={styles.credLabel}>Temporary Password:</Text>
            <Text style={styles.credValue}>{showPassword ? credentialsResult.password : '••••••••••••'}</Text>
            <TouchableOpacity style={styles.copyBtn} onPress={() => setShowPassword(!showPassword)}>
              <Text style={styles.copyBtnText}>{showPassword ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.copyBtn} onPress={() => copyTextToClipboard(credentialsResult.password, 'password')}>
              <Text style={styles.copyBtnText}>{copiedPassword ? 'Copied' : 'Copy'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Main Content: Mobile Record Cards vs Desktop Table */}
      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color={ADMIN_COLORS.emeraldPrimary} />
          <Text style={styles.loadingText}>Loading operator directory...</Text>
        </View>
      ) : isMobile ? (
        <View style={styles.mobileListContainer}>
          {members.map((m) => (
            <View key={m.id} style={styles.recordCard}>
              <View style={styles.recordHeader}>
                <View style={styles.memberCell}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>
                      {(m.fullName || 'SA').substring(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.boldText}>{m.fullName || 'Admin'}</Text>
                    <Text style={styles.cellMuted}>{m.email || 'operator@letsbooffin.com'}</Text>
                  </View>
                </View>
                <AdminBadge
                  label={m.status}
                  variant={m.status === 'ACTIVE' ? 'emerald' : 'danger'}
                  size="sm"
                />
              </View>

              <View style={styles.mobileMetaRow}>
                <View style={styles.roleTag}>
                  <Text style={styles.roleTagText}>{m.role.replace('_', ' ')}</Text>
                </View>
                <AdminBadge
                  label={m.status === 'ACTIVE' ? '2FA ENFORCED' : '2FA OPTIONAL'}
                  variant={m.status === 'ACTIVE' ? 'emerald' : 'neutral'}
                  size="sm"
                />
              </View>

              <View style={styles.recordFooter}>
                <TouchableOpacity
                  style={styles.actionOutlineBtn}
                  onPress={() => handleOpenRecoveryModal(m)}
                >
                  <Key size={11} color={ADMIN_COLORS.textSecondary} />
                  <Text style={styles.actionOutlineBtnText}>Credentials</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionOutlineBtn}
                  onPress={() => handleOpenEditModal(m)}
                >
                  <Text style={styles.actionOutlineBtnText}>Edit Role</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.tableWrapper}>
          <AdminDataTable
            columns={columns}
            data={members}
            emptyMessage="No administrators configured."
          />
        </View>
      )}

      {/* Provisioning Modal */}
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <UserPlus size={16} color={ADMIN_COLORS.emeraldPrimary} />
                  <Text style={styles.modalTitle}>Provision New Operations Admin</Text>
                </View>
                <TouchableOpacity onPress={() => setIsProvisionModalOpen(false)} style={styles.closeBtn}>
                  <X size={16} color={ADMIN_COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.inputLabel}>Full Legal / Staff Name</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="e.g. Dr. Eleanor Vance"
                  placeholderTextColor={ADMIN_COLORS.textMuted}
                  value={provisionFullName}
                  onChangeText={setProvisionFullName}
                />

                <Text style={[styles.inputLabel, { marginTop: 10 }]}>Username Handle</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="e.g. eleanor.vance"
                  placeholderTextColor={ADMIN_COLORS.textMuted}
                  value={provisionUsername}
                  onChangeText={setProvisionUsername}
                  autoCapitalize="none"
                />

                <Text style={[styles.inputLabel, { marginTop: 10 }]}>Assign Security Role</Text>
                <View style={styles.roleSelectionGrid}>
                  {(['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT_LEAD', 'AUDITOR'] as AdminRole[]).map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.roleSelectBtn, provisionRole === r && styles.roleSelectBtnActive]}
                      onPress={() => setProvisionRole(r)}
                    >
                      <Text style={[styles.roleSelectText, provisionRole === r && styles.roleSelectTextActive]}>
                        {r.replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.actionOutlineBtn}
                  onPress={() => setIsProvisionModalOpen(false)}
                >
                  <Text style={styles.actionOutlineBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryActionBtn, isSubmittingProvision && { opacity: 0.6 }]}
                  onPress={handleExecuteProvision}
                  disabled={isSubmittingProvision}
                >
                  {isSubmittingProvision ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryActionBtnText}>Issue Provisioning</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Edit Role Modal */}
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
                <Text style={styles.modalTitle}>Modify Role — {selectedMember.fullName || 'Admin'}</Text>
                <TouchableOpacity onPress={() => setSelectedMember(null)} style={styles.closeBtn}>
                  <X size={16} color={ADMIN_COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.inputLabel}>Select Authority Tier</Text>
                <View style={styles.roleSelectionGrid}>
                  {(['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT_LEAD', 'AUDITOR'] as AdminRole[]).map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.roleSelectBtn, editRole === r && styles.roleSelectBtnActive]}
                      onPress={() => setEditRole(r)}
                    >
                      <Text style={[styles.roleSelectText, editRole === r && styles.roleSelectTextActive]}>
                        {r.replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.actionDangerBtn}
                  onPress={() => handleToggleMemberStatus(selectedMember)}
                >
                  <Text style={styles.actionDangerBtnText}>
                    {selectedMember.status === 'ACTIVE' ? 'Deactivate Access' : 'Activate Access'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.primaryActionBtn}
                  onPress={handleExecuteRoleChange}
                  disabled={isSubmittingRoleChange}
                >
                  {isSubmittingRoleChange ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryActionBtnText}>Save Role</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Credentials Recovery Modal */}
      {recoveryMember && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setRecoveryMember(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Key size={16} color={ADMIN_COLORS.emeraldPrimary} />
                  <Text style={styles.modalTitle}>Credentials Inspection & Reset</Text>
                </View>
                <TouchableOpacity onPress={() => setRecoveryMember(null)} style={styles.closeBtn}>
                  <X size={16} color={ADMIN_COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {recoveryModalError && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{recoveryModalError}</Text>
                  </View>
                )}

                <View style={styles.credRow}>
                  <Text style={styles.credLabel}>Login Email:</Text>
                  <Text style={styles.credValue}>{recoveryMember.email || `${recoveryMember.user_id}@letsbooffin.com`}</Text>
                  <TouchableOpacity style={styles.copyBtn} onPress={() => copyTextToClipboard(recoveryMember.email || '', 'recEmail')}>
                    <Text style={styles.copyBtnText}>{copiedRecoveryEmail ? 'Copied' : 'Copy'}</Text>
                  </TouchableOpacity>
                </View>

                {generatedRecoveryPassword ? (
                  <View style={[styles.credRow, { marginTop: 8 }]}>
                    <Text style={styles.credLabel}>New Password:</Text>
                    <Text style={styles.credValue}>{showRecoveryPassword ? generatedRecoveryPassword : '••••••••••••'}</Text>
                    <TouchableOpacity style={styles.copyBtn} onPress={() => setShowRecoveryPassword(!showRecoveryPassword)}>
                      <Text style={styles.copyBtnText}>{showRecoveryPassword ? 'Hide' : 'Show'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.copyBtn} onPress={() => copyTextToClipboard(generatedRecoveryPassword, 'recPass')}>
                      <Text style={styles.copyBtnText}>{copiedRecoveryPassword ? 'Copied' : 'Copy'}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.primaryActionBtn, { marginTop: 12, alignSelf: 'flex-start' }]}
                    onPress={handleGenerateNewPassword}
                    disabled={isResettingPassword}
                  >
                    {isResettingPassword ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryActionBtnText}>Generate New Temporary Password</Text>
                    )}
                  </TouchableOpacity>
                )}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.actionOutlineBtn}
                  onPress={() => setRecoveryMember(null)}
                >
                  <Text style={styles.actionOutlineBtnText}>Close</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 10,
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
  credentialsBanner: {
    backgroundColor: ADMIN_COLORS.bgSurface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.emeraldBorder,
    borderRadius: ADMIN_RADII.card,
    padding: 12,
    marginBottom: 16,
    gap: 6,
  },
  credentialsBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  credentialsBannerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: ADMIN_COLORS.emeraldPrimary,
  },
  credentialsBannerSub: {
    fontSize: 11,
    color: ADMIN_COLORS.textSecondary,
    marginBottom: 4,
  },
  credRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ADMIN_COLORS.bgCanvas,
    padding: 8,
    borderRadius: ADMIN_RADII.input,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
  },
  credLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: ADMIN_COLORS.textLight,
  },
  credValue: {
    fontSize: 12,
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
    flex: 1,
    fontFamily: 'monospace',
  },
  copyBtn: {
    backgroundColor: ADMIN_COLORS.bgSurface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: ADMIN_RADII.badge,
  },
  copyBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: ADMIN_COLORS.textSecondary,
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
  memberCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberAvatar: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: ADMIN_COLORS.bgActive,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.emeraldBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    fontSize: 10,
    fontWeight: '700',
    color: ADMIN_COLORS.emeraldPrimary,
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
  roleTag: {
    backgroundColor: ADMIN_COLORS.bgCanvas,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.badge,
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: ADMIN_COLORS.textSecondary,
    letterSpacing: 0.4,
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
  actionDangerBtn: {
    borderWidth: 1,
    borderColor: ADMIN_COLORS.statusDangerBorder,
    backgroundColor: ADMIN_COLORS.statusDangerBg,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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
    gap: 8,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mobileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: ADMIN_COLORS.borderSubtle,
    paddingTop: 8,
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
    maxWidth: 500,
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
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: ADMIN_COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  inputField: {
    backgroundColor: ADMIN_COLORS.bgCanvas,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.input,
    paddingHorizontal: 10,
    height: 36,
    fontSize: 12,
    color: ADMIN_COLORS.textPrimary,
  },
  roleSelectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  roleSelectBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: ADMIN_RADII.badge,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    backgroundColor: ADMIN_COLORS.bgCanvas,
  },
  roleSelectBtnActive: {
    borderColor: ADMIN_COLORS.emeraldPrimary,
    backgroundColor: ADMIN_COLORS.bgActive,
  },
  roleSelectText: {
    fontSize: 11,
    fontWeight: '500',
    color: ADMIN_COLORS.textSecondary,
  },
  roleSelectTextActive: {
    color: ADMIN_COLORS.emeraldPrimary,
    fontWeight: '600',
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
