import React from 'react';
import { View, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { router } from 'expo-router';
import { colors, radii, spacing } from '../../theme';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { Header } from '../../components/layout/Header';
import { Typography } from '../../components/core/Typography';
import { Icon, IconName } from '../../components/core/Icon';
import { Divider } from '../../components/core/Divider';
import { env } from '../../config/env';

interface SettingRowProps {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}

const SettingRow: React.FC<SettingRowProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  rightElement,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      style={styles.settingRow}
    >
      <View style={styles.iconCircle}>
        <Icon name={icon} size="sm" color={colors.textPrimary} />
      </View>

      <View style={styles.settingMeta}>
        <Typography variant="captionBold" color={colors.textPrimary}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="micro" color={colors.textSecondary} style={{ marginTop: 2 }}>
            {subtitle}
          </Typography>
        )}
      </View>

      {rightElement || (
        <Icon name="ArrowRight" size="xs" color={colors.textMuted} />
      )}
    </TouchableOpacity>
  );
};

export default function SettingsScreen() {
  const [pushEnabled, setPushEnabled] = React.useState(true);
  const [digestEnabled, setDigestEnabled] = React.useState(true);

  return (
    <ScreenContainer scrollable>
      <Header title="Settings" showBack onBack={() => router.back()} />

      <View style={styles.content}>
        {/* Section: Academic Identity */}
        <Typography variant="captionBold" color={colors.textSecondary} style={styles.sectionHeader}>
          ACADEMIC IDENTITY & VERIFICATION
        </Typography>

        <View style={styles.cardGroup}>
          <SettingRow
            icon="CheckCircle2"
            title="ORCID Integration"
            subtitle="Connect your verified works and author ID"
            onPress={() => router.push('/(tabs)/profile')}
          />
          <Divider />
          <SettingRow
            icon="User"
            title="Institutional Affiliation"
            subtitle="Verified academic address & role"
            onPress={() => router.push('/(tabs)/profile')}
          />
        </View>

        {/* Section: Notifications */}
        <Typography variant="captionBold" color={colors.textSecondary} style={styles.sectionHeader}>
          NOTIFICATIONS
        </Typography>

        <View style={styles.cardGroup}>
          <SettingRow
            icon="Bell"
            title="Push Notifications"
            subtitle="Paper citations, replies, and mentions"
            rightElement={
              <Switch
                value={pushEnabled}
                onValueChange={setPushEnabled}
                trackColor={{ false: colors.borderDark, true: colors.black }}
              />
            }
          />
          <Divider />
          <SettingRow
            icon="Inbox"
            title="Weekly Topic Digest"
            subtitle="Top preprints and discussions in your fields"
            rightElement={
              <Switch
                value={digestEnabled}
                onValueChange={setDigestEnabled}
                trackColor={{ false: colors.borderDark, true: colors.black }}
              />
            }
          />
        </View>

        {/* Section: Legal & Open Access */}
        <Typography variant="captionBold" color={colors.textSecondary} style={styles.sectionHeader}>
          OPEN ACCESS & POLICY
        </Typography>

        <View style={styles.cardGroup}>
          <SettingRow
            icon="FileText"
            title="Open Access Fair Use Policy"
            subtitle="BooffIn does not host copyrighted PDFs"
          />
          <Divider />
          <SettingRow
            icon="Shield"
            title="Privacy & Data Governance"
            subtitle="Row Level Security and user data rights"
          />
        </View>

        {/* Section: Account & Session */}
        <Typography variant="captionBold" color={colors.textSecondary} style={styles.sectionHeader}>
          ACCOUNT & SESSION
        </Typography>

        <View style={styles.cardGroup}>
          <SettingRow
            icon="LogOut"
            title="Sign Out"
            subtitle="Sign out of your BooffIn account"
            onPress={async () => {
              const { useAuthStore } = await import('../../store/useAuthStore');
              await useAuthStore.getState().signOut();
              router.replace('/(auth)/welcome');
            }}
          />
        </View>

        {/* App Version Info */}
        <View style={styles.appInfo}>
          <Typography variant="micro" color={colors.textMuted} align="center">
            BooffIn v1.0.0 ({env.APP_ENV})
          </Typography>
          <Typography variant="micro" color={colors.textMuted} align="center" style={{ marginTop: 2 }}>
            Research finds it's people.
          </Typography>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  sectionHeader: {
    fontSize: 12,
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  cardGroup: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  settingMeta: {
    flex: 1,
  },
  appInfo: {
    marginTop: spacing.xxxl,
    alignItems: 'center',
  },
});
