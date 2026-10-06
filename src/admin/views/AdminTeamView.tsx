// ============================================================================
// BOOFFIN ADMIN PORTAL — TEAM & ACCESS CONTROL (RBAC)
// Robust Administrator Provisioning, Password Management & Role Enforcement
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
import { ADMIN_COLORS } from '../lib/constants';
import { AdminDataTable, ColumnDef } from '../components/AdminDataTable';
import { AdminBadge } from '../components/AdminBadge';
import { adminSecurityService, ProvisionResult, generateSecurePassword } from '../services/adminSecurityService';
import { AdminMember, AdminRole, AdminStatus } from '../types/roles';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { 
  UserPlus, 
  CheckCircle2, 
  AlertTriangle, 
  Key, 
  Copy, 
  Eye, 
  EyeOff, 
  Lock, 
  X,
  Check,
  Shield,
  Edit3,
  RefreshCw,
  Mail,
  User
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
  const [provisionEmail, setProvisionEmail] = useState('');
  const [provisionUsername, setProvisionUsername] = useState('');
  const [provisionPassword, setProvisionPassword] = useState('');
  const [provisionRole, setProvisionRole] = useState<AdminRole>('ADMIN');
  const [isSubmittingProvision, setIsSubmittingProvision] = useState(false);

  // 2. Credentials Success Card State
  const [credentialsResult, setCredentialsResult] = useState<ProvisionResult | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // 3. Member Authority & Details Edit Modal State
  const [selectedMember, setSelectedMember] = useState<(AdminMember & { email?: string; fullName?: string }) | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<AdminRole>('ADMIN');
  const [isSubmittingDetailsChange, setIsSubmittingDetailsChange] = useState(false);

  // 4. View / Reset Password Modal State
  const [recoveryMember, setRecoveryMember] = useState<(AdminMember & { email?: string; fullName?: string }) | null>(null);
  const [newCustomPassword, setNewCustomPassword] = useState('');
  const [activeNewPassword, setActiveNewPassword] = useState<string | null>(null);
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
    setProvisionEmail('');
    setProvisionUsername('');
    setProvisionPassword(generateSecurePassword());
    setProvisionRole('ADMIN');
    setErrorMessage(null);
    setIsProvisionModalOpen(true);
  };

  const handleExecuteProvision = async () => {
    if (!provisionFullName.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }

    const emailToUse = provisionEmail.trim() || `${provisionUsername.trim().toLowerCase()}@letsbooffin.com`;
    if (!emailToUse.includes('@')) {
      setErrorMessage('A valid email address is required.');
      return;
    }

    const usernameToUse = provisionUsername.trim() || emailToUse.split('@')[0];
    const passwordToUse = provisionPassword.trim() || generateSecurePassword();

    setIsSubmittingProvision(true);
    setErrorMessage(null);

    const res = await adminSecurityService.provisionTeamMember({
      fullName: provisionFullName.trim(),
      email: emailToUse,
      username: usernameToUse,
      password: passwordToUse,
      role: provisionRole,
    });

    setIsSubmittingProvision(false);

    if (res.error) {
      setErrorMessage(`Provisioning failed: ${res.error.message}`);
    } else if (res.result) {
      setIsProvisionModalOpen(false);
      setCredentialsResult(res.result);
      setActionSuccessMessage(`Team member ${res.result.fullName} provisioned successfully! Ready for login.`);
      loadMembers();
    }
  };

  const handleOpenEditModal = (member: AdminMember & { email?: string; fullName?: string }) => {
    setSelectedMember(member);
    setEditFullName(member.fullName || '');
    setEditEmail(member.email || '');
    setEditRole(member.role);
    setErrorMessage(null);
  };

  const handleExecuteDetailsChange = async () => {
    if (!selectedMember) return;
    setIsSubmittingDetailsChange(true);
    setErrorMessage(null);

    const res = await adminSecurityService.updateMemberDetails({
      targetUserId: selectedMember.user_id,
      fullName: editFullName.trim() || selectedMember.fullName || 'Administrator',
      email: editEmail.trim() || selectedMember.email || '',
      role: editRole,
    });

    setIsSubmittingDetailsChange(false);

    if (res.error) {
      setErrorMessage(res.error.message);
    } else {
      setActionSuccessMessage(`Employee details updated permanently.`);
      setSelectedMember(null);
      loadMembers();
    }
  };

  const handleOpenRecoveryModal = (member: AdminMember & { email?: string; fullName?: string }) => {
    setRecoveryMember(member);
    setNewCustomPassword(generateSecurePassword());
    setActiveNewPassword(null);
    setShowRecoveryPassword(true);
    setCopiedRecoveryEmail(false);
    setCopiedRecoveryPassword(false);
    setIsResettingPassword(false);
    setRecoveryModalError(null);
    setErrorMessage(null);
  };

  const handleSavePermanentPassword = async () => {
    if (!recoveryMember) return;
    if (!newCustomPassword.trim() || newCustomPassword.trim().length < 6) {
      setRecoveryModalError('Password must be at least 6 characters.');
      return;
    }

    setIsResettingPassword(true);
    setRecoveryModalError(null);
    setErrorMessage(null);

    try {
      const res = await adminSecurityService.resetMemberPassword({
        targetUserId: recoveryMember.user_id,
        targetEmail: recoveryMember.email || `${recoveryMember.user_id}@letsbooffin.com`,
        targetFullName: recoveryMember.fullName || 'Team Member',
        newPassword: newCustomPassword.trim(),
      });

      setIsResettingPassword(false);

      if (res.error) {
        setRecoveryModalError(`Failed to update password: ${res.error.message}`);
      } else if (res.newPassword) {
        setActiveNewPassword(res.newPassword);
        setActionSuccessMessage(`Permanent password updated for ${recoveryMember.fullName || 'member'}. They can log in immediately.`);
        loadMembers();
      }
    } catch (err: any) {
      setIsResettingPassword(false);
      setRecoveryModalError(err?.message || 'An unexpected error occurred while updating password.');
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
      width: 260,
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
      header: '2FA TOTP',
      width: 120,
      render: (m) => (
        <AdminBadge
          label={m.status === 'ACTIVE' ? 'ENFORCED' : 'OPTIONAL'}
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
            <Edit3 size={11} color={ADMIN_COLORS.textSecondary} />
            <Text style={styles.actionOutlineBtnText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionOutlineBtn}
            onPress={() => handleOpenRecoveryModal(m)}
          >
            <Key size={11} color={ADMIN_COLORS.textSecondary} />
            <Text style={styles.actionOutlineBtnText}>Password</Text>
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

        <TouchableOpacity style={styles.primaryActionBtn} onPress={handleOpenProvisionModal} activeOpacity={0.75}>
          <UserPlus size={13} color="#FFFFFF" />
          <Text style={styles.primaryActionBtnText}>Provision Admin</Text>
        </TouchableOpacity>
      </View>

      {/* Notifications */}
      {actionSuccessMessage && (
        <View style={styles.successBox}>
          <CheckCircle2 size={14} color="#047857" />
          <Text style={styles.successText}>{actionSuccessMessage}</Text>
        </View>
      )}

      {errorMessage && (
        <View style={styles.errorBox}>
          <AlertTriangle size={14} color="#B91C1C" />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {/* Credentials Banner (after provisioning) */}
      {credentialsResult && (
        <View style={styles.credentialsBanner}>
          <View style={styles.credentialsBannerHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Key size={14} color="#047857" />
              <Text style={styles.credentialsBannerTitle}>New Employee Credentials Ready for Login</Text>
            </View>
            <TouchableOpacity onPress={() => setCredentialsResult(null)}>
              <X size={14} color={ADMIN_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.credentialsBannerSub}>
            The employee can now sign in immediately using this Email and Password. Google Authenticator (TOTP) will be enrolled upon first login.
          </Text>

          <View style={styles.credRow}>
            <Text style={styles.credLabel}>Login Email:</Text>
            <Text style={styles.credValue}>{credentialsResult.email}</Text>
            <TouchableOpacity style={styles.copyBtn} onPress={() => copyTextToClipboard(credentialsResult.email, 'email')}>
              <Text style={styles.copyBtnText}>{copiedEmail ? 'Copied' : 'Copy'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.credRow}>
            <Text style={styles.credLabel}>Permanent Password:</Text>
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

      {/* Main Content */}
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
                  <Text style={styles.actionOutlineBtnText}>Password</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionOutlineBtn}
                  onPress={() => handleOpenEditModal(m)}
                >
                  <Edit3 size={11} color={ADMIN_COLORS.textSecondary} />
                  <Text style={styles.actionOutlineBtnText}>Edit Details</Text>
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

      {/* 1. Provisioning Modal */}
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
                  <Text style={styles.modalTitle}>Provision New Staff / Admin Account</Text>
                </View>
                <TouchableOpacity onPress={() => setIsProvisionModalOpen(false)} style={styles.closeBtn}>
                  <X size={16} color={ADMIN_COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.inputLabel}>Employee Full Name</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="e.g. Dr. Eleanor Vance"
                  placeholderTextColor={ADMIN_COLORS.textMuted}
                  value={provisionFullName}
                  onChangeText={setProvisionFullName}
                />

                <Text style={[styles.inputLabel, { marginTop: 10 }]}>Employee Email Address (Login ID)</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="e.g. eleanor.vance@gmail.com"
                  placeholderTextColor={ADMIN_COLORS.textMuted}
                  value={provisionEmail}
                  onChangeText={setProvisionEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />

                <Text style={[styles.inputLabel, { marginTop: 10 }]}>Username Handle (Optional)</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="e.g. eleanor.vance"
                  placeholderTextColor={ADMIN_COLORS.textMuted}
                  value={provisionUsername}
                  onChangeText={setProvisionUsername}
                  autoCapitalize="none"
                />

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <Text style={styles.inputLabel}>Initial Permanent Password</Text>
                  <TouchableOpacity onPress={() => setProvisionPassword(generateSecurePassword())}>
                    <Text style={styles.linkActionText}>Auto-Generate</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.inputField}
                  placeholder="Enter or generate password"
                  placeholderTextColor={ADMIN_COLORS.textMuted}
                  value={provisionPassword}
                  onChangeText={setProvisionPassword}
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
                    <Text style={styles.primaryActionBtnText}>Create Employee Account</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* 2. Edit Details & Role Modal */}
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
                <Text style={styles.modalTitle}>Edit Staff Details — {selectedMember.fullName || 'Admin'}</Text>
                <TouchableOpacity onPress={() => setSelectedMember(null)} style={styles.closeBtn}>
                  <X size={16} color={ADMIN_COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.inputLabel}>Full Staff Name</Text>
                <TextInput
                  style={styles.inputField}
                  value={editFullName}
                  onChangeText={setEditFullName}
                  placeholder="Full Name"
                />

                <Text style={[styles.inputLabel, { marginTop: 10 }]}>Email Address (Login ID)</Text>
                <TextInput
                  style={styles.inputField}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="Email Address"
                />

                <Text style={[styles.inputLabel, { marginTop: 10 }]}>Authority Tier & Role</Text>
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
                    {selectedMember.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.primaryActionBtn}
                  onPress={handleExecuteDetailsChange}
                  disabled={isSubmittingDetailsChange}
                >
                  {isSubmittingDetailsChange ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryActionBtnText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* 3. Password Reset / Change Modal */}
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
                  <Text style={styles.modalTitle}>Set Permanent Password</Text>
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

                {activeNewPassword ? (
                  <View style={[styles.successBannerBlock, { marginTop: 12 }]}>
                    <Text style={styles.successBannerTitle}>Password Updated Successfully</Text>
                    <Text style={styles.successBannerSub}>This password is now active and permanent in authentication:</Text>
                    <View style={[styles.credRow, { marginTop: 6 }]}>
                      <Text style={styles.credLabel}>Active Password:</Text>
                      <Text style={styles.credValue}>{activeNewPassword}</Text>
                      <TouchableOpacity style={styles.copyBtn} onPress={() => copyTextToClipboard(activeNewPassword, 'recPass')}>
                        <Text style={styles.copyBtnText}>{copiedRecoveryPassword ? 'Copied' : 'Copy'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={{ marginTop: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={styles.inputLabel}>New Permanent Password</Text>
                      <TouchableOpacity onPress={() => setNewCustomPassword(generateSecurePassword())}>
                        <Text style={styles.linkActionText}>Generate Random</Text>
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={styles.inputField}
                      value={newCustomPassword}
                      onChangeText={setNewCustomPassword}
                      placeholder="Type or generate new password"
                    />
                  </View>
                )}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.actionOutlineBtn}
                  onPress={() => setRecoveryMember(null)}
                >
                  <Text style={styles.actionOutlineBtnText}>{activeNewPassword ? 'Done' : 'Cancel'}</Text>
                </TouchableOpacity>

                {!activeNewPassword && (
                  <TouchableOpacity
                    style={styles.primaryActionBtn}
                    onPress={handleSavePermanentPassword}
                    disabled={isResettingPassword}
                  >
                    {isResettingPassword ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryActionBtnText}>Apply Permanent Password</Text>
                    )}
                  </TouchableOpacity>
                )}
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
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 6,
    padding: 10,
    marginBottom: 14,
  },
  successText: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '500',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 6,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '500',
  },
  credentialsBanner: {
    backgroundColor: ADMIN_COLORS.bgSurface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.emeraldBorder,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: ADMIN_COLORS.emeraldPrimary,
  },
  credentialsBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  credentialsBannerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
  },
  credentialsBannerSub: {
    fontSize: 11,
    color: ADMIN_COLORS.textSecondary,
    marginTop: 2,
    marginBottom: 10,
  },
  credRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 6,
    gap: 8,
  },
  credLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: ADMIN_COLORS.textSecondary,
  },
  credValue: {
    fontSize: 11.5,
    fontFamily: 'monospace',
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
    flex: 1,
  },
  copyBtn: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: ADMIN_COLORS.bgSurface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
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
    borderRadius: 8,
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
    gap: 9,
  },
  memberAvatar: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
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
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: ADMIN_COLORS.textSecondary,
    letterSpacing: 0.3,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'flex-end',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ADMIN_COLORS.emeraldPrimary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    gap: 5,
  },
  primaryActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ADMIN_COLORS.bgSurface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  actionOutlineBtnText: {
    fontSize: 11,
    fontWeight: '500',
    color: ADMIN_COLORS.textSecondary,
  },
  actionDangerBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionDangerBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B91C1C',
  },
  // Mobile Card
  mobileListContainer: {
    gap: 10,
    marginBottom: 24,
  },
  recordCard: {
    backgroundColor: ADMIN_COLORS.bgSurface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: 8,
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
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    gap: 8,
  },
  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: ADMIN_COLORS.bgSurface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    padding: 18,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 14,
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
    color: ADMIN_COLORS.textSecondary,
    marginBottom: 4,
  },
  inputField: {
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    color: ADMIN_COLORS.textPrimary,
    backgroundColor: '#FFFFFF',
  },
  linkActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#047857',
  },
  roleSelectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  roleSelectBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    backgroundColor: '#F8FAFC',
  },
  roleSelectBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  roleSelectText: {
    fontSize: 11,
    color: ADMIN_COLORS.textSecondary,
    fontWeight: '500',
  },
  roleSelectTextActive: {
    color: '#047857',
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
    gap: 8,
  },
  successBannerBlock: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 6,
    padding: 10,
  },
  successBannerTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
  },
  successBannerSub: {
    fontSize: 11,
    color: ADMIN_COLORS.textSecondary,
    marginTop: 2,
  },
});
