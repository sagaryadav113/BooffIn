import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
} from 'react-native';
import {
  Search,
  X,
  Link2,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  Edit3,
  Layers,
  Sparkles,
  BookOpen,
} from 'lucide-react-native';
import { Paper } from '../../types';
import { colors, radii, spacing, typography } from '../../theme';
import { usePaperStore } from '../../store/usePaperStore';
import {
  resolvePaperWithDetails,
  createManualPaperReference,
  parseReferenceInput,
} from '../../api/paperResolver';
import { Badge } from '../core/Badge';
import { Button } from '../core/Button';

interface PaperLookupModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectPaper: (paper: Paper) => void;
}

export const PaperLookupModal: React.FC<PaperLookupModalProps> = ({
  visible,
  onClose,
  onSelectPaper,
}) => {
  const [query, setQuery] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState('');
  const [previewPaper, setPreviewPaper] = useState<Paper | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [resolvedProvider, setResolvedProvider] = useState<string>('');

  // Manual fallback state
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualAuthors, setManualAuthors] = useState('');
  const [manualJournal, setManualJournal] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [manualDoi, setManualDoi] = useState('');
  const [manualAbstract, setManualAbstract] = useState('');

  const searchPapers = usePaperStore((s) => s.searchPapers);
  const addPaper = usePaperStore((s) => s.addPaper);

  const localResults = searchPapers(query);
  const parsedInput = query.trim() ? parseReferenceInput(query) : null;

  const handleResolveExternal = async () => {
    if (!query.trim() || resolving) return;
    setResolving(true);
    setResolveError('');
    setPreviewPaper(null);
    setIsDuplicate(false);

    try {
      const res = await resolvePaperWithDetails(query.trim());
      if (res.paper) {
        setPreviewPaper(res.paper);
        setIsDuplicate(res.isDuplicate);
        setResolvedProvider(res.providerName || 'Academic Registry');
      } else {
        setResolveError(
          res.error ||
            'Could not retrieve bibliographic metadata for this DOI or link. You can enter details manually.'
        );
      }
    } catch {
      setResolveError('Network timeout while querying academic registries. Please verify connection.');
    } finally {
      setResolving(false);
    }
  };

  const handleConfirmAttach = () => {
    if (!previewPaper) return;
    addPaper(previewPaper);
    onSelectPaper(previewPaper);
    handleResetAndClose();
  };

  const handleSaveManualReference = () => {
    if (!manualTitle.trim() || !manualUrl.trim()) return;

    const paper = createManualPaperReference({
      title: manualTitle.trim(),
      authorsString: manualAuthors.trim() || 'Referenced Author',
      journal: manualJournal.trim() || 'Academic Reference',
      canonicalUrl: manualUrl.trim(),
      doi: manualDoi.trim() || undefined,
      abstract: manualAbstract.trim() || undefined,
    });

    addPaper(paper);
    onSelectPaper(paper);
    handleResetAndClose();
  };

  const handleResetAndClose = () => {
    setQuery('');
    setResolving(false);
    setResolveError('');
    setPreviewPaper(null);
    setIsDuplicate(false);
    setIsManualMode(false);
    setManualTitle('');
    setManualAuthors('');
    setManualJournal('');
    setManualUrl('');
    setManualDoi('');
    setManualAbstract('');
    onClose();
  };

  const isDoiOrUrl =
    query.includes('10.') ||
    query.includes('http://') ||
    query.includes('https://') ||
    query.includes('doi.org') ||
    query.includes('arxiv.org') ||
    query.includes('biorxiv.org') ||
    query.includes('pubmed') ||
    query.toLowerCase().startsWith('arxiv:');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleResetAndClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <BookOpen size={20} color={colors.textPrimary} />
            <Text style={styles.headerTitle}>Reference External Paper</Text>
          </View>
          <TouchableOpacity onPress={handleResetAndClose} style={styles.closeButton}>
            <X size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Notice: BoffIn is a social discussion platform, not a host */}
        <View style={styles.disclaimerBanner}>
          <Text style={styles.disclaimerText}>
            BoffIn references research published externally. No full-text files are uploaded or hosted.
          </Text>
        </View>

        {isManualMode ? (
          /* ================================================================ */
          /* MANUAL REFERENCE ENTRY FORM */
          /* ================================================================ */
          <ScrollView contentContainerStyle={styles.manualFormContent}>
            <View style={styles.manualFormHeader}>
              <Text style={styles.manualFormTitle}>Manual Reference Confirmation</Text>
              <Text style={styles.manualFormSubtitle}>
                Enter the permitted bibliographic details for the external publication.
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Paper Title <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Structural plasticity in adult cortex"
                placeholderTextColor={colors.textMuted}
                value={manualTitle}
                onChangeText={setManualTitle}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Canonical External URL <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.formInput}
                placeholder="https://doi.org/10.1038/... or publisher link"
                placeholderTextColor={colors.textMuted}
                value={manualUrl}
                onChangeText={setManualUrl}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Authors (comma-separated)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Dr. Aanya Rao, Elena Park"
                placeholderTextColor={colors.textMuted}
                value={manualAuthors}
                onChangeText={setManualAuthors}
              />
            </View>

            <View style={styles.rowTwoCols}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Journal / Venue</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Nature, arXiv"
                  placeholderTextColor={colors.textMuted}
                  value={manualJournal}
                  onChangeText={setManualJournal}
                />
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>DOI (Optional)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="10.1038/..."
                  placeholderTextColor={colors.textMuted}
                  value={manualDoi}
                  onChangeText={setManualDoi}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Bibliographic Abstract (Optional)</Text>
              <TextInput
                style={[styles.formInput, styles.formTextarea]}
                placeholder="Paste public bibliographic abstract or summary..."
                placeholderTextColor={colors.textMuted}
                value={manualAbstract}
                onChangeText={setManualAbstract}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.manualActionsRow}>
              <Button
                title="Back to Search"
                variant="outline"
                size="md"
                onPress={() => setIsManualMode(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Attach Reference"
                variant="primary"
                size="md"
                onPress={handleSaveManualReference}
                disabled={!manualTitle.trim() || !manualUrl.trim()}
                style={{ flex: 1 }}
              />
            </View>
          </ScrollView>
        ) : (
          /* ================================================================ */
          /* DOI / URL SEARCH & RESOLUTION FLOW */
          /* ================================================================ */
          <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            {/* Search / DOI Input Box */}
            <View style={styles.searchBox}>
              <Search size={18} color={colors.textSecondary} style={{ marginRight: spacing.sm }} />
              <TextInput
                style={styles.input}
                placeholder="Paste DOI (10.1038/...), journal link, or arXiv/PubMed URL..."
                placeholderTextColor={colors.textMuted}
                value={query}
                onChangeText={(text) => {
                  setQuery(text);
                  setResolveError('');
                  setPreviewPaper(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {query.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setQuery('');
                    setPreviewPaper(null);
                    setResolveError('');
                  }}
                >
                  <X size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Live Detected Source Badge */}
            {parsedInput && (parsedInput.doi || parsedInput.arxivId || parsedInput.pmid || parsedInput.detectedPublisher) && (
              <View style={styles.detectedSourceRow}>
                <Sparkles size={13} color={colors.accentBlue} />
                <Text style={styles.detectedSourceText}>
                  Recognized Source:{' '}
                  <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
                    {parsedInput.detectedJournal || parsedInput.detectedPublisher || parsedInput.type.toUpperCase()}
                  </Text>
                  {parsedInput.doi ? ` · DOI: ${parsedInput.doi}` : ''}
                </Text>
              </View>
            )}

            {/* Fetch Metadata Action Button */}
            {isDoiOrUrl && !previewPaper && (
              <TouchableOpacity
                onPress={handleResolveExternal}
                disabled={resolving}
                style={styles.resolveButton}
              >
                {resolving ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Link2 size={16} color={colors.white} />
                )}
                <Text style={styles.resolveButtonText}>
                  {resolving ? 'Querying Academic Registries...' : 'Fetch Bibliographic Metadata'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Error Message & Manual Fallback Option */}
            {resolveError ? (
              <View style={styles.errorBox}>
                <View style={styles.errorRow}>
                  <AlertCircle size={16} color={colors.accentRed} />
                  <Text style={styles.errorText}>{resolveError}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setManualUrl(query.startsWith('http') ? query : `https://doi.org/${query}`);
                    setManualDoi(query.includes('10.') ? query : '');
                    setIsManualMode(true);
                  }}
                  style={styles.manualFallbackBtn}
                >
                  <Edit3 size={14} color={colors.textPrimary} />
                  <Text style={styles.manualFallbackText}>Enter Reference Details Manually</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* ================================================================ */}
            {/* METADATA PREVIEW & CONFIRMATION CARD */}
            {/* ================================================================ */}
            {previewPaper && (
              <View style={styles.previewContainer}>
                <View style={styles.previewHeader}>
                  <View style={styles.previewBadgeRow}>
                    <Badge
                      label={previewPaper.journal}
                      variant={
                        previewPaper.journal.toLowerCase().includes('nature')
                          ? 'nature'
                          : previewPaper.journal.toLowerCase().includes('science')
                          ? 'science'
                          : previewPaper.journal.toLowerCase().includes('cell')
                          ? 'cell'
                          : 'generic'
                      }
                    />
                    {previewPaper.isOpenAccess && (
                      <Badge label="Open Access" variant="oa" />
                    )}
                    <Text style={styles.providerTag}>via {resolvedProvider}</Text>
                  </View>

                  {isDuplicate && (
                    <View style={styles.duplicateTag}>
                      <Layers size={13} color={colors.accentBlue} />
                      <Text style={styles.duplicateText}>Existing Reference in BoffIn</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.previewTitle}>{previewPaper.title}</Text>

                <Text style={styles.previewAuthors}>
                  {previewPaper.authors.map((a) => a.name).join(', ')}
                </Text>

                <Text style={styles.previewMeta}>
                  {previewPaper.publisher ? `${previewPaper.publisher} · ` : ''}
                  Published {previewPaper.publicationYear}
                  {previewPaper.doi ? ` · DOI: ${previewPaper.doi}` : ''}
                </Text>

                {previewPaper.abstract ? (
                  <Text numberOfLines={3} style={styles.previewAbstract}>
                    {previewPaper.abstract}
                  </Text>
                ) : null}

                <TouchableOpacity
                  onPress={() => Linking.openURL(previewPaper.canonicalUrl)}
                  style={styles.canonicalUrlRow}
                >
                  <Text numberOfLines={1} style={styles.canonicalUrlText}>
                    {previewPaper.canonicalUrl}
                  </Text>
                  <ExternalLink size={13} color={colors.accentLink} />
                </TouchableOpacity>

                {/* Confirmation Actions */}
                <View style={styles.confirmButtonsRow}>
                  <Button
                    title="Cancel"
                    variant="outline"
                    size="sm"
                    onPress={() => setPreviewPaper(null)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Confirm & Attach"
                    variant="primary"
                    size="sm"
                    onPress={handleConfirmAttach}
                    style={{ flex: 2 }}
                  />
                </View>
              </View>
            )}

            {/* ================================================================ */}
            {/* LOCAL / EXISTING PAPERS LIST */}
            {/* ================================================================ */}
            {!previewPaper && (
              <View style={styles.existingSection}>
                <View style={styles.existingSectionHeader}>
                  <Text style={styles.sectionHeading}>Previously Referenced Papers</Text>
                  <TouchableOpacity onPress={() => setIsManualMode(true)}>
                    <Text style={styles.manualLinkText}>+ Manual Entry</Text>
                  </TouchableOpacity>
                </View>

                {localResults.length > 0 ? (
                  localResults.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.8}
                      onPress={() => {
                        onSelectPaper(item);
                        handleResetAndClose();
                      }}
                      style={styles.paperItem}
                    >
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={2} style={styles.paperTitle}>
                          {item.title}
                        </Text>
                        <View style={styles.paperMetaRow}>
                          <Badge label={item.journal} />
                          <Text style={styles.paperYear}>({item.publicationYear})</Text>
                          <Text style={styles.paperAuthors} numberOfLines={1}>
                            · {item.authors.map((a) => a.name).join(', ')}
                          </Text>
                        </View>
                      </View>
                      <CheckCircle2 size={18} color={colors.textMuted} style={{ marginLeft: spacing.sm }} />
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>
                      {query ? 'No matching cached references found.' : 'Paste a DOI or URL to fetch new research.'}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        )}
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
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  headerTitle: {
    ...typography.captionBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  closeButton: {
    padding: spacing.xs,
  },
  disclaimerBanner: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  disclaimerText: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  scrollContainer: {
    padding: spacing.lg,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    ...typography.body,
    fontSize: 14,
    color: colors.textPrimary,
    padding: 0,
  },
  detectedSourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  detectedSourceText: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 12,
  },
  resolveButton: {
    backgroundColor: colors.black,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  resolveButtonText: {
    ...typography.captionBold,
    color: colors.white,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  errorText: {
    ...typography.caption,
    color: colors.accentRed,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  manualFallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(239, 68, 68, 0.15)',
  },
  manualFallbackText: {
    ...typography.microBold,
    color: colors.textPrimary,
    fontSize: 12,
  },
  previewContainer: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderDark,
    padding: spacing.lg,
    marginTop: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs + 2,
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  previewBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  providerTag: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 11,
  },
  duplicateTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  duplicateText: {
    ...typography.microBold,
    color: colors.accentBlue,
    fontSize: 11,
  },
  previewTitle: {
    ...typography.h3,
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 23,
    marginBottom: spacing.xs,
  },
  previewAuthors: {
    ...typography.captionMedium,
    color: colors.textPrimary,
    fontSize: 13,
    marginBottom: 2,
  },
  previewMeta: {
    ...typography.micro,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  previewAbstract: {
    ...typography.body,
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  canonicalUrlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    marginBottom: spacing.lg,
  },
  canonicalUrlText: {
    ...typography.micro,
    color: colors.accentLink,
    flex: 1,
    fontSize: 12,
  },
  confirmButtonsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  existingSection: {
    marginTop: spacing.xl,
  },
  existingSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionHeading: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  manualLinkText: {
    ...typography.microBold,
    color: colors.accentLink,
    fontSize: 12,
  },
  paperItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  paperTitle: {
    ...typography.captionBold,
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: 4,
  },
  paperMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  paperYear: {
    ...typography.micro,
    color: colors.textSecondary,
  },
  paperAuthors: {
    ...typography.micro,
    color: colors.textMuted,
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  manualFormContent: {
    padding: spacing.lg,
  },
  manualFormHeader: {
    marginBottom: spacing.lg,
  },
  manualFormTitle: {
    ...typography.h3,
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  manualFormSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 13,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.captionBold,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  required: {
    color: colors.accentRed,
  },
  formInput: {
    ...typography.body,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formTextarea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  manualActionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
});
