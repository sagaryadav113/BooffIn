import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  Share,
  Platform,
  Modal,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
} from 'react-native';
import { router } from 'expo-router';
import {
  GraduationCap,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Share2,
  FileText,
  Sparkles,
  MessageSquare,
  Lock,
  Unlock,
  Award,
  ArrowUpRight,
  MoreVertical,
  Edit3,
  Copy,
  X as XIcon,
  ShieldCheck,
  Trash2,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { colors, radii, spacing, typography } from '../../theme';
import { Button } from '../core/Button';
import { ScholarPublication, ScholarProfileStats } from '../../types/scholar';
import { Paper } from '../../types/paper';
import {
  getScholarPublications,
  syncScholarPublications,
  normalizeOrcidId,
  isValidOrcidId,
  connectOrcidOAuth,
  fetchOrcidPersonDetails,
  OrcidPersonDetails,
} from '../../api/orcidService';
import {
  verifyPasswordAndDisconnectOrcid,
  verifyPasswordAndLinkOrcid,
  checkOrcidAvailability,
} from '../../api/authService';
import { useAuthStore } from '../../store/useAuthStore';
import { usePostStore } from '../../store/usePostStore';

export interface BooffInScholarsTabProps {
  userId: string;
  isCurrentUser: boolean;
  userFullName?: string;
  orcidId?: string;
  orcidVerified?: boolean;
  onSharePaperToFeed?: (publication: ScholarPublication) => void;
  onOpenPaperReader?: (publication: ScholarPublication) => void;
}

export const BooffInScholarsTab: React.FC<BooffInScholarsTabProps> = ({
  userId,
  isCurrentUser,
  userFullName,
  orcidId: propOrcidId,
  orcidVerified: propOrcidVerified,
  onSharePaperToFeed,
  onOpenPaperReader,
}) => {
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const createPost = usePostStore((s) => s.createPost);

  const [publications, setPublications] = useState<ScholarPublication[]>([]);
  const [stats, setStats] = useState<ScholarProfileStats>({
    totalPublications: 0,
    totalCitations: 0,
    openAccessCount: 0,
    isVerified: Boolean(propOrcidVerified),
    orcidId: propOrcidId,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isQuickSharing, setIsQuickSharing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'journal' | 'preprint' | 'oa'>('all');

  // 3-dot Action Sheet state
  const [selectedMenuPublication, setSelectedMenuPublication] = useState<ScholarPublication | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Connect & Verify ORCID Modal state
  const [connectModalVisible, setConnectModalVisible] = useState(false);
  const [connectInputOrcid, setConnectInputOrcid] = useState('');
  const [isVerifyingRecord, setIsVerifyingRecord] = useState(false);
  const [verifiedPersonPreview, setVerifiedPersonPreview] = useState<OrcidPersonDetails | null>(null);
  const [connectPassword, setConnectPassword] = useState('');
  const [showConnectPassword, setShowConnectPassword] = useState(false);
  const [isConnectingWithPassword, setIsConnectingWithPassword] = useState(false);
  const [connectStepError, setConnectStepError] = useState<string | null>(null);

  // Password verification modal for disconnecting ORCID
  const [disconnectModalVisible, setDisconnectModalVisible] = useState(false);
  const [disconnectPassword, setDisconnectPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);

  const activeOrcid = stats.orcidId || propOrcidId;
  const isVerifiedScholar = Boolean(stats.isVerified || propOrcidVerified);

  /**
   * Syncs existing verified ORCID works
   */
  const handleSync = async (orcidToSync?: string) => {
    const targetOrcid = orcidToSync || activeOrcid;
    if (!targetOrcid) return;
    const cleanOrcid = normalizeOrcidId(targetOrcid);

    setConnectError(null);
    setIsSyncing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    const res = await syncScholarPublications(userId, cleanOrcid, userFullName);
    setIsSyncing(false);

    if (res.success) {
      setPublications(res.publications);
      setStats(res.stats);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    } else {
      setConnectError(res.error || 'Failed to synchronize ORCID publications.');
    }
  };

  // Load publications on mount or when user changes
  const loadPublications = async () => {
    if (!userId) return;
    setIsLoading(true);
    const res = await getScholarPublications(userId);
    setIsLoading(false);

    if (res.publications.length > 0) {
      setPublications(res.publications);
      setStats(res.stats);
    } else if (activeOrcid && isCurrentUser && isVerifiedScholar) {
      // If user already has an authenticated verified ORCID ID, auto-sync works
      handleSync(activeOrcid);
    }
  };

  useEffect(() => {
    loadPublications();
  }, [userId, propOrcidId, propOrcidVerified]);

  /**
   * Opens the Connect & Verify ORCID Modal
   */
  const handleOpenConnectModal = () => {
    setConnectInputOrcid('');
    setVerifiedPersonPreview(null);
    setConnectPassword('');
    setShowConnectPassword(false);
    setConnectStepError(null);
    setConnectError(null);
    setConnectModalVisible(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  /**
   * Live Query to ORCID Public Registry to verify the researcher record.
   * Also checks uniqueness so no duplicate accounts can claim the same ORCID iD.
   */
  const handleVerifyOrcidRecord = async () => {
    const clean = normalizeOrcidId(connectInputOrcid);
    if (!isValidOrcidId(clean)) {
      setConnectStepError('Please enter a valid 16-digit ORCID iD (e.g. 0000-0002-1825-0097).');
      return;
    }

    setConnectStepError(null);
    setConnectPassword('');
    setIsVerifyingRecord(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    // 1. Strict Uniqueness Check: Ensure no other user has verified this ORCID iD
    const availability = await checkOrcidAvailability(clean, userId);
    if (!availability.available) {
      setIsVerifyingRecord(false);
      setConnectStepError(
        availability.error ||
          'This ORCID iD is already verified and linked to another BooffIn account. Each ORCID iD can only be associated with a single verified author account.'
      );
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      return;
    }

    // 2. Fetch live official researcher details from ORCID Registry
    const res = await fetchOrcidPersonDetails(clean);
    setIsVerifyingRecord(false);

    if (res.success && res.person) {
      setVerifiedPersonPreview(res.person);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    } else {
      setConnectStepError(res.error || 'Could not find a public ORCID record with this ID.');
    }
  };

  /**
   * Confirms binding the verified ORCID by requiring password verification.
   * Only after valid password authentication is the verified badge granted.
   */
  const handleConfirmAndSyncOrcid = async () => {
    if (!verifiedPersonPreview) return;
    if (!connectPassword.trim()) {
      setConnectStepError('Please enter your account password to verify ownership and claim your author badge.');
      return;
    }
    const cleanOrcid = verifiedPersonPreview.orcidId;

    setIsConnectingWithPassword(true);
    setConnectStepError(null);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    // 1. Re-authenticate with Supabase password and link ORCID
    const authRes = await verifyPasswordAndLinkOrcid(
      userId,
      cleanOrcid,
      connectPassword
    );

    if (!authRes.success) {
      setIsConnectingWithPassword(false);
      setConnectStepError(
        authRes.error ||
          'Password verification failed. Only the authenticated account owner can verify this identity.'
      );
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      return;
    }

    // 2. Sync all publications from ORCID & OpenAlex
    setIsSyncing(true);
    const syncRes = await syncScholarPublications(
      userId,
      cleanOrcid,
      userFullName || verifiedPersonPreview.name
    );

    setIsConnectingWithPassword(false);
    setIsSyncing(false);

    if (syncRes.success) {
      setConnectModalVisible(false);
      setVerifiedPersonPreview(null);
      setConnectInputOrcid('');
      setConnectPassword('');
      setPublications(syncRes.publications);
      setStats({
        ...syncRes.stats,
        isVerified: true,
        orcidId: cleanOrcid,
      });

      // Update auth store with verified status
      await updateProfile({
        orcidId: cleanOrcid,
        orcidVerified: true,
      });

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      Alert.alert(
        'Verified Author Badge Granted',
        `Successfully verified your identity as ${verifiedPersonPreview.name}! Your verified author badge is active and ${syncRes.publications.length} publications are synced to your BooffIn Scholar profile.`
      );
    } else {
      setConnectStepError(syncRes.error || 'Failed to sync publications from ORCID.');
    }
  };

  /**
   * Disconnects ORCID with password verification
   */
  const handleConfirmDisconnect = async () => {
    if (!disconnectPassword.trim() || isDisconnecting) return;

    setIsDisconnecting(true);
    setDisconnectError(null);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    const res = await verifyPasswordAndDisconnectOrcid(
      userId,
      disconnectPassword,
      undefined
    );
    setIsDisconnecting(false);

    if (res.success) {
      setDisconnectModalVisible(false);
      setDisconnectPassword('');
      setPublications([]);
      setStats({
        totalPublications: 0,
        totalCitations: 0,
        openAccessCount: 0,
        isVerified: false,
        orcidId: undefined,
      });

      // Update store user profile
      await updateProfile({
        orcidId: undefined,
        orcidVerified: false,
      });

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      Alert.alert(
        'ORCID Account Disconnected',
        'Your ORCID iD and verified publications have been safely removed from your profile.'
      );
    } else {
      setDisconnectError(res.error || 'Password verification failed. Please try again.');
    }
  };

  const handleShareWithCaption = (pub: ScholarPublication) => {
    setSelectedMenuPublication(null);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (onSharePaperToFeed) {
      onSharePaperToFeed(pub);
      return;
    }

    // Default fallback to compose screen
    const paperAttachment: Paper = {
      id: pub.id,
      title: pub.title,
      authors:
        pub.authors && pub.authors.length > 0
          ? pub.authors.map((name) => ({ name }))
          : [{ name: userFullName || 'Author' }],
      journal: pub.journalName || 'Verified Scholar Publication',
      publicationYear: pub.publicationYear || new Date().getFullYear(),
      doi: pub.doi,
      canonicalUrl: pub.url || (pub.doi ? `https://doi.org/${pub.doi}` : 'https://booffin.com'),
      openAccessUrl: pub.openAccessPdfUrl || pub.url,
      abstract: pub.abstract || '',
      isOpenAccess: Boolean(pub.isOpenAccess || pub.openAccessPdfUrl),
      topics: pub.topics || [],
      citationCount: pub.citationCount || 0,
      discussionCount: 0,
      likesCount: 0,
      savesCount: 0,
    };

    router.push({
      pathname: '/(tabs)/create',
      params: {
        paperData: JSON.stringify(paperAttachment),
        initialContent: `Sharing my paper: "${pub.title}". Welcoming feedback and questions from fellow researchers!`,
      },
    });
  };

  /**
   * 1-Click Quick Share directly to the home feed
   */
  const handleQuickShare = async (pub: ScholarPublication) => {
    setSelectedMenuPublication(null);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    const paperAttachment: Paper = {
      id: pub.id,
      title: pub.title,
      authors:
        pub.authors && pub.authors.length > 0
          ? pub.authors.map((name) => ({ name }))
          : [{ name: userFullName || 'Author' }],
      journal: pub.journalName || 'Verified Scholar Publication',
      publicationYear: pub.publicationYear || new Date().getFullYear(),
      doi: pub.doi,
      canonicalUrl: pub.url || (pub.doi ? `https://doi.org/${pub.doi}` : 'https://booffin.com'),
      openAccessUrl: pub.openAccessPdfUrl || pub.url,
      abstract: pub.abstract || '',
      isOpenAccess: Boolean(pub.isOpenAccess || pub.openAccessPdfUrl),
      topics: pub.topics || [],
      citationCount: pub.citationCount || 0,
      discussionCount: 0,
      likesCount: 0,
      savesCount: 0,
    };

    setIsQuickSharing(true);
    try {
      await createPost(
        {
          content: `Sharing my verified publication: "${pub.title}". Read the full text and join the scientific discussion.`,
          postType: 'research_share',
          paper: paperAttachment,
          topics: pub.topics || [],
          visibility: 'public',
        },
        userId
      );
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      Alert.alert(
        'Shared to Feed',
        'Your paper has been shared to the BooffIn home feed for peer discussion.'
      );
    } catch (err: any) {
      Alert.alert('Share Issue', err?.message || 'Could not complete quick share.');
    } finally {
      setIsQuickSharing(false);
    }
  };

  const handleOpenPaper = (pub: ScholarPublication) => {
    setSelectedMenuPublication(null);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (onOpenPaperReader) {
      onOpenPaperReader(pub);
      return;
    }

    const openUrl = pub.openAccessPdfUrl || pub.url || (pub.doi ? `https://doi.org/${pub.doi}` : null);
    if (openUrl) {
      Linking.openURL(openUrl).catch(() => {
        Alert.alert('Unable to Open Paper', 'Could not open publication link in browser.');
      });
    }
  };

  const handleCopyLink = async (pub: ScholarPublication) => {
    setSelectedMenuPublication(null);
    const link = pub.url || (pub.doi ? `https://doi.org/${pub.doi}` : 'https://booffin.com');
    await Clipboard.setStringAsync(link);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    Alert.alert('Link Copied', 'Publication link copied to clipboard.');
  };

  const handleExternalShare = async (pub: ScholarPublication) => {
    setSelectedMenuPublication(null);
    const shareUrl = pub.url || (pub.doi ? `https://doi.org/${pub.doi}` : 'https://booffin.com');
    await Share.share({
      title: pub.title,
      message: `Check out "${pub.title}" by ${userFullName || 'the author'} on BooffIn: ${shareUrl}`,
      url: shareUrl,
    });
  };

  const filteredPublications = useMemo(() => {
    if (activeFilter === 'journal') {
      return publications.filter(
        (p) => (p.workType || '').toLowerCase().includes('journal') || !p.workType
      );
    }
    if (activeFilter === 'preprint') {
      return publications.filter((p) =>
        (p.workType || '').toLowerCase().includes('preprint')
      );
    }
    if (activeFilter === 'oa') {
      return publications.filter((p) => p.isOpenAccess || Boolean(p.openAccessPdfUrl));
    }
    return publications;
  }, [publications, activeFilter]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.accentBlue} />
        <Text style={styles.loadingText}>Loading verified scholar publications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 1. Verified Scholar Status Banner */}
      <View style={styles.scholarBannerCard}>
        <View style={styles.scholarBannerTop}>
          <View style={styles.scholarBadgeWrap}>
            <View style={styles.scholarIconBadge}>
              <GraduationCap size={22} color={colors.white} />
            </View>
            <View style={styles.scholarTitleCol}>
              <View style={styles.scholarNameRow}>
                <Text style={styles.scholarSectionTitle}>BooffIn Scholar</Text>
                {isVerifiedScholar ? (
                  <View style={styles.verifiedGreenBadge}>
                    <CheckCircle2 size={12} color="#16A34A" />
                    <Text style={styles.verifiedGreenText}>Verified</Text>
                  </View>
                ) : (
                  <View style={styles.unverifiedBadge}>
                    <Lock size={11} color={colors.textSecondary} />
                    <Text style={styles.unverifiedText}>Not Connected</Text>
                  </View>
                )}
              </View>

              {activeOrcid && isVerifiedScholar ? (
                <TouchableOpacity
                  onPress={() => Linking.openURL(`https://orcid.org/${activeOrcid}`)}
                  style={styles.orcidLinkPill}
                  activeOpacity={0.7}
                >
                  <Text style={styles.orcidLabel}>ORCID:</Text>
                  <Text style={styles.orcidValue}>{activeOrcid}</Text>
                  <ArrowUpRight size={11} color={colors.accentBlue} />
                </TouchableOpacity>
              ) : (
                <Text style={styles.scholarSubtitle}>
                  Verified academic publications and peer record
                </Text>
              )}
            </View>
          </View>

          {isCurrentUser && isVerifiedScholar && (
            <View style={styles.bannerActionsCol}>
              <TouchableOpacity
                onPress={() => handleSync()}
                disabled={isSyncing}
                style={[styles.syncButton, isSyncing && { opacity: 0.6 }]}
                activeOpacity={0.75}
              >
                <RefreshCw
                  size={12}
                  color={colors.textPrimary}
                  style={[isSyncing && { transform: [{ rotate: '45deg' }] }]}
                />
                <Text style={styles.syncButtonText}>
                  {isSyncing ? 'Syncing...' : 'Sync'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setDisconnectPassword('');
                  setDisconnectError(null);
                  setDisconnectModalVisible(true);
                }}
                style={styles.disconnectLink}
                activeOpacity={0.7}
              >
                <Trash2 size={11} color={colors.accentRed} />
                <Text style={styles.disconnectLinkText}>Disconnect</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Scholar Metrics Strip */}
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricNumber}>{stats.totalPublications}</Text>
            <Text style={styles.metricLabel}>Publications</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricNumber}>{stats.totalCitations}</Text>
            <Text style={styles.metricLabel}>Citations</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={[styles.metricNumber, { color: '#16A34A' }]}>
              {stats.openAccessCount}
            </Text>
            <Text style={styles.metricLabel}>Open Access</Text>
          </View>
        </View>
      </View>

      {/* 2. Empty State / Connect ORCID Prompt */}
      {publications.length === 0 || !isVerifiedScholar ? (
        <View style={styles.emptyCard}>
          <View style={styles.orcidBrandedIconWrap}>
            <View style={styles.orcidCircle}>
              <Text style={styles.orcidCircleText}>iD</Text>
            </View>
          </View>

          <Text style={styles.emptyTitle}>
            {isCurrentUser ? 'Connect & Verify Your ORCID iD' : 'No Verified Publications'}
          </Text>
          <Text style={styles.emptyDesc}>
            {isCurrentUser
              ? 'Connect your official ORCID record to showcase verified papers, citation counts, open-access PDFs, and gain the verified researcher badge on BooffIn.'
              : 'This researcher has not connected their official ORCID publication record yet.'}
          </Text>

          {isCurrentUser && (
            <View style={styles.connectForm}>
              {connectError && (
                <Text style={styles.errorText}>{connectError}</Text>
              )}

              {/* Connect & Verify Button */}
              <TouchableOpacity
                onPress={handleOpenConnectModal}
                disabled={isSyncing}
                style={[
                  styles.orcidOAuthButton,
                  isSyncing && { opacity: 0.7 },
                ]}
                activeOpacity={0.85}
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <View style={styles.orcidLogoMini}>
                      <Text style={styles.orcidLogoMiniText}>iD</Text>
                    </View>
                    <Text style={styles.orcidOAuthButtonText}>
                      Connect & Verify ORCID iD
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.securityPledgeRow}>
                <ShieldCheck size={13} color="#16A34A" />
                <Text style={styles.securityPledgeText}>
                  Verified against the official ORCID Public Registry. Instant paper sync.
                </Text>
              </View>
            </View>
          )}
        </View>
      ) : (
        /* 3. Publications List & Filter Tabs */
        <View style={styles.publicationsSection}>
          {/* Filter Sub-Tabs */}
          <View style={styles.filterTabsRow}>
            <TouchableOpacity
              onPress={() => setActiveFilter('all')}
              style={[styles.filterPill, activeFilter === 'all' && styles.filterPillActive]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeFilter === 'all' && styles.filterPillTextActive,
                ]}
              >
                All ({publications.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveFilter('journal')}
              style={[styles.filterPill, activeFilter === 'journal' && styles.filterPillActive]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeFilter === 'journal' && styles.filterPillTextActive,
                ]}
              >
                Journal Articles
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveFilter('oa')}
              style={[styles.filterPill, activeFilter === 'oa' && styles.filterPillActive]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeFilter === 'oa' && styles.filterPillTextActive,
                ]}
              >
                Open Access ({stats.openAccessCount})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Publication Cards */}
          <View style={styles.pubCardsList}>
            {filteredPublications.map((pub) => {
              const isOA = pub.isOpenAccess || Boolean(pub.openAccessPdfUrl);
              return (
                <View key={pub.id} style={styles.pubCard}>
                  {/* Top Header with Badges & 3-Dot Menu Button */}
                  <View style={styles.pubCardHeader}>
                    {pub.journalName ? (
                      <View style={styles.journalBadge}>
                        <Award size={11} color={colors.accentBlue} />
                        <Text style={styles.journalNameText} numberOfLines={1}>
                          {pub.journalName}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.journalBadge}>
                        <BookOpen size={11} color={colors.textSecondary} />
                        <Text style={styles.journalNameText}>Verified Publication</Text>
                      </View>
                    )}

                    <View style={styles.badgesRightRow}>
                      {isOA && (
                        <View style={styles.oaBadge}>
                          <Unlock size={10} color="#16A34A" />
                          <Text style={styles.oaBadgeText}>Open Access (CC-BY)</Text>
                        </View>
                      )}
                      {Boolean(pub.publicationYear) && (
                        <Text style={styles.yearText}>{pub.publicationYear}</Text>
                      )}

                      {/* 3-DOT MENU BUTTON */}
                      <TouchableOpacity
                        style={styles.threeDotBtn}
                        onPress={() => setSelectedMenuPublication(pub)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MoreVertical size={16} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Title */}
                  <TouchableOpacity
                    onPress={() => handleOpenPaper(pub)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.pubTitle}>{pub.title}</Text>
                  </TouchableOpacity>

                  {/* Authors */}
                  {pub.authors && pub.authors.length > 0 && (
                    <Text style={styles.authorsText} numberOfLines={2}>
                      {pub.authors.join(', ')}
                    </Text>
                  )}

                  {/* Abstract snippet if present */}
                  {pub.abstract && (
                    <Text style={styles.abstractSnippet} numberOfLines={3}>
                      {pub.abstract}
                    </Text>
                  )}

                  {/* Footer Meta & Actions */}
                  <View style={styles.pubCardFooter}>
                    <View style={styles.citationBadge}>
                      <Text style={styles.citationCount}>
                        {pub.citationCount > 0
                          ? `★ ${pub.citationCount} citations`
                          : 'Indexed Work'}
                      </Text>
                    </View>

                    <View style={styles.cardActionsRow}>
                      {isCurrentUser && (
                        <TouchableOpacity
                          style={styles.shareFeedBtn}
                          onPress={() => handleShareWithCaption(pub)}
                          activeOpacity={0.75}
                        >
                          <MessageSquare size={13} color={colors.white} />
                          <Text style={styles.shareFeedBtnText}>Discuss on Feed</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={styles.readPaperBtn}
                        onPress={() => handleOpenPaper(pub)}
                        activeOpacity={0.75}
                      >
                        <FileText size={13} color={colors.textPrimary} />
                        <Text style={styles.readPaperBtnText}>
                          {isOA ? 'Read Paper' : 'View DOI'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* 4. Interactive 3-Dot Action Modal Sheet */}
      <Modal
        visible={Boolean(selectedMenuPublication)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMenuPublication(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSelectedMenuPublication(null)}
          />
          <View style={styles.actionSheetCard}>
            <View style={styles.actionSheetHeader}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.actionSheetPaperTitle} numberOfLines={2}>
                  {selectedMenuPublication?.title}
                </Text>
                <Text style={styles.actionSheetJournal} numberOfLines={1}>
                  {selectedMenuPublication?.journalName || 'Verified Scholar Publication'} ·{' '}
                  {selectedMenuPublication?.publicationYear}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setSelectedMenuPublication(null)}
                style={styles.closeModalBtn}
              >
                <XIcon size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.actionSheetOptionsList}>
              {/* Option 1: Quick Share directly to feed */}
              {isCurrentUser && (
                <TouchableOpacity
                  style={styles.actionOptionItem}
                  onPress={() =>
                    selectedMenuPublication && handleQuickShare(selectedMenuPublication)
                  }
                  activeOpacity={0.7}
                  disabled={isQuickSharing}
                >
                  <View style={[styles.actionOptionIconWrap, { backgroundColor: '#F0FDF4' }]}>
                    <Share2 size={18} color="#16A34A" />
                  </View>
                  <View style={styles.actionOptionTextCol}>
                    <Text style={styles.actionOptionMainText}>Quick Share to Feed</Text>
                    <Text style={styles.actionOptionSubText}>
                      Instantly share your paper with peers in 1 tap
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Option 2: Share with Caption / Thoughts */}
              {isCurrentUser && (
                <TouchableOpacity
                  style={styles.actionOptionItem}
                  onPress={() =>
                    selectedMenuPublication && handleShareWithCaption(selectedMenuPublication)
                  }
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionOptionIconWrap, { backgroundColor: 'rgba(37, 99, 235, 0.08)' }]}>
                    <Edit3 size={18} color={colors.accentBlue} />
                  </View>
                  <View style={styles.actionOptionTextCol}>
                    <Text style={styles.actionOptionMainText}>Share with Caption / Thoughts</Text>
                    <Text style={styles.actionOptionSubText}>
                      Write research context, ask questions, or poll peers
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Option 3: Read Paper */}
              <TouchableOpacity
                style={styles.actionOptionItem}
                onPress={() =>
                  selectedMenuPublication && handleOpenPaper(selectedMenuPublication)
                }
                activeOpacity={0.7}
              >
                <View style={styles.actionOptionIconWrap}>
                  <FileText size={18} color={colors.textPrimary} />
                </View>
                <View style={styles.actionOptionTextCol}>
                  <Text style={styles.actionOptionMainText}>
                    {selectedMenuPublication?.isOpenAccess ? 'Read Open Access Paper' : 'View Publisher DOI'}
                  </Text>
                  <Text style={styles.actionOptionSubText}>
                    {selectedMenuPublication?.isOpenAccess ? 'Open full-text CC-BY publication' : 'Open canonical publisher source'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Option 4: Copy DOI Link */}
              <TouchableOpacity
                style={styles.actionOptionItem}
                onPress={() =>
                  selectedMenuPublication && handleCopyLink(selectedMenuPublication)
                }
                activeOpacity={0.7}
              >
                <View style={styles.actionOptionIconWrap}>
                  <Copy size={18} color={colors.textPrimary} />
                </View>
                <View style={styles.actionOptionTextCol}>
                  <Text style={styles.actionOptionMainText}>Copy Publication Link</Text>
                  <Text style={styles.actionOptionSubText}>Copy DOI URL to clipboard</Text>
                </View>
              </TouchableOpacity>

              {/* Option 5: External Share */}
              <TouchableOpacity
                style={styles.actionOptionItem}
                onPress={() =>
                  selectedMenuPublication && handleExternalShare(selectedMenuPublication)
                }
                activeOpacity={0.7}
              >
                <View style={styles.actionOptionIconWrap}>
                  <ArrowUpRight size={18} color={colors.textPrimary} />
                </View>
                <View style={styles.actionOptionTextCol}>
                  <Text style={styles.actionOptionMainText}>Share via Apps</Text>
                  <Text style={styles.actionOptionSubText}>Send to Twitter/X, WhatsApp, or Email</Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.actionSheetCancelBtn}
              onPress={() => setSelectedMenuPublication(null)}
              activeOpacity={0.7}
            >
              <Text style={styles.actionSheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 5. Password Confirmation Modal for Disconnecting ORCID */}
      <Modal
        visible={disconnectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDisconnectModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setDisconnectModalVisible(false)}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoidWrapper}
          >
            <View style={styles.passwordModalCard}>
              <View style={styles.passwordModalHeader}>
                <View style={styles.lockIconCircle}>
                  <Lock size={20} color={colors.accentRed} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.passwordModalTitle}>Disconnect ORCID Account</Text>
                  <Text style={styles.passwordModalSubtitle}>
                    For your security, enter your BooffIn password to confirm disconnecting ORCID ({activeOrcid}).
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setDisconnectModalVisible(false)}
                  style={styles.closeModalBtn}
                >
                  <XIcon size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {disconnectError && (
                <View style={styles.passwordErrorBox}>
                  <Text style={styles.passwordErrorText}>{disconnectError}</Text>
                </View>
              )}

              <View style={styles.passwordInputWrap}>
                <Text style={styles.passwordInputLabel}>BooffIn Account Password</Text>
                <View style={styles.passwordInputFieldRow}>
                  <KeyRound size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.passwordTextInput}
                    placeholder="Enter your account password..."
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showPassword}
                    value={disconnectPassword}
                    onChangeText={(val) => {
                      setDisconnectPassword(val);
                      if (disconnectError) setDisconnectError(null);
                    }}
                    autoCapitalize="none"
                    autoFocus
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={{ padding: 4 }}
                  >
                    {showPassword ? (
                      <EyeOff size={16} color={colors.textSecondary} />
                    ) : (
                      <Eye size={16} color={colors.textSecondary} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.passwordModalButtonsRow}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  size="sm"
                  onPress={() => setDisconnectModalVisible(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title={isDisconnecting ? 'Verifying...' : 'Disconnect ORCID'}
                  variant="danger"
                  size="sm"
                  loading={isDisconnecting}
                  disabled={!disconnectPassword.trim() || isDisconnecting}
                  onPress={handleConfirmDisconnect}
                  style={{ flex: 1.3 }}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* 6. Connect & Verify ORCID Modal */}
      <Modal
        visible={connectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConnectModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setConnectModalVisible(false)}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoidWrapper}
          >
            <View style={styles.connectModalCard}>
              <View style={styles.connectModalHeader}>
                <View style={styles.orcidModalIconWrap}>
                  <Text style={styles.orcidModalIconText}>iD</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.connectModalTitle}>Connect & Verify ORCID</Text>
                  <Text style={styles.connectModalSubtitle}>
                    {verifiedPersonPreview
                      ? 'Verify your account password to confirm ownership and seal your verified author badge.'
                      : 'Enter your 16-digit ORCID iD. We will query the public registry to verify your official works.'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setConnectModalVisible(false)}
                  style={styles.closeModalBtn}
                >
                  <XIcon size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {connectStepError && (
                <View style={styles.passwordErrorBox}>
                  <Text style={styles.passwordErrorText}>{connectStepError}</Text>
                </View>
              )}

              {/* Step 1: Input ORCID Form */}
              <View style={styles.orcidInputWrap}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.passwordInputLabel}>ORCID iD or Profile URL</Text>
                  {verifiedPersonPreview && (
                    <TouchableOpacity
                      onPress={() => {
                        setVerifiedPersonPreview(null);
                        setConnectPassword('');
                        setConnectStepError(null);
                      }}
                    >
                      <Text style={{ ...typography.micro, color: colors.accentBlue, fontWeight: '600' }}>
                        Change ID
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.orcidInputFieldRow}>
                  <TextInput
                    style={styles.orcidTextInput}
                    placeholder="0000-0002-1825-0097"
                    placeholderTextColor={colors.textMuted}
                    value={connectInputOrcid}
                    editable={!verifiedPersonPreview}
                    onChangeText={(val) => {
                      setConnectInputOrcid(val);
                      if (connectStepError) setConnectStepError(null);
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {!verifiedPersonPreview ? (
                    <TouchableOpacity
                      onPress={handleVerifyOrcidRecord}
                      disabled={isVerifyingRecord || !connectInputOrcid.trim()}
                      style={[
                        styles.verifyPillBtn,
                        (!connectInputOrcid.trim() || isVerifyingRecord) && { opacity: 0.6 },
                      ]}
                      activeOpacity={0.75}
                    >
                      {isVerifyingRecord ? (
                        <ActivityIndicator size="small" color={colors.white} />
                      ) : (
                        <Text style={styles.verifyPillBtnText}>Verify Record</Text>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6 }}>
                      <CheckCircle2 size={16} color="#16A34A" />
                      <Text style={{ ...typography.captionBold, color: '#16A34A', fontSize: 11.5 }}>
                        Found
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Step 2: Live Verified Record Preview Card */}
              {verifiedPersonPreview && (
                <View style={styles.verifiedPreviewCard}>
                  <View style={styles.verifiedPreviewHeader}>
                    <View style={styles.verifiedGreenCircle}>
                      <CheckCircle2 size={16} color="#16A34A" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.verifiedAuthorName}>{verifiedPersonPreview.name}</Text>
                      <Text style={styles.verifiedOrcidId}>ORCID: {verifiedPersonPreview.orcidId}</Text>
                    </View>
                  </View>

                  <View style={styles.verifiedStatsRow}>
                    <View style={styles.verifiedStatBadge}>
                      <BookOpen size={12} color={colors.accentBlue} />
                      <Text style={styles.verifiedStatText}>
                        {verifiedPersonPreview.worksCount} Works Found on ORCID
                      </Text>
                    </View>
                    <View style={[styles.verifiedStatBadge, { borderColor: '#BBF7D0' }]}>
                      <ShieldCheck size={12} color="#16A34A" />
                      <Text style={[styles.verifiedStatText, { color: '#166534' }]}>
                        Verified Registry
                      </Text>
                    </View>
                  </View>

                  {verifiedPersonPreview.biography ? (
                    <Text style={styles.verifiedBioSnippet} numberOfLines={2}>
                      {verifiedPersonPreview.biography}
                    </Text>
                  ) : null}
                </View>
              )}

              {/* Step 3: Password Confirmation Input */}
              {verifiedPersonPreview && (
                <View style={styles.passwordInputWrap}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ShieldCheck size={14} color={colors.accentBlue} />
                    <Text style={styles.passwordInputLabel}>Confirm BooffIn Account Password</Text>
                  </View>
                  <Text style={[styles.passwordModalSubtitle, { marginBottom: 6 }]}>
                    To prevent identity theft, please enter your password. Only authenticated account owners can claim this author badge.
                  </Text>
                  <View style={styles.passwordInputFieldRow}>
                    <KeyRound size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.passwordTextInput}
                      placeholder="Enter your account password..."
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry={!showConnectPassword}
                      value={connectPassword}
                      onChangeText={(val) => {
                        setConnectPassword(val);
                        if (connectStepError) setConnectStepError(null);
                      }}
                      autoCapitalize="none"
                      autoFocus
                    />
                    <TouchableOpacity
                      onPress={() => setShowConnectPassword(!showConnectPassword)}
                      style={{ padding: 4 }}
                    >
                      {showConnectPassword ? (
                        <EyeOff size={16} color={colors.textSecondary} />
                      ) : (
                        <Eye size={16} color={colors.textSecondary} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Anti-impersonation notice */}
              {!verifiedPersonPreview && (
                <View style={styles.antiImpersonationBox}>
                  <ShieldCheck size={15} color={colors.accentBlue} />
                  <Text style={styles.antiImpersonationText}>
                    Academic Integrity Guarantee: Each ORCID iD can only be bound to a single BooffIn account. Password authentication is required before issuing the verified badge.
                  </Text>
                </View>
              )}

              {/* Actions */}
              <View style={styles.passwordModalButtonsRow}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  size="sm"
                  onPress={() => setConnectModalVisible(false)}
                  style={{ flex: 1 }}
                />
                {verifiedPersonPreview ? (
                  <Button
                    title={
                      isConnectingWithPassword || isSyncing
                        ? 'Verifying...'
                        : 'Verify Password & Claim Badge'
                    }
                    variant="primary"
                    size="sm"
                    loading={isConnectingWithPassword || isSyncing}
                    disabled={
                      !connectPassword.trim() || isConnectingWithPassword || isSyncing
                    }
                    onPress={handleConfirmAndSyncOrcid}
                    style={{ flex: 1.8 }}
                  />
                ) : (
                  <Button
                    title={isVerifyingRecord ? 'Searching...' : 'Continue'}
                    variant="primary"
                    size="sm"
                    loading={isVerifyingRecord}
                    disabled={!connectInputOrcid.trim() || isVerifyingRecord}
                    onPress={handleVerifyOrcidRecord}
                    style={{ flex: 1.2 }}
                  />
                )}
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  loadingContainer: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 13,
  },

  /* Scholar Banner Card */
  scholarBannerCard: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...Platform.select({
      web: { boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
      default: { elevation: 1 },
    }),
  },
  scholarBannerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  scholarBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  scholarIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scholarTitleCol: {
    flex: 1,
    gap: 2,
  },
  scholarNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scholarSectionTitle: {
    ...typography.h3,
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  verifiedGreenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.full,
  },
  verifiedGreenText: {
    ...typography.micro,
    color: '#16A34A',
    fontWeight: '700',
    fontSize: 10.5,
  },
  unverifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.full,
  },
  unverifiedText: {
    ...typography.micro,
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 10.5,
  },
  orcidLinkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.sm,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  orcidLabel: {
    ...typography.micro,
    color: colors.accentBlue,
    fontWeight: '700',
    fontSize: 11,
  },
  orcidValue: {
    ...typography.micro,
    color: colors.accentBlue,
    fontWeight: '600',
    fontSize: 11,
  },
  scholarSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  bannerActionsCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radii.full,
  },
  syncButtonText: {
    ...typography.micro,
    fontWeight: '600',
    color: colors.textPrimary,
    fontSize: 11,
  },
  disconnectLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  disconnectLinkText: {
    ...typography.micro,
    color: colors.accentRed,
    fontWeight: '600',
    fontSize: 10.5,
  },

  /* Metrics Strip */
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricNumber: {
    ...typography.bodyBold,
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  metricLabel: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.borderLight,
  },

  /* Empty State & ORCID OAuth Connect Card */
  emptyCard: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  orcidBrandedIconWrap: {
    marginBottom: spacing.xs,
  },
  orcidCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#A6CE39',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(166, 206, 57, 0.35)' },
      default: { elevation: 3 },
    }),
  },
  orcidCircleText: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 24,
    letterSpacing: -0.5,
  },
  emptyTitle: {
    ...typography.h3,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptyDesc: {
    ...typography.body,
    fontSize: 13.5,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 380,
  },
  connectForm: {
    width: '100%',
    maxWidth: 380,
    gap: spacing.sm,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  errorText: {
    ...typography.caption,
    color: colors.accentRed,
    fontSize: 12,
    textAlign: 'center',
  },
  orcidOAuthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    paddingVertical: 13,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.full,
    width: '100%',
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(15, 23, 42, 0.25)' },
      default: { elevation: 2 },
    }),
  },
  orcidLogoMini: {
    backgroundColor: '#A6CE39',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orcidLogoMiniText: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 11,
  },
  orcidOAuthButtonText: {
    ...typography.captionBold,
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  securityPledgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
    paddingHorizontal: spacing.sm,
  },
  securityPledgeText: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 11.5,
    lineHeight: 16,
    textAlign: 'center',
    flex: 1,
  },

  /* Publications Section */
  publicationsSection: {
    gap: spacing.md,
  },
  filterTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    flexWrap: 'wrap',
  },
  filterPill: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radii.full,
  },
  filterPillActive: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  filterPillText: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    fontSize: 12,
  },
  filterPillTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  pubCardsList: {
    gap: spacing.md,
  },
  pubCard: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  pubCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  journalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
    maxWidth: '58%',
  },
  journalNameText: {
    ...typography.micro,
    color: colors.accentBlue,
    fontWeight: '700',
    fontSize: 11.5,
  },
  badgesRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  oaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  oaBadgeText: {
    ...typography.micro,
    color: '#15803D',
    fontWeight: '700',
    fontSize: 10,
  },
  yearText: {
    ...typography.micro,
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 11.5,
  },
  threeDotBtn: {
    padding: 3,
    borderRadius: radii.sm,
    backgroundColor: colors.backgroundSecondary,
  },
  pubTitle: {
    ...typography.bodyBold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  authorsText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12.5,
  },
  abstractSnippet: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 18,
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.sm,
    borderRadius: radii.sm,
  },
  pubCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.sm,
  },
  citationBadge: {
    flex: 1,
  },
  citationCount: {
    ...typography.micro,
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 11.5,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  shareFeedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.black,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  shareFeedBtnText: {
    ...typography.captionBold,
    color: colors.white,
    fontSize: 11.5,
  },
  readPaperBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  readPaperBtnText: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 11.5,
  },

  /* Modal Styles */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  keyboardAvoidWrapper: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  actionSheetCard: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
    maxHeight: '80%',
  },
  actionSheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.sm + 2,
    gap: spacing.md,
  },
  actionSheetPaperTitle: {
    ...typography.bodyBold,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  actionSheetJournal: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  closeModalBtn: {
    padding: 4,
  },
  actionSheetOptionsList: {
    gap: spacing.xs,
  },
  actionOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    gap: spacing.md,
  },
  actionOptionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionOptionTextCol: {
    flex: 1,
    gap: 1,
  },
  actionOptionMainText: {
    ...typography.bodyBold,
    fontSize: 14.5,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  actionOptionSubText: {
    ...typography.micro,
    fontSize: 12,
    color: colors.textSecondary,
  },
  actionSheetCancelBtn: {
    backgroundColor: colors.backgroundSecondary,
    paddingVertical: 12,
    borderRadius: radii.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  actionSheetCancelText: {
    ...typography.captionBold,
    fontSize: 13.5,
    color: colors.textPrimary,
  },

  /* Password Confirmation Disconnect Modal */
  passwordModalCard: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  passwordModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.sm + 2,
  },
  lockIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordModalTitle: {
    ...typography.bodyBold,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  passwordModalSubtitle: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  passwordErrorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: spacing.sm,
    borderRadius: radii.sm,
  },
  passwordErrorText: {
    ...typography.caption,
    color: colors.accentRed,
    fontSize: 12,
  },
  passwordInputWrap: {
    gap: 6,
  },
  passwordInputLabel: {
    ...typography.captionBold,
    fontSize: 12.5,
    color: colors.textPrimary,
  },
  passwordInputFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : 2,
  },
  passwordTextInput: {
    flex: 1,
    ...typography.body,
    fontSize: 14,
    color: colors.textPrimary,
    minHeight: 38,
  },
  passwordModalButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },

  /* Connect & Verify Modal */
  connectModalCard: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  connectModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.sm + 2,
  },
  orcidModalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#A6CE39',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orcidModalIconText: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 16,
  },
  connectModalTitle: {
    ...typography.bodyBold,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  connectModalSubtitle: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  orcidInputWrap: {
    gap: 6,
  },
  orcidInputFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.md,
    paddingLeft: spacing.md,
    paddingRight: 6,
    paddingVertical: 4,
    gap: spacing.sm,
  },
  orcidTextInput: {
    flex: 1,
    ...typography.body,
    fontSize: 14,
    color: colors.textPrimary,
    minHeight: 38,
  },
  verifyPillBtn: {
    backgroundColor: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyPillBtnText: {
    ...typography.captionBold,
    color: colors.white,
    fontSize: 12,
  },
  verifiedPreviewCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs + 2,
  },
  verifiedPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  verifiedGreenCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedAuthorName: {
    ...typography.bodyBold,
    fontSize: 14.5,
    fontWeight: '700',
    color: '#15803D',
  },
  verifiedOrcidId: {
    ...typography.micro,
    fontSize: 11.5,
    color: '#166534',
  },
  verifiedStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  verifiedStatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  verifiedStatText: {
    ...typography.micro,
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 11.5,
  },
  verifiedBioSnippet: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },
  antiImpersonationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: 'rgba(37, 99, 235, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.15)',
    borderRadius: radii.md,
    padding: spacing.md,
  },
  antiImpersonationText: {
    ...typography.micro,
    flex: 1,
    color: colors.textSecondary,
    fontSize: 11.5,
    lineHeight: 16,
  },
});

