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
  Link2,
  Plus,
  ArrowUpRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';
import { ScholarPublication, ScholarProfileStats } from '../../types/scholar';
import {
  getScholarPublications,
  syncScholarPublications,
  normalizeOrcidId,
  isValidOrcidId,
} from '../../api/orcidService';
import { Input } from '../core/Input';

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
  const [activeFilter, setActiveFilter] = useState<'all' | 'journal' | 'preprint' | 'oa'>('all');

  // Manual ORCID connect input in empty state
  const [orcidInput, setOrcidInput] = useState(propOrcidId || '');
  const [connectError, setConnectError] = useState<string | null>(null);

  const activeOrcid = stats.orcidId || propOrcidId;

  // Load publications on mount or when user changes
  const loadPublications = async () => {
    if (!userId) return;
    setIsLoading(true);
    const res = await getScholarPublications(userId);
    setIsLoading(false);

    if (res.publications.length > 0) {
      setPublications(res.publications);
      setStats(res.stats);
    } else if (activeOrcid && isCurrentUser) {
      // If user already has an ORCID ID on their profile, auto-sync works
      handleSync(activeOrcid);
    }
  };

  useEffect(() => {
    loadPublications();
  }, [userId, propOrcidId]);

  const handleSync = async (orcidToSync?: string) => {
    const targetOrcid = orcidToSync || activeOrcid || orcidInput;
    const cleanOrcid = normalizeOrcidId(targetOrcid);

    if (!isValidOrcidId(cleanOrcid)) {
      setConnectError('Please enter a valid 16-character ORCID iD (e.g. 0000-0002-1825-0097).');
      return;
    }

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
      Alert.alert(
        'ORCID Sync Successful',
        `Retrieved and verified ${res.publications.length} publications for your scholar profile.`
      );
    } else {
      setConnectError(res.error || 'Failed to synchronize ORCID publications.');
    }
  };

  const handleSharePaper = async (pub: ScholarPublication) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (onSharePaperToFeed) {
      onSharePaperToFeed(pub);
      return;
    }

    // Native sharing fallback
    const shareUrl = pub.url || (pub.doi ? `https://doi.org/${pub.doi}` : 'https://booffin.com');
    await Share.share({
      title: pub.title,
      message: `Check out "${pub.title}" published by ${userFullName || 'the author'} on BooffIn: ${shareUrl}`,
      url: shareUrl,
    });
  };

  const handleOpenPaper = (pub: ScholarPublication) => {
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
              <GraduationCap size={20} color={colors.white} />
            </View>
            <View style={styles.scholarTitleCol}>
              <View style={styles.scholarNameRow}>
                <Text style={styles.scholarSectionTitle}>BooffIn Scholar</Text>
                <View style={styles.verifiedGreenBadge}>
                  <CheckCircle2 size={12} color="#16A34A" />
                  <Text style={styles.verifiedGreenText}>Verified</Text>
                </View>
              </View>

              {activeOrcid ? (
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

          {isCurrentUser && (
            <TouchableOpacity
              onPress={() => handleSync()}
              disabled={isSyncing}
              style={[styles.syncButton, isSyncing && { opacity: 0.6 }]}
              activeOpacity={0.75}
            >
              <RefreshCw
                size={13}
                color={colors.textPrimary}
                style={[isSyncing && { transform: [{ rotate: '45deg' }] }]}
              />
              <Text style={styles.syncButtonText}>
                {isSyncing ? 'Syncing...' : 'Sync ORCID'}
              </Text>
            </TouchableOpacity>
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
      {publications.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconCircle}>
            <BookOpen size={28} color={colors.accentBlue} />
          </View>

          <Text style={styles.emptyTitle}>
            {isCurrentUser ? 'Showcase Your Published Research' : 'No Publications Found'}
          </Text>
          <Text style={styles.emptyDesc}>
            {isCurrentUser
              ? 'Connect your ORCID iD to automatically pull your peer-reviewed papers, preprints, citation metrics, and open-access PDFs.'
              : 'This researcher has not connected their verified ORCID publication record yet.'}
          </Text>

          {isCurrentUser && (
            <View style={styles.connectForm}>
              <Input
                label="ORCID Identifier"
                placeholder="e.g. 0000-0002-1825-0097"
                value={orcidInput}
                onChangeText={(text) => {
                  setOrcidInput(text);
                  if (connectError) setConnectError(null);
                }}
                leftIcon="CheckCircle2"
                hint="Your 16-digit official ORCID scholar identifier"
              />

              {connectError && (
                <Text style={styles.errorText}>{connectError}</Text>
              )}

              <TouchableOpacity
                onPress={() => handleSync(orcidInput)}
                disabled={isSyncing}
                style={[styles.primaryConnectBtn, isSyncing && { opacity: 0.7 }]}
                activeOpacity={0.85}
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Sparkles size={16} color={colors.white} />
                    <Text style={styles.primaryConnectText}>
                      Connect & Sync Publications
                    </Text>
                  </>
                )}
              </TouchableOpacity>
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
                  {/* Top badges */}
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
                          onPress={() => handleSharePaper(pub)}
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
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  syncButtonText: {
    ...typography.micro,
    fontWeight: '600',
    color: colors.textPrimary,
    fontSize: 11.5,
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

  /* Empty State */
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
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    ...typography.h3,
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptyDesc: {
    ...typography.body,
    fontSize: 13.5,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 380,
  },
  connectForm: {
    width: '100%',
    maxWidth: 380,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.caption,
    color: colors.accentRed,
    fontSize: 12,
  },
  primaryConnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.black,
    paddingVertical: 12,
    borderRadius: radii.md,
    marginTop: spacing.xs,
  },
  primaryConnectText: {
    ...typography.captionBold,
    color: colors.white,
    fontSize: 13.5,
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
    maxWidth: '65%',
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
});
