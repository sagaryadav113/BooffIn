import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Search, Link2, Check, AlertCircle, BookOpen, ExternalLink } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { resolvePaperWithDetails } from '../../api/paperResolver';
import { createArticleReferenceFromPaper } from '../../utils/apaFormatter';
import { ArticleReference } from '../../types/post';
import { Paper } from '../../types/paper';

interface AddReferenceModalProps {
  visible: boolean;
  onClose: () => void;
  onInsertReference: (reference: ArticleReference) => void;
}

export const AddReferenceModal: React.FC<AddReferenceModalProps> = ({
  visible,
  onClose,
  onInsertReference,
}) => {
  const [query, setQuery] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [resolvedPaper, setResolvedPaper] = useState<Paper | null>(null);
  const [previewReference, setPreviewReference] = useState<ArticleReference | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleResolve = async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      setError('Please enter a DOI, paper title, or publication URL.');
      return;
    }

    setIsResolving(true);
    setError(null);
    setResolvedPaper(null);
    setPreviewReference(null);

    try {
      const res = await resolvePaperWithDetails(trimmed);
      if (res.paper) {
        setResolvedPaper(res.paper);
        const ref = createArticleReferenceFromPaper(res.paper);
        setPreviewReference(ref);
      } else {
        setError(res.error || 'Could not locate academic paper. Please check the DOI or URL.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch paper details. Please try again.');
    } finally {
      setIsResolving(false);
    }
  };

  const handleConfirmInsert = () => {
    if (!previewReference) return;
    onInsertReference(previewReference);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setQuery('');
    setResolvedPaper(null);
    setPreviewReference(null);
    setError(null);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        handleReset();
        onClose();
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Link2 size={20} color={colors.accentBlue} />
            <Text style={styles.headerTitle}>Add Paper Reference</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              handleReset();
              onClose();
            }}
            style={styles.closeBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.instructions}>
            Enter any DOI, arXiv ID, or paper link (e.g.{' '}
            <Text style={styles.monoCode}>10.1016/j.isci.2019.100817</Text> or{' '}
            <Text style={styles.monoCode}>arxiv.org/abs/2103.00020</Text>). The app will automatically
            convert it to an APA citation and link it to the in-app PDF reader.
          </Text>

          {/* Search Input Box */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder="Paste DOI, PubMed link, or title..."
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={(t) => {
                setQuery(t);
                if (error) setError(null);
              }}
              onSubmitEditing={handleResolve}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            <TouchableOpacity
              style={[styles.resolveBtn, (!query.trim() || isResolving) && styles.resolveBtnDisabled]}
              onPress={handleResolve}
              disabled={!query.trim() || isResolving}
            >
              {isResolving ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Search size={18} color={colors.white} />
              )}
            </TouchableOpacity>
          </View>

          {/* Error Message */}
          {error && (
            <View style={styles.errorBox}>
              <AlertCircle size={16} color={colors.accentRed} style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Resolved Paper Preview & APA Format */}
          {previewReference && (
            <View style={styles.previewContainer}>
              <View style={styles.previewHeaderRow}>
                <BookOpen size={16} color={colors.accentGreen} />
                <Text style={styles.previewHeading}>Resolved Paper Details</Text>
              </View>

              <Text style={styles.paperTitle}>{previewReference.title}</Text>
              <Text style={styles.paperAuthors}>
                By {previewReference.authors.join(', ')}
              </Text>
              {previewReference.journal && (
                <Text style={styles.paperJournal}>
                  Published in: {previewReference.journal}{' '}
                  {previewReference.publicationYear ? `(${previewReference.publicationYear})` : ''}
                </Text>
              )}

              {/* In-text Citation Preview */}
              <View style={styles.citationCard}>
                <Text style={styles.citationCardLabel}>IN-TEXT APA CITATION</Text>
                <View style={styles.citationBadge}>
                  <Text style={styles.citationBadgeText}>
                    {previewReference.apaInTextCitation}
                  </Text>
                </View>
                <Text style={styles.citationCardHint}>
                  This citation will be inserted at your current cursor position.
                </Text>
              </View>

              {/* Full Bibliography Citation Preview */}
              <View style={styles.citationCard}>
                <Text style={styles.citationCardLabel}>FULL APA BIBLIOGRAPHY ENTRY</Text>
                <Text style={styles.fullCitationText}>
                  {previewReference.apaFullCitation}
                </Text>
                <Text style={styles.citationCardHint}>
                  Automatically appended to the References section at the end of the article.
                </Text>
              </View>

              {/* Insert Action Button */}
              <TouchableOpacity
                style={styles.insertBtn}
                onPress={handleConfirmInsert}
                activeOpacity={0.85}
              >
                <Check size={18} color={colors.white} style={{ marginRight: 6 }} />
                <Text style={styles.insertBtnText}>
                  Insert APA Citation ({previewReference.apaInTextCitation})
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.white,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  headerTitle: {
    ...typography.h3,
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  instructions: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  monoCode: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: colors.accentBlue,
    fontSize: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  textInput: {
    flex: 1,
    height: 46,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    ...typography.body,
    fontSize: 14,
    color: colors.textPrimary,
  },
  resolveBtn: {
    width: 46,
    height: 46,
    borderRadius: radii.md,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resolveBtnDisabled: {
    opacity: 0.4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.captionMedium,
    color: colors.accentRed,
    flex: 1,
  },
  previewContainer: {
    marginTop: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  previewHeading: {
    ...typography.captionBold,
    color: colors.accentGreen,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  paperTitle: {
    ...typography.h3,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: 4,
  },
  paperAuthors: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  paperJournal: {
    ...typography.captionMedium,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  citationCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  citationCardLabel: {
    ...typography.captionBold,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
  },
  citationBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentBlue,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginBottom: 4,
  },
  citationBadgeText: {
    ...typography.captionBold,
    color: colors.white,
    fontSize: 12,
  },
  fullCitationText: {
    ...typography.captionMedium,
    color: colors.textPrimary,
    lineHeight: 20,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  citationCardHint: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  insertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.black,
    height: 48,
    borderRadius: radii.md,
    marginTop: spacing.xs,
  },
  insertBtnText: {
    ...typography.labelBold,
    color: colors.white,
    fontWeight: '700',
  },
});
