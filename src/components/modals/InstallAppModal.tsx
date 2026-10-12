import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  Linking,
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
  Monitor,
  ExternalLink,
  ShieldCheck,
  HardDrive,
  Info,
  ChevronRight,
  FileCheck,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';
import { BooffinLogo } from '../core/BooffinLogo';
import { Button } from '../core/Button';
import { usePWAInstall } from '../../hooks/usePWAInstall';

const GOOGLE_DRIVE_DOWNLOAD_URL = 'https://drive.google.com/uc?export=download&id=17zpIPDXDNA-Itb035Pq-vgsCSre5cjfS&confirm=t';
const GOOGLE_DRIVE_VIEW_URL = 'https://drive.google.com/file/d/17zpIPDXDNA-Itb035Pq-vgsCSre5cjfS/view?usp=sharing';
const WINDOWS_SETUP_URL = GOOGLE_DRIVE_DOWNLOAD_URL;
const WINDOWS_PORTABLE_URL = GOOGLE_DRIVE_DOWNLOAD_URL;
const GITHUB_RELEASES_URL = 'https://github.com/sagaryadav113/BooffIn/releases';

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
    hasNativePrompt,
    promptInstall,
  } = usePWAInstall();

  const isRunningInElectron =
    typeof window !== 'undefined' &&
    (Boolean((window as any).booffinDesktop?.isDesktop) ||
      Boolean(navigator.userAgent?.includes('BooffInDesktop')));

  const [activeTab, setActiveTab] = useState<'windows' | 'pwa'>(
    isIOS || isAndroid ? 'pwa' : 'windows'
  );
  const [downloadStarted, setDownloadStarted] = useState(false);

  const handleDownloadWindows = (url: string = GOOGLE_DRIVE_DOWNLOAD_URL) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setDownloadStarted(true);

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      Linking.openURL(url);
    }
  };

  const handleOpenExternal = (url: string) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      Linking.openURL(url);
    }
  };

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
            accessibilityLabel="Close install dialog"
          >
            <X size={20} color="#64748B" />
          </TouchableOpacity>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header / Brand */}
            <View style={styles.headerSection}>
              <BooffinLogo size={36} variant="wordmark" style={styles.logo} />
              <Text style={styles.title}>Install BooffIn Application</Text>
              <Text style={styles.subtitle}>
                Professional academic & scientific research community platform.
              </Text>

              {isRunningInElectron && (
                <View style={styles.runningDesktopBanner}>
                  <CheckCircle2 size={16} color="#065F46" />
                  <Text style={styles.runningDesktopText}>
                    You are currently running BooffIn Desktop (v1.0.0 Stable).
                  </Text>
                </View>
              )}

              {/* Platform Switcher Tabs */}
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    setActiveTab('windows');
                    setDownloadStarted(false);
                  }}
                  style={[
                    styles.tabButton,
                    activeTab === 'windows' && styles.tabButtonActive,
                  ]}
                >
                  <Monitor
                    size={16}
                    color={activeTab === 'windows' ? '#064E3B' : '#64748B'}
                    strokeWidth={2.2}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === 'windows' && styles.tabTextActive,
                    ]}
                  >
                    Windows (.exe)
                  </Text>
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedBadgeText}>Desktop</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setActiveTab('pwa')}
                  style={[
                    styles.tabButton,
                    activeTab === 'pwa' && styles.tabButtonActive,
                  ]}
                >
                  <Smartphone
                    size={16}
                    color={activeTab === 'pwa' ? '#064E3B' : '#64748B'}
                    strokeWidth={2.2}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === 'pwa' && styles.tabTextActive,
                    ]}
                  >
                    Web & Mobile App
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* WINDOWS (.EXE) TAB CONTENT */}
            {activeTab === 'windows' && (
              <View style={styles.tabContent}>
                {/* Hero Download Card */}
                <View style={styles.windowsHeroCard}>
                  <View style={styles.windowsHeroHeader}>
                    <View style={styles.windowsIconCircle}>
                      <Monitor size={24} color="#FFFFFF" strokeWidth={2.2} />
                    </View>
                    <View style={styles.windowsHeroTitles}>
                      <View style={styles.versionRow}>
                        <Text style={styles.windowsHeroTitle}>BooffIn Desktop</Text>
                        <View style={styles.versionTag}>
                          <Text style={styles.versionTagText}>v1.0.0 Stable</Text>
                        </View>
                      </View>
                      <Text style={styles.windowsHeroSubtitle}>
                        Windows 10 / 11 • 64-bit Architecture (x64)
                      </Text>
                    </View>
                  </View>

                  {/* Primary Download Button */}
                  <TouchableOpacity
                    style={styles.primaryDownloadBtn}
                    activeOpacity={0.85}
                    onPress={() => handleDownloadWindows(GOOGLE_DRIVE_DOWNLOAD_URL)}
                  >
                    <Download size={20} color="#FFFFFF" strokeWidth={2.3} />
                    <View style={styles.downloadBtnTextCol}>
                      <Text style={styles.downloadBtnTitle}>Download for Windows (.exe)</Text>
                      <Text style={styles.downloadBtnMeta}>
                        BooffIn.exe • 234 MB • Windows 10/11 (64-bit)
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Secondary Mirror & Portable Options */}
                  <View style={styles.secondaryLinksRow}>
                    <TouchableOpacity
                      style={styles.secondaryOptionBtn}
                      activeOpacity={0.75}
                      onPress={() => handleOpenExternal(GOOGLE_DRIVE_VIEW_URL)}
                    >
                      <HardDrive size={13} color="#064E3B" strokeWidth={2} />
                      <Text style={styles.secondaryOptionText}>Google Drive Mirror</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.secondaryOptionBtn}
                      activeOpacity={0.75}
                      onPress={() => handleOpenExternal(GITHUB_RELEASES_URL)}
                    >
                      <ExternalLink size={13} color="#064E3B" strokeWidth={2} />
                      <Text style={styles.secondaryOptionText}>GitHub Releases</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Download confirmation feedback banner */}
                  {downloadStarted && (
                    <View style={styles.downloadSuccessBox}>
                      <CheckCircle2 size={18} color="#065F46" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.downloadSuccessTitle}>
                          Download link opened!
                        </Text>
                        <Text style={styles.downloadSuccessDesc}>
                          Your download from Google Drive is ready. Once downloaded, double-click <Text style={{ fontWeight: '700' }}>BooffIn.exe</Text> to launch your desktop app.
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Professional Advantages */}
                <View style={styles.featuresSection}>
                  <Text style={styles.sectionHeaderTitle}>Native Desktop Benefits</Text>

                  <View style={styles.featureItem}>
                    <View style={styles.featureIconBadge}>
                      <ShieldCheck size={16} color="#064E3B" strokeWidth={2.2} />
                    </View>
                    <View style={styles.featureTextWrapper}>
                      <Text style={styles.featureItemTitle}>Dedicated Workspace & Window Controls</Text>
                      <Text style={styles.featureItemDesc}>
                        Run research discussions, PDF reading, and live calls without browser tab clutter or accidental tab closes.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.featureItem}>
                    <View style={styles.featureIconBadge}>
                      <Sparkles size={16} color="#064E3B" strokeWidth={2.2} />
                    </View>
                    <View style={styles.featureTextWrapper}>
                      <Text style={styles.featureItemTitle}>Real-time Desktop Alerts & System Tray</Text>
                      <Text style={styles.featureItemDesc}>
                        Instant peer-review notices, citations, and inner circle messaging even when minimized.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.featureItem}>
                    <View style={styles.featureIconBadge}>
                      <FileCheck size={16} color="#064E3B" strokeWidth={2.2} />
                    </View>
                    <View style={styles.featureTextWrapper}>
                      <Text style={styles.featureItemTitle}>Hardware-Accelerated PDF & Graph Engine</Text>
                      <Text style={styles.featureItemDesc}>
                        High-efficiency Electron runtime with local caching for rapid paper navigation.
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Installation Steps */}
                <View style={styles.stepsCard}>
                  <Text style={styles.sectionHeaderTitle}>How to Install on Windows:</Text>

                  <View style={styles.stepRow}>
                    <View style={styles.stepNum}>
                      <Text style={styles.stepNumText}>1</Text>
                    </View>
                    <Text style={styles.stepInstruction}>
                      Click <Text style={{ fontWeight: '700' }}>Download for Windows (.exe)</Text> above to get the installer.
                    </Text>
                  </View>

                  <View style={styles.stepRow}>
                    <View style={styles.stepNum}>
                      <Text style={styles.stepNumText}>2</Text>
                    </View>
                    <Text style={styles.stepInstruction}>
                      Open the downloaded <Text style={{ fontWeight: '700' }}>BooffIn.exe</Text>. If Windows SmartScreen prompts on first run, click <Text style={{ fontWeight: '700' }}>"More info" → "Run anyway"</Text>.
                    </Text>
                  </View>

                  <View style={styles.stepRow}>
                    <View style={styles.stepNum}>
                      <Text style={styles.stepNumText}>3</Text>
                    </View>
                    <Text style={styles.stepInstruction}>
                      Right-click <Text style={{ fontWeight: '700' }}>BooffIn.exe</Text> → <Text style={{ fontWeight: '700' }}>Send to → Desktop</Text> to place an instant shortcut on your desktop, and sign in to your research feed.
                    </Text>
                  </View>
                </View>

                {/* System Specs Footer Card */}
                <View style={styles.specsBadgeRow}>
                  <View style={styles.specPill}>
                    <Text style={styles.specPillLabel}>OS:</Text>
                    <Text style={styles.specPillValue}>Windows 10 / 11 (64-bit)</Text>
                  </View>
                  <View style={styles.specPill}>
                    <Text style={styles.specPillLabel}>Runtime:</Text>
                    <Text style={styles.specPillValue}>Electron v44.7 (x64)</Text>
                  </View>
                  <View style={styles.specPill}>
                    <Text style={styles.specPillLabel}>Checksum:</Text>
                    <Text style={styles.specPillValue}>SHA-256 Verified</Text>
                  </View>
                </View>

                {/* Local Dev Launcher Hint */}
                <View style={styles.localDevCard}>
                  <Info size={15} color="#065F46" style={{ marginTop: 2 }} />
                  <Text style={styles.localDevText}>
                    <Text style={{ fontWeight: '700' }}>Local Desktop Environment:</Text> If you have this repository on your PC, you can also launch the prebuilt binary immediately with <Text style={styles.codeSnippet}>Launch-BooffIn.bat</Text> in the project folder.
                  </Text>
                </View>
              </View>
            )}

            {/* WEB & MOBILE (PWA) TAB CONTENT */}
            {activeTab === 'pwa' && (
              <View style={styles.tabContent}>
                {/* Benefits List */}
                <View style={styles.benefitsCard}>
                  <View style={styles.benefitRow}>
                    <View style={styles.benefitIconCircle}>
                      <Sparkles size={16} color={colors.textPrimary} />
                    </View>
                    <View style={styles.benefitTextCol}>
                      <Text style={styles.benefitTitle}>Fast 1-Tap Access</Text>
                      <Text style={styles.benefitDesc}>
                        Launch directly from your mobile home screen or dock without typing a URL.
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
                        Distraction-free reading of papers, figures, and discussions without browser navigation bars.
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
                    <CheckCircle2 size={24} color="#059669" />
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
    padding: spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 540,
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 12,
  },
  closeButton: {
    position: 'absolute',
    top: 18,
    right: 18,
    zIndex: 20,
    width: 34,
    height: 34,
    borderRadius: radii.full,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 28,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    marginBottom: 10,
  },
  title: {
    ...typography.h2,
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.caption,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 420,
  },
  runningDesktopBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginTop: 12,
    gap: 8,
  },
  runningDesktopText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: radii.full,
    padding: 4,
    marginTop: 18,
    width: '100%',
    maxWidth: 440,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: radii.full,
    gap: 7,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#064E3B',
    fontWeight: '700',
  },
  recommendedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  recommendedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  tabContent: {
    width: '100%',
  },
  windowsHeroCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 20,
    marginBottom: 18,
  },
  windowsHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  windowsIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#064E3B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  windowsHeroTitles: {
    flex: 1,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  windowsHeroTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  versionTag: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  versionTagText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0369A1',
  },
  windowsHeroSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  primaryDownloadBtn: {
    backgroundColor: '#064E3B',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 14,
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },
  downloadBtnTextCol: {
    flex: 1,
  },
  downloadBtnTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  downloadBtnMeta: {
    fontSize: 11.5,
    color: '#A7F3D0',
    marginTop: 2,
  },
  secondaryLinksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  secondaryOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 6,
  },
  secondaryOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#064E3B',
  },
  downloadSuccessBox: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  downloadSuccessTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  downloadSuccessDesc: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
    lineHeight: 17,
  },
  featuresSection: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  sectionHeaderTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  featureIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  featureTextWrapper: {
    flex: 1,
  },
  featureItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  featureItemDesc: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
    marginTop: 1,
  },
  stepsCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 16,
    gap: 10,
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#064E3B',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  stepInstruction: {
    flex: 1,
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 18,
  },
  specsBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  specPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 9,
    gap: 4,
  },
  specPillLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  specPillValue: {
    fontSize: 11,
    color: '#0F172A',
    fontWeight: '700',
  },
  localDevCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 6,
  },
  localDevText: {
    flex: 1,
    fontSize: 11.5,
    color: '#166534',
    lineHeight: 16,
  },
  codeSnippet: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '700',
    backgroundColor: '#DCFCE7',
    color: '#14532D',
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
    marginTop: 8,
  },
  continueLinkText: {
    ...typography.captionMedium,
    color: '#94A3B8',
    textDecorationLine: 'underline',
  },
});
