// ============================================================================
// BOOFFIN — OFFICIAL MULTI-PAGE LANDING EXPERIENCE & AUTHENTICATION PORTAL
// ============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Platform,
  ScrollView,
  Modal,
  useWindowDimensions,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { 
  Mail, 
  X, 
  ArrowLeft 
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { GoogleIcon } from '../../components/core/GoogleIcon';
import { useAuthStore } from '../../store/useAuthStore';
import { isProfileComplete } from '../../api/authService';
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from '../../constants/legalPolicies';

const WELCOME_HERO_BG = require('../../../assets/images/welcome-hero.jpg');

type LandingTab = 'welcome' | 'about' | 'features' | 'community' | 'privacy' | 'terms';

export default function WelcomeScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;

  const [activeTab, setActiveTab] = useState<LandingTab>('welcome');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const isLoading = useAuthStore((s) => s.isLoading);
  const authError = useAuthStore((s) => s.authError);

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBF9" />

      {/* 1. TOP HEADER NAVIGATION */}
      <View style={styles.headerContainer}>
        <View style={styles.headerInner}>
          {/* Brand Logo */}
          <TouchableOpacity 
            style={styles.logoBtn} 
            onPress={() => setActiveTab('welcome')} 
            activeOpacity={0.8}
          >
            <Text style={styles.logoB}>B</Text>
            <Text style={styles.logoText}>BooffIn</Text>
          </TouchableOpacity>

          {/* Nav Links */}
          <View style={styles.navLinks}>
            <TouchableOpacity 
              style={[styles.navItem, activeTab === 'about' && styles.navItemActive]} 
              onPress={() => setActiveTab('about')}
            >
              <Text style={[styles.navItemText, activeTab === 'about' && styles.navItemTextActive]}>
                About
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.navItem, activeTab === 'features' && styles.navItemActive]} 
              onPress={() => setActiveTab('features')}
            >
              <Text style={[styles.navItemText, activeTab === 'features' && styles.navItemTextActive]}>
                Features
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.navItem, activeTab === 'community' && styles.navItemActive]} 
              onPress={() => setActiveTab('community')}
            >
              <Text style={[styles.navItemText, activeTab === 'community' && styles.navItemTextActive]}>
                Community
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
        </View>
      </View>

      {/* 2. MAIN SCROLLABLE CONTENT AREA */}
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainContainer}>

          {/* ============================================================ */}
          {/* TAB 1: WELCOME / HOME (IMAGE 1) */}
          {/* ============================================================ */}
          {activeTab === 'welcome' && (
            <View style={[styles.pageLayout, isDesktop && styles.pageLayoutDesktop]}>
              {/* Left Column: Text & CTAs */}
              <View style={[styles.leftColumn, isDesktop && styles.leftColumnDesktop]}>
                <Text style={styles.heroPreTitle}>Welcome to BooffIn</Text>
                
                <View style={styles.brandTitleBlock}>
                  <Text style={styles.heroLets}>Let’s</Text>
                  <Text style={styles.heroBrandTitle}>BooffIn</Text>
                </View>

                <Text style={styles.heroTagline}>Research finds its people.</Text>

                <Text style={styles.heroDescription}>
                  Connect our researchers, share insights, and discover the science of finding you platforms.
                </Text>

                <View style={styles.heroActionsRow}>
                  <TouchableOpacity 
                    style={styles.primaryCtaBtn} 
                    onPress={handleOpenAuthModal}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.primaryCtaBtnText}>Get Started</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.secondaryLinkBtn} 
                    onPress={handleOpenAuthModal}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.secondaryLinkText}>Log In</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Right Column: Isometric Scientific Collage Artwork */}
              <View style={[styles.rightColumn, isDesktop && styles.rightColumnDesktop]}>
                <Image
                  source={WELCOME_HERO_BG}
                  style={styles.heroImage}
                  contentFit="contain"
                  priority="high"
                />
              </View>
            </View>
          )}

          {/* ============================================================ */}
          {/* TAB 2: ABOUT (IMAGE 2) */}
          {/* ============================================================ */}
          {activeTab === 'about' && (
            <View style={[styles.pageLayout, isDesktop && styles.pageLayoutDesktop]}>
              <View style={[styles.leftColumn, isDesktop && styles.leftColumnDesktop]}>
                <Text style={styles.editorialTitle}>About BooffIn</Text>
                <Text style={styles.editorialSubtitle}>A space where research finds its people</Text>

                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionHeading}>Our Mission</Text>
                  <Text style={styles.bodyParagraph}>
                    BooffIn was created to bridge the gap between curiosity and collaboration. We believe that groundbreaking research shouldn't exist in a vacuum, but rather thrive through connection.
                  </Text>
                  <Text style={[styles.bodyParagraph, { marginTop: 8 }]}>
                    Our platform enables student researchers, academics, and science enthusiasts to share insights, engage in meaningful discussions, and push the boundaries of collective knowledge.
                  </Text>
                </View>

                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionHeading}>What We Do</Text>
                  <View style={styles.bulletList}>
                    <Text style={styles.bulletItem}>• Connect researchers globally</Text>
                    <Text style={styles.bulletItem}>• Facilitate interdisciplinary discussions</Text>
                    <Text style={styles.bulletItem}>• Make scientific insight accessible to everyone</Text>
                  </View>
                </View>

                {/* Footer in Left Column */}
                <View style={styles.inlineFooter}>
                  <TouchableOpacity onPress={() => setActiveTab('privacy')}>
                    <Text style={styles.footerLink}>Privacy Policy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setActiveTab('terms')}>
                    <Text style={styles.footerLink}>Terms of Service</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.rightColumn, isDesktop && styles.rightColumnDesktop]}>
                <Image
                  source={WELCOME_HERO_BG}
                  style={styles.heroImage}
                  contentFit="contain"
                />
              </View>
            </View>
          )}

          {/* ============================================================ */}
          {/* TAB 3: FEATURES (IMAGE 3) */}
          {/* ============================================================ */}
          {activeTab === 'features' && (
            <View style={[styles.pageLayout, isDesktop && styles.pageLayoutDesktop]}>
              <View style={[styles.leftColumn, isDesktop && styles.leftColumnDesktop]}>
                <Text style={styles.editorialTitle}>What You Can Do on BooffIn</Text>
                <Text style={styles.editorialSubtitle}>
                  Explore the features that connect researchers with people and ideas
                </Text>

                {/* 2x2 Feature Grid */}
                <View style={styles.featureGrid}>
                  <View style={styles.featureGridItem}>
                    <Text style={styles.featureTitle}>Engage in Discussions</Text>
                    <Text style={styles.featureDesc}>
                      Share insights, ask questions, and engage with a global community on biology, AI, and neuroscience.
                    </Text>
                  </View>

                  <View style={styles.featureGridItem}>
                    <Text style={styles.featureTitle}>Discover Content</Text>
                    <Text style={styles.featureDesc}>
                      Find articles, post updates, and follow topics like DeepMind's AlphaFold.
                    </Text>
                  </View>

                  <View style={styles.featureGridItem}>
                    <Text style={styles.featureTitle}>Find Your People</Text>
                    <Text style={styles.featureDesc}>
                      Build networks with student researchers, academics, and global science enthusiasts.
                    </Text>
                  </View>

                  <View style={styles.featureGridItem}>
                    <Text style={styles.featureTitle}>Filing & Storage</Text>
                    <Text style={styles.featureDesc}>
                      Keep track of your research, find academic papers, and organize your bibliography.
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={[styles.heroActionsRow, { marginTop: 18 }]}>
                  <TouchableOpacity 
                    style={styles.primaryCtaBtn} 
                    onPress={handleOpenAuthModal}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.primaryCtaBtnText}>Explore All Features</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.secondaryLinkBtn} 
                    onPress={handleOpenAuthModal}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.secondaryLinkText}>Start For Free</Text>
                  </TouchableOpacity>
                </View>

                {/* Footer */}
                <View style={styles.inlineFooter}>
                  <TouchableOpacity onPress={() => setActiveTab('privacy')}>
                    <Text style={styles.footerLink}>Privacy Policy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setActiveTab('terms')}>
                    <Text style={styles.footerLink}>Terms of Service</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.rightColumn, isDesktop && styles.rightColumnDesktop]}>
                <Image
                  source={WELCOME_HERO_BG}
                  style={styles.heroImage}
                  contentFit="contain"
                />
              </View>
            </View>
          )}

          {/* ============================================================ */}
          {/* TAB 4: COMMUNITY (IMAGE 4) */}
          {/* ============================================================ */}
          {activeTab === 'community' && (
            <View style={[styles.pageLayout, isDesktop && styles.pageLayoutDesktop]}>
              <View style={[styles.leftColumn, isDesktop && styles.leftColumnDesktop]}>
                <Text style={styles.editorialTitle}>Meet the BooffIn Community</Text>
                <Text style={styles.editorialSubtitle}>
                  Where curious minds, researchers, and creators come together to share the shape of life
                </Text>

                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionHeading}>A Global Network</Text>
                  <Text style={styles.bodyParagraph}>
                    BooffIn is home to thousands of student researchers, PhD candidates, and science enthusiasts who are passionate about sharing knowledge. From late-night breakthrough discussions to collaborative reviews, find your place in a thriving network designed for curious minds.
                  </Text>
                </View>

                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionHeading}>How to Participate</Text>
                  <View style={styles.bulletList}>
                    <Text style={styles.bulletItem}>• Join dedicated interest groups (e.g., AI in Science, Neuroscience)</Text>
                    <Text style={styles.bulletItem}>• Participate in live discussions & Q&As</Text>
                    <Text style={styles.bulletItem}>• Share your latest research & insights with peers</Text>
                  </View>
                </View>

                <View style={[styles.heroActionsRow, { marginTop: 16 }]}>
                  <TouchableOpacity 
                    style={styles.primaryCtaBtn} 
                    onPress={handleOpenAuthModal}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.primaryCtaBtnText}>Join the Community</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.secondaryLinkBtn} 
                    onPress={handleOpenAuthModal}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.secondaryLinkText}>Browse Groups</Text>
                  </TouchableOpacity>
                </View>

                {/* Footer */}
                <View style={styles.inlineFooter}>
                  <TouchableOpacity onPress={() => setActiveTab('privacy')}>
                    <Text style={styles.footerLink}>Privacy Policy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setActiveTab('terms')}>
                    <Text style={styles.footerLink}>Terms of Service</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.rightColumn, isDesktop && styles.rightColumnDesktop]}>
                <Image
                  source={WELCOME_HERO_BG}
                  style={styles.heroImage}
                  contentFit="contain"
                />
              </View>
            </View>
          )}

          {/* ============================================================ */}
          {/* TAB 5: IN-PAGE EMBEDDED PRIVACY POLICY */}
          {/* ============================================================ */}
          {activeTab === 'privacy' && (
            <View style={styles.embeddedLegalContainer}>
              <TouchableOpacity 
                style={styles.backToHomeBtn} 
                onPress={() => setActiveTab('welcome')}
                activeOpacity={0.7}
              >
                <ArrowLeft size={14} color="#047857" />
                <Text style={styles.backToHomeText}>Back to Welcome</Text>
              </TouchableOpacity>

              <Text style={styles.legalTitle}>{PRIVACY_POLICY.title}</Text>
              <Text style={styles.legalMeta}>
                Effective Date: {PRIVACY_POLICY.effectiveDate} · Version {PRIVACY_POLICY.version}
              </Text>
              <Text style={styles.legalSummary}>{PRIVACY_POLICY.summary}</Text>

              {PRIVACY_POLICY.sections.map((sec, idx) => (
                <View key={idx} style={styles.legalSection}>
                  <Text style={styles.legalSectionTitle}>{sec.title}</Text>
                  {sec.content.map((p, pIdx) => (
                    <Text key={pIdx} style={styles.legalSectionText}>{p}</Text>
                  ))}
                </View>
              ))}

              <View style={styles.inlineFooter}>
                <TouchableOpacity onPress={() => setActiveTab('terms')}>
                  <Text style={styles.footerLink}>Switch to Terms of Service</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('welcome')}>
                  <Text style={styles.footerLink}>Back to Home</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ============================================================ */}
          {/* TAB 6: IN-PAGE EMBEDDED TERMS OF SERVICE */}
          {/* ============================================================ */}
          {activeTab === 'terms' && (
            <View style={styles.embeddedLegalContainer}>
              <TouchableOpacity 
                style={styles.backToHomeBtn} 
                onPress={() => setActiveTab('welcome')}
                activeOpacity={0.7}
              >
                <ArrowLeft size={14} color="#047857" />
                <Text style={styles.backToHomeText}>Back to Welcome</Text>
              </TouchableOpacity>

              <Text style={styles.legalTitle}>{TERMS_OF_SERVICE.title}</Text>
              <Text style={styles.legalMeta}>
                Effective Date: {TERMS_OF_SERVICE.effectiveDate} · Version {TERMS_OF_SERVICE.version}
              </Text>
              <Text style={styles.legalSummary}>{TERMS_OF_SERVICE.summary}</Text>

              {TERMS_OF_SERVICE.sections.map((sec, idx) => (
                <View key={idx} style={styles.legalSection}>
                  <Text style={styles.legalSectionTitle}>{sec.title}</Text>
                  {sec.content.map((p, pIdx) => (
                    <Text key={pIdx} style={styles.legalSectionText}>{p}</Text>
                  ))}
                </View>
              ))}

              <View style={styles.inlineFooter}>
                <TouchableOpacity onPress={() => setActiveTab('privacy')}>
                  <Text style={styles.footerLink}>Switch to Privacy Policy</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('welcome')}>
                  <Text style={styles.footerLink}>Back to Home</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

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
                <Text style={styles.modalLogoB}>B</Text>
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
                    setActiveTab('terms');
                  }}
                >
                  Terms of Service
                </Text>{' '}
                and{' '}
                <Text 
                  style={styles.modalLegalLink} 
                  onPress={() => {
                    setIsAuthModalOpen(false);
                    setActiveTab('privacy');
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
  // Header
  headerContainer: {
    backgroundColor: '#FAFBF9',
    borderBottomWidth: 1,
    borderBottomColor: '#EBEFED',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  headerInner: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoB: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  logoText: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  navItem: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  navItemActive: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#0F172A',
  },
  navItemText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
  },
  navItemTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  navSignInBtn: {
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  navSignInText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  // Main Content
  scrollContent: {
    flexGrow: 1,
  },
  mainContainer: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  pageLayout: {
    flexDirection: 'column',
    gap: 36,
  },
  pageLayoutDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 520,
    gap: 48,
  },
  leftColumn: {
    width: '100%',
  },
  leftColumnDesktop: {
    flex: 1.1,
    maxWidth: 560,
  },
  rightColumn: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightColumnDesktop: {
    flex: 1.2,
    maxWidth: 580,
  },
  heroImage: {
    width: '100%',
    height: 380,
    maxWidth: 520,
  },
  // Hero Typography
  heroPreTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 32,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  brandTitleBlock: {
    marginBottom: 12,
  },
  heroLets: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 18,
    color: '#047857',
    fontWeight: '600',
    fontStyle: 'italic',
    marginBottom: -4,
  },
  heroBrandTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 48,
    fontWeight: '800',
    color: '#064E3B',
    letterSpacing: -1,
  },
  heroTagline: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 12,
  },
  heroDescription: {
    fontSize: 13.5,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 480,
  },
  heroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  primaryCtaBtn: {
    backgroundColor: '#1B3B2B',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  primaryCtaBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '600',
  },
  secondaryLinkBtn: {
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  secondaryLinkText: {
    color: '#1E293B',
    fontSize: 13.5,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  // Editorial Content (About / Features / Community)
  editorialTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 34,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  editorialSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 24,
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 18,
    fontWeight: '700',
    color: '#047857',
    marginBottom: 6,
  },
  bodyParagraph: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  bulletList: {
    gap: 4,
  },
  bulletItem: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  // Feature Grid
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 10,
  },
  featureGridItem: {
    width: '47%',
    minWidth: 200,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
  },
  featureTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#047857',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },
  // Embedded Legal Page
  embeddedLegalContainer: {
    maxWidth: 820,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 28,
  },
  backToHomeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  backToHomeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
  },
  legalTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  legalMeta: {
    fontSize: 11.5,
    color: '#64748B',
    marginBottom: 14,
  },
  legalSummary: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  legalSection: {
    marginBottom: 18,
  },
  legalSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  legalSectionText: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 19,
    marginBottom: 4,
  },
  // Inline Footer
  inlineFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 28,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  footerLink: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 26,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  authModalCardDesktop: {
    maxWidth: 440,
  },
  authModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modalLogoB: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalLogoText: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  modalSub: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 20,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 6,
    padding: 10,
    marginBottom: 14,
  },
  errorBannerText: {
    color: '#B91C1C',
    fontSize: 12,
  },
  modalBtnStack: {
    gap: 10,
  },
  authProviderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  googleIconBox: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authProviderBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  modalDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    gap: 10,
  },
  modalDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  modalDividerText: {
    fontSize: 11,
    color: '#94A3B8',
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  emailAuthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 11,
  },
  emailAuthBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  signupOutlineBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  signupOutlineText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#047857',
  },
  modalFooterLegal: {
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalLegalText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
  },
  modalLegalLink: {
    color: '#047857',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
