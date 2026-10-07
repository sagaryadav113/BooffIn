import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  SafeAreaView,
  StatusBar,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Menu, X, ChevronRight, Mail } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { GoogleIcon } from '../core/GoogleIcon';
import { useAuthStore } from '../../store/useAuthStore';
import { isProfileComplete } from '../../api/authService';
import { LegalDocument } from '../../constants/legalPolicies';

interface LegalPageLayoutProps {
  document: LegalDocument;
}

export function LegalPageLayout({ document }: LegalPageLayoutProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;
  const isMobile = width < 768;
  const isSmallMobile = width < 480;

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const isLoading = useAuthStore((s) => s.isLoading);
  const authError = useAuthStore((s) => s.authError);

  const topInset = Math.max(insets.top, Platform.OS === 'web' ? (isMobile ? 22 : 14) : 0);

  const handleOpenAuthModal = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setIsAuthModalOpen(true);
  };

  const handleCloseAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const handleGoogleAuth = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    const success = await signInWithGoogle();
    if (success) {
      setIsAuthModalOpen(false);
      const activeUser = useAuthStore.getState().user;
      if (isProfileComplete(activeUser)) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/onboarding');
      }
    }
  };

  const handleEmailAuth = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setIsAuthModalOpen(false);
    router.push('/(auth)/email');
  };

  const handleSignUp = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setIsAuthModalOpen(false);
    router.push('/(auth)/signup');
  };

  const handleEmailPress = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBF9" />

      {/* ============================================================ */}
      {/* 1. TOP HEADER NAVIGATION (100% IDENTICAL TO WELCOME PAGE) */}
      {/* ============================================================ */}
      <View
        style={[
          styles.headerContainer,
          {
            paddingTop: topInset + (isMobile ? 10 : 16),
            paddingBottom: isMobile ? 10 : 16,
            paddingHorizontal: isMobile ? (isSmallMobile ? 14 : 20) : 36,
            backgroundColor: Platform.OS === 'web' ? 'rgba(250, 251, 249, 0.96)' : '#FAFBF9',
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(226, 232, 240, 0.8)',
          },
        ]}
      >
        <View style={styles.headerInner}>
          {/* Brand Logo */}
          <TouchableOpacity
            style={styles.logoBtn}
            onPress={() => {
              setIsMobileMenuOpen(false);
              router.push('/(auth)/welcome' as any);
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.logoText, isSmallMobile && { fontSize: 22 }]}>BooffIn</Text>
          </TouchableOpacity>

          {isMobile ? (
            /* Mobile Right Action Bar: Sign In Pill + Hamburger Toggle */
            <View style={styles.mobileHeaderRight}>
              <TouchableOpacity
                style={styles.mobileHeaderSignInBtn}
                onPress={handleOpenAuthModal}
                activeOpacity={0.8}
              >
                <Text style={styles.mobileHeaderSignInText}>Sign In</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.mobileMenuToggleBtn}
                onPress={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Toggle Navigation Menu"
              >
                {isMobileMenuOpen ? (
                  <X size={22} color="#0F172A" strokeWidth={2.2} />
                ) : (
                  <Menu size={22} color="#0F172A" strokeWidth={2.2} />
                )}
              </TouchableOpacity>
            </View>
          ) : (
            /* Desktop Nav Links */
            <View style={styles.navLinks}>
              <TouchableOpacity
                style={styles.navItem}
                onPress={() => router.push('/(auth)/welcome' as any)}
              >
                <Text style={styles.navItemText}>Home</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => router.push('/(auth)/welcome?tab=about' as any)}
              >
                <Text style={styles.navItemText}>About</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => router.push('/(auth)/welcome?tab=features' as any)}
              >
                <Text style={styles.navItemText}>Features</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => router.push('/(auth)/welcome?tab=community' as any)}
              >
                <Text style={styles.navItemText}>Community</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.navItem,
                  document.id === 'privacy' && styles.navItemActive,
                ]}
                onPress={() => router.push('/welcome/policy' as any)}
              >
                <Text
                  style={[
                    styles.navItemText,
                    document.id === 'privacy' && styles.navItemTextActive,
                  ]}
                >
                  Privacy Policy
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.navItem,
                  document.id === 'terms' && styles.navItemActive,
                ]}
                onPress={() => router.push('/welcome/terms' as any)}
              >
                <Text
                  style={[
                    styles.navItemText,
                    document.id === 'terms' && styles.navItemTextActive,
                  ]}
                >
                  Terms
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navSignInBtn}
                onPress={handleOpenAuthModal}
                activeOpacity={0.7}
              >
                <Text style={styles.navSignInText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Mobile Navigation Dropdown Menu */}
        {isMobile && isMobileMenuOpen && (
          <View
            style={[
              styles.mobileMenuDropdown,
              { top: topInset + (isSmallMobile ? 50 : 58) },
            ]}
          >
            <TouchableOpacity
              style={styles.mobileMenuItem}
              onPress={() => {
                setIsMobileMenuOpen(false);
                router.push('/(auth)/welcome' as any);
              }}
            >
              <Text style={styles.mobileMenuItemText}>Home</Text>
              <ChevronRight size={16} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mobileMenuItem}
              onPress={() => {
                setIsMobileMenuOpen(false);
                router.push('/(auth)/welcome?tab=about' as any);
              }}
            >
              <Text style={styles.mobileMenuItemText}>About</Text>
              <ChevronRight size={16} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mobileMenuItem}
              onPress={() => {
                setIsMobileMenuOpen(false);
                router.push('/(auth)/welcome?tab=features' as any);
              }}
            >
              <Text style={styles.mobileMenuItemText}>Features</Text>
              <ChevronRight size={16} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mobileMenuItem}
              onPress={() => {
                setIsMobileMenuOpen(false);
                router.push('/(auth)/welcome?tab=community' as any);
              }}
            >
              <Text style={styles.mobileMenuItemText}>Community</Text>
              <ChevronRight size={16} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.mobileMenuItem,
                document.id === 'privacy' && styles.mobileMenuItemActive,
              ]}
              onPress={() => {
                setIsMobileMenuOpen(false);
                router.push('/welcome/policy' as any);
              }}
            >
              <Text
                style={[
                  styles.mobileMenuItemText,
                  document.id === 'privacy' && styles.mobileMenuItemTextActive,
                ]}
              >
                Privacy Policy
              </Text>
              <ChevronRight
                size={16}
                color={document.id === 'privacy' ? '#047857' : '#94A3B8'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.mobileMenuItem,
                document.id === 'terms' && styles.mobileMenuItemActive,
              ]}
              onPress={() => {
                setIsMobileMenuOpen(false);
                router.push('/welcome/terms' as any);
              }}
            >
              <Text
                style={[
                  styles.mobileMenuItemText,
                  document.id === 'terms' && styles.mobileMenuItemTextActive,
                ]}
              >
                Terms of Service
              </Text>
              <ChevronRight
                size={16}
                color={document.id === 'terms' ? '#047857' : '#94A3B8'}
              />
            </TouchableOpacity>

            <View style={styles.mobileMenuDivider} />

            <View style={styles.mobileMenuCtaContainer}>
              <TouchableOpacity
                style={styles.mobileMenuPrimaryBtn}
                onPress={() => {
                  setIsMobileMenuOpen(false);
                  handleOpenAuthModal();
                }}
              >
                <Text style={styles.mobileMenuPrimaryText}>Get Started (Free)</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* ============================================================ */}
      {/* 2. MAIN LEGAL DOCUMENT CONTENT */}
      {/* ============================================================ */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: topInset + (isMobile ? 74 : 90) },
        ]}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.card}>
          {/* Header Badge */}
          <View style={styles.metaRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                OFFICIAL POLICY v{document.version}
              </Text>
            </View>
            <Text style={styles.effectiveDateText}>
              Effective: {document.effectiveDate}
            </Text>
          </View>

          {/* Title & Summary */}
          <Text style={styles.title}>{document.title}</Text>
          <Text style={styles.summary}>{document.summary}</Text>

          {/* Contact Bar */}
          <View style={styles.contactBox}>
            <View style={styles.contactItem}>
              <Text style={styles.contactItemLabel}>CONTROLLER</Text>
              <Text style={styles.contactItemValue}>{document.controller}</Text>
            </View>
            <View style={styles.contactItem}>
              <Text style={styles.contactItemLabel}>OFFICIAL INQUIRIES</Text>
              <TouchableOpacity onPress={() => handleEmailPress(document.supportEmail)}>
                <Text style={styles.contactItemLink}>{document.supportEmail}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.contactItem}>
              <Text style={styles.contactItemLabel}>PRIVACY & DPO</Text>
              <TouchableOpacity onPress={() => handleEmailPress(document.privacyEmail)}>
                <Text style={styles.contactItemLink}>{document.privacyEmail}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Policy Sections */}
          {document.sections.map((section, idx) => (
            <View key={idx} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.content.map((paragraph, pIdx) => (
                <Text key={pIdx} style={styles.paragraph}>
                  {paragraph}
                </Text>
              ))}
            </View>
          ))}

          <View style={styles.divider} />

          {/* Bottom Footer Notice */}
          <View style={styles.footerNotice}>
            <Text style={styles.footerNoticeText}>
              Questions regarding these terms or your personal data rights? Reach out directly to our privacy compliance team at{' '}
              <Text
                style={styles.footerNoticeLink}
                onPress={() => handleEmailPress('admin@letsbooffin.com')}
              >
                admin@letsbooffin.com
              </Text>
              .
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ============================================================ */}
      {/* 3. SMOOTH POPUP AUTHENTICATION MODAL */}
      {/* ============================================================ */}
      <Modal
        visible={isAuthModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseAuthModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.authModalCard, isDesktop && styles.authModalCardDesktop]}>
            {/* Modal Header */}
            <View style={styles.authModalHeader}>
              <View style={styles.modalLogoRow}>
                <Text style={styles.modalLogoText}>BooffIn</Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={handleCloseAuthModal}
                activeOpacity={0.7}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalTitle}>Join the Research Community</Text>
            <Text style={styles.modalSub}>
              Discover preprints, share findings, and connect with fellow scientists.
            </Text>

            {authError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{authError}</Text>
              </View>
            ) : null}

            {/* Auth Buttons */}
            <View style={styles.modalBtnStack}>
              {/* Google OAuth Button */}
              <TouchableOpacity
                style={[styles.authProviderBtn, isLoading && { opacity: 0.6 }]}
                onPress={handleGoogleAuth}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#047857" />
                ) : (
                  <>
                    <View style={styles.googleIconBox}>
                      <GoogleIcon size={18} />
                    </View>
                    <Text style={styles.authProviderBtnText}>Continue with Google</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.modalDividerRow}>
                <View style={styles.modalDividerLine} />
                <Text style={styles.modalDividerText}>or continue with email</Text>
                <View style={styles.modalDividerLine} />
              </View>

              {/* Email Login Button */}
              <TouchableOpacity
                style={styles.emailAuthBtn}
                onPress={handleEmailAuth}
                activeOpacity={0.8}
              >
                <Mail size={16} color="#0F172A" />
                <Text style={styles.emailAuthBtnText}>Sign In with Email</Text>
              </TouchableOpacity>

              {/* Email Sign Up Button */}
              <TouchableOpacity
                style={styles.signupOutlineBtn}
                onPress={handleSignUp}
                activeOpacity={0.8}
              >
                <Text style={styles.signupOutlineText}>Create New Account (Free)</Text>
              </TouchableOpacity>
            </View>

            {/* In-Modal Policy Agreement Links */}
            <View style={styles.modalFooterLegal}>
              <Text style={styles.modalLegalText}>
                By continuing, you agree to BooffIn's{' '}
                <Text
                  style={styles.modalLegalLink}
                  onPress={() => {
                    setIsAuthModalOpen(false);
                    router.push('/welcome/terms' as any);
                  }}
                >
                  Terms of Service
                </Text>{' '}
                and{' '}
                <Text
                  style={styles.modalLegalLink}
                  onPress={() => {
                    setIsAuthModalOpen(false);
                    router.push('/welcome/policy' as any);
                  }}
                >
                  Privacy Policy
                </Text>
                .
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFBF9',
  },
  // Top Header
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  headerInner: {
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
  },
  navItem: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  navItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#0F172A',
  },
  navItemText: {
    fontSize: 14.5,
    fontWeight: '500',
    color: '#475569',
  },
  navItemTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  navSignInBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  navSignInText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  // Mobile Header Elements
  mobileHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mobileHeaderSignInBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#064E3B',
    backgroundColor: '#064E3B',
  },
  mobileHeaderSignInText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  mobileMenuToggleBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  mobileMenuDropdown: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    zIndex: 100,
  },
  mobileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  mobileMenuItemActive: {
    backgroundColor: '#F0FDF4',
  },
  mobileMenuItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#334155',
  },
  mobileMenuItemTextActive: {
    color: '#047857',
    fontWeight: '700',
  },
  mobileMenuDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  mobileMenuCtaContainer: {
    paddingTop: 4,
  },
  mobileMenuPrimaryBtn: {
    backgroundColor: '#064E3B',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  mobileMenuPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '600',
  },
  // Main Content & Legal Card
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 64,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: Platform.OS === 'web' ? 36 : 20,
    maxWidth: 960,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
    letterSpacing: 0.5,
  },
  effectiveDateText: {
    fontSize: 13,
    color: '#64748B',
  },
  title: {
    fontSize: Platform.OS === 'web' ? 32 : 26,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  summary: {
    fontSize: 15,
    lineHeight: 24,
    color: '#475569',
    marginBottom: 20,
  },
  contactBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    justifyContent: 'space-between',
    gap: 12,
  },
  contactItem: {
    flex: 1,
  },
  contactItemLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  contactItemValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  contactItemLink: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  paragraph: {
    fontSize: 14.5,
    lineHeight: 23,
    color: '#334155',
    marginBottom: 10,
  },
  footerNotice: {
    paddingVertical: 8,
  },
  footerNoticeText: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#64748B',
  },
  footerNoticeLink: {
    color: '#2563EB',
    fontWeight: '600',
  },
  // Auth Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authModalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
  },
  authModalCardDesktop: {
    padding: 28,
  },
  authModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalLogoText: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 9999,
    backgroundColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  modalSub: {
    fontSize: 13.5,
    lineHeight: 19,
    color: '#64748B',
    marginBottom: 20,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  errorBannerText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '500',
  },
  modalBtnStack: {
    gap: 10,
  },
  authProviderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  googleIconBox: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authProviderBtnText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  modalDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  modalDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  modalDividerText: {
    paddingHorizontal: 10,
    fontSize: 12,
    color: '#94A3B8',
  },
  emailAuthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  emailAuthBtnText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  signupOutlineBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#064E3B',
    borderRadius: 12,
    paddingVertical: 12,
  },
  signupOutlineText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalFooterLegal: {
    marginTop: 18,
    alignItems: 'center',
  },
  modalLegalText: {
    fontSize: 12,
    lineHeight: 17,
    color: '#64748B',
    textAlign: 'center',
  },
  modalLegalLink: {
    color: '#047857',
    fontWeight: '600',
  },
});
