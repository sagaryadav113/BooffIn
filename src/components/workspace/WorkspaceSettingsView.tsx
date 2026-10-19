import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Settings,
  Shield,
  Users,
  MessageSquare,
  Lock,
  CheckCircle2,
  CheckCheck,
  Bell,
  Volume2,
  FileText,
  Download,
  Trash2,
  RotateCcw,
  Sparkles,
  Info,
  ChevronRight,
  Eye,
  Radio,
  Clock,
  Layers,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Scale,
  Copy,
  Check,
  X,
  ExternalLink,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWorkspaceSettingsStore } from '../../store/useWorkspaceSettingsStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { colors, radii, spacing, typography } from '../../theme';
import { WorkspaceSettings } from '../../types/workspaceSettings';
import {
  LEGAL_CONTACTS,
  TERMS_OF_SERVICE,
  PRIVACY_POLICY,
  COMMUNITY_GUIDELINES,
  LegalDocument,
} from '../../constants/legalPolicies';

export const WorkspaceSettingsView: React.FC = () => {
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom || 0;
  const currentUser = useAuthStore((s) => s.user);
  const { settings, updateSetting, resetSettings, isLoading } = useWorkspaceSettingsStore();
  const communities = useWorkspaceStore((s) => s.communities);

  const [isClearingCache, setIsClearingCache] = useState(false);
  const [cacheClearedSuccess, setCacheClearedSuccess] = useState(false);
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocument | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const handleCopyEmail = async (email: string) => {
    try {
      await Clipboard.setStringAsync(email);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(null), 2500);
    } catch {
      Alert.alert('Copied', email);
    }
  };

  const handleSendEmail = (email: string, subject = 'BooffIn Support Inquiry') => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(subject)}`).catch(() => {
      Alert.alert('Email Client Error', `Could not open mail app. Please contact us directly at ${email}`);
    });
  };

  // Active owned communities count (max 3)
  const activeOwnedCommunitiesCount = (communities || []).filter(
    (c) =>
      (c.owner_id === currentUser?.id || c.creator_id === currentUser?.id) &&
      c.type === 'community' &&
      !c.is_disabled &&
      c.status !== 'disabled'
  ).length;

  const handleToggle = (key: keyof WorkspaceSettings, currentValue: boolean) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const nextVal = !currentValue;
    updateSetting(key, nextVal, currentUser?.id);

    // Keep General Privacy DM permission synchronized
    if (key === 'mutualFollowDMsOnly') {
      useSettingsStore.getState().updateSetting('allowDirectMessages', nextVal ? 'connections' : 'everyone');
    }
  };

  const handleSegmentChange = <K extends keyof WorkspaceSettings>(
    key: K,
    value: WorkspaceSettings[K]
  ) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    updateSetting(key, value, currentUser?.id);
  };

  const handleClearCache = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    setIsClearingCache(true);
    try {
      // Clear cached voice notes, paper abstracts, and ephemeral files
      const allKeys = await AsyncStorage.getAllKeys();
      const wsCacheKeys = allKeys.filter(
        (k) =>
          k.startsWith('booffin_audio_') ||
          k.startsWith('booffin_paper_cache_') ||
          k.startsWith('booffin_media_thumb_')
      );
      if (wsCacheKeys.length > 0) {
        await AsyncStorage.multiRemove(wsCacheKeys);
      }
      setCacheClearedSuccess(true);
      setTimeout(() => setCacheClearedSuccess(false), 3000);
    } catch {
      Alert.alert('Cache Error', 'Failed to clear local workspace cache.');
    } finally {
      setIsClearingCache(false);
    }
  };

  const handleResetDefaults = () => {
    Alert.alert(
      'Reset Workspace Settings',
      'Are you sure you want to reset all workspace settings to their default configuration?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {}
            resetSettings(currentUser?.id);
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#164E3F" />
        <Text style={styles.loadingText}>Loading workspace preferences...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 90 + bottomInset }]}
        showsVerticalScrollIndicator={false}
      >
      {/* Header Banner */}
      <View style={styles.headerBanner}>
        <View style={styles.headerIconCircle}>
          <Settings size={24} color="#064E3B" strokeWidth={2.2} />
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Workspace Settings</Text>
          <Text style={styles.headerSub}>
            Preferences apply in real-time across DMs, Communities & Inner Circles
          </Text>
        </View>
      </View>

      {/* SECTION 1: GLOBAL CHAT & PRIVACY PREFERENCES */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Layers size={17} color="#064E3B" strokeWidth={2.2} />
          <Text style={styles.sectionTitle}>Global Chat & Privacy</Text>
        </View>

        {/* Read Receipts */}
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <View style={styles.iconBox}>
              <CheckCheck size={18} color="#064E3B" />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingLabel}>Send Read Receipts</Text>
              <Text style={styles.settingDesc}>
                Show double blue checkmarks (✓✓) when messages are seen
              </Text>
            </View>
          </View>
          <Switch
            value={settings.readReceiptsEnabled}
            onValueChange={() => handleToggle('readReceiptsEnabled', settings.readReceiptsEnabled)}
            trackColor={{ false: '#CBD5E1', true: '#064E3B' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Online Presence */}
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <View style={styles.iconBox}>
              <Radio size={18} color="#064E3B" />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingLabel}>Active Online Presence</Text>
              <Text style={styles.settingDesc}>
                Show a green dot when you are actively inside the workspace
              </Text>
            </View>
          </View>
          <Switch
            value={settings.onlinePresenceEnabled}
            onValueChange={() => handleToggle('onlinePresenceEnabled', settings.onlinePresenceEnabled)}
            trackColor={{ false: '#CBD5E1', true: '#064E3B' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Typing Indicators */}
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <View style={styles.iconBox}>
              <Sparkles size={18} color="#064E3B" />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingLabel}>Typing Indicators</Text>
              <Text style={styles.settingDesc}>
                Broadcast typing status when composing chat responses
              </Text>
            </View>
          </View>
          <Switch
            value={settings.typingIndicatorsEnabled}
            onValueChange={() => handleToggle('typingIndicatorsEnabled', settings.typingIndicatorsEnabled)}
            trackColor={{ false: '#CBD5E1', true: '#064E3B' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Sound & Haptics */}
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <View style={styles.iconBox}>
              <Volume2 size={18} color="#064E3B" />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingLabel}>In-App Sounds & Haptics</Text>
              <Text style={styles.settingDesc}>
                Play subtle auditory & tactile feedback for new messages
              </Text>
            </View>
          </View>
          <Switch
            value={settings.soundAndHapticsEnabled}
            onValueChange={() => handleToggle('soundAndHapticsEnabled', settings.soundAndHapticsEnabled)}
            trackColor={{ false: '#CBD5E1', true: '#064E3B' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* DOI Paper Auto-Preview */}
        <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
          <View style={styles.settingLeft}>
            <View style={styles.iconBox}>
              <FileText size={18} color="#064E3B" />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingLabel}>Paper & DOI Auto-Previews</Text>
              <Text style={styles.settingDesc}>
                Automatically fetch abstracts, journal info & citation stats
              </Text>
            </View>
          </View>
          <Switch
            value={settings.doiAutoPreviewEnabled}
            onValueChange={() => handleToggle('doiAutoPreviewEnabled', settings.doiAutoPreviewEnabled)}
            trackColor={{ false: '#CBD5E1', true: '#064E3B' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* SECTION 2: DIRECT MESSAGES (DM) */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <MessageSquare size={17} color="#064E3B" strokeWidth={2.2} />
          <Text style={styles.sectionTitle}>Direct Messages (DM)</Text>
        </View>

        {/* Mutual Follow DM Security */}
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <View style={styles.iconBox}>
              <Shield size={18} color="#064E3B" />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingLabel}>Mutual Follow Requirement</Text>
              <Text style={styles.settingDesc}>
                Only researchers whom you mutually follow can initiate 1-on-1 DMs
              </Text>
            </View>
          </View>
          <Switch
            value={settings.mutualFollowDMsOnly}
            onValueChange={() => handleToggle('mutualFollowDMsOnly', settings.mutualFollowDMsOnly)}
            trackColor={{ false: '#CBD5E1', true: '#064E3B' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* E2EE Info Card */}
        <View style={styles.infoBanner}>
          <View style={styles.infoBannerHeader}>
            <Lock size={15} color="#064E3B" strokeWidth={2.2} />
            <Text style={styles.infoBannerTitle}>End-to-End Encryption (E2EE)</Text>
          </View>
          <Text style={styles.infoBannerText}>
            Direct messages between verified researchers are secured with standard asymmetric key encryption. Messages are encrypted on-device.
          </Text>
        </View>
      </View>

      {/* SECTION 3: COMMUNITY MANAGEMENT */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Users size={17} color="#064E3B" strokeWidth={2.2} />
          <Text style={styles.sectionTitle}>Community Settings</Text>
        </View>

        {/* Community Capacity Tracker */}
        <View style={styles.capacityCard}>
          <View style={styles.capacityHeader}>
            <Text style={styles.capacityLabel}>Active Communities Created</Text>
            <View style={styles.capacityPill}>
              <Text style={styles.capacityPillText}>
                {activeOwnedCommunitiesCount}/2 Active
              </Text>
            </View>
          </View>
          <Text style={styles.capacityDesc}>
            You can maintain up to 2 active communities. Inactive/disabled communities remain view-only.
          </Text>
        </View>

        {/* Public Directory Discoverability */}
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <View style={styles.iconBox}>
              <Eye size={18} color="#064E3B" />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingLabel}>Public Directory Listing</Text>
              <Text style={styles.settingDesc}>
                Show your communities in global search and discovery feeds
              </Text>
            </View>
          </View>
          <Switch
            value={settings.communityDiscoverableByDefault}
            onValueChange={() => handleToggle('communityDiscoverableByDefault', settings.communityDiscoverableByDefault)}
            trackColor={{ false: '#CBD5E1', true: '#064E3B' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Community Notifications Segmented Filter */}
        <View style={[styles.settingRowVertical, { borderBottomWidth: 0 }]}>
          <View style={styles.settingTextWrap}>
            <Text style={styles.settingLabel}>Community Notifications</Text>
            <Text style={styles.settingDesc}>
              Select what triggers push notifications in community channels
            </Text>
          </View>
          <View style={styles.segmentedRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleSegmentChange('communityNotificationFilter', 'all')}
              style={[
                styles.segmentBtn,
                settings.communityNotificationFilter === 'all' && styles.segmentBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentBtnText,
                  settings.communityNotificationFilter === 'all' && styles.segmentBtnTextActive,
                ]}
              >
                All Messages
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleSegmentChange('communityNotificationFilter', 'mentions_only')}
              style={[
                styles.segmentBtn,
                settings.communityNotificationFilter === 'mentions_only' && styles.segmentBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentBtnText,
                  settings.communityNotificationFilter === 'mentions_only' && styles.segmentBtnTextActive,
                ]}
              >
                @Mentions Only
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleSegmentChange('communityNotificationFilter', 'mute')}
              style={[
                styles.segmentBtn,
                settings.communityNotificationFilter === 'mute' && styles.segmentBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentBtnText,
                  settings.communityNotificationFilter === 'mute' && styles.segmentBtnTextActive,
                ]}
              >
                Mute All
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* SECTION 4: INNER CIRCLE (RESEARCH PODS) */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Shield size={17} color="#064E3B" strokeWidth={2.2} />
          <Text style={styles.sectionTitle}>Inner Circle (Research Pods)</Text>
        </View>

        {/* Zero Historical Chat for New Joiners */}
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <View style={styles.iconBox}>
              <Lock size={18} color="#064E3B" />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingLabel}>Zero Historical Chat for Joiners</Text>
              <Text style={styles.settingDesc}>
                Newly added members join freshly with no access to past conversations
              </Text>
            </View>
          </View>
          <Switch
            value={settings.innerCircleZeroHistoryDefault}
            onValueChange={() => handleToggle('innerCircleZeroHistoryDefault', settings.innerCircleZeroHistoryDefault)}
            trackColor={{ false: '#CBD5E1', true: '#064E3B' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Admin-Only Invitations */}
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <View style={styles.iconBox}>
              <Shield size={18} color="#064E3B" />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingLabel}>Admin-Only Invitations</Text>
              <Text style={styles.settingDesc}>
                Only pod creators and designated admins can invite/add new researchers
              </Text>
            </View>
          </View>
          <Switch
            value={settings.innerCircleAdminOnlyInvites}
            onValueChange={() => handleToggle('innerCircleAdminOnlyInvites', settings.innerCircleAdminOnlyInvites)}
            trackColor={{ false: '#CBD5E1', true: '#064E3B' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Auto-Expiring Pod Messages */}
        <View style={[styles.settingRowVertical, { borderBottomWidth: 0 }]}>
          <View style={styles.settingTextWrap}>
            <Text style={styles.settingLabel}>Auto-Expiring Messages</Text>
            <Text style={styles.settingDesc}>
              Automatically purge old pod messages after a set retention window
            </Text>
          </View>
          <View style={styles.segmentedRow}>
            {(['off', '7d', '30d', '90d'] as const).map((period) => (
              <TouchableOpacity
                key={period}
                activeOpacity={0.8}
                onPress={() => handleSegmentChange('autoExpiringPodMessages', period)}
                style={[
                  styles.segmentBtn,
                  settings.autoExpiringPodMessages === period && styles.segmentBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.segmentBtnText,
                    settings.autoExpiringPodMessages === period && styles.segmentBtnTextActive,
                  ]}
                >
                  {period === 'off' ? 'Off' : period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : '90 Days'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* SECTION 5: PRIVACY, SAFETY, POLICIES & TERMS */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <ShieldCheck size={17} color="#064E3B" strokeWidth={2.2} />
          <Text style={styles.sectionTitle}>Privacy, Safety & Legal Terms</Text>
        </View>

        {/* Official App Support & Direct Contacts */}
        <View style={styles.legalSectionIntro}>
          <Text style={styles.legalSectionIntroTitle}>Official App Support & Contact</Text>
          <Text style={styles.legalSectionIntroSub}>
            Direct inquiries regarding workspace safety, account policies, or research data protection:
          </Text>

          <View style={styles.contactEmailList}>
            {/* Primary Support Mail */}
            <View style={styles.contactRow}>
              <View style={styles.contactRowLeft}>
                <View style={[styles.contactIconWrap, { backgroundColor: '#DCFCE7' }]}>
                  <Mail size={16} color="#064E3B" />
                </View>
                <View style={styles.contactTextWrap}>
                  <Text style={styles.contactRole}>Official App Support</Text>
                  <Text style={styles.contactEmailText}>{LEGAL_CONTACTS.support}</Text>
                </View>
              </View>
              <View style={styles.contactBtnGroup}>
                <TouchableOpacity
                  style={styles.contactActionBtn}
                  onPress={() => handleSendEmail(LEGAL_CONTACTS.support, 'BooffIn Support Request')}
                  activeOpacity={0.7}
                >
                  <Mail size={13} color="#064E3B" />
                  <Text style={styles.contactActionText}>Mail</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.contactActionBtn,
                    copiedEmail === LEGAL_CONTACTS.support && styles.contactActionBtnCopied,
                  ]}
                  onPress={() => handleCopyEmail(LEGAL_CONTACTS.support)}
                  activeOpacity={0.7}
                >
                  {copiedEmail === LEGAL_CONTACTS.support ? (
                    <Check size={13} color="#059669" />
                  ) : (
                    <Copy size={13} color="#475569" />
                  )}
                  <Text
                    style={[
                      styles.contactActionText,
                      copiedEmail === LEGAL_CONTACTS.support && { color: '#059669' },
                    ]}
                  >
                    {copiedEmail === LEGAL_CONTACTS.support ? 'Copied' : 'Copy'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Privacy Email */}
            <View style={styles.contactRow}>
              <View style={styles.contactRowLeft}>
                <View style={[styles.contactIconWrap, { backgroundColor: '#EFF6FF' }]}>
                  <Shield size={16} color="#1D4ED8" />
                </View>
                <View style={styles.contactTextWrap}>
                  <Text style={styles.contactRole}>Privacy & Data Protection</Text>
                  <Text style={styles.contactEmailText}>{LEGAL_CONTACTS.privacy}</Text>
                </View>
              </View>
              <View style={styles.contactBtnGroup}>
                <TouchableOpacity
                  style={styles.contactActionBtn}
                  onPress={() => handleSendEmail(LEGAL_CONTACTS.privacy, 'BooffIn Privacy & Data Protection Request')}
                  activeOpacity={0.7}
                >
                  <Mail size={13} color="#1D4ED8" />
                  <Text style={[styles.contactActionText, { color: '#1D4ED8' }]}>Mail</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.contactActionBtn,
                    copiedEmail === LEGAL_CONTACTS.privacy && styles.contactActionBtnCopied,
                  ]}
                  onPress={() => handleCopyEmail(LEGAL_CONTACTS.privacy)}
                  activeOpacity={0.7}
                >
                  {copiedEmail === LEGAL_CONTACTS.privacy ? (
                    <Check size={13} color="#059669" />
                  ) : (
                    <Copy size={13} color="#475569" />
                  )}
                  <Text
                    style={[
                      styles.contactActionText,
                      copiedEmail === LEGAL_CONTACTS.privacy && { color: '#059669' },
                    ]}
                  >
                    {copiedEmail === LEGAL_CONTACTS.privacy ? 'Copied' : 'Copy'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Security Email */}
            <View style={[styles.contactRow, { borderBottomWidth: 0 }]}>
              <View style={styles.contactRowLeft}>
                <View style={[styles.contactIconWrap, { backgroundColor: '#FEF3C7' }]}>
                  <Lock size={16} color="#B45309" />
                </View>
                <View style={styles.contactTextWrap}>
                  <Text style={styles.contactRole}>Security & Vulnerabilities</Text>
                  <Text style={styles.contactEmailText}>{LEGAL_CONTACTS.security}</Text>
                </View>
              </View>
              <View style={styles.contactBtnGroup}>
                <TouchableOpacity
                  style={styles.contactActionBtn}
                  onPress={() => handleSendEmail(LEGAL_CONTACTS.security, 'BooffIn Security Disclosure')}
                  activeOpacity={0.7}
                >
                  <Mail size={13} color="#B45309" />
                  <Text style={[styles.contactActionText, { color: '#B45309' }]}>Mail</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.contactActionBtn,
                    copiedEmail === LEGAL_CONTACTS.security && styles.contactActionBtnCopied,
                  ]}
                  onPress={() => handleCopyEmail(LEGAL_CONTACTS.security)}
                  activeOpacity={0.7}
                >
                  {copiedEmail === LEGAL_CONTACTS.security ? (
                    <Check size={13} color="#059669" />
                  ) : (
                    <Copy size={13} color="#475569" />
                  )}
                  <Text
                    style={[
                      styles.contactActionText,
                      copiedEmail === LEGAL_CONTACTS.security && { color: '#059669' },
                    ]}
                  >
                    {copiedEmail === LEGAL_CONTACTS.security ? 'Copied' : 'Copy'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* 1. Privacy Policy Card */}
        <View style={styles.legalDocCard}>
          <View style={styles.legalDocCardHeader}>
            <View style={[styles.legalDocIconWrap, { backgroundColor: '#DCFCE7' }]}>
              <ShieldCheck size={18} color="#064E3B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.legalDocCardTitle}>Privacy Policy & Data Security</Text>
              <Text style={styles.legalDocCardVersion}>v2.0 • Effective Oct 2026</Text>
            </View>
          </View>

          <Text style={styles.legalDocCardSummary}>
            {PRIVACY_POLICY.summary}
          </Text>

          <View style={styles.legalKeyPointsBox}>
            <View style={styles.keyPointRow}>
              <CheckCircle2 size={13} color="#059669" style={{ marginTop: 2 }} />
              <Text style={styles.keyPointText}>
                <Text style={{ fontWeight: '700', color: '#0F172A' }}>Zero Data Selling: </Text>
                We never sell, rent, or trade your personal information, reading history, or research topics to brokers.
              </Text>
            </View>
            <View style={styles.keyPointRow}>
              <CheckCircle2 size={13} color="#059669" style={{ marginTop: 2 }} />
              <Text style={styles.keyPointText}>
                <Text style={{ fontWeight: '700', color: '#0F172A' }}>Client-Side AEAD Encryption: </Text>
                Direct messages and sensitive notes are secured with AES-256-GCM authenticated encryption.
              </Text>
            </View>
            <View style={styles.keyPointRow}>
              <CheckCircle2 size={13} color="#059669" style={{ marginTop: 2 }} />
              <Text style={styles.keyPointText}>
                <Text style={{ fontWeight: '700', color: '#0F172A' }}>Google OAuth Limited Use: </Text>
                Adheres strictly to Google API Services User Data Policy with zero transfer to third-party AI models.
              </Text>
            </View>
            <View style={styles.keyPointRow}>
              <CheckCircle2 size={13} color="#059669" style={{ marginTop: 2 }} />
              <Text style={styles.keyPointText}>
                <Text style={{ fontWeight: '700', color: '#0F172A' }}>Row Level Security (RLS): </Text>
                PostgreSQL database RLS enforces complete isolation across workspaces, communities, and pods.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.viewDocBtn}
            onPress={() => setActiveLegalDoc(PRIVACY_POLICY)}
            activeOpacity={0.8}
          >
            <Text style={styles.viewDocBtnText}>Read Complete Privacy Policy</Text>
            <ExternalLink size={14} color="#064E3B" />
          </TouchableOpacity>
        </View>

        {/* 2. Terms of Service Card */}
        <View style={styles.legalDocCard}>
          <View style={styles.legalDocCardHeader}>
            <View style={[styles.legalDocIconWrap, { backgroundColor: '#EFF6FF' }]}>
              <Scale size={18} color="#1D4ED8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.legalDocCardTitle}>Terms of Service & IP Rights</Text>
              <Text style={styles.legalDocCardVersion}>v2.0 • Effective Oct 2026</Text>
            </View>
          </View>

          <Text style={styles.legalDocCardSummary}>
            {TERMS_OF_SERVICE.summary}
          </Text>

          <View style={styles.legalKeyPointsBox}>
            <View style={styles.keyPointRow}>
              <CheckCircle2 size={13} color="#1D4ED8" style={{ marginTop: 2 }} />
              <Text style={styles.keyPointText}>
                <Text style={{ fontWeight: '700', color: '#0F172A' }}>Researcher IP Ownership: </Text>
                You retain full ownership of all original scientific posts, TL;DR summaries, and collaboration ideas.
              </Text>
            </View>
            <View style={styles.keyPointRow}>
              <CheckCircle2 size={13} color="#1D4ED8" style={{ marginTop: 2 }} />
              <Text style={styles.keyPointText}>
                <Text style={{ fontWeight: '700', color: '#0F172A' }}>Academic Integrity: </Text>
                Strict prohibition of data fabrication, plagiarism, ghost-authorship, or citation manipulation.
              </Text>
            </View>
            <View style={styles.keyPointRow}>
              <CheckCircle2 size={13} color="#1D4ED8" style={{ marginTop: 2 }} />
              <Text style={styles.keyPointText}>
                <Text style={{ fontWeight: '700', color: '#0F172A' }}>Preprint Fair Use & Caching: </Text>
                Reader targets open CC BY preprint sources with ephemeral cache that automatically expires.
              </Text>
            </View>
            <View style={styles.keyPointRow}>
              <CheckCircle2 size={13} color="#1D4ED8" style={{ marginTop: 2 }} />
              <Text style={styles.keyPointText}>
                <Text style={{ fontWeight: '700', color: '#0F172A' }}>Scientific Disclaimer: </Text>
                Community HYPE scores and discussions represent open academic discourse, not formal clinical certifications.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.viewDocBtn}
            onPress={() => setActiveLegalDoc(TERMS_OF_SERVICE)}
            activeOpacity={0.8}
          >
            <Text style={styles.viewDocBtnText}>Read Complete Terms of Service</Text>
            <ExternalLink size={14} color="#064E3B" />
          </TouchableOpacity>
        </View>

        {/* 3. Community Guidelines & Safety Standards Card */}
        <View style={[styles.legalDocCard, { marginBottom: 0 }]}>
          <View style={styles.legalDocCardHeader}>
            <View style={[styles.legalDocIconWrap, { backgroundColor: '#FEF3C7' }]}>
              <ShieldAlert size={18} color="#B45309" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.legalDocCardTitle}>Academic Safety & Guidelines</Text>
              <Text style={styles.legalDocCardVersion}>v2.0 • Effective Oct 2026</Text>
            </View>
          </View>

          <Text style={styles.legalDocCardSummary}>
            {COMMUNITY_GUIDELINES.summary}
          </Text>

          <View style={styles.legalKeyPointsBox}>
            <View style={styles.keyPointRow}>
              <CheckCircle2 size={13} color="#B45309" style={{ marginTop: 2 }} />
              <Text style={styles.keyPointText}>
                <Text style={{ fontWeight: '700', color: '#0F172A' }}>Zero Harassment Tolerance: </Text>
                Critique methodologies vigorously and respectfully; scholarly intimidation or insults lead to bans.
              </Text>
            </View>
            <View style={styles.keyPointRow}>
              <CheckCircle2 size={13} color="#B45309" style={{ marginTop: 2 }} />
              <Text style={styles.keyPointText}>
                <Text style={{ fontWeight: '700', color: '#0F172A' }}>Zero Media Calling Storage: </Text>
                Audio and video research calls are peer-to-peer WebRTC with zero server recording or storage.
              </Text>
            </View>
            <View style={styles.keyPointRow}>
              <CheckCircle2 size={13} color="#B45309" style={{ marginTop: 2 }} />
              <Text style={styles.keyPointText}>
                <Text style={{ fontWeight: '700', color: '#0F172A' }}>Safety Number Verification: </Text>
                60-digit mutual fingerprinting to independently audit and verify cryptographic session authenticity.
              </Text>
            </View>
            <View style={styles.keyPointRow}>
              <CheckCircle2 size={13} color="#B45309" style={{ marginTop: 2 }} />
              <Text style={styles.keyPointText}>
                <Text style={{ fontWeight: '700', color: '#0F172A' }}>Reporting & Moderator Appeals: </Text>
                Direct in-app reporting of misconduct with rapid review and human moderation oversight.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.viewDocBtn}
            onPress={() => setActiveLegalDoc(COMMUNITY_GUIDELINES)}
            activeOpacity={0.8}
          >
            <Text style={styles.viewDocBtnText}>Read Community Guidelines</Text>
            <ExternalLink size={14} color="#064E3B" />
          </TouchableOpacity>
        </View>
      </View>

      {/* SECTION 6: DATA, STORAGE & RESET */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Download size={17} color="#064E3B" strokeWidth={2.2} />
          <Text style={styles.sectionTitle}>Storage & Maintenance</Text>
        </View>

        {/* Clear Cache */}
        <TouchableOpacity
          style={styles.actionRow}
          onPress={handleClearCache}
          disabled={isClearingCache}
          activeOpacity={0.7}
        >
          <View style={styles.actionLeft}>
            <View style={[styles.iconBox, { backgroundColor: '#F1F5F9' }]}>
              <Trash2 size={18} color="#475569" />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={styles.actionTitle}>Clear Local Workspace Cache</Text>
              <Text style={styles.actionDesc}>
                {cacheClearedSuccess
                  ? 'Local cache cleared successfully!'
                  : 'Free up local device storage from voice notes & paper thumbnails'}
              </Text>
            </View>
          </View>
          {isClearingCache ? (
            <ActivityIndicator size="small" color="#064E3B" />
          ) : cacheClearedSuccess ? (
            <CheckCircle2 size={20} color="#059669" />
          ) : (
            <ChevronRight size={18} color="#94A3B8" />
          )}
        </TouchableOpacity>

        {/* Reset Defaults */}
        <TouchableOpacity
          style={[styles.actionRow, { borderBottomWidth: 0 }]}
          onPress={handleResetDefaults}
          activeOpacity={0.7}
        >
          <View style={styles.actionLeft}>
            <View style={[styles.iconBox, { backgroundColor: '#FEF2F2' }]}>
              <RotateCcw size={18} color="#DC2626" />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={[styles.actionTitle, { color: '#DC2626' }]}>
                Reset to Standard Defaults
              </Text>
              <Text style={styles.actionDesc}>
                Restore all workspace configurations to initial settings
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color="#94A3B8" />
        </TouchableOpacity>
      </View>
    </ScrollView>

    {/* Full Document Reader Modal */}
    <Modal
      visible={activeLegalDoc !== null}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setActiveLegalDoc(null)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderTitleWrap}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {activeLegalDoc?.title}
              </Text>
              <Text style={styles.modalSubTitle}>
                Version {activeLegalDoc?.version} • Effective {activeLegalDoc?.effectiveDate}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setActiveLegalDoc(null)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Modal Content */}
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={true}
          >
            {/* Summary Callout */}
            <View style={styles.modalSummaryBox}>
              <Info size={18} color="#064E3B" style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.modalSummaryLabel}>Executive Summary</Text>
                <Text style={styles.modalSummaryText}>{activeLegalDoc?.summary}</Text>
              </View>
            </View>

            {/* Data Controller Banner */}
            <View style={styles.controllerBanner}>
              <Text style={styles.controllerText}>
                Governing Entity: <Text style={{ fontWeight: '700' }}>{activeLegalDoc?.controller}</Text>
              </Text>
              <Text style={styles.controllerText}>
                Designated Support: <Text style={{ fontWeight: '700' }}>{activeLegalDoc?.supportEmail}</Text>
              </Text>
            </View>

            {/* Sections */}
            {(activeLegalDoc?.sections || []).map((sec, sIdx) => (
              <View key={sIdx} style={styles.modalSectionBlock}>
                <Text style={styles.modalSectionTitle}>{sec.title}</Text>
                {sec.content.map((paragraph, pIdx) => (
                  <Text key={pIdx} style={styles.modalParagraph}>
                    {paragraph}
                  </Text>
                ))}
              </View>
            ))}

            {/* Modal Contact Footer */}
            <View style={styles.modalFooterCard}>
              <Text style={styles.modalFooterTitle}>Have questions about these terms?</Text>
              <Text style={styles.modalFooterSub}>
                Contact the BooffIn Legal & Support desk at{' '}
                <Text style={{ fontWeight: '700', color: '#064E3B' }}>
                  {activeLegalDoc?.supportEmail}
                </Text>
              </Text>
              <View style={styles.modalFooterBtnRow}>
                <TouchableOpacity
                  style={styles.modalFooterContactBtn}
                  onPress={() => {
                    if (activeLegalDoc) {
                      handleSendEmail(activeLegalDoc.supportEmail, `${activeLegalDoc.title} Inquiry`);
                    }
                  }}
                >
                  <Mail size={15} color="#FFFFFF" />
                  <Text style={styles.modalFooterContactBtnText}>Email Support Desk</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalFooterCopyBtn}
                  onPress={() => {
                    if (activeLegalDoc) {
                      handleCopyEmail(activeLegalDoc.supportEmail);
                    }
                  }}
                >
                  {copiedEmail === activeLegalDoc?.supportEmail ? (
                    <Check size={15} color="#059669" />
                  ) : (
                    <Copy size={15} color="#475569" />
                  )}
                  <Text style={styles.modalFooterCopyBtnText}>
                    {copiedEmail === activeLegalDoc?.supportEmail ? 'Copied' : 'Copy Email'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Modal Bottom Done Bar */}
          <View style={styles.modalBottomBar}>
            <TouchableOpacity
              style={styles.modalPrimaryDoneBtn}
              onPress={() => setActiveLegalDoc(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalPrimaryDoneBtnText}>Done Reading</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  </View>
);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  headerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 14,
  },
  headerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#064E3B',
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 12,
    color: '#166534',
    lineHeight: 16,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  settingRowVertical: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTextWrap: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  infoBanner: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  infoBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  infoBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#064E3B',
  },
  infoBannerText: {
    fontSize: 12,
    color: '#166534',
    lineHeight: 16,
  },
  capacityCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  capacityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  capacityLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  capacityPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  capacityPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#064E3B',
  },
  capacityDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  segmentedRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentBtnTextActive: {
    color: '#064E3B',
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 10,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  // Legal, Safety & Privacy Styles
  legalSectionIntro: {
    marginBottom: 16,
  },
  legalSectionIntroTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  legalSectionIntroSub: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 10,
  },
  contactEmailList: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  contactRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  contactIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactTextWrap: {
    flex: 1,
  },
  contactRole: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  contactEmailText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  contactBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  contactActionBtnCopied: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  contactActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  legalDocCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  legalDocCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  legalDocIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legalDocCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  legalDocCardVersion: {
    fontSize: 11,
    color: '#64748B',
  },
  legalDocCardSummary: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
    marginBottom: 10,
  },
  legalKeyPointsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  keyPointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  keyPointText: {
    fontSize: 11.5,
    color: '#334155',
    lineHeight: 16,
    flex: 1,
  },
  viewDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingVertical: 9,
    borderRadius: 8,
  },
  viewDocBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#064E3B',
  },
  // Document Reader Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    minHeight: '65%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalHeaderTitleWrap: {
    flex: 1,
    paddingRight: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubTitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 30,
  },
  modalSummaryBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  modalSummaryLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#064E3B',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  modalSummaryText: {
    fontSize: 12,
    color: '#166534',
    lineHeight: 17,
  },
  controllerBanner: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 16,
    gap: 4,
  },
  controllerText: {
    fontSize: 11.5,
    color: '#475569',
  },
  modalSectionBlock: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  modalSectionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  modalParagraph: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 6,
  },
  modalFooterCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    alignItems: 'center',
  },
  modalFooterTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  modalFooterSub: {
    fontSize: 11.5,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalFooterBtnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalFooterContactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#064E3B',
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalFooterContactBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalFooterCopyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalFooterCopyBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  modalBottomBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalPrimaryDoneBtn: {
    backgroundColor: '#064E3B',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryDoneBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
