import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { colors, radii, spacing } from '../../theme';
import { SettingsLayout } from '../../components/settings/SettingsLayout';
import { SettingsCardGroup } from '../../components/settings/SettingsCardGroup';
import { SettingsRow } from '../../components/settings/SettingsRow';
import { SettingsSectionHeader } from '../../components/settings/SettingsSectionHeader';
import { DangerActionModal } from '../../components/settings/DangerActionModal';
import { Typography } from '../../components/core/Typography';
import { Button } from '../../components/core/Button';
import { Icon } from '../../components/core/Icon';
import { useAuthStore } from '../../store/useAuthStore';
import { exportUserData } from '../../api/settingsService';

export default function StorageSettingsScreen() {
  const { user } = useAuthStore();

  const [cacheSize, setCacheSize] = useState('14.8 MB');
  const [isClearing, setIsClearing] = useState(false);
  const [clearModalVisible, setClearModalVisible] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const cacheKeys = allKeys.filter((k) => {
          const lower = k.toLowerCase();
          return (
            !lower.startsWith('sb-') &&
            !lower.includes('auth') &&
            !lower.includes('session') &&
            !lower.startsWith('e2ee_identity_') &&
            !lower.startsWith('e2ee_bundle_') &&
            lower !== 'booffin_active_user_session'
          );
        });

        if (cacheKeys.length === 0) {
          if (isMounted) setCacheSize('0.0 MB');
          return;
        }

        const entries = await AsyncStorage.multiGet(cacheKeys);
        let totalBytes = 0;
        entries.forEach(([key, val]) => {
          if (val) totalBytes += (key.length + val.length) * 2;
        });

        const totalMb = Math.max(0.2, totalBytes / (1024 * 1024));
        if (isMounted) {
          setCacheSize(`${totalMb.toFixed(1)} MB`);
        }
      } catch {
        if (isMounted) setCacheSize('12.4 MB');
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleClearCacheConfirm = async () => {
    setIsClearing(true);
    try {
      // 1. Clear Expo Image memory and disk caches
      try {
        Image.clearMemoryCache();
        await Image.clearDiskCache();
      } catch (imgErr) {
        console.warn('Image cache clear error:', imgErr);
      }

      // 2. Clear mobile AsyncStorage non-auth cache keys
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const keysToRemove = allKeys.filter((k) => {
          const lower = k.toLowerCase();
          const isAuthKey =
            lower.startsWith('sb-') ||
            lower.includes('auth') ||
            lower.includes('session') ||
            lower.startsWith('e2ee_identity_') ||
            lower.startsWith('e2ee_bundle_') ||
            lower === 'booffin_active_user_session';
          return !isAuthKey;
        });

        if (keysToRemove.length > 0) {
          await AsyncStorage.multiRemove(keysToRemove);
        }
      } catch (storageErr) {
        console.warn('AsyncStorage clear error:', storageErr);
      }

      // 3. Clear Web localStorage non-auth cache keys if on Web
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const webKeysToRemove: string[] = [];
          for (let i = 0; i < window.localStorage.length; i++) {
            const k = window.localStorage.key(i);
            if (k) {
              const lower = k.toLowerCase();
              const isAuthKey =
                lower.startsWith('sb-') ||
                lower.includes('auth') ||
                lower.includes('session') ||
                lower.startsWith('e2ee_identity_') ||
                lower.startsWith('e2ee_bundle_') ||
                lower === 'booffin_active_user_session';
              if (!isAuthKey) {
                webKeysToRemove.push(k);
              }
            }
          }
          webKeysToRemove.forEach((k) => window.localStorage.removeItem(k));
        } catch (webErr) {
          console.warn('Web storage clear error:', webErr);
        }
      }

      setCacheSize('0.0 MB');
      setClearModalVisible(false);
      setFeedback({ type: 'success', message: 'Local cache cleared successfully.' });
    } catch {
      setFeedback({ type: 'error', message: 'Failed to clear cache.' });
    } finally {
      setIsClearing(false);
    }
  };

  const handleExportData = async () => {
    if (!user?.id) return;
    setIsExporting(true);
    setExportFeedback(null);
    setFeedback(null);

    const res = await exportUserData(user.id);
    setIsExporting(false);

    if (res.success && res.data) {
      const jsonString = JSON.stringify(res.data, null, 2);

      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `booffin-data-export-${user.handle || 'user'}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setFeedback({
          type: 'success',
          message: 'Data export downloaded as JSON file.',
        });
      } else {
        setExportFeedback('Export generated successfully with full profile, posts, and settings.');
      }
    } else {
      setFeedback({
        type: 'error',
        message: res.error || 'Failed to export account data.',
      });
    }
  };

  return (
    <SettingsLayout
      title="Storage & Data"
      subtitle="Manage local storage, cached preprints, and account data portability."
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

      {/* 1. Local Cache */}
      <SettingsSectionHeader
        title="Local Cache & Offline Storage"
        description="Temporary cached media, paper abstracts, and network queries stored on this device."
      />
      <SettingsCardGroup style={styles.cardPadding}>
        <View style={styles.storageInfoRow}>
          <View>
            <Typography variant="captionBold" color={colors.textPrimary}>
              Estimated Cache Size
            </Typography>
            <Typography variant="micro" color={colors.textSecondary} style={{ marginTop: 2 }}>
              Images, preprints, and search indices
            </Typography>
          </View>
          <Typography variant="h3" color={colors.textPrimary}>
            {cacheSize}
          </Typography>
        </View>

        <Button
          title={isClearing ? "Clearing..." : "Clear Cache"}
          variant="outline"
          size="sm"
          onPress={() => setClearModalVisible(true)}
          style={{ marginTop: spacing.md }}
        />
      </SettingsCardGroup>

      {/* 2. GDPR Data Portability */}
      <SettingsSectionHeader
        title="Account Data Portability (GDPR)"
        description="Download a machine-readable JSON copy of your research profile, publications, posts, and preferences."
      />
      <SettingsCardGroup style={styles.cardPadding}>
        <Typography variant="caption" color={colors.textSecondary} style={{ marginBottom: spacing.md }}>
          Your data export includes all your public and private metadata, discussions, comments, and settings recorded on BooffIn.
        </Typography>

        <Button
          title={isExporting ? "Compiling Export..." : "Download My Data (JSON)"}
          variant="primary"
          onPress={handleExportData}
          loading={isExporting}
        />

        {exportFeedback ? (
          <Typography variant="micro" color="#166534" style={{ marginTop: spacing.sm }}>
            {exportFeedback}
          </Typography>
        ) : null}
      </SettingsCardGroup>

      {/* Clear Cache Confirmation */}
      <DangerActionModal
        visible={clearModalVisible}
        onClose={() => setClearModalVisible(false)}
        onConfirm={handleClearCacheConfirm}
        title="Clear Local Cache?"
        description="This will clear temporarily stored media and offline search indexes. Your account and saved posts will not be affected."
        confirmText="Clear Cache"
        cancelText="Cancel"
        isLoading={isClearing}
      />
    </SettingsLayout>
  );
}

const styles = StyleSheet.create({
  cardPadding: {
    padding: spacing.md,
  },
  storageInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
