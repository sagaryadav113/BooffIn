// ============================================================================
// BOOFFIN ADMIN PORTAL — SUPER ADMIN PERSONAL PROFILE MODAL
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { ADMIN_COLORS, ADMIN_RADII } from '../lib/constants';
import { AdminBadge } from './AdminBadge';
import { adminProfileService, SuperAdminProfileData } from '../services/adminProfileService';
import {
  User,
  Mail,
  Phone,
  Briefcase,
  ShieldCheck,
  Key,
  LogOut,
  X,
  CheckCircle2,
  Copy,
  Check,
  Save,
} from 'lucide-react-native';

interface AdminProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onSignOut: () => void;
  onProfileUpdated?: (updatedProfile: SuperAdminProfileData) => void;
}

export const AdminProfileModal: React.FC<AdminProfileModalProps> = ({
  visible,
  onClose,
  onSignOut,
  onProfileUpdated,
}) => {
  const [profile, setProfile] = useState<SuperAdminProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Fields
  const [formFullName, setFormFullName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDepartment, setFormDepartment] = useState('');

  const loadProfile = async () => {
    setLoading(true);
    const res = await adminProfileService.getProfile();
    if (res.profile) {
      setProfile(res.profile);
      setFormFullName(res.profile.fullName || '');
      setFormUsername(res.profile.username || '');
      setFormPhone(res.profile.phone || '');
      setFormDepartment(res.profile.department || 'Operations & Security');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (visible) {
      loadProfile();
      setSuccessMsg(null);
    }
  }, [visible]);

  const handleCopyId = () => {
    if (!profile?.id) return;
    navigator.clipboard?.writeText(profile.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSave = async () => {
    if (!formFullName.trim()) {
      alert('Please enter your full name.');
      return;
    }

    setSaving(true);
    setSuccessMsg(null);

    const res = await adminProfileService.updateProfile({
      fullName: formFullName,
      username: formUsername,
      phone: formPhone,
      department: formDepartment,
    });

    setSaving(false);

    if (res.error) {
      alert('Failed to update profile: ' + res.error.message);
    } else {
      setSuccessMsg('Profile credentials updated & synchronized to database.');
      const updated = {
        ...profile!,
        fullName: formFullName.trim(),
        username: formUsername.trim(),
        phone: formPhone.trim(),
        department: formDepartment.trim(),
      };
      setProfile(updated);
      onProfileUpdated?.(updated);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const getInitials = () => {
    if (formFullName.trim()) {
      const parts = formFullName.trim().split(' ');
      if (parts.length > 1) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return formFullName.substring(0, 2).toUpperCase();
    }
    if (profile?.email) {
      return profile.email.substring(0, 2).toUpperCase();
    }
    return 'SA';
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Administrator Profile & Security</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={16} color={ADMIN_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {successMsg && (
            <View style={styles.successBanner}>
              <CheckCircle2 size={14} color={ADMIN_COLORS.statusSuccessText} />
              <Text style={styles.successBannerText}>{successMsg}</Text>
            </View>
          )}

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={ADMIN_COLORS.emeraldPrimary} />
              <Text style={styles.loadingText}>Fetching authenticated credentials...</Text>
            </View>
          ) : (
            <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {/* Hero Identity Block */}
              <View style={styles.heroCard}>
                <View style={styles.avatarLarge}>
                  <Text style={styles.avatarLargeText}>{getInitials()}</Text>
                </View>

                <View style={styles.heroInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.heroName} numberOfLines={1}>
                      {formFullName.trim() || profile?.fullName || 'Administrator'}
                    </Text>
                    <View style={styles.roleTag}>
                      <Text style={styles.roleTagText}>{profile?.role || 'SUPER_ADMIN'}</Text>
                    </View>
                  </View>

                  <Text style={styles.heroEmail}>{profile?.email || 'admin@letsbooffin.com'}</Text>

                  <View style={styles.heroMetaRow}>
                    <AdminBadge label="ACTIVE SESSION" variant="emerald" size="sm" />
                    <TouchableOpacity style={styles.copyIdBtn} onPress={handleCopyId}>
                      <Text style={styles.copyIdText}>ID: {profile?.id?.slice(0, 8)}...</Text>
                      {copiedId ? <Check size={10} color={ADMIN_COLORS.emeraldPrimary} /> : <Copy size={10} color={ADMIN_COLORS.textMuted} />}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Form Fields */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Full Legal / Staff Name</Text>
                <TextInput
                  style={styles.inputField}
                  value={formFullName}
                  onChangeText={setFormFullName}
                  placeholder="e.g. Dr. Eleanor Vance"
                  placeholderTextColor={ADMIN_COLORS.textMuted}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Username Handle</Text>
                <TextInput
                  style={styles.inputField}
                  value={formUsername}
                  onChangeText={setFormUsername}
                  placeholder="e.g. eleanor.vance"
                  placeholderTextColor={ADMIN_COLORS.textMuted}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Operational Department</Text>
                <TextInput
                  style={styles.inputField}
                  value={formDepartment}
                  onChangeText={setFormDepartment}
                  placeholder="e.g. Trust & Safety Ops"
                  placeholderTextColor={ADMIN_COLORS.textMuted}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Direct Phone (Optional)</Text>
                <TextInput
                  style={styles.inputField}
                  value={formPhone}
                  onChangeText={setFormPhone}
                  placeholder="+1 (555) 000-0000"
                  placeholderTextColor={ADMIN_COLORS.textMuted}
                  keyboardType="phone-pad"
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  style={styles.signOutModalBtn}
                  onPress={() => {
                    onClose();
                    onSignOut();
                  }}
                >
                  <LogOut size={13} color={ADMIN_COLORS.statusDangerText} />
                  <Text style={styles.signOutModalBtnText}>Sign Out</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Save size={13} color="#FFFFFF" />
                      <Text style={styles.saveBtnText}>Save Changes</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLORS.borderSubtle,
    backgroundColor: ADMIN_COLORS.bgSurface,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ADMIN_COLORS.statusSuccessBg,
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLORS.statusSuccessBorder,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  successBannerText: {
    fontSize: 11,
    fontWeight: '500',
    color: ADMIN_COLORS.statusSuccessText,
    flex: 1,
  },
  loadingContainer: {
    padding: 36,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: ADMIN_COLORS.textSecondary,
  },
  scrollContent: {
    padding: 16,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: ADMIN_COLORS.bgCanvas,
    borderRadius: ADMIN_RADII.card,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    padding: 12,
    marginBottom: 14,
  },
  avatarLarge: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: ADMIN_COLORS.bgActive,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.emeraldBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLargeText: {
    fontSize: 15,
    fontWeight: '700',
    color: ADMIN_COLORS.emeraldPrimary,
  },
  heroInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroName: {
    fontSize: 14,
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
  },
  roleTag: {
    backgroundColor: ADMIN_COLORS.bgSurface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.badge,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  roleTagText: {
    fontSize: 9,
    fontWeight: '600',
    color: ADMIN_COLORS.textSecondary,
    letterSpacing: 0.4,
  },
  heroEmail: {
    fontSize: 11,
    color: ADMIN_COLORS.textSecondary,
    marginTop: 1,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  copyIdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: ADMIN_COLORS.bgSurface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: ADMIN_RADII.badge,
  },
  copyIdText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: ADMIN_COLORS.textMuted,
  },
  formGroup: {
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 10,
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
    height: 34,
    fontSize: 12,
    color: ADMIN_COLORS.textPrimary,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: ADMIN_COLORS.borderSubtle,
    paddingTop: 12,
    marginTop: 6,
    gap: 8,
  },
  signOutModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.statusDangerBorder,
    backgroundColor: ADMIN_COLORS.statusDangerBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: ADMIN_RADII.button,
  },
  signOutModalBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: ADMIN_COLORS.statusDangerText,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: ADMIN_COLORS.emeraldPrimary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: ADMIN_RADII.button,
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: ADMIN_COLORS.textInverse,
  },
});
