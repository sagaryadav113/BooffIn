// ============================================================================
// BOOFFIN ADMIN PORTAL — DEDICATED SUPER ADMIN PROFILE PAGE
// Synchronized personal credentials, access tier, contacts & security metadata
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { ADMIN_COLORS } from '../lib/constants';
import { AdminBadge } from '../components/AdminBadge';
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
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  ArrowLeft,
  Save,
  Shield,
  Fingerprint,
} from 'lucide-react-native';

interface AdminProfileViewProps {
  onSignOut: () => void;
  onNavigateBack?: () => void;
}

export const AdminProfileView: React.FC<AdminProfileViewProps> = ({
  onSignOut,
  onNavigateBack,
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

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
    loadProfile();
  }, []);

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

  if (loading) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator size="large" color={ADMIN_COLORS.emeraldPrimary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* 1. Header Row */}
      <View style={styles.pageHeader}>
        <View style={styles.headerTitleRow}>
          {onNavigateBack && (
            <TouchableOpacity style={styles.backBtn} onPress={onNavigateBack}>
              <ArrowLeft size={18} color="#0F172A" />
            </TouchableOpacity>
          )}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} color="#059669" />
              <Text style={styles.pageTitle}>Admin Personal Profile</Text>
            </View>
            <Text style={styles.pageSubtitle}>
              Manage your personal staff credentials, access levels & contact info
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.headerSignOutBtn} onPress={onSignOut}>
          <LogOut size={14} color="#EF4444" />
          <Text style={styles.headerSignOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Success Toast */}
      {successMsg && (
        <View style={styles.successBanner}>
          <CheckCircle2 size={16} color="#064E3B" />
          <Text style={styles.successBannerText}>{successMsg}</Text>
        </View>
      )}

      {/* 2. Hero Identity Card */}
      <View style={[styles.heroCard, isMobile && styles.heroCardMobile]}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarLargeText}>{getInitials()}</Text>
        </View>

        <View style={styles.heroInfo}>
          <View style={styles.heroNameRow}>
            <Text style={styles.heroName} numberOfLines={1}>
              {formFullName.trim() || profile?.fullName || 'Super Administrator'}
            </Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{profile?.role || 'SUPER_ADMIN'}</Text>
            </View>
          </View>

          <Text style={styles.heroEmail}>{profile?.email || 'admin@letsbooffin.com'}</Text>

          <View style={styles.heroStatusRow}>
            <View style={styles.statusPill}>
              <View style={styles.onlineDot} />
              <Text style={styles.statusPillText}>Active Session</Text>
            </View>

            <View style={styles.securityPill}>
              <ShieldCheck size={13} color="#059669" />
              <Text style={styles.securityPillText}>AAL2 Verified</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 3. Main Form Grid */}
      <View style={[styles.gridContainer, isMobile && styles.gridContainerMobile]}>
        {/* Left Card: Personal Credentials & Contacts */}
        <View style={[styles.cardSection, isMobile && styles.cardSectionMobile]}>
          <Text style={styles.cardSectionTitle}>PERSONAL CREDENTIALS & CONTACTS</Text>

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <View style={styles.inputWrapper}>
              <User size={16} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={formFullName}
                onChangeText={setFormFullName}
                placeholder="Syed Shaeel Ahmed"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          {/* Username */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Staff Handle / Username</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.atPrefix}>@</Text>
              <TextInput
                style={[styles.textInput, { paddingLeft: 4 }]}
                value={formUsername}
                onChangeText={setFormUsername}
                placeholder="shaeel_admin"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Authenticated Email (Read-only verified) */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Authenticated Email ID</Text>
            <View style={[styles.inputWrapper, styles.inputWrapperDisabled]}>
              <Mail size={16} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, styles.textInputDisabled]}
                value={profile?.email || 'admin@letsbooffin.com'}
                editable={false}
              />
              <View style={styles.verifiedChip}>
                <Check size={12} color="#059669" />
                <Text style={styles.verifiedChipText}>Verified</Text>
              </View>
            </View>
          </View>

          {/* Phone Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Contact Number / Phone</Text>
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

          {/* Designation / Department */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Designation / Department</Text>
            <View style={styles.inputWrapper}>
              <Briefcase size={16} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={formDepartment}
                onChangeText={setFormDepartment}
                placeholder="Operations & Security"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>
        </View>

        {/* Right Card: Security & Account Metadata */}
        <View style={[styles.cardSection, isMobile && styles.cardSectionMobile]}>
          <Text style={styles.cardSectionTitle}>SECURITY & ACCOUNT METADATA</Text>

          <View style={styles.metadataCard}>
            {/* Admin UUID */}
            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>Admin UUID</Text>
              <TouchableOpacity style={styles.uuidBadge} onPress={handleCopyId}>
                <Text style={styles.uuidText} numberOfLines={1}>
                  {profile?.id || 'f5534cbc-14dc-4d50-975d-1a0b3d459359'}
                </Text>
                {copiedId ? (
                  <Check size={13} color="#059669" />
                ) : (
                  <Copy size={13} color="#64748B" />
                )}
              </TouchableOpacity>
            </View>

            {/* Access Tier */}
            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>Access Tier</Text>
              <Text style={styles.metaValueHighlight}>Tier 1 — Full Root Access</Text>
            </View>

            {/* MFA Security Method */}
            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>MFA Enforcement</Text>
              <View style={styles.mfaStatusRow}>
                <Fingerprint size={14} color="#059669" />
                <Text style={styles.metaValue}>TOTP Authenticator (AAL2)</Text>
              </View>
            </View>

            {/* Member Since */}
            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>Member Since</Text>
              <Text style={styles.metaValue}>
                {profile?.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'Oct 5, 2026'}
              </Text>
            </View>
          </View>

          {/* Security Notice Box */}
          <View style={styles.securityNoticeBox}>
            <Shield size={16} color="#059669" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.securityNoticeTitle}>Root Level Account Protection</Text>
              <Text style={styles.securityNoticeText}>
                All profile updates are immediately committed to the central PostgreSQL security tables with strict cryptographic audit logs.
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Save size={16} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>Save Profile Changes</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.signOutBtn} onPress={onSignOut}>
              <LogOut size={16} color="#EF4444" />
              <Text style={styles.signOutBtnText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    padding: 20,
    gap: 16,
    paddingBottom: 60,
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  headerSignOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  headerSignOutText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 12,
    borderRadius: 10,
  },
  successBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#064E3B',
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  heroCardMobile: {
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  avatarLarge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#D1FAE5',
  },
  avatarLargeText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroInfo: {
    flex: 1,
    gap: 6,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  heroName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  roleBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  heroEmail: {
    fontSize: 13,
    color: '#64748B',
  },
  heroStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  securityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  securityPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
  },
  gridContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  gridContainerMobile: {
    flexDirection: 'column',
  },
  cardSection: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardSectionMobile: {
    flex: 1,
  },
  cardSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputWrapperDisabled: {
    backgroundColor: '#F1F5F9',
  },
  inputIcon: {
    marginRight: 10,
  },
  atPrefix: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginRight: 4,
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
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  metadataCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  metaKey: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  metaValueHighlight: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  mfaStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  uuidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxWidth: 180,
  },
  uuidText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#475569',
  },
  securityNoticeBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  securityNoticeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#064E3B',
    marginBottom: 2,
  },
  securityNoticeText: {
    fontSize: 11,
    color: '#047857',
    lineHeight: 15,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 10,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  signOutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 12,
    borderRadius: 10,
  },
  signOutBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
});
