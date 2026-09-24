import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Download, X, Smartphone } from 'lucide-react-native';
import { colors, radii, spacing, typography, shadows } from '../../theme';
import { BooffinLogo } from '../core/BooffinLogo';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { InstallAppModal } from '../modals/InstallAppModal';

const DISMISS_STORAGE_KEY = 'booffin_pwa_banner_dismissed';

export const WebInstallBanner: React.FC = () => {
  const { isWeb, isInstalled, canInstall } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (!isWeb) return;
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const dismissed = window.sessionStorage.getItem(DISMISS_STORAGE_KEY);
        if (!dismissed) {
          setIsDismissed(false);
        }
      } else {
        setIsDismissed(false);
      }
    } catch {
      setIsDismissed(false);
    }
  }, [isWeb]);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(DISMISS_STORAGE_KEY, 'true');
      }
    } catch {}
  };

  const handleOpenInstall = () => {
    setModalVisible(true);
  };

  if (!isWeb || isInstalled || isDismissed) {
    return null;
  }

  return (
    <>
      <View style={styles.bannerContainer}>
        <View style={styles.leftContent}>
          <BooffinLogo size={24} style={styles.logo} />
          <View style={styles.textWrapper}>
            <Text style={styles.bannerTitle}>Install BooffIn App</Text>
            <Text style={styles.bannerSubtitle} numberOfLines={1}>
              Fast 1-tap access & fullscreen reading
            </Text>
          </View>
        </View>

        <View style={styles.rightActions}>
          <TouchableOpacity
            style={styles.installButton}
            onPress={handleOpenInstall}
            activeOpacity={0.85}
          >
            <Download size={13} color={colors.white} style={{ marginRight: 4 }} />
            <Text style={styles.installButtonText}>Install</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dismissButton}
            onPress={handleDismiss}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      <InstallAppModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    width: '100%',
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 999,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.xs + 2,
  },
  logo: {
    marginRight: 2,
  },
  textWrapper: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  bannerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  installButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.black,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  installButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  dismissButton: {
    padding: 2,
  },
});
