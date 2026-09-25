import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { colors, radii, spacing } from '../../theme';
import { SettingsLayout } from '../../components/settings/SettingsLayout';
import { SettingsCardGroup } from '../../components/settings/SettingsCardGroup';
import { SettingsRow } from '../../components/settings/SettingsRow';
import { SettingsSectionHeader } from '../../components/settings/SettingsSectionHeader';
import { DangerActionModal } from '../../components/settings/DangerActionModal';
import { Divider } from '../../components/core/Divider';
import { Typography } from '../../components/core/Typography';
import { Avatar } from '../../components/core/Avatar';
import { Icon } from '../../components/core/Icon';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { InstallAppModal } from '../../components/modals/InstallAppModal';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { env } from '../../config/env';

export default function SettingsMainScreen() {
  const { user, signOut } = useAuthStore();
  const { settings, fetchSettings } = useSettingsStore();

  const [signOutModalVisible, setSignOutModalVisible] = useState(false);
  const [installModalVisible, setInstallModalVisible] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const { isInstalled, isIOS } = usePWAInstall();

  useEffect(() => {
    if (user?.id) {
      fetchSettings(user.id);
    }
  }, [user?.id]);

  const handleSignOutConfirm = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
      setSignOutModalVisible(false);
      router.replace('/(auth)/welcome');
    } catch {
      setIsSigningOut(false);
    }
  };

  // Construct academic descriptor line (e.g. "PhD Candidate · Stanford University")
  const academicDescriptor = [user?.academicTitle, user?.institution]
    .filter(Boolean)
    .join(' · ');

  return (
    <SettingsLayout
      title="Settings"
      showBack
      onBack={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)/profile');
        }
      }}
    >
      {/* Profile Summary Card at Top */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push('/settings/profile' as any)}
        style={styles.profileSummaryCard}
      >
        <Avatar
          uri={user?.avatarUrl}
          name={user?.fullName || 'Researcher'}
          size="lg"
        />

        <View style={styles.profileSummaryMeta}>
          <Typography variant="h3" color={colors.textPrimary} numberOfLines={1}>
            {user?.fullName || 'Academic Researcher'}
          </Typography>

          <Typography variant="caption" color={colors.textSecondary} numberOfLines={1}>
            @{user?.handle || 'researcher'}
          </Typography>

          {academicDescriptor ? (
            <Typography variant="micro" color={colors.textMuted} numberOfLines={1} style={styles.academicText}>
              {academicDescriptor}
            </Typography>
          ) : null}
        </View>

        <View style={styles.editProfileBtn}>
          <Typography variant="captionBold" color={colors.textPrimary}>
            Edit profile
          </Typography>
          <Icon name="ArrowRight" size="xs" color={colors.textPrimary} style={{ marginLeft: 4 }} />
        </View>
      </TouchableOpacity>

      {/* 1. Academic & Research Profile */}
      <SettingsSectionHeader title="Academic & Research Profile" />
      <SettingsCardGroup>
        <SettingsRow
          icon="Award"
          title="Research Profile"
          subtitle="Fields, Lab/Group, ORCID, Google Scholar, ResearchGate"
          onPress={() => router.push('/settings/research' as any)}
        />
        <Divider />
        <SettingsRow
          icon="User"
          title="Basic Profile Details"
          subtitle="Name, Handle, Bio, Affiliation, Website"
          onPress={() => router.push('/settings/profile' as any)}
        />
      </SettingsCardGroup>

      {/* 2. Account & Security */}
      <SettingsSectionHeader title="Account & Security" />
      <SettingsCardGroup>
        <SettingsRow
          icon="Shield"
          title="Account & Authentication"
          subtitle="Email, Password, Connected logins, Account deletion"
          onPress={() => router.push('/settings/account' as any)}
        />
      </SettingsCardGroup>

      {/* 3. Notifications */}
      <SettingsSectionHeader title="Notifications" />
      <SettingsCardGroup>
        <SettingsRow
          icon="Bell"
          title="Notification Preferences"
          subtitle="Citations, replies, mentions, push & email alerts"
          onPress={() => router.push('/settings/notifications' as any)}
        />
      </SettingsCardGroup>

      {/* 4. Privacy & Safety */}
      <SettingsSectionHeader title="Privacy & Safety" />
      <SettingsCardGroup>
        <SettingsRow
          icon="Eye"
          title="Privacy Controls"
          subtitle="Who can message, profile visibility, activity status"
          onPress={() => router.push('/settings/privacy' as any)}
        />
        <Divider />
        <SettingsRow
          icon="UserX"
          title="Blocked Researchers"
          subtitle="Manage muted & blocked accounts"
          onPress={() => router.push('/settings/blocked' as any)}
        />
      </SettingsCardGroup>

      {/* 5. Networking & Discoverability */}
      <SettingsSectionHeader title="Networking" />
      <SettingsCardGroup>
        <SettingsRow
          icon="Users"
          title="Networking & Discovery"
          subtitle="Research-interest matching & scholar recommendations"
          onPress={() => router.push('/settings/networking' as any)}
        />
      </SettingsCardGroup>

      {/* 6. Content & Activity */}
      <SettingsSectionHeader title="Content & Activity" />
      <SettingsCardGroup>
        <SettingsRow
          icon="Bookmark"
          title="Saved Research & Content"
          subtitle="My posts, saved preprints, and bookmarks"
          onPress={() => router.push('/settings/content' as any)}
        />
      </SettingsCardGroup>

      {/* 7. Appearance & Display */}
      <SettingsSectionHeader title="Appearance & Display" />
      <SettingsCardGroup>
        <SettingsRow
          icon="Sun"
          title="Display & Theme"
          subtitle={`Theme: ${settings.theme} · Default tab: ${settings.defaultTab}`}
          onPress={() => router.push('/settings/appearance' as any)}
        />
        <Divider />
        <SettingsRow
          icon="Download"
          title={isInstalled ? "App Installed (Standalone)" : "Install BooffIn App"}
          subtitle={
            isInstalled
              ? "Running in dedicated standalone application mode"
              : isIOS
              ? "Add BooffIn to iOS Home Screen"
              : "Install as a desktop or mobile application"
          }
          onPress={() => setInstallModalVisible(true)}
        />
      </SettingsCardGroup>

      {/* 8. Storage & Data */}
      <SettingsSectionHeader title="Storage & Data" />
      <SettingsCardGroup>
        <SettingsRow
          icon="Database"
          title="Storage & Data Export"
          subtitle="Cached data management and GDPR account data export"
          onPress={() => router.push('/settings/storage' as any)}
        />
      </SettingsCardGroup>

      {/* 9. Help & Legal */}
      <SettingsSectionHeader title="Help & Policies" />
      <SettingsCardGroup>
        <SettingsRow
          icon="FileText"
          title="About, Guidelines & Policy"
          subtitle="Open Access Fair Use, Community Guidelines, Terms"
          onPress={() => router.push('/settings/help' as any)}
        />
      </SettingsCardGroup>

      {/* 10. Session & Sign Out */}
      <SettingsSectionHeader title="Session" />
      <SettingsCardGroup>
        <SettingsRow
          icon="LogOut"
          title="Sign Out"
          subtitle="End active session on this device"
          destructive
          onPress={() => setSignOutModalVisible(true)}
        />
      </SettingsCardGroup>

      {/* App Version Info */}
      <View style={styles.appFooter}>
        <Typography variant="captionBold" color={colors.textPrimary} align="center">
          BooffIn
        </Typography>
        <Typography variant="micro" color={colors.textMuted} align="center" style={{ marginTop: 2 }}>
          v1.0.0 ({env.APP_ENV}) · Social Layer for Global Research
        </Typography>
      </View>

      {/* Sign Out Confirmation Modal */}
      <DangerActionModal
        visible={signOutModalVisible}
        onClose={() => setSignOutModalVisible(false)}
        onConfirm={handleSignOutConfirm}
        title="Sign Out of BooffIn?"
        description="You will need to enter your credentials or sign in with your connected account to access your research feed again."
        confirmText="Sign Out"
        cancelText="Stay Signed In"
        isLoading={isSigningOut}
      />

      {/* PWA / App Install Modal */}
      <InstallAppModal
        visible={installModalVisible}
        onClose={() => setInstallModalVisible(false)}
      />
    </SettingsLayout>
  );
}

const styles = StyleSheet.create({
  profileSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  profileSummaryMeta: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  academicText: {
    marginTop: 3,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.full,
  },
  appFooter: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
});
