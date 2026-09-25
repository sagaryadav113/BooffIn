import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { colors, radii, spacing } from '../../theme';
import { SettingsLayout } from '../../components/settings/SettingsLayout';
import { SettingsCardGroup } from '../../components/settings/SettingsCardGroup';
import { SettingsRow } from '../../components/settings/SettingsRow';
import { SettingsSectionHeader } from '../../components/settings/SettingsSectionHeader';
import { DangerActionModal } from '../../components/settings/DangerActionModal';
import { Typography } from '../../components/core/Typography';
import { Input } from '../../components/core/Input';
import { Button } from '../../components/core/Button';
import { Divider } from '../../components/core/Divider';
import { Icon } from '../../components/core/Icon';
import { useAuthStore } from '../../store/useAuthStore';
import { changeUserPassword, changeUserEmail, deleteUserAccount } from '../../api/settingsService';
import { supabase } from '../../api/client';

export default function AccountSettingsScreen() {
  const { user, signOut } = useAuthStore();

  const [email, setEmail] = useState('');
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [providerList, setProviderList] = useState<string[]>(['Email & Password']);
  const [isEmailVerified, setIsEmailVerified] = useState(true);

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    async function loadAuthInfo() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser?.email) {
          setEmail(authUser.email);
          setNewEmail(authUser.email);
        }
        if (authUser?.app_metadata?.providers) {
          setProviderList(authUser.app_metadata.providers);
        }
        if (authUser?.email_confirmed_at) {
          setIsEmailVerified(true);
        }
      } catch {}
    }
    loadAuthInfo();
  }, []);

  const handleUpdatePassword = async () => {
    if (!newPassword) {
      setFeedback({ type: 'error', message: 'Please enter a new password.' });
      return;
    }
    if (newPassword.length < 6) {
      setFeedback({ type: 'error', message: 'Password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    setIsChangingPassword(true);
    setFeedback(null);

    const res = await changeUserPassword(newPassword);
    setIsChangingPassword(false);

    if (res.success) {
      setNewPassword('');
      setConfirmPassword('');
      setFeedback({ type: 'success', message: 'Password successfully updated.' });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to update password.' });
    }
  };

  const handleUpdateEmail = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      setFeedback({ type: 'error', message: 'Please enter a valid email address.' });
      return;
    }

    setFeedback(null);
    const res = await changeUserEmail(newEmail);

    if (res.success) {
      setEmail(newEmail);
      setIsEditingEmail(false);
      setFeedback({
        type: 'success',
        message: 'A confirmation link has been sent to your new email address.',
      });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to update email address.' });
    }
  };

  const handleDeleteAccountConfirm = async () => {
    setIsDeleting(true);
    const res = await deleteUserAccount();
    setIsDeleting(false);

    if (res.success) {
      setDeleteModalVisible(false);
      await signOut();
      router.replace('/(auth)/welcome');
    } else {
      setDeleteModalVisible(false);
      setFeedback({
        type: 'error',
        message: res.error || 'Failed to delete account. Please contact support.',
      });
    }
  };

  return (
    <SettingsLayout
      title="Account & Security"
      subtitle="Manage your authentication credentials, login methods, and account security."
    >
      {feedback ? (
        <View
          style={[
            styles.feedbackBanner,
            feedback.type === 'success' ? styles.successBanner : styles.errorBanner,
          ]}
        >
          <Icon
            name={feedback.type === 'success' ? 'CheckCircle2' : 'AlertTriangle'}
            size="sm"
            color={feedback.type === 'success' ? '#166534' : colors.error}
          />
          <Typography
            variant="caption"
            color={feedback.type === 'success' ? '#166534' : colors.error}
            style={{ marginLeft: 8, flex: 1 }}
          >
            {feedback.message}
          </Typography>
        </View>
      ) : null}

      {/* 1. Account Information */}
      <SettingsSectionHeader title="Account Credentials" />
      <SettingsCardGroup style={styles.cardPadding}>
        <View style={styles.infoRow}>
          <View style={{ flex: 1 }}>
            <Typography variant="captionBold" color={colors.textPrimary}>
              Email Address
            </Typography>
            <Typography variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
              {email || 'No email attached'}
            </Typography>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.actionPill}
            onPress={() => setIsEditingEmail(!isEditingEmail)}
          >
            <Typography variant="captionBold" color={colors.textPrimary}>
              {isEditingEmail ? 'Cancel' : 'Change'}
            </Typography>
          </TouchableOpacity>
        </View>

        {isEditingEmail ? (
          <View style={styles.emailEditSection}>
            <Input
              label="New Email Address"
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="new.email@institution.edu"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Button
              title="Send Verification Email"
              variant="primary"
              size="sm"
              onPress={handleUpdateEmail}
            />
          </View>
        ) : null}

        <Divider style={{ marginVertical: spacing.md }} />

        <View style={styles.infoRow}>
          <View style={{ flex: 1 }}>
            <Typography variant="captionBold" color={colors.textPrimary}>
              Researcher Handle
            </Typography>
            <Typography variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
              @{user?.handle || 'researcher'}
            </Typography>
          </View>
          <View style={styles.verifiedBadge}>
            <Icon name="CheckCircle2" size="xs" color="#166534" />
            <Typography variant="micro" color="#166534" style={{ marginLeft: 4 }}>
              Active
            </Typography>
          </View>
        </View>
      </SettingsCardGroup>

      {/* 2. Password & Authentication */}
      <SettingsSectionHeader title="Change Password" />
      <SettingsCardGroup style={styles.cardPadding}>
        <Input
          label="New Password"
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="At least 6 characters"
          secureTextEntry
          leftIcon="Lock"
        />

        <Input
          label="Confirm New Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Re-enter new password"
          secureTextEntry
          leftIcon="Lock"
        />

        <Button
          title={isChangingPassword ? "Updating..." : "Update Password"}
          variant="primary"
          onPress={handleUpdatePassword}
          loading={isChangingPassword}
          disabled={!newPassword || !confirmPassword}
          style={{ marginTop: spacing.xs }}
        />
      </SettingsCardGroup>

      {/* 3. Connected Authentication Methods */}
      <SettingsSectionHeader title="Connected Authentication Methods" />
      <SettingsCardGroup>
        <SettingsRow
          icon="Mail"
          title="Email / Password"
          subtitle={email ? `Connected with ${email}` : 'Configured'}
          showChevron={false}
          rightElement={
            <Icon name="Check" size="sm" color="#166534" />
          }
        />
        <Divider />
        <SettingsRow
          icon="Globe"
          title="Google OAuth"
          subtitle={providerList.includes('google') ? 'Connected' : 'Available for one-tap sign in'}
          showChevron={false}
          rightElement={
            providerList.includes('google') ? (
              <Icon name="Check" size="sm" color="#166534" />
            ) : (
              <Typography variant="micro" color={colors.textMuted}>
                Not linked
              </Typography>
            )
          }
        />
        <Divider />
        <SettingsRow
          icon="CheckCircle2"
          title="ORCID Single Sign-On"
          subtitle={user?.orcidId ? `Connected (${user.orcidId})` : 'Link your verified ORCID iD'}
          showChevron={false}
          rightElement={
            user?.orcidId ? (
              <Icon name="Check" size="sm" color="#166534" />
            ) : (
              <Typography variant="micro" color={colors.textMuted}>
                Not linked
              </Typography>
            )
          }
        />
      </SettingsCardGroup>

      {/* 4. Danger Zone */}
      <SettingsSectionHeader title="Danger Zone" description="Irreversible actions regarding your account and research data." />
      <SettingsCardGroup>
        <SettingsRow
          icon="Trash2"
          title="Delete BooffIn Account"
          subtitle="Permanently delete your profile, posts, comments, and research data"
          destructive
          onPress={() => setDeleteModalVisible(true)}
        />
      </SettingsCardGroup>

      {/* Account Deletion Confirmation Modal */}
      <DangerActionModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        onConfirm={handleDeleteAccountConfirm}
        title="Permanently Delete Account?"
        description="This action cannot be undone. All your research posts, comments, bookmarks, and affiliations will be permanently removed from BooffIn."
        confirmText="Delete My Account"
        cancelText="Keep Account"
        requiresTyping
        confirmationMatchText="DELETE"
        isLoading={isDeleting}
      />
    </SettingsLayout>
  );
}

const styles = StyleSheet.create({
  cardPadding: {
    padding: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionPill: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  emailEditSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  successBanner: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
});
