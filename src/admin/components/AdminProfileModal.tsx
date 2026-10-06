// ============================================================================
// BOOFFIN ADMIN PORTAL — SUPER ADMIN PERSONAL PROFILE MODAL
// Realtime synchronized credentials, contacts, and security management
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
import { ADMIN_COLORS } from '../lib/constants';
import { AdminBadge } from './AdminBadge';
import { adminProfileService, SuperAdminProfileData } from '../services/adminProfileService';
import {
  User,
  Mail,
  Phone,
  Briefcase,
  ShieldCheck,
  Key,
  Clock,
  LogOut,
  X,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
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
      setSuccessMsg('Profile credentials updated & synchronized to database!');
      const updated = {
        ...profile!,
        fullName: formFullName.trim(),
        username: formUsername.trim(),
        phone: formPhone.trim(),
        department: formDepartment.trim(),
      };
      setProfile(updated);
      onProfileUpdated?.(updated);
      setTimeout(() => setSuccessMsg(null), 3500);
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
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          {/* 1. Modal Header */}
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} color="#059669" />
              <Text style={styles.modalTitle}>Super Admin Personal Profile</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Success Banner */}
          {successMsg && (
            <View style={styles.successBanner}>
              <CheckCircle2 size={16} color="#064E3B" />
              <Text style={styles.successBannerText}>{successMsg}</Text>
            </View>
          )}

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#059669" />
              <Text style={styles.loadingText}>Loading verified credentials from database...</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {/* 2. Hero Identity Card */}
              <View style={styles.heroCard}>
                <View style={styles.avatarLarge}>
                  <Text style={styles.avatarLargeText}>{getInitials()}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.heroName} numberOfLines={1}>
                      {formFullName || profile?.email?.split('@')[0] || 'Super Admin'}
                    </Text>
                    <AdminBadge label="SUPER_ADMIN" variant="emerald" size="md" />
                  </View>
                  <Text style={styles.heroEmail}>{profile?.email}</Text>
                  <View style={styles.heroMetaRow}>
                    <View style={styles.onlineBadge}>
                      <View style={styles.onlineDot} />
                      <Text style={styles.onlineBadgeText}>Active Session</Text>
                    </View>
                    <View style={styles.securityBadge}>
                      <ShieldCheck size={12} color="#059669" />
                      <Text style={styles.securityBadgeText}>AAL2 Verified</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* 3. Credentials & Details Section */}
              <Text style={styles.sectionHeader}>PERSONAL CREDENTIALS & CONTACTS</Text>

              {/* Full Name Input */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Full Name</Text>
                <View style={styles.inputWrapper}>
                  <User size={16} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={formFullName}
                    onChangeText={setFormFullName}
                    placeholder="e.g. Syed Shaeel Ahmed"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              {/* Email Address (Read-only Authenticated) */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Authenticated Email ID</Text>
                <View style={[styles.inputWrapper, styles.inputDisabled]}>
                  <Mail size={16} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, styles.textInputDisabled]}
                    value={profile?.email || ''}
                    editable={false}
                  />
                  <View style={styles.verifiedChip}>
                    <Check size={12} color="#059669" />
                    <Text style={styles.verifiedChipText}>Verified</Text>
                  </View>
                </View>
              </View>

              {/* Phone / Contact Number */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Contact Number / Phone</Text>
                <View style={styles.inputWrapper}>
                  <Phone size={16} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={formPhone}
                    onChangeText={setFormPhone}
                    placeholder="+91 98765 43210"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Department / Role Title */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Designation / Department</Text>
                <View style={styles.inputWrapper}>
                  <Briefcase size={16} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={formDepartment}
                    onChangeText={setFormDepartment}
                    placeholder="e.g. Operations & Trust Lead"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              {/* 4. Security & System Metadata */}
              <Text style={[styles.sectionHeader, { marginTop: 12 }]}>SECURITY & ACCOUNT METADATA</Text>

              <View style={styles.metadataCard}>
                {/* User ID */}
                <View style={styles.metaRow}>
                  <Text style={styles.metaKey}>Admin UUID</Text>
                  <TouchableOpacity style={styles.copyIdBtn} onPress={handleCopyId}>
                    <Text style={styles.metaValMono}>{profile?.id}</Text>
                    {copiedId ? (
                      <Check size={13} color="#059669" />
                    ) : (
                      <Copy size={13} color="#94A3B8" />
                    )}
                  </TouchableOpacity>
                </View>

                {/* Role Tier */}
                <View style={styles.metaRow}>
                  <Text style={styles.metaKey}>Access Tier</Text>
                  <Text style={styles.metaValHighlight}>Tier 1 — Full Root Access</Text>
                </View>

                {/* Created Date */}
                {profile?.createdAt && (
                  <View style={styles.metaRow}>
                    <Text style={styles.metaKey}>Member Since</Text>
                    <Text style={styles.metaVal}>
                      {new Date(profile.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                )}
              </View>

              {/* 5. Bottom Action Buttons */}
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  style={styles.signOutModalBtn}
                  onPress={() => {
                    onClose();
                    onSignOut();
                  }}
                >
                  <LogOut size={15} color="#EF4444" />
                  <Text style={styles.signOutModalBtnText}>Sign Out</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Check size={15} color="#FFFFFF" />
                      <Text style={styles.saveBtnText}>Save Profile Changes</Text>
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

// ============================================================================
// STYLES (MATCHES BOOFFIN EMERALD LIGHT SAAS DESIGN)
// ============================================================================

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)', // Backdrop blur style
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
    maxHeight: '94%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderBottomWidth: 1,
    borderBottomColor: '#A7F3D0',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  successBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#064E3B',
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  scrollContent: {
    padding: 20,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 20,
  },
  avatarLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#059669', // Primary BooffIn Emerald
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#A7F3D0',
  },
  avatarLargeText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  heroName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  heroEmail: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  onlineBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#064E3B',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  securityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1E40AF',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  inputDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    padding: 0,
  },
  textInputDisabled: {
    color: '#64748B',
  },
  verifiedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  metadataCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 20,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaKey: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },
  metaVal: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0F172A',
  },
  metaValHighlight: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  metaValMono: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#475569',
    maxWidth: 200,
  },
  copyIdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 6,
  },
  signOutModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  signOutModalBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669', // Emerald primary
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
