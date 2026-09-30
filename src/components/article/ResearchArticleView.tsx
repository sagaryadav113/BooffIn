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
} from 'react-native';
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
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';
import { Post, ArticleData, ArticleReference } from '../../types/post';
import { Paper } from '../../types/paper';

interface ResearchArticleViewProps {
  post: Post;
  onBack?: () => void;
}

export const ResearchArticleView: React.FC<ResearchArticleViewProps> = ({
  post,
  onBack,
}) => {
  const article: ArticleData | undefined = post.article;
  const [viewMode, setViewMode] = useState<'article' | 'pdf'>('article');

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
        message: `${article.title}\n\nBy ${article.authors.join(', ')}\n\nRead on BooffIn: https://booffin.app/post/${post.id}`,
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
      return <Text style={styles.paragraphText}>{text}</Text>;
    }

    const regex = new RegExp(`(${patterns.join('|')})`, 'g');
    const parts = text.split(regex);

    return (
      <Text style={styles.paragraphText}>
        {parts.map((part, index) => {
          const matchedRef = citationMap.get(part);
          if (matchedRef) {
            return (
              <Text
                key={index}
                style={styles.inlineCitationLink}
                onPress={() => handleOpenReferenceInApp(matchedRef)}
              >
                {part}
              </Text>
            );
          }
          return <Text key={index}>{part}</Text>;
        })}
      </Text>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header (Matching Screenshot 2) */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack ? onBack : () => router.back()}
          style={styles.headerIconButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Research Article</Text>

        <View style={styles.headerActions}>
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
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabButton, viewMode === 'article' && styles.tabButtonActive]}
            onPress={() => setViewMode('article')}
          >
            <BookOpen
              size={15}
              color={viewMode === 'article' ? colors.white : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.tabButtonText,
                viewMode === 'article' && styles.tabButtonTextActive,
              ]}
            >
              Article View
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, viewMode === 'pdf' && styles.tabButtonActive]}
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
              color={viewMode === 'pdf' ? colors.white : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.tabButtonText,
                viewMode === 'pdf' && styles.tabButtonTextActive,
              ]}
            >
              Original PDF
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Research Article Document */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Article Headline (Matching Screenshot 2) */}
        <Text style={styles.articleTitle}>{article.title}</Text>

        {/* Authors Byline */}
        <Text style={styles.authorsByline}>
          By {article.authors.join(', ')}
        </Text>

        {/* DOI / Publication Metadata */}
        <View style={styles.metaRow}>
          {article.doi ? (
            <Text style={styles.doiText}>DOI: {article.doi}</Text>
          ) : (
            <Text style={styles.doiText}>BooffIn Academic Preprint</Text>
          )}
          {article.readingTimeMinutes && (
            <Text style={styles.readingTimeText}>
              • {article.readingTimeMinutes} min read
            </Text>
          )}
        </View>

        {/* Abstract & Key Findings Box (Matching Screenshot 2) */}
        {article.abstract ? (
          <View style={styles.abstractCard}>
            <View style={styles.abstractHeaderRow}>
              <View style={styles.abstractBullet} />
              <Text style={styles.abstractLabel}>ABSTRACT & KEY FINDINGS</Text>
            </View>
            <Text style={styles.abstractBodyText}>{article.abstract}</Text>
          </View>
        ) : null}

        {/* Flexible Domain Sections */}
        {article.sections &&
          article.sections.map((section) => (
            <View key={section.id} style={styles.sectionBlock}>
              {section.heading ? (
                <Text style={styles.sectionHeading}>{section.heading}</Text>
              ) : null}

              {/* Section Paragraph Text with Clickable Citations */}
              {renderRichTextWithCitations(section.content)}

              {/* Inline Figures & Captions */}
              {section.images && section.images.length > 0 && (
                <View style={styles.figuresContainer}>
                  {section.images.map((img) => (
                    <View key={img.id} style={styles.figureCard}>
                      <Image
                        source={{ uri: img.uri }}
                        style={styles.figureImage}
                        contentFit="contain"
                      />
                      {img.caption ? (
                        <View style={styles.captionContainer}>
                          <Text style={styles.captionText}>
                            {img.figureNumber ? (
                              <Text style={styles.figureNumberBold}>
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
          <View style={styles.referencesCard}>
            <View style={styles.referencesHeaderRow}>
              <Text style={styles.referencesTitle}>References</Text>
              <Text style={styles.referencesSubtitle}>APA 7th Edition</Text>
            </View>

            {article.references.map((ref, idx) => (
              <TouchableOpacity
                key={ref.id}
                style={styles.referenceItem}
                onPress={() => handleOpenReferenceInApp(ref, true)}
                activeOpacity={0.7}
              >
                <View style={styles.referenceIndexCircle}>
                  <Text style={styles.referenceIndexText}>{idx + 1}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.referenceCitationText}>
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

        <View style={{ height: 60 }} />
      </ScrollView>
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
});
