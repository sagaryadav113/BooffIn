import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';
import { Button } from '../core/Button';
import { useAuthStore } from '../../store/useAuthStore';

export interface QuickOAuthModalProps {
  visible: boolean;
  provider: 'google' | 'orcid';
  onClose: () => void;
  onSuccess: () => void;
}

export const QuickOAuthModal: React.FC<QuickOAuthModalProps> = ({
  visible,
  provider,
  onClose,
  onSuccess,
}) => {
  const isGoogle = provider === 'google';
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const signInWithORCID = useAuthStore((s) => s.signInWithORCID);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOAuth = async () => {
    setLoading(true);
    setError(null);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    const success = isGoogle
      ? await signInWithGoogle()
      : await signInWithORCID();

    setLoading(false);
    if (success) {
      onSuccess();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.scrollContent}>
            {/* Provider Header */}
            <View style={styles.header}>
              <View
                style={[
                  styles.providerBadgeCircle,
                  isGoogle ? styles.googleCircle : styles.orcidCircle,
                ]}
              >
                {isGoogle ? (
                  <Text style={styles.googleBadgeText}>G</Text>
                ) : (
                  <Text style={styles.orcidBadgeText}>iD</Text>
                )}
              </View>

              <Text style={styles.modalTitle}>
                {isGoogle ? 'Continue with Google' : 'Continue with ORCID iD'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {isGoogle
                  ? 'Sign in securely with your Google account to access your research profile and peer discussions.'
                  : 'Authenticate with your verified ORCID researcher identifier to connect your publications.'}
              </Text>
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Button
              title={loading ? 'Connecting...' : (isGoogle ? 'Open Google Login' : 'Open ORCID Login')}
              variant="primary"
              size="lg"
              onPress={handleOAuth}
              disabled={loading}
              style={styles.primaryButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 10,
    padding: 6,
    borderRadius: radii.full,
    backgroundColor: colors.gray100,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingTop: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  providerBadgeCircle: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  googleCircle: {
    backgroundColor: '#EA4335',
  },
  orcidCircle: {
    backgroundColor: '#A6CE39',
  },
  googleBadgeText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 24,
    fontFamily: 'serif',
  },
  orcidBadgeText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 20,
    fontFamily: 'serif',
  },
  modalTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.caption,
    color: colors.accentRed,
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: spacing.sm,
    width: '100%',
  },
});
