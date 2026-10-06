// ============================================================================
// BOOFFIN ADMIN PORTAL — DEDICATED SUPER ADMIN PROFILE PAGE
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
import { ADMIN_COLORS, ADMIN_RADII } from '../lib/constants';
import { AdminBadge } from '../components/AdminBadge';
import { adminProfileService, SuperAdminProfileData } from '../services/adminProfileService';
import {
  User,
  Mail,
  Phone,
  Briefcase,
  ShieldCheck,
  Key,
  LogOut,
  CheckCircle2,
  Copy,
  Check,
  Save,
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
      setSuccessMsg('Profile credentials updated & synchronized to database.');
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
        <ActivityIndicator size="small" color={ADMIN_COLORS.emeraldPrimary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerSection}>
        <View>
          <Text style={styles.pageTitle}>Administrator Profile</Text>
          <Text style={styles.pageSubtitle}>
            Personal staff credentials, role permissions & security metadata
          </Text>
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={onSignOut}>
          <LogOut size={13} color={ADMIN_COLORS.statusDangerText} />
          <Text style={styles.signOutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Success Notification */}
      {successMsg && (
        <View style={styles.successBox}>
          <CheckCircle2 size={15} color={ADMIN_COLORS.statusSuccessText} />
          <Text style={styles.successText}>{successMsg}</Text>
        </View>
      )}

      {/* Hero Identity Block */}
      <View style={styles.heroCard}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarLargeText}>{getInitials()}</Text>
        </View>

        <View style={styles.heroInfo}>
          <View style={styles.heroNameRow}>
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
              {copiedId ? <Check size={11} color={ADMIN_COLORS.emeraldPrimary} /> : <Copy size={11} color={ADMIN_COLORS.textMuted} />}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Two-Column Grid / Forms */}
      <View style={styles.gridContainer}>
        {/* Left Column: Personal Information Form */}
        <View style={styles.formCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Personal & Contact Details</Text>
            <Text style={styles.cardSub}>Update your administrative contact profile</Text>
          </View>

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

          <TouchableOpacity
            style={[styles.primarySaveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Save size={13} color="#FFFFFF" />
                <Text style={styles.primarySaveBtnText}>Save Profile</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Right Column: Security & Role Metadata */}
        <View style={styles.metaCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Authority & System Access</Text>
            <Text style={styles.cardSub}>Assigned security tier and privileges</Text>
          </View>

          <View style={styles.definitionList}>
            <View style={styles.defItem}>
              <Text style={styles.defLabel}>Assigned Role</Text>
              <Text style={styles.defVal}>{profile?.role || 'SUPER_ADMIN'}</Text>
            </View>

            <View style={styles.defItem}>
              <Text style={styles.defLabel}>Account Standing</Text>
              <AdminBadge label="ACTIVE" variant="emerald" size="sm" />
            </View>

            <View style={styles.defItem}>
              <Text style={styles.defLabel}>Two-Factor Authentication</Text>
              <AdminBadge label="ENFORCED (AAL2)" variant="emerald" size="sm" />
            </View>

            <View style={styles.defItem}>
              <Text style={styles.defLabel}>Database Access</Text>
              <Text style={styles.defVal}>RLS Full Superadmin Scope</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ADMIN_COLORS.bgCanvas,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
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
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.statusDangerBorder,
    backgroundColor: ADMIN_COLORS.statusDangerBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: ADMIN_RADII.button,
  },
  signOutBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: ADMIN_COLORS.statusDangerText,
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
  heroCard: {
    backgroundColor: ADMIN_COLORS.bgSurface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.card,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  avatarLarge: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: ADMIN_COLORS.bgActive,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.emeraldBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLargeText: {
    fontSize: 16,
    fontWeight: '700',
    color: ADMIN_COLORS.emeraldPrimary,
  },
  heroInfo: {
    flex: 1,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroName: {
    fontSize: 15,
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
  },
  heroEmail: {
    fontSize: 12,
    color: ADMIN_COLORS.textSecondary,
    marginTop: 1,
  },
  roleTag: {
    backgroundColor: ADMIN_COLORS.bgCanvas,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.badge,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: ADMIN_COLORS.textSecondary,
    letterSpacing: 0.4,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  copyIdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: ADMIN_COLORS.bgCanvas,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: ADMIN_RADII.badge,
  },
  copyIdText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: ADMIN_COLORS.textMuted,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 24,
  },
  formCard: {
    flex: 1,
    minWidth: 300,
    backgroundColor: ADMIN_COLORS.bgSurface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.card,
    padding: 14,
  },
  metaCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: ADMIN_COLORS.bgSurface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.card,
    padding: 14,
  },
  cardHeader: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLORS.borderSubtle,
    paddingBottom: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
  },
  cardSub: {
    fontSize: 11,
    color: ADMIN_COLORS.textSecondary,
    marginTop: 1,
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
  primarySaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: ADMIN_COLORS.emeraldPrimary,
    paddingVertical: 8,
    borderRadius: ADMIN_RADII.button,
    marginTop: 8,
  },
  primarySaveBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: ADMIN_COLORS.textInverse,
  },
  definitionList: {
    gap: 10,
  },
  defItem: {
    backgroundColor: ADMIN_COLORS.bgCanvas,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.button,
    padding: 10,
    gap: 4,
  },
  defLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: ADMIN_COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  defVal: {
    fontSize: 12,
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
  },
});
