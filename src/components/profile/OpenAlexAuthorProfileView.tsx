import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Share,
  Clipboard,
} from 'react-native';
import { router } from 'expo-router';
import {
  Building2,
  Award,
  GraduationCap,
  ExternalLink,
  Share2,
  FileText,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  CheckCircle2,
  BarChart2,
  Layers,
  Lock,
  Unlock,
  ArrowLeft,
  Sparkles,
  TrendingUp,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';
import {
  fetchOpenAlexAuthorDetails,
  fetchOpenAlexAuthorWorks,
  OpenAlexAuthorDetails,
} from '../../api/openalexAuthorService';
import { Paper } from '../../types';
import { usePaperStore } from '../../store/usePaperStore';
import { useAuthStore } from '../../store/useAuthStore';
import { supabase } from '../../api/client';
import { normalizeOrcidId } from '../../api/orcidService';
import { ClaimProfileModal } from '../modals/ClaimProfileModal';

interface OpenAlexAuthorProfileViewProps {
  authorId: string;
  initialOrcid?: string;
  onBack?: () => void;
}

export const OpenAlexAuthorProfileView: React.FC<OpenAlexAuthorProfileViewProps> = ({
  authorId,
  initialOrcid,
  onBack,
}) => {
  const [profile, setProfile] = useState<OpenAlexAuthorDetails | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [copiedId, setCopiedId] = useState(false);
  const [showAllInstitutions, setShowAllInstitutions] = useState(false);

  // Works state & filters
  const [works, setWorks] = useState<Paper[]>([]);
  const [worksPage, setWorksPage] = useState(1);
  const [hasMoreWorks, setHasMoreWorks] = useState(false);
  const [totalWorksCount, setTotalWorksCount] = useState(0);
  const [isLoadingWorks, setIsLoadingWorks] = useState(false);
  const [isLoadingMoreWorks, setIsLoadingMoreWorks] = useState(false);
  const [accessFilter, setAccessFilter] = useState<'all' | 'oa' | 'closed'>('all');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [expandedAbstracts, setExpandedAbstracts] = useState<Record<string, boolean>>({});

  const addPaperToStore = usePaperStore((s) => s.addPaper);
  const currentUser = useAuthStore((s) => s.user);
  const [claimModalVisible, setClaimModalVisible] = useState(false);
  const [isClaimedByAuthor, setIsClaimedByAuthor] = useState(false);

  const handleClaimProfile = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setClaimModalVisible(true);
  };

  // Check if profile is claimed in Supabase
  useEffect(() => {
    let isMounted = true;

    async function checkClaimStatus() {
      const targetOrcid = normalizeOrcidId(profile?.orcid || initialOrcid || '');
      if (!targetOrcid) {
        if (isMounted) setIsClaimedByAuthor(false);
        return;
      }

      // Check if current user has this verified ORCID
      if (
        currentUser?.orcidVerified &&
        currentUser?.orcidId &&
        normalizeOrcidId(currentUser.orcidId) === targetOrcid
      ) {
        if (isMounted) setIsClaimedByAuthor(true);
        return;
      }

      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, orcid_id, orcid_verified')
          .eq('orcid_id', targetOrcid)
          .eq('orcid_verified', true)
          .maybeSingle();

        if (isMounted) {
          setIsClaimedByAuthor(Boolean(data));
        }
      } catch {
        if (isMounted) setIsClaimedByAuthor(false);
      }
    }

    checkClaimStatus();

    return () => {
      isMounted = false;
    };
  }, [profile?.orcid, initialOrcid, currentUser?.orcidId, currentUser?.orcidVerified]);

  // 1. Fetch Author Profile
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoadingProfile(true);
      try {
        const data = await fetchOpenAlexAuthorDetails(authorId);
        if (isMounted) {
          if (data) {
            setProfile(data);
          } else {
            // Fallback basic object if API request failed
            setProfile({
              id: authorId,
              openAlexId: authorId,
              openAlexUrl: `https://openalex.org/${authorId}`,
              displayName: 'Academic Researcher',
              alternativeNames: [],
              institutions: [],
              observedInstitutions: [],
              orcid: initialOrcid,
              orcidUrl: initialOrcid ? `https://orcid.org/${initialOrcid}` : undefined,
              worksCount: 0,
              citationCount: 0,
              hIndex: 0,
              i10Index: 0,
              countsByYear: [],
              topics: [],
              typeBreakdown: [],
            });
          }
        }
      } catch (err) {
        console.warn('Error loading OpenAlex author profile:', err);
      } finally {
        if (isMounted) setIsLoadingProfile(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [authorId, initialOrcid]);

  // 2. Fetch Works when authorId or accessFilter changes
  const loadWorks = useCallback(
    async (pageToLoad = 1, isLoadMore = false) => {
      if (!authorId) return;
      if (isLoadMore) {
        setIsLoadingMoreWorks(true);
      } else {
        setIsLoadingWorks(true);
      }

      try {
        const res = await fetchOpenAlexAuthorWorks(authorId, pageToLoad, 15, accessFilter);
        if (isLoadMore) {
          setWorks((prev) => [...prev, ...res.works]);
        } else {
          setWorks(res.works);
          setTotalWorksCount(res.totalCount);
        }
        setWorksPage(res.page);
        setHasMoreWorks(res.hasMore);
      } catch (err) {
        console.warn('Error loading author works:', err);
      } finally {
        setIsLoadingWorks(false);
        setIsLoadingMoreWorks(false);
      }
    },
    [authorId, accessFilter]
  );

  useEffect(() => {
    loadWorks(1, false);
  }, [loadWorks]);

  const handleFilterChange = (filter: 'all' | 'oa' | 'closed') => {
    if (accessFilter === filter) return;
    try {
      Haptics.selectionAsync();
    } catch {}
    setAccessFilter(filter);
    setWorks([]);
    setWorksPage(1);
  };

  const handleCopyId = (idStr: string) => {
    try {
      Clipboard.setString(idStr);
      setCopiedId(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {}
  };

  const handleShare = async () => {
    if (!profile) return;
    try {
      await Share.share({
        title: `${profile.displayName} - Researcher Profile on BooffIn`,
        message: `Check out researcher ${profile.displayName} (${profile.worksCount} works, ${profile.citationCount} citations) on BooffIn: ${profile.openAlexUrl}`,
        url: profile.openAlexUrl,
      });
    } catch {}
  };

  const handleOpenPaper = (paper: Paper, openPdfDirectly = false) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    addPaperToStore(paper);
    router.push({
      pathname: '/paper/[id]',
      params: {
        id: paper.id,
        doi: paper.doi,
        title: encodeURIComponent(paper.title),
        url: paper.canonicalUrl,
        pdfUrl: paper.openAccessUrl,
        mode: openPdfDirectly && paper.openAccessUrl ? 'pdf' : 'article',
      },
    });
  };

  const toggleAbstract = (paperId: string) => {
    setExpandedAbstracts((prev) => ({
      ...prev,
      [paperId]: !prev[paperId],
    }));
  };

  // Bar chart calculations
  const maxYearWorks = useMemo(() => {
    if (!profile?.countsByYear || profile.countsByYear.length === 0) return 1;
    return Math.max(...profile.countsByYear.map((c) => c.worksCount), 1);
  }, [profile]);

  if (isLoadingProfile) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.textPrimary} />
        <Text style={styles.loadingText}>Loading researcher profile & metrics...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Could not load researcher profile</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={onBack || (() => router.back())}>
          <Text style={styles.retryBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const initials = profile.displayName
    ? profile.displayName
        .split(' ')
        .filter(Boolean)
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'R';

  const visibleInstitutions = showAllInstitutions
    ? [...profile.institutions, ...profile.observedInstitutions]
    : profile.institutions.length > 0
    ? profile.institutions
    : profile.observedInstitutions.slice(0, 2);

  const hiddenCount =
    profile.institutions.length + profile.observedInstitutions.length - visibleInstitutions.length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Bar Navigation */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={onBack || (() => router.back())}
          style={styles.navIconButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.navActions}>
          <TouchableOpacity
            onPress={handleShare}
            style={styles.navIconButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Share2 size={19} color={colors.textPrimary} />
          </TouchableOpacity>
          {profile.openAlexUrl && (
            <TouchableOpacity
              onPress={() => Linking.openURL(profile.openAlexUrl)}
              style={styles.navIconButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ExternalLink size={19} color={colors.textPrimary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── CARD 1: AUTHOR INFO CARD (OpenAlex Style) ── */}
      <View style={styles.card}>
        <View style={styles.authorHeaderRow}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.authorHeaderTextWrap}>
            <View style={styles.nameBadgeRow}>
              <Text style={styles.authorName} numberOfLines={2}>
                {profile.displayName}
              </Text>
            </View>

            {/* Observed Name from OpenAlex */}
            {profile.observedName && profile.observedName !== profile.displayName && (
              <View style={styles.observedNameRow}>
                <Text style={styles.observedNameLabel}>Observed name: </Text>
                <Text style={styles.observedNameVal}>{profile.observedName}</Text>
              </View>
            )}

            {/* Verification Status */}
            <View style={styles.sourcePill}>
              <Sparkles size={11} color={colors.accentLink} />
              <Text style={styles.sourcePillText}>OpenAlex Verified Scholar Index</Text>
            </View>
          </View>

          {/* Claim Profile Option or Claimed by Author Badge */}
          {isClaimedByAuthor ? (
            <View style={styles.claimedProfileTopBadge}>
              <CheckCircle2 size={12} color="#15803D" />
              <Text style={styles.claimedProfileTopText}>Claimed by Author</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.claimProfileTopBtn}
              onPress={handleClaimProfile}
              activeOpacity={0.8}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.claimProfileTopText}>Claim Profile</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Current & Historical Affiliations */}
        {visibleInstitutions.length > 0 && (
          <View style={styles.affiliationsWrap}>
            <Text style={styles.sectionMiniTitle}>AFFILIATIONS & INSTITUTIONS</Text>
            {visibleInstitutions.map((inst, index) => (
              <View key={`${inst}-${index}`} style={styles.institutionRow}>
                <Building2 size={14} color={colors.textSecondary} style={{ marginTop: 2 }} />
                <Text style={styles.institutionText}>{inst}</Text>
              </View>
            ))}

            {(hiddenCount > 0 || (showAllInstitutions && profile.observedInstitutions.length > 0)) && (
              <TouchableOpacity
                onPress={() => setShowAllInstitutions(!showAllInstitutions)}
                style={styles.toggleInstitutionsBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.toggleInstitutionsText}>
                  {showAllInstitutions
                    ? 'Show fewer affiliations'
                    : `+${hiddenCount} more observed institution${hiddenCount > 1 ? 's' : ''}`}
                </Text>
                {showAllInstitutions ? (
                  <ChevronUp size={14} color={colors.accentLink} />
                ) : (
                  <ChevronDown size={14} color={colors.accentLink} />
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Identifiers Row (ORCID & OpenAlex ID) */}
        <View style={styles.identifiersRow}>
          {/* ORCID */}
          {profile.orcid ? (
            <TouchableOpacity
              onPress={() => profile.orcidUrl && Linking.openURL(profile.orcidUrl)}
              style={styles.orcidBadgeBtn}
              activeOpacity={0.8}
            >
              <Award size={13} color="#A6CE39" />
              <Text style={styles.orcidText}>{profile.orcid}</Text>
              <ExternalLink size={11} color="#4D6B18" />
            </TouchableOpacity>
          ) : null}

          {/* OpenAlex ID (Original Canonical OpenAlex ID) */}
          {profile.openAlexId && !profile.openAlexId.includes('-') && (profile.openAlexId.startsWith('A') || profile.openAlexId.length > 4) ? (
            <TouchableOpacity
              onPress={() => handleCopyId(profile.openAlexId)}
              style={styles.openAlexIdBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.openAlexIdLabel}>OpenAlex ID:</Text>
              <Text style={styles.openAlexIdText}>{profile.openAlexId}</Text>
              {copiedId ? (
                <Check size={12} color="#16A34A" />
              ) : (
                <Copy size={12} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* ── CARD 2: STATS & METRICS (OpenAlex Snapshot Structure) ── */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <BarChart2 size={16} color={colors.textPrimary} />
          <Text style={styles.cardHeaderTitle}>SCHOLARLY IMPACT & METRICS</Text>
        </View>

        {/* 4 Primary Stats Cards Grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCell}>
            <Text style={styles.metricVal}>{profile.worksCount.toLocaleString()}</Text>
            <Text style={styles.metricLbl}>Works Published</Text>
          </View>

          <View style={styles.metricCell}>
            <Text style={styles.metricVal}>{profile.citationCount.toLocaleString()}</Text>
            <Text style={styles.metricLbl}>Total Citations</Text>
          </View>

          <View style={styles.metricCell}>
            <Text style={styles.metricVal}>{profile.hIndex}</Text>
            <Text style={styles.metricLbl}>h-index</Text>
          </View>

          <View style={styles.metricCell}>
            <Text style={styles.metricVal}>{profile.i10Index}</Text>
            <Text style={styles.metricLbl}>i10-index</Text>
          </View>
        </View>

        {/* 2-Year Mean Citedness if present */}
        {profile.twoYearMeanCitedness !== undefined && profile.twoYearMeanCitedness > 0 && (
          <View style={styles.meanCitednessRow}>
            <TrendingUp size={13} color={colors.accentLink} />
            <Text style={styles.meanCitednessText}>
              2-Year Mean Citedness: <Text style={styles.boldText}>{profile.twoYearMeanCitedness.toFixed(2)}</Text> citations/work
            </Text>
          </View>
        )}

        {/* Yearly Works & Citations Bar Chart */}
        {profile.countsByYear && profile.countsByYear.length > 0 && (
          <View style={styles.chartContainer}>
            <View style={styles.chartHeaderRow}>
              <Text style={styles.chartTitle}>ANNUAL PUBLICATIONS TREND</Text>
              {selectedYear && (
                <Text style={styles.chartSelectedYearText}>
                  {selectedYear}:{' '}
                  {profile.countsByYear.find((c) => c.year === selectedYear)?.worksCount || 0} works ·{' '}
                  {profile.countsByYear.find((c) => c.year === selectedYear)?.citedByCount || 0} citations
                </Text>
              )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScroll}>
              <View style={styles.chartBarsRow}>
                {profile.countsByYear.map((item) => {
                  const barHeight = Math.max(12, Math.round((item.worksCount / maxYearWorks) * 90));
                  const isSelected = selectedYear === item.year;
                  return (
                    <TouchableOpacity
                      key={item.year}
                      onPress={() => setSelectedYear(isSelected ? null : item.year)}
                      style={styles.barColumn}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.barCountText, isSelected && styles.barCountTextActive]}>
                        {item.worksCount}
                      </Text>
                      <View
                        style={[
                          styles.barFill,
                          { height: barHeight },
                          isSelected && styles.barFillActive,
                        ]}
                      />
                      <Text style={[styles.barYearText, isSelected && styles.barYearTextActive]}>
                        {String(item.year).slice(-2)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            <Text style={styles.chartFooterHint}>Tap on any year to inspect citations and output</Text>
          </View>
        )}

        {/* Research Topics Breakdown */}
        {profile.topics && profile.topics.length > 0 && (
          <View style={styles.topicsSection}>
            <Text style={styles.sectionMiniTitle}>KEY RESEARCH TOPICS</Text>
            <View style={styles.topicsCloud}>
              {profile.topics.map((t) => (
                <View key={t.id} style={styles.topicChip}>
                  <Text style={styles.topicChipName}>{t.displayName}</Text>
                  {t.count > 0 && (
                    <View style={styles.topicCountBadge}>
                      <Text style={styles.topicCountText}>{t.count}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Publication Types Breakdown */}
        {profile.typeBreakdown && profile.typeBreakdown.length > 0 && (
          <View style={styles.typesSection}>
            <Text style={styles.sectionMiniTitle}>PUBLICATION TYPES</Text>
            <View style={styles.typesRow}>
              {profile.typeBreakdown.map((tb) => (
                <View key={tb.type} style={styles.typeBadge}>
                  <Layers size={11} color={colors.textSecondary} />
                  <Text style={styles.typeBadgeText}>
                    {tb.type.toUpperCase()}: <Text style={styles.boldText}>{tb.count.toLocaleString()}</Text>
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* ── CARD 3: PUBLICATIONS CATALOG (WITH OA / CLOSED FILTER) ── */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <GraduationCap size={16} color={colors.textPrimary} />
          <Text style={styles.cardHeaderTitle}>
            PUBLICATIONS ({totalWorksCount > 0 ? totalWorksCount.toLocaleString() : works.length})
          </Text>
        </View>

        {/* Filter Tabs: All | Open Access (PDF) | Closed */}
        <View style={styles.filterTabsRow}>
          <TouchableOpacity
            onPress={() => handleFilterChange('all')}
            style={[styles.filterTab, accessFilter === 'all' && styles.filterTabActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterTabText, accessFilter === 'all' && styles.filterTabTextActive]}>
              All Works
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleFilterChange('oa')}
            style={[styles.filterTab, accessFilter === 'oa' && styles.filterTabActiveGreen]}
            activeOpacity={0.7}
          >
            <Unlock size={12} color={accessFilter === 'oa' ? '#15803D' : colors.textSecondary} />
            <Text
              style={[
                styles.filterTabText,
                accessFilter === 'oa' && styles.filterTabTextActiveGreen,
              ]}
            >
              Open Access (PDF)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleFilterChange('closed')}
            style={[styles.filterTab, accessFilter === 'closed' && styles.filterTabActive]}
            activeOpacity={0.7}
          >
            <Lock size={12} color={accessFilter === 'closed' ? colors.textPrimary : colors.textSecondary} />
            <Text
              style={[
                styles.filterTabText,
                accessFilter === 'closed' && styles.filterTabTextActive,
              ]}
            >
              Closed
            </Text>
          </TouchableOpacity>
        </View>

        {/* Works List */}
        {isLoadingWorks ? (
          <View style={styles.worksLoadingContainer}>
            <ActivityIndicator size="small" color={colors.textPrimary} />
            <Text style={styles.worksLoadingText}>Fetching publication catalog...</Text>
          </View>
        ) : works.length === 0 ? (
          <View style={styles.emptyWorksContainer}>
            <BookOpen size={24} color={colors.textSecondary} />
            <Text style={styles.emptyWorksTitle}>No publications found</Text>
            <Text style={styles.emptyWorksDesc}>
              {accessFilter === 'oa'
                ? 'No free Open Access PDFs indexed for this author under this filter.'
                : 'No works recorded for this author.'}
            </Text>
          </View>
        ) : (
          <View style={styles.worksList}>
            {works.map((paper) => {
              const isExpanded = Boolean(expandedAbstracts[paper.id]);
              const authorNames = paper.authors.map((a) => a.name).join(', ');

              return (
                <View key={paper.id} style={styles.paperItemCard}>
                  {/* Paper Title */}
                  <TouchableOpacity
                    onPress={() => handleOpenPaper(paper, false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.paperTitle}>{paper.title}</Text>
                  </TouchableOpacity>

                  {/* Authors line */}
                  <Text style={styles.paperAuthors} numberOfLines={2}>
                    {authorNames}
                  </Text>

                  {/* Journal & Year & Citations row */}
                  <View style={styles.paperMetaRow}>
                    <Text style={styles.paperJournal} numberOfLines={1}>
                      {paper.journal} · {paper.publicationYear}
                    </Text>
                    {paper.citationCount > 0 && (
                      <View style={styles.citationsPill}>
                        <Text style={styles.citationsPillText}>
                          Cited by {paper.citationCount}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Open Access vs Closed Badge */}
                  <View style={styles.badgesRow}>
                    {paper.isOpenAccess ? (
                      <View style={styles.oaBadge}>
                        <FileText size={11} color="#15803D" />
                        <Text style={styles.oaBadgeText}>Open Access · PDF Available</Text>
                      </View>
                    ) : (
                      <View style={styles.closedBadge}>
                        <Lock size={11} color={colors.textSecondary} />
                        <Text style={styles.closedBadgeText}>Subscription / Closed</Text>
                      </View>
                    )}
                  </View>

                  {/* Abstract preview if available */}
                  {paper.abstract ? (
                    <View style={styles.abstractContainer}>
                      <Text
                        style={styles.abstractText}
                        numberOfLines={isExpanded ? undefined : 3}
                      >
                        {paper.abstract}
                      </Text>
                      <TouchableOpacity
                        onPress={() => toggleAbstract(paper.id)}
                        style={styles.toggleAbstractBtn}
                        hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                      >
                        <Text style={styles.toggleAbstractText}>
                          {isExpanded ? 'Show less' : 'Read abstract'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  {/* Actions Row */}
                  <View style={styles.paperActionsRow}>
                    {paper.isOpenAccess && paper.openAccessUrl ? (
                      <TouchableOpacity
                        onPress={() => handleOpenPaper(paper, true)}
                        style={styles.readPdfBtn}
                        activeOpacity={0.8}
                      >
                        <BookOpen size={13} color="#FFFFFF" />
                        <Text style={styles.readPdfBtnText}>Read Paper (PDF)</Text>
                      </TouchableOpacity>
                    ) : null}

                    <TouchableOpacity
                      onPress={() => handleOpenPaper(paper, false)}
                      style={styles.discussBtn}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.discussBtnText}>View Details & Discussion</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            {/* Load More Publications Button */}
            {hasMoreWorks && (
              <TouchableOpacity
                onPress={() => loadWorks(worksPage + 1, true)}
                disabled={isLoadingMoreWorks}
                style={styles.loadMoreWorksBtn}
                activeOpacity={0.8}
              >
                {isLoadingMoreWorks ? (
                  <ActivityIndicator size="small" color={colors.textPrimary} />
                ) : (
                  <>
                    <GraduationCap size={14} color={colors.textPrimary} />
                    <Text style={styles.loadMoreWorksBtnText}>Load more publications</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Claim Profile Interactive Modal */}
      {profile && (
        <ClaimProfileModal
          visible={claimModalVisible}
          onClose={() => setClaimModalVisible(false)}
          profile={profile}
          onClaimSuccess={() => {
            setIsClaimedByAuthor(true);
            setClaimModalVisible(false);
          }}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingBottom: spacing.xxl,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  retryBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.black,
    borderRadius: radii.md,
  },
  retryBtnText: {
    ...typography.bodyBold,
    color: '#FFFFFF',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  navIconButton: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.cardBackground,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radii.lg,
    padding: spacing.md + 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  authorHeaderRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  avatarPlaceholder: {
    width: 62,
    height: 62,
    borderRadius: radii.full,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.h3,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  authorHeaderTextWrap: {
    flex: 1,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  authorName: {
    ...typography.h2,
    color: colors.textPrimary,
    fontSize: 20,
    lineHeight: 25,
  },
  observedNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  observedNameLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  observedNameVal: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 12,
  },
  sourcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radii.full,
    marginTop: 6,
    borderWidth: 0.5,
    borderColor: '#BFDBFE',
  },
  sourcePillText: {
    ...typography.microBold,
    color: '#1D4ED8',
    fontSize: 10.5,
  },
  affiliationsWrap: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  sectionMiniTitle: {
    ...typography.microBold,
    color: colors.textSecondary,
    letterSpacing: 0.6,
    marginBottom: spacing.xs + 2,
  },
  institutionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 5,
  },
  institutionText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  toggleInstitutionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  toggleInstitutionsText: {
    ...typography.captionBold,
    color: colors.accentLink,
    fontSize: 12,
  },
  identifiersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  orcidBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F8EA',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: 0.8,
    borderColor: '#D4E8B0',
  },
  orcidText: {
    ...typography.microBold,
    color: '#4D6B18',
    fontSize: 11,
  },
  openAlexIdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceHover,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: 0.8,
    borderColor: colors.borderLight,
  },
  openAlexIdLabel: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 11,
  },
  openAlexIdText: {
    ...typography.microBold,
    color: colors.textPrimary,
    fontSize: 11,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginBottom: spacing.md,
  },
  cardHeaderTitle: {
    ...typography.captionBold,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricCell: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surfaceHover,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
  },
  metricVal: {
    ...typography.h2,
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 2,
  },
  metricLbl: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11.5,
  },
  meanCitednessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  meanCitednessText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  boldText: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  chartContainer: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  chartTitle: {
    ...typography.microBold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  chartSelectedYearText: {
    ...typography.microBold,
    color: colors.accentLink,
    fontSize: 11,
  },
  chartScroll: {
    marginTop: spacing.xs,
  },
  chartBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    height: 120,
    paddingTop: 10,
    paddingBottom: 2,
  },
  barColumn: {
    alignItems: 'center',
    width: 24,
    justifyContent: 'flex-end',
  },
  barCountText: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 9,
    marginBottom: 2,
  },
  barCountTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  barFill: {
    width: 14,
    backgroundColor: '#CBD5E1',
    borderRadius: 3,
  },
  barFillActive: {
    backgroundColor: colors.textPrimary,
    width: 16,
  },
  barYearText: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 4,
  },
  barYearTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  chartFooterHint: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 10.5,
    marginTop: 4,
    textAlign: 'center',
  },
  topicsSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  topicsCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceHover,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  topicChipName: {
    ...typography.caption,
    color: colors.textPrimary,
    fontSize: 12,
  },
  topicCountBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radii.full,
  },
  topicCountText: {
    ...typography.microBold,
    color: colors.textSecondary,
    fontSize: 10,
  },
  typesSection: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  typesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceHover,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  typeBadgeText: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 11,
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: colors.surfaceHover,
    padding: 3,
    borderRadius: radii.md,
    marginBottom: spacing.md,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: radii.sm,
  },
  filterTabActive: {
    backgroundColor: colors.cardBackground,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  filterTabActiveGreen: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  filterTabText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  filterTabTextActive: {
    ...typography.captionBold,
    color: colors.textPrimary,
  },
  filterTabTextActiveGreen: {
    ...typography.captionBold,
    color: '#15803D',
  },
  worksLoadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  worksLoadingText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  emptyWorksContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  emptyWorksTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  emptyWorksDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  worksList: {
    gap: spacing.md,
  },
  paperItemCard: {
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  paperTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  paperAuthors: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 6,
  },
  paperMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: spacing.sm,
  },
  paperJournal: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    flex: 1,
    fontStyle: 'italic',
  },
  citationsPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  citationsPillText: {
    ...typography.microBold,
    color: '#92400E',
    fontSize: 10.5,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  oaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: radii.full,
    borderWidth: 0.5,
    borderColor: '#86EFAC',
  },
  oaBadgeText: {
    ...typography.microBold,
    color: '#15803D',
    fontSize: 10.5,
  },
  closedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceHover,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: radii.full,
    borderWidth: 0.5,
    borderColor: colors.borderLight,
  },
  closedBadgeText: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 10.5,
  },
  abstractContainer: {
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: colors.borderLight,
  },
  abstractText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  toggleAbstractBtn: {
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  toggleAbstractText: {
    ...typography.captionBold,
    color: colors.accentLink,
    fontSize: 11.5,
  },
  paperActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.xs + 2,
    borderTopWidth: 0.5,
    borderTopColor: colors.borderLight,
  },
  readPdfBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#16A34A',
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  readPdfBtnText: {
    ...typography.captionBold,
    color: '#FFFFFF',
    fontSize: 12.5,
  },
  discussBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  discussBtnText: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 12,
  },
  loadMoreWorksBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm + 4,
    backgroundColor: colors.cardBackground,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginTop: spacing.xs,
  },
  loadMoreWorksBtnText: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 13,
  },
  claimProfileTopBtn: {
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: '#1B4D3E',
    backgroundColor: '#EAF3EE',
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  claimProfileTopText: {
    ...typography.captionBold,
    color: '#1B4D3E',
    fontSize: 11.5,
    fontWeight: '700',
  },
  claimedProfileTopBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    backgroundColor: '#DCFCE7',
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  claimedProfileTopText: {
    ...typography.captionBold,
    color: '#15803D',
    fontSize: 11.5,
    fontWeight: '700',
  },
});
