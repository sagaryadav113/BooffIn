import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Platform,
  Linking,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import {
  ArrowLeft,
  Share2,
  FileText,
  BookOpen,
  ExternalLink,
  Calendar,
  Clock,
  CheckCircle2,
  Edit3,
  Activity,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography, useColors, useIsDark } from '../../theme';
import { Post, ArticleData, ArticleReference, Comment, DiscussionType } from '../../types';
import { UserProfile } from '../../types/user';
import { DiscussionIcon } from '../core/DiscussionIcon';
import { DiscussionComposer, DiscussionTypePills } from '../discussion';
import { LikeButton } from '../core/LikeButton';
import { CommentCard } from '../cards/CommentCard';
import { EmptyState } from '../feedback/EmptyState';
import { ArticleComposer } from '../composer/ArticleComposer';
import { PostImpactModal } from '../post/PostImpactModal';
import { usePostStore } from '../../store/usePostStore';

export interface ResearchArticleViewProps {
  post: Post;
  onBack?: () => void;
  currentUser?: UserProfile | null;
  onPostUpdated?: (updated: Post) => void;
  comments?: Comment[];
  totalDiscussionCount?: number;
  activeFilter?: 'all' | DiscussionType;
  filterCounts?: Record<'all' | DiscussionType, number>;
  onSelectFilter?: (type: 'all' | DiscussionType) => void;
  onSubmitDiscussion?: (data: { type: DiscussionType; title?: string; content: string }) => Promise<void>;
  onAddReply?: (parentId: string, replyText: string) => Promise<void>;
  onDeleteComment?: (commentId: string) => void;
  onLikeComment?: (commentId: string) => void;
  onLikeReply?: (parentId: string, replyId: string) => void;
  onLikePost?: () => void;
  isSubmittingComment?: boolean;
}

