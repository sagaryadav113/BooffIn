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
  ImageBackground,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  Mail, 
  X, 
  ArrowLeft 
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography, layout } from '../../theme';
import { GoogleIcon } from '../../components/core/GoogleIcon';
import { useAuthStore } from '../../store/useAuthStore';
import { isProfileComplete } from '../../api/authService';
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from '../../constants/legalPolicies';

const WELCOME_HERO_BG = require('../../../assets/images/welcome-hero.jpg');
const WELCOME_FULL_BG = require('../../../assets/images/welcome-bg.png');
const ABOUT_FULL_BG = require('../../../assets/images/about-bg.png');
const FEATURES_FULL_BG = require('../../../assets/images/features-bg.png');
const COMMUNITY_FULL_BG = require('../../../assets/images/community-bg.png');

export type LandingTab = 'home' | 'welcome' | 'about' | 'features' | 'community' | 'privacy' | 'terms';

interface WelcomeScreenProps {
  initialTab?: LandingTab;
}

export default function WelcomeScreen({ initialTab: propTab }: WelcomeScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const searchParams = useLocalSearchParams<{ tab?: string }>();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;
  const isMobile = width < 768;
  const isSmallMobile = width < 480;

  const topInset = Math.max(insets.top, Platform.OS === 'web' ? (isMobile ? 22 : 14) : 0);

  const resolveTab = (t?: string): LandingTab => {
    if (!t) return 'welcome';
    if (t === 'welcome' || t === 'home') return 'welcome';
    if (['about', 'features', 'community', 'privacy', 'terms'].includes(t)) {
      return t as LandingTab;
    }
    return 'welcome';
  };

  const [activeTab, setActiveTab] = useState<LandingTab>(resolveTab(propTab || searchParams?.tab));
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  React.useEffect(() => {
    const nextTab = resolveTab(propTab || searchParams?.tab);
    setActiveTab(nextTab);
  }, [propTab, searchParams?.tab]);

  const handleTabChange = (tab: LandingTab) => {
    const target = (tab === 'home' || tab === 'welcome') ? 'welcome' : tab;
    setActiveTab(target);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (Platform.OS === 'web') {
      if (target === 'welcome') {
        router.replace('/(auth)/welcome' as any);
      } else {
        router.replace(`/(auth)/welcome?tab=${target}` as any);
      }
    }
  };

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

  // ============================================================
  // NATIVE MOBILE APP (iOS / Android APK) - EXACT ORIGINAL VIEW
  // ============================================================
  if (Platform.OS !== 'web') {
    return (
      <View style={nativeStyles.outerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ImageBackground
          source={WELCOME_HERO_BG}
          style={nativeStyles.backgroundImage}
          resizeMode="cover"
        >
          <SafeAreaView style={nativeStyles.safeArea}>
            <ScrollView
              contentContainerStyle={nativeStyles.scrollContent}
              bounces={false}
              showsVerticalScrollIndicator={false}
            >
              {/* Top Artwork Spacer - preserves visibility for the illustration & tagline */}
              <View style={nativeStyles.artworkSpacer} />

              {/* Bottom Actions Section */}
              <View style={nativeStyles.bottomSection}>
                {authError && (
                  <View style={nativeStyles.errorContainer}>
                    <Text style={nativeStyles.errorText}>{authError}</Text>
                  </View>
                )}

                {/* Sign up for free */}
                <TouchableOpacity
                  style={nativeStyles.signUpButton}
                  onPress={handleSignUp}
                  disabled={isLoading}
                  activeOpacity={0.88}
                  accessibilityRole="button"
                  accessibilityLabel="Sign up for free"
                >
                  <Text style={nativeStyles.signUpButtonText}>Sign up for free</Text>
                </TouchableOpacity>

                {/* Continue with Google */}
                <TouchableOpacity
                  style={nativeStyles.googleButton}
                  onPress={handleGoogleAuth}
                  disabled={isLoading}
                  activeOpacity={0.88}
                  accessibilityRole="button"
                  accessibilityLabel="Continue with Google"
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={colors.textPrimary} />
                  ) : (
                    <>
                      <GoogleIcon size={20} />
                      <Text style={nativeStyles.googleButtonText}>Continue with Google</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Continue with Email */}
                <TouchableOpacity
                  style={nativeStyles.emailButton}
                  onPress={handleEmailAuth}
                  disabled={isLoading}
                  activeOpacity={0.88}
                  accessibilityRole="button"
                  accessibilityLabel="Continue with email"
                >
                  <Mail size={19} color={colors.textPrimary} strokeWidth={2} />
                  <Text style={nativeStyles.emailButtonText}>Continue with email</Text>
                </TouchableOpacity>

                {/* Legal Footer */}
                <View style={nativeStyles.legalContainer}>
                  <Text style={nativeStyles.legalText}>
                    By continuing, you agree to BooffIn's{' '}
                    <Text style={nativeStyles.legalLink} onPress={() => router.push('/terms' as any)}>Terms of Use</Text> and{' '}
                    <Text style={nativeStyles.legalLink} onPress={() => router.push('/privacy' as any)}>Privacy Policy</Text>.
                  </Text>
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </ImageBackground>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBF9" />

      {/* 1. TOP HEADER NAVIGATION */}
      <View style={[
        styles.headerContainer, 
        {
          paddingTop: topInset + (isMobile ? 10 : 16),
          paddingBottom: isMobile ? 10 : 16,
          paddingHorizontal: isMobile ? (isSmallMobile ? 14 : 20) : 36,
          backgroundColor: Platform.OS === 'web' ? 'rgba(250, 251, 249, 0.96)' : 'transparent',
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(226, 232, 240, 0.8)',
        }
      ]}>
        <View style={styles.headerInner}>
          {/* Brand Logo */}
          <TouchableOpacity 
            style={styles.logoBtn} 
            onPress={() => handleTabChange('welcome')} 
            activeOpacity={0.8}
          >
            <Text style={[styles.logoText, isSmallMobile && { fontSize: 20 }]}>BooffIn</Text>
          </TouchableOpacity>

          {/* Nav Links */}
          <View style={[
            styles.navLinks, 
            isMobile && { gap: isSmallMobile ? 6 : 10, flexWrap: 'wrap', justifyContent: 'flex-end' }
          ]}>
            <TouchableOpacity 
              style={[
                styles.navItem, 
                (activeTab === 'welcome' || activeTab === 'home' || !['about', 'features', 'community', 'privacy', 'terms'].includes(activeTab)) && styles.navItemActive
              ]} 
              onPress={() => handleTabChange('welcome')}
            >
              <Text style={[
                styles.navItemText, 
                isMobile && { fontSize: isSmallMobile ? 11.5 : 12.5 },
                (activeTab === 'welcome' || activeTab === 'home' || !['about', 'features', 'community', 'privacy', 'terms'].includes(activeTab)) && styles.navItemTextActive
              ]}>
                Home
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.navItem, activeTab === 'about' && styles.navItemActive]} 
              onPress={() => handleTabChange('about')}
            >
              <Text style={[
                styles.navItemText, 
                isMobile && { fontSize: isSmallMobile ? 11.5 : 12.5 },
                activeTab === 'about' && styles.navItemTextActive
              ]}>
                About
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.navItem, activeTab === 'features' && styles.navItemActive]} 
              onPress={() => handleTabChange('features')}
            >
              <Text style={[
                styles.navItemText, 
                isMobile && { fontSize: isSmallMobile ? 11.5 : 12.5 },
                activeTab === 'features' && styles.navItemTextActive
              ]}>
                Features
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.navItem, activeTab === 'community' && styles.navItemActive]} 
              onPress={() => handleTabChange('community')}
            >
              <Text style={[
                styles.navItemText, 
                isMobile && { fontSize: isSmallMobile ? 11.5 : 12.5 },
                activeTab === 'community' && styles.navItemTextActive
              ]}>
                Community
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.navItem, activeTab === 'privacy' && styles.navItemActive]} 
              onPress={() => handleTabChange('privacy')}
            >
              <Text style={[
                styles.navItemText, 
                isMobile && { fontSize: isSmallMobile ? 11.5 : 12.5 },
                activeTab === 'privacy' && styles.navItemTextActive
              ]}>
                Privacy Policy
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.navItem, activeTab === 'terms' && styles.navItemActive]} 
              onPress={() => handleTabChange('terms')}
            >
              <Text style={[
                styles.navItemText, 
                isMobile && { fontSize: isSmallMobile ? 11.5 : 12.5 },
                activeTab === 'terms' && styles.navItemTextActive
              ]}>
                Terms
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.navSignInBtn, isSmallMobile && { paddingHorizontal: 4 }]} 
              onPress={handleOpenAuthModal}
              activeOpacity={0.7}
            >
              <Text style={[styles.navSignInText, isMobile && { fontSize: isSmallMobile ? 11.5 : 12.5 }]}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 2. MAIN SCROLLABLE CONTENT AREA */}
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        {/* ============================================================ */}
        {/* TAB 1: WELCOME / HOME (FULL COVER BACKGROUND) */}
        {/* ============================================================ */}
        {(activeTab === 'welcome' || activeTab === 'home' || !['about', 'features', 'community', 'privacy', 'terms'].includes(activeTab)) && (
          <View style={[
            styles.welcomeHeroContainer,
            isMobile && { minHeight: Platform.OS === 'web' ? ('100dvh' as any) : 600 }
          ]}>
            {/* Full Screen Background Image (100% Crisp & Visible) */}
            <Image
              source={WELCOME_FULL_BG}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              contentPosition={isMobile ? "right center" : "center"}
              priority="high"
            />

            {/* Left Content Overlay */}
            <View style={[
              styles.welcomeContentInner,
              { paddingTop: topInset + (isMobile ? 72 : 88) },
              isMobile && { paddingHorizontal: isSmallMobile ? 16 : 20, paddingBottom: 36 }
            ]}>
              {/* Editorial Plinth Card on Mobile */}
              <View style={[
                styles.editorialPlinthCard,
                isMobile && styles.editorialPlinthCardMobile
              ]}>
                <Text style={[
                  styles.heroPreTitle,
                  isMobile && { fontSize: isSmallMobile ? 21 : 24 }
                ]}>
                  Welcome to BooffIn
                </Text>
                
                <View style={styles.brandTitleBlock}>
                  <Text style={[
                    styles.heroLets,
                    isMobile && { fontSize: 17 }
                  ]}>
                    Let’s
                  </Text>
                  <Text style={[
                    styles.heroBrandTitle,
                    isMobile && { fontSize: isSmallMobile ? 36 : 42 }
                  ]}>
                    BooffIn
                  </Text>
                </View>

                <Text style={[
                  styles.heroTagline,
                  isMobile && { fontSize: 16, marginBottom: 8 }
                ]}>
                  Research finds its people.
                </Text>

                <Text style={[
                  styles.heroDescription,
                  isMobile && { fontSize: 13.5, lineHeight: 20, marginBottom: 20 }
                ]}>
                  Connect our researchers, share insights, and discover the science of finding you platforms.
                </Text>

                <View style={[
                  styles.heroActionsRow,
                  isMobile && { gap: 14 }
                ]}>
                  <TouchableOpacity 
                    style={[
                      styles.primaryCtaBtn,
                      isMobile && { paddingVertical: 11, paddingHorizontal: 20 }
                    ]} 
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
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* TAB 2: ABOUT (FULL COVER BACKGROUND) */}
        {/* ============================================================ */}
        {activeTab === 'about' && (
          <View style={[
            styles.aboutHeroContainer,
            isMobile && { minHeight: Platform.OS === 'web' ? ('100dvh' as any) : 600 }
          ]}>
            {/* Full Screen Background Image */}
            <Image
              source={ABOUT_FULL_BG}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              contentPosition={isMobile ? "right center" : "center"}
              priority="high"
            />

            {/* Content Overlay */}
            <View style={[
              styles.aboutContentInner,
              { paddingTop: topInset + (isMobile ? 72 : 88) },
              isMobile && { paddingHorizontal: isSmallMobile ? 16 : 20, paddingBottom: 36 }
            ]}>
              <View style={styles.aboutContentBlock}>
                {/* Header Plinth */}
                <View style={[
                  styles.editorialPlinthHeader,
                  isMobile && styles.editorialPlinthHeaderMobile
                ]}>
                  <Text style={[
                    styles.editorialTitle,
                    isMobile && { fontSize: isSmallMobile ? 24 : 26 }
                  ]}>
                    About BooffIn
                  </Text>
                  <Text style={[
                    styles.editorialSubtitle,
                    isMobile && { fontSize: 13.5, marginBottom: 0 }
                  ]}>
                    A space where research finds its people
                  </Text>
                </View>

                {/* Micro-Panel 1: Mission */}
                <View style={styles.contentMicroPanel}>
                  <Text style={styles.sectionHeading}>Our Mission</Text>
                  <Text style={styles.bodyParagraph}>
                    BooffIn was created to bridge the gap between curiosity and collaboration. We believe that groundbreaking research shouldn't exist in a vacuum, but rather thrive through connection.
                  </Text>
                  <Text style={[styles.bodyParagraph, { marginTop: 8 }]}>
                    Our platform enables student researchers, academics, and science enthusiasts to share insights, engage in meaningful discussions, and push the boundaries of collective knowledge.
                  </Text>
                </View>

                {/* Micro-Panel 2: What We Do */}
                <View style={styles.contentMicroPanel}>
                  <Text style={styles.sectionHeading}>What We Do</Text>
                  <View style={styles.bulletList}>
                    <Text style={styles.bulletItem}>• Connect researchers globally</Text>
                    <Text style={styles.bulletItem}>• Facilitate interdisciplinary discussions</Text>
                    <Text style={styles.bulletItem}>• Make scientific insight accessible to everyone</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* TAB 3: FEATURES (FULL COVER BACKGROUND) */}
        {/* ============================================================ */}
        {activeTab === 'features' && (
          <View style={[
            styles.featuresHeroContainer,
            isMobile && { minHeight: Platform.OS === 'web' ? ('100dvh' as any) : 600 }
          ]}>
            {/* Full Screen Background Image */}
            <Image
              source={FEATURES_FULL_BG}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              contentPosition={isMobile ? "right center" : "center"}
              priority="high"
            />

            {/* Content Overlay */}
            <View style={[
              styles.featuresContentInner,
              { paddingTop: topInset + (isMobile ? 72 : 88) },
              isMobile && { paddingHorizontal: isSmallMobile ? 16 : 20, paddingBottom: 36 }
            ]}>
              <View style={styles.featuresContentBlock}>
                {/* Header Plinth */}
                <View style={[
                  styles.editorialPlinthHeader,
                  isMobile && styles.editorialPlinthHeaderMobile
                ]}>
                  <Text style={[
                    styles.editorialTitle,
                    isMobile && { fontSize: isSmallMobile ? 22 : 25 }
                  ]}>
                    What You Can Do on BooffIn
                  </Text>
                  <Text style={[
                    styles.editorialSubtitle,
                    isMobile && { fontSize: 13.5, marginBottom: 0 }
                  ]}>
                    Explore the features that connect researchers with people and ideas
                  </Text>
                </View>

                {/* Feature Grid */}
                <View style={[
                  styles.featureGrid,
                  isMobile && { gap: 10 }
                ]}>
                  <View style={[
                    styles.featureGridItem,
                    isMobile && { width: '100%', minWidth: '100%', padding: 14 }
                  ]}>
                    <Text style={styles.featureTitle}>Engage in Discussions</Text>
                    <Text style={styles.featureDesc}>
                      Share insights, ask questions, and engage with a global community on biology, AI, and neuroscience.
                    </Text>
                  </View>

                  <View style={[
                    styles.featureGridItem,
                    isMobile && { width: '100%', minWidth: '100%', padding: 14 }
                  ]}>
                    <Text style={styles.featureTitle}>Discover Content</Text>
                    <Text style={styles.featureDesc}>
                      Find articles, post updates, and follow topics like DeepMind's AlphaFold.
                    </Text>
                  </View>

                  <View style={[
                    styles.featureGridItem,
                    isMobile && { width: '100%', minWidth: '100%', padding: 14 }
                  ]}>
                    <Text style={styles.featureTitle}>Find Your People</Text>
                    <Text style={styles.featureDesc}>
                      Build networks with student researchers, academics, and global science enthusiasts.
                    </Text>
                  </View>

                  <View style={[
                    styles.featureGridItem,
                    isMobile && { width: '100%', minWidth: '100%', padding: 14 }
                  ]}>
                    <Text style={styles.featureTitle}>Filing & Storage</Text>
                    <Text style={styles.featureDesc}>
                      Keep track of your research, find academic papers, and organize your bibliography.
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={[
                  styles.heroActionsRow, 
                  { marginTop: 16 },
                  isMobile && { gap: 14 }
                ]}>
                  <TouchableOpacity 
                    style={[
                      styles.primaryCtaBtn,
                      isMobile && { paddingVertical: 11, paddingHorizontal: 20 }
                    ]} 
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
              </View>
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* TAB 4: COMMUNITY (FULL COVER BACKGROUND) */}
        {/* ============================================================ */}
        {activeTab === 'community' && (
          <View style={[
            styles.communityHeroContainer,
            isMobile && { minHeight: Platform.OS === 'web' ? ('100dvh' as any) : 600 }
          ]}>
            {/* Full Screen Background Image */}
            <Image
              source={COMMUNITY_FULL_BG}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              contentPosition={isMobile ? "right center" : "center"}
              priority="high"
            />

            {/* Content Overlay */}
            <View style={[
              styles.communityContentInner,
              { paddingTop: topInset + (isMobile ? 72 : 88) },
              isMobile && { paddingHorizontal: isSmallMobile ? 16 : 20, paddingBottom: 36 }
            ]}>
              <View style={styles.communityContentBlock}>
                {/* Header Plinth */}
                <View style={[
                  styles.editorialPlinthHeader,
                  isMobile && styles.editorialPlinthHeaderMobile
                ]}>
                  <Text style={[
                    styles.editorialTitle,
                    isMobile && { fontSize: isSmallMobile ? 22 : 25 }
                  ]}>
                    Meet the BooffIn Community
                  </Text>
                  <Text style={[
                    styles.editorialSubtitle,
                    isMobile && { fontSize: 13.5, marginBottom: 0 }
                  ]}>
                    Where curious minds, researchers, and creators come together to share the shape of life
                  </Text>
                </View>

                {/* Micro-Panel 1: Global Network */}
                <View style={styles.contentMicroPanel}>
                  <Text style={styles.sectionHeading}>A Global Network</Text>
                  <Text style={styles.bodyParagraph}>
                    BooffIn is home to thousands of student researchers, PhD candidates, and science enthusiasts who are passionate about sharing knowledge. From late-night breakthrough discussions to collaborative reviews, find your place in a thriving network designed for curious minds.
                  </Text>
                </View>

                {/* Micro-Panel 2: How to Participate */}
                <View style={styles.contentMicroPanel}>
                  <Text style={styles.sectionHeading}>How to Participate</Text>
                  <View style={styles.bulletList}>
                    <Text style={styles.bulletItem}>• Join dedicated interest groups (e.g., AI in Science, Neuroscience)</Text>
                    <Text style={styles.bulletItem}>• Participate in live discussions & Q&As</Text>
                    <Text style={styles.bulletItem}>• Share your latest research & insights with peers</Text>
                  </View>
                </View>

                <View style={[
                  styles.heroActionsRow, 
                  { marginTop: 16 },
                  isMobile && { gap: 14 }
                ]}>
                  <TouchableOpacity 
                    style={[
                      styles.primaryCtaBtn,
                      isMobile && { paddingVertical: 11, paddingHorizontal: 20 }
                    ]} 
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
              </View>
            </View>
          </View>
        )}

        {(activeTab === 'privacy' || activeTab === 'terms') && (
          <View style={[
            styles.mainContainer,
            { paddingTop: topInset + (isMobile ? 72 : 88) },
            isMobile && { paddingHorizontal: 18 }
          ]}>

            {/* ============================================================ */}
            {/* TAB 5: IN-PAGE EMBEDDED PRIVACY POLICY */}
            {/* ============================================================ */}
            {activeTab === 'privacy' && (
              <View style={styles.embeddedLegalContainer}>
                <TouchableOpacity 
                  style={styles.backToHomeBtn} 
                  onPress={() => handleTabChange('welcome')}
                  activeOpacity={0.7}
                >
                  <ArrowLeft size={16} color="#047857" />
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

              </View>
            )}

            {/* ============================================================ */}
            {/* TAB 6: IN-PAGE EMBEDDED TERMS OF SERVICE */}
            {/* ============================================================ */}
            {activeTab === 'terms' && (
              <View style={styles.embeddedLegalContainer}>
                <TouchableOpacity 
                  style={styles.backToHomeBtn} 
                  onPress={() => handleTabChange('welcome')}
                  activeOpacity={0.7}
                >
                  <ArrowLeft size={16} color="#047857" />
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

              </View>
            )}
          </View>
        )}
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    paddingHorizontal: 32,
    paddingVertical: 20,
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
  // Main Content
  scrollContent: {
    flexGrow: 1,
  },
  welcomeHeroContainer: {
    width: '100%',
    minHeight: '100vh' as any,
    height: Platform.OS === 'web' ? ('100vh' as any) : undefined,
    position: 'relative',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  welcomeContentInner: {
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 36,
    paddingVertical: 48,
    paddingTop: 80,
    position: 'relative',
    zIndex: 2,
  },
  welcomeTextCard: {
    maxWidth: 580,
    width: '100%',
  },
  editorialPlinthCard: {
    maxWidth: 580,
    width: '100%',
  },
  editorialPlinthCardMobile: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  editorialPlinthHeader: {
    marginBottom: 24,
  },
  editorialPlinthHeaderMobile: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  contentMicroPanel: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  aboutHeroContainer: {
    width: '100%',
    minHeight: '100vh' as any,
    height: Platform.OS === 'web' ? ('100vh' as any) : undefined,
    position: 'relative',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  aboutContentInner: {
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 36,
    paddingVertical: 48,
    paddingTop: 90,
    position: 'relative',
    zIndex: 2,
  },
  aboutContentBlock: {
    maxWidth: 620,
    width: '100%',
  },
  featuresHeroContainer: {
    width: '100%',
    minHeight: '100vh' as any,
    height: Platform.OS === 'web' ? ('100vh' as any) : undefined,
    position: 'relative',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  featuresContentInner: {
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 36,
    paddingVertical: 48,
    paddingTop: 90,
    position: 'relative',
    zIndex: 2,
  },
  featuresContentBlock: {
    maxWidth: 620,
    width: '100%',
  },
  communityHeroContainer: {
    width: '100%',
    minHeight: '100vh' as any,
    height: Platform.OS === 'web' ? ('100vh' as any) : undefined,
    position: 'relative',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  communityContentInner: {
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 36,
    paddingVertical: 48,
    paddingTop: 90,
    position: 'relative',
    zIndex: 2,
  },
  communityContentBlock: {
    maxWidth: 620,
    width: '100%',
  },
  mainContainer: {
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
    paddingTop: 100,
  },
  pageLayout: {
    width: '100%',
    minHeight: 520,
    justifyContent: 'center',
  },
  contentBlock: {
    maxWidth: 760,
    width: '100%',
  },
  // Hero Typography
  heroPreTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 38,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  brandTitleBlock: {
    marginBottom: 16,
  },
  heroLets: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 22,
    color: '#047857',
    fontWeight: '600',
    fontStyle: 'italic',
    marginBottom: -4,
  },
  heroBrandTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 58,
    fontWeight: '800',
    color: '#064E3B',
    letterSpacing: -1.2,
  },
  heroTagline: {
    fontSize: 19,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 14,
  },
  heroDescription: {
    fontSize: 15.5,
    color: '#475569',
    lineHeight: 25,
    marginBottom: 28,
    maxWidth: 520,
  },
  heroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
  },
  primaryCtaBtn: {
    backgroundColor: '#1B3B2B',
    paddingVertical: 13,
    paddingHorizontal: 26,
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
    fontSize: 14.5,
    fontWeight: '600',
  },
  secondaryLinkBtn: {
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  secondaryLinkText: {
    color: '#1E293B',
    fontSize: 14.5,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  // Editorial Content (About / Features / Community)
  editorialTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 42,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  editorialSubtitle: {
    fontSize: 16.5,
    color: '#64748B',
    marginBottom: 32,
  },
  sectionBlock: {
    marginBottom: 26,
  },
  sectionHeading: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 22,
    fontWeight: '700',
    color: '#047857',
    marginBottom: 8,
  },
  bodyParagraph: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 24,
  },
  bulletList: {
    gap: 6,
  },
  bulletItem: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 24,
  },
  // Feature Grid
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    marginBottom: 12,
  },
  featureGridItem: {
    width: '47%',
    minWidth: 260,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  featureTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#047857',
    marginBottom: 6,
  },
  featureDesc: {
    fontSize: 13.5,
    color: '#475569',
    lineHeight: 20,
  },
  // Embedded Legal Page
  embeddedLegalContainer: {
    maxWidth: 880,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 32,
  },
  backToHomeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backToHomeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#047857',
  },
  legalTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 30,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  legalMeta: {
    fontSize: 12.5,
    color: '#64748B',
    marginBottom: 16,
  },
  legalSummary: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 14,
    marginBottom: 24,
  },
  legalSection: {
    marginBottom: 20,
  },
  legalSectionTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  legalSectionText: {
    fontSize: 13.5,
    color: '#475569',
    lineHeight: 21,
    marginBottom: 6,
  },
  // Inline Footer
  inlineFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 36,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  footerLink: {
    fontSize: 12.5,
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
  },
  modalLogoText: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 22,
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

const nativeStyles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  artworkSpacer: {
    flex: 1,
    minHeight: 400,
    width: '100%',
  },
  bottomSection: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingTop: spacing.xs,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    marginBottom: spacing.xs,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  errorText: {
    ...typography.caption,
    color: colors.accentRed,
    textAlign: 'center',
    fontSize: 13,
  },
  signUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: layout.buttonHeights.lg,
    backgroundColor: colors.brandDarkGreen,
    borderRadius: radii.md,
    shadowColor: colors.brandDarkGreen,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 3,
  },
  signUpButtonText: {
    ...typography.bodyBold,
    color: colors.white,
    fontSize: 15,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: layout.buttonHeights.lg,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  googleButtonText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 15,
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: layout.buttonHeights.lg,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  emailButtonText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 15,
  },
  legalContainer: {
    paddingTop: spacing.xs,
    alignItems: 'center',
  },
  legalText: {
    ...typography.micro,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    fontSize: 11.5,
  },
  legalLink: {
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
