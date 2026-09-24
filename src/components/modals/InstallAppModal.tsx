import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import {
  Download,
  Share2,
  PlusSquare,
  Sparkles,
  Smartphone,
  CheckCircle2,
  X,
  Laptop,
  ArrowRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';
import { BooffinLogo } from '../core/BooffinLogo';
import { Button } from '../core/Button';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface InstallAppModalProps {
  visible: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  visible,
  onClose,
}) => {
  const {
    isInstalled,
    isIOS,
    isAndroid,
    isDesktop,
    hasNativePrompt,
    promptInstall,
  } = usePWAInstall();

  const handleNativeInstall = async () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    const installed = await promptInstall();
    if (installed) {
      onClose();
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
          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header / Brand */}
            <View style={styles.headerSection}>
              <BooffinLogo size={64} style={styles.logo} />
              <Text style={styles.title}>Install BooffIn App</Text>
              <Text style={styles.subtitle}>
                Get the full scientific community experience directly on your device.
              </Text>
            </View>

            {/* Benefits List */}
            <View style={styles.benefitsCard}>
              <View style={styles.benefitRow}>
                <View style={styles.benefitIconCircle}>
                  <Sparkles size={16} color={colors.textPrimary} />
                </View>
                <View style={styles.benefitTextCol}>
                  <Text style={styles.benefitTitle}>Fast 1-Tap Access</Text>
                  <Text style={styles.benefitDesc}>
                    Launch directly from your home screen or dock without typing a URL.
                  </Text>
                </View>
              </View>

              <View style={styles.benefitRow}>
                <View style={styles.benefitIconCircle}>
                  <Smartphone size={16} color={colors.textPrimary} />
                </View>
                <View style={styles.benefitTextCol}>
                  <Text style={styles.benefitTitle}>Fullscreen Immersion</Text>
                  <Text style={styles.benefitDesc}>
                    Distraction-free reading of papers, figures, and discussions without browser bars.
                  </Text>
                </View>
              </View>

              <View style={styles.benefitRow}>
                <View style={styles.benefitIconCircle}>
                  <CheckCircle2 size={16} color={colors.textPrimary} />
                </View>
                <View style={styles.benefitTextCol}>
                  <Text style={styles.benefitTitle}>Instant Updates & Offline Caching</Text>
                  <Text style={styles.benefitDesc}>
                    Always up-to-date with peer-reviewed preprints and research replies.
                  </Text>
                </View>
              </View>
            </View>

            {/* Platform-Specific Installation Steps */}
            {isInstalled ? (
              <View style={styles.installedBox}>
                <CheckCircle2 size={24} color={colors.accentGreen} />
                <Text style={styles.installedText}>
                  BooffIn is already installed on this device!
                </Text>
              </View>
            ) : hasNativePrompt ? (
              /* 1-Tap Native Install (Chrome, Android, Edge) */
              <View style={styles.actionContainer}>
                <Button
                  title="Install BooffIn Now"
                  variant="primary"
                  size="lg"
                  onPress={handleNativeInstall}
                  iconLeft={<Download size={18} color={colors.white} style={{ marginRight: spacing.xs }} />}
                  style={styles.actionButton}
                />
              </View>
            ) : isIOS ? (
              /* iOS Safari Instructions */
              <View style={styles.iosInstructionsCard}>
                <Text style={styles.instructionsHeading}>How to install on iOS / iPhone:</Text>

                <View style={styles.instructionStep}>
                  <View style={styles.stepNumberBadge}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <View style={styles.stepTextWrapper}>
                    <Text style={styles.stepText}>
                      Tap the <Text style={{ fontWeight: '700' }}>Share</Text> button in Safari's bottom bar.
                    </Text>
                    <Share2 size={16} color={colors.textPrimary} style={{ marginTop: 2 }} />
                  </View>
                </View>

                <View style={styles.instructionStep}>
                  <View style={styles.stepNumberBadge}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <View style={styles.stepTextWrapper}>
                    <Text style={styles.stepText}>
                      Scroll down and tap <Text style={{ fontWeight: '700' }}>"Add to Home Screen"</Text>.
                    </Text>
                    <PlusSquare size={16} color={colors.textPrimary} style={{ marginTop: 2 }} />
                  </View>
                </View>

                <View style={styles.instructionStep}>
                  <View style={styles.stepNumberBadge}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                  <View style={styles.stepTextWrapper}>
                    <Text style={styles.stepText}>
                      Tap <Text style={{ fontWeight: '700' }}>"Add"</Text> in the top-right corner.
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              /* Desktop / Other Browsers */
              <View style={styles.iosInstructionsCard}>
                <Text style={styles.instructionsHeading}>Install from Browser:</Text>
                <View style={styles.instructionStep}>
                  <Laptop size={20} color={colors.textPrimary} />
                  <Text style={styles.stepText}>
                    Click the <Text style={{ fontWeight: '700' }}>Install icon (⊕)</Text> in your browser address bar, or select <Text style={{ fontWeight: '700' }}>"Install BooffIn"</Text> from the browser menu.
                  </Text>
                </View>
              </View>
            )}

            {/* Secondary Continue Button */}
            <TouchableOpacity
              style={styles.continueLink}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.continueLinkText}>Continue in Browser</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: spacing.xl,
    paddingTop: spacing.xxl,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logo: {
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h2,
    fontSize: 22,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  benefitsCard: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  benefitIconCircle: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  benefitTextCol: {
    flex: 1,
  },
  benefitTitle: {
    ...typography.captionBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  benefitDesc: {
    ...typography.micro,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  actionContainer: {
    width: '100%',
    marginBottom: spacing.md,
  },
  actionButton: {
    width: '100%',
  },
  iosInstructionsCard: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  instructionsHeading: {
    ...typography.captionBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: radii.full,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  stepTextWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepText: {
    ...typography.caption,
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 18,
  },
  installedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#ECFDF5',
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.md,
  },
  installedText: {
    ...typography.captionBold,
    color: '#065F46',
    flex: 1,
  },
  continueLink: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  continueLinkText: {
    ...typography.captionMedium,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
});