export const ResearchArticleView: React.FC<ResearchArticleViewProps> = ({
  post,
  onBack,
  currentUser,
  onPostUpdated,
  comments,
  totalDiscussionCount,
  activeFilter,
  filterCounts,
  onSelectFilter,
  onSubmitDiscussion,
  onAddReply,
  onDeleteComment,
  onLikeComment,
  onLikeReply,
  onLikePost,
  isSubmittingComment = false,
}) => {
  const colors = useColors();
  const isDark = useIsDark();
  const article: ArticleData | undefined = post.article;
  const [viewMode, setViewMode] = useState<'article' | 'pdf'>('article');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImpactModalOpen, setIsImpactModalOpen] = useState(false);
  const [isSavingArticle, setIsSavingArticle] = useState(false);
  const updatePost = usePostStore((s) => s.updatePost);

  const isAuthor = Boolean(currentUser?.id && post.author?.id && currentUser.id === post.author.id);

  // Fallback if post is missing structured article data
  if (!article) {
    return (
      <View style={styles.fallbackContainer}>
        <Text style={styles.fallbackText}>Article content not found.</Text>
      </View>
    );
  }

  const handleShare = async () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    try {
      await Share.share({
        title: article.title,
        message: `${article.title}\n\nBy ${article.authors.join(', ')}\n\nRead on BooffIn: https://www.letsbooffin.com/post/${post.id}`,
      });
    } catch {}
  };

  const handleOpenReferenceInApp = (ref: ArticleReference, asPdf: boolean = false) => {
    try {
      Haptics.selectionAsync();
    } catch {}

    const targetId = ref.doi || ref.paperId || ref.id;
    router.push({
      pathname: '/paper/[id]',
      params: {
        id: targetId,
        fromPostId: post.id,
        refId: ref.id,
        ...(asPdf ? { mode: 'pdf' } : {}),
        ...(ref.doi ? { doi: ref.doi } : {}),
        ...(ref.title ? { title: ref.title } : {}),
        ...(ref.url ? { url: ref.url } : {}),
        ...(ref.openAccessPdfUrl ? { pdfUrl: ref.openAccessPdfUrl } : {}),
      },
    });
  };

  // Helper to render text with interactive in-text citations
  const renderRichTextWithCitations = (text: string) => {
    if (!article.references || article.references.length === 0) {
      return <Text style={styles.paragraphText}>{text}</Text>;
    }

    // Build regex pattern matching all in-text citations in this article
    const citationMap = new Map<string, ArticleReference>();
    const patterns: string[] = [];

    article.references.forEach((ref) => {
      if (ref.apaInTextCitation) {
        citationMap.set(ref.apaInTextCitation, ref);
        const escaped = ref.apaInTextCitation.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        patterns.push(escaped);
      }
    });

    if (patterns.length === 0) {
      return <Text style={[styles.paragraphText, { color: isDark ? '#D1D5DB' : '#334155' }]}>{text}</Text>;
    }

    const regex = new RegExp(`(${patterns.join('|')})`, 'g');
    const parts = text.split(regex);

    return (
      <Text style={[styles.paragraphText, { color: isDark ? '#D1D5DB' : '#334155' }]}>
        {parts.map((part, index) => {
          const matchedRef = citationMap.get(part);
          if (matchedRef) {
            return (
              <Text
                key={index}
                style={[styles.inlineCitationLink, { color: isDark ? '#34D399' : colors.accentBlue }]}
                onPress={() => handleOpenReferenceInApp(matchedRef)}
              >
                {part}
              </Text>
            );
          }
          return <Text key={index} style={{ color: isDark ? '#D1D5DB' : '#334155' }}>{part}</Text>;
        })}
      </Text>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header (Matching Screenshot 2) */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity
          onPress={onBack ? onBack : () => router.back()}
          style={styles.headerIconButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Research Article</Text>

        <View style={styles.headerActions}>
          {isAuthor && (
            <TouchableOpacity
              onPress={() => setIsEditModalOpen(true)}
              style={[styles.headerEditBtn, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' }]}
              activeOpacity={0.8}
            >
              <Edit3 size={13} color={isDark ? '#34D399' : '#1B4D3E'} />
              <Text style={[styles.headerEditBtnText, { color: isDark ? '#34D399' : '#1B4D3E' }]}>Edit</Text>
            </TouchableOpacity>
          )}

          {post.paper?.openAccessUrl && (
            <TouchableOpacity
              onPress={() => router.push(`/paper/${post.paper?.id || post.paper?.doi}`)}
              style={styles.headerIconButton}
            >
              <FileText size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={handleShare} style={styles.headerIconButton}>
            <Share2 size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Reader View Mode Switcher (Matching Screenshot 2) */}
      {(Boolean(post.paper?.openAccessUrl) || Boolean(article.references?.find((r) => r.openAccessPdfUrl))) && (
        <View style={[styles.tabSwitcher, { backgroundColor: colors.backgroundSecondary }]}>
          <TouchableOpacity
            style={[styles.tabButton, viewMode === 'article' && [styles.tabButtonActive, { backgroundColor: isDark ? '#1F2636' : '#0F172A' }]]}
            onPress={() => setViewMode('article')}
          >
            <BookOpen
              size={15}
              color={viewMode === 'article' ? (isDark ? '#34D399' : colors.white) : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.tabButtonText,
                { color: colors.textSecondary },
                viewMode === 'article' && [styles.tabButtonTextActive, { color: isDark ? '#34D399' : '#FFFFFF' }],
              ]}
            >
              Article View
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, viewMode === 'pdf' && [styles.tabButtonActive, { backgroundColor: isDark ? '#1F2636' : '#0F172A' }]]}
            onPress={() => {
              const primaryPdfRef = post.paper?.openAccessUrl
                ? { paperId: post.paper.id, doi: post.paper.doi, title: post.paper.title, openAccessPdfUrl: post.paper.openAccessUrl }
                : article.references?.find((r) => r.openAccessPdfUrl);
              if (primaryPdfRef) {
                handleOpenReferenceInApp(primaryPdfRef as any, true);
              }
            }}
          >
            <FileText
              size={15}
              color={viewMode === 'pdf' ? (isDark ? '#34D399' : colors.white) : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.tabButtonText,
                { color: colors.textSecondary },
                viewMode === 'pdf' && [styles.tabButtonTextActive, { color: isDark ? '#34D399' : '#FFFFFF' }],
              ]}
            >
              Original PDF
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Research Article Document */}
      <ScrollView
        style={[styles.scrollContainer, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Article Headline (Matching Screenshot 2) */}
        <Text style={[styles.articleTitle, { color: colors.textPrimary }]}>{article.title}</Text>

        {/* Authors Byline */}
        <Text style={[styles.authorsByline, { color: colors.textSecondary }]}>
          By {article.authors.join(', ')}
        </Text>

        {/* DOI / Publication Metadata */}
        <View style={styles.metaRow}>
          {article.doi ? (
            <Text style={[styles.doiText, { color: colors.textMuted }]}>DOI: {article.doi}</Text>
          ) : (
            <Text style={[styles.doiText, { color: colors.textMuted }]}>BooffIn Academic Preprint</Text>
          )}
          {article.readingTimeMinutes && (
            <Text style={[styles.readingTimeText, { color: colors.textMuted }]}>
              • {article.readingTimeMinutes} min read
            </Text>
          )}
        </View>

        {/* Abstract & Key Findings Box (Matching Screenshot 2) */}
        {article.abstract ? (
          <View style={[styles.abstractCard, { backgroundColor: isDark ? '#161B26' : '#F8FAFC', borderLeftColor: isDark ? '#10B981' : '#0F172A' }]}>
            <View style={styles.abstractHeaderRow}>
              <View style={[styles.abstractBullet, { backgroundColor: isDark ? '#10B981' : '#0F172A' }]} />
              <Text style={[styles.abstractLabel, { color: isDark ? '#34D399' : '#0F172A' }]}>ABSTRACT & KEY FINDINGS</Text>
            </View>
            <Text style={[styles.abstractBodyText, { color: isDark ? '#E5E7EB' : '#1E293B' }]}>{article.abstract}</Text>
          </View>
        ) : null}

        {/* Flexible Domain Sections */}
        {article.sections &&
          article.sections.map((section) => (
            <View key={section.id} style={styles.sectionBlock}>
              {section.heading ? (
                <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>{section.heading}</Text>
              ) : null}

              {/* Section Paragraph Text with Clickable Citations */}
              {renderRichTextWithCitations(section.content)}

              {/* Inline Figures & Captions */}
              {section.images && section.images.length > 0 && (
                <View style={styles.figuresContainer}>
                  {section.images.map((img) => (
                    <View key={img.id} style={[styles.figureCard, { backgroundColor: isDark ? '#161B26' : '#F8FAFC', borderColor: colors.borderLight }]}>
                      <Image
                        source={{ uri: img.uri }}
                        style={styles.figureImage}
                        contentFit="contain"
                      />
                      {img.caption ? (
                        <View style={[styles.captionContainer, { backgroundColor: colors.cardBackground, borderTopColor: colors.borderLight }]}>
                          <Text style={[styles.captionText, { color: colors.textSecondary }]}>
                            {img.figureNumber ? (
                              <Text style={[styles.figureNumberBold, { color: colors.textPrimary }]}>
                                Figure {img.figureNumber}:{' '}
                              </Text>
                            ) : null}
                            {img.caption}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}

        {/* References Section (Auto-generated in APA Style) */}
        {article.references && article.references.length > 0 && (
          <View style={[styles.referencesCard, { borderTopColor: colors.borderLight }]}>
            <View style={styles.referencesHeaderRow}>
              <Text style={[styles.referencesTitle, { color: colors.textPrimary }]}>References</Text>
              <Text style={styles.referencesSubtitle}>APA 7th Edition</Text>
            </View>

            {article.references.map((ref, idx) => (
              <TouchableOpacity
                key={ref.id}
                style={[styles.referenceItem, { borderBottomColor: colors.borderLight }]}
                onPress={() => handleOpenReferenceInApp(ref, true)}
                activeOpacity={0.7}
              >
                <View style={[styles.referenceIndexCircle, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.referenceIndexText, { color: colors.textSecondary }]}>{idx + 1}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.referenceCitationText, { color: colors.textPrimary }]}>
                    {ref.apaFullCitation}
                  </Text>
                  <View style={styles.openPdfHintRow}>
                    <ExternalLink size={12} color={colors.accentBlue} />
                    <Text style={styles.openPdfHintText}>
                      Open paper in BooffIn PDF reader
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Article Interaction Dock */}
        <View
          style={[
            styles.interactionDock,
            {
              backgroundColor: isDark ? '#161B26' : colors.backgroundSecondary,
              borderColor: colors.borderLight,
            },
          ]}
        >
          {onLikePost ? (
            <LikeButton
              isLiked={Boolean(post.isLiked)}
              likesCount={post.likesCount || 0}
              onPress={onLikePost}
              size={20}
              style={styles.dockItem}
            />
          ) : null}

          <View style={styles.dockItem}>
            <DiscussionIcon size={19} color={colors.textSecondary} />
            <Text style={[styles.dockText, { color: colors.textSecondary }]}>
              {totalDiscussionCount ?? (comments?.length || 0)} Discussions
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleShare}
            style={styles.dockItem}
            activeOpacity={0.7}
          >
            <Share2 size={19} color={colors.textSecondary} />
            <Text style={[styles.dockText, { color: colors.textSecondary }]}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* ==================================================================== */}
        {/* DISCUSSION & PEER REVIEW SECTION                                     */}
        {/* ==================================================================== */}
        <View style={styles.discussionSectionContainer}>
          <View style={[styles.discussionSectionDivider, { backgroundColor: colors.borderLight }]} />

          {/* Section Header */}
          <View style={styles.discussionHeader}>
            <View style={styles.discussionHeaderMainRow}>
              <View style={styles.discussionTitleCol}>
                <View style={styles.discussionTitleRow}>
                  <DiscussionIcon size={20} color={colors.textPrimary} />
                  <Text style={[styles.discussionTitleText, { color: colors.textPrimary }]}>Discussion & Peer Review</Text>
                  <View style={[styles.discussionCountBadge, { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight }]}>
                    <Text style={[styles.discussionCountBadgeText, { color: colors.textSecondary }]}>
                      {totalDiscussionCount ?? (comments?.length || 0)}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.discussionSubtitleText, { color: colors.textSecondary }]}>
                  Constructive scientific inquiry, questions & methodology review
                </Text>
              </View>

              {/* Impact Button (Author Only) */}
              {isAuthor && (
                <TouchableOpacity
                  style={styles.impactButton}
                  onPress={() => {
                    try {
                      Haptics.selectionAsync();
                    } catch {}
                    setIsImpactModalOpen(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Activity size={14} color="#FFFFFF" />
                  <Text style={styles.impactButtonText}>Impact</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Discussion Composer Card */}
          {currentUser && onSubmitDiscussion && (
            <View style={styles.composerWrapper}>
              <DiscussionComposer
                currentUser={currentUser}
                onSubmit={onSubmitDiscussion}
                isSubmitting={isSubmittingComment}
              />
            </View>
          )}

          {/* Discussion List */}
          <View style={styles.discussionsList}>
            {comments && comments.length > 0 ? (
              comments.map((c) => (
                <CommentCard
                  key={c.id}
                  comment={c}
                  onAddReply={onAddReply || (async () => {})}
                  onLike={(cId) => onLikeComment?.(cId)}
                  onLikeReply={(_, replyId) => onLikeReply?.(_, replyId)}
                  onDelete={onDeleteComment || (() => {})}
                  currentUserId={currentUser?.id || ''}
                  currentUser={currentUser || undefined}
                />
              ))
            ) : (
              <View style={styles.emptyWrap}>
                <EmptyState
                  icon="Discussion"
                  title="No discussions yet"
                  description="Be the first to ask a question or share insights on this article."
                />
              </View>
            )}
          </View>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Full-Screen Article Composer Modal for Editing */}
      {isEditModalOpen && (
        <Modal
          visible={isEditModalOpen}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setIsEditModalOpen(false)}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'left', 'right']}>
            <ArticleComposer
              currentUser={currentUser || post.author}
              initialData={post.article}
              isEditing={true}
              submitButtonTitle="Save Changes"
              isPublishing={isSavingArticle}
              onExit={() => setIsEditModalOpen(false)}
              onPublish={async (updatedArticleData) => {
                setIsSavingArticle(true);
                try {
                  const success = await updatePost(
                    post.id,
                    updatedArticleData.abstract || updatedArticleData.title,
                    post.topics,
                    updatedArticleData
                  );
                  if (success) {
                    try {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    } catch {}
                    const updatedPost: Post = {
                      ...post,
                      content: updatedArticleData.abstract || updatedArticleData.title,
                      article: updatedArticleData,
                    };
                    onPostUpdated?.(updatedPost);
                    setIsEditModalOpen(false);
                  } else {
                    Alert.alert('Error', 'Failed to update research article. Please try again.');
                  }
                } catch (err: any) {
                  Alert.alert('Error', err?.message || 'Failed to save changes.');
                } finally {
                  setIsSavingArticle(false);
                }
              }}
            />
          </SafeAreaView>
        </Modal>
      )}

      {/* Post Impact Modal (Author Only) */}
      {isAuthor && (
        <PostImpactModal
          visible={isImpactModalOpen}
          postId={post.id}
          onClose={() => setIsImpactModalOpen(false)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  fallbackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: spacing.xl,
  },
  fallbackText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  headerIconButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h3,
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    padding: 4,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: radii.md,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: radii.sm,
  },
  tabButtonActive: {
    backgroundColor: '#0F172A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    ...typography.captionBold,
    fontSize: 12,
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  articleTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 34,
    marginBottom: spacing.sm + 2,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  authorsByline: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 4,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  doiText: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  readingTimeText: {
    fontSize: 12,
    color: '#94A3B8',
    marginLeft: 4,
  },
  abstractCard: {
    backgroundColor: '#F8FAFC',
    borderLeftWidth: 3,
    borderLeftColor: '#0F172A',
    borderRadius: radii.md,
    padding: spacing.md + 2,
    marginBottom: spacing.xl,
  },
  abstractHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs + 2,
  },
  abstractBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0F172A',
  },
  abstractLabel: {
    ...typography.captionBold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: '#0F172A',
  },
  abstractBodyText: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 24,
    color: '#1E293B',
  },
  sectionBlock: {
    marginBottom: spacing.xl,
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 26,
    marginBottom: spacing.sm,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  paragraphText: {
    fontSize: 16,
    lineHeight: 27,
    color: '#334155',
  },
  inlineCitationLink: {
    color: colors.accentBlue,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  figuresContainer: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  figureCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  figureImage: {
    width: '100%',
    height: 240,
    backgroundColor: '#F1F5F9',
  },
  captionContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  captionText: {
    ...typography.captionMedium,
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  figureNumberBold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  referencesCard: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  referencesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  referencesTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  referencesSubtitle: {
    ...typography.captionBold,
    fontSize: 11,
    color: colors.accentBlue,
  },
  referenceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  referenceIndexCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  referenceIndexText: {
    ...typography.captionBold,
    fontSize: 11,
    color: '#64748B',
  },
  referenceCitationText: {
    ...typography.captionMedium,
    fontSize: 13,
    lineHeight: 20,
    color: '#1E293B',
  },
  openPdfHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  openPdfHintText: {
    ...typography.captionBold,
    fontSize: 11,
    color: colors.accentBlue,
  },
  headerEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginRight: 2,
  },
  headerEditBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1B4D3E',
  },
  interactionDock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
  },
  dockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  dockText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  discussionSectionContainer: {
    marginTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  discussionSectionDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginBottom: spacing.lg,
  },
  discussionHeader: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  discussionHeaderMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  discussionTitleCol: {
    flex: 1,
  },
  discussionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginBottom: 4,
  },
  discussionTitleText: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  discussionCountBadge: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  discussionCountBadgeText: {
    ...typography.micro,
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 11,
  },
  discussionSubtitleText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 13,
  },
  impactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#064E3B',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: radii.full,
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  impactButtonText: {
    ...typography.captionBold,
    fontSize: 12.5,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterPillsWrapper: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  composerWrapper: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  discussionsList: {
    marginTop: spacing.xs,
  },
  emptyWrap: {
    paddingVertical: spacing.xl,
  },
});
