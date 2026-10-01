import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Image } from 'expo-image';
import {
  X,
  Plus,
  Link2,
  List,
  Quote,
  Undo2,
  Keyboard as KeyboardIcon,
  Trash2,
  FileText,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  MoreHorizontal,
  ChevronDown,
  Sparkles,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { colors, radii, spacing, typography } from '../../theme';
import { ArticleData, ArticleReference, ArticleSection, ArticleImage } from '../../types/post';
import { UserProfile } from '../../types/user';
import { AddReferenceModal } from './AddReferenceModal';
import { pickPostImages, capturePostImage, uploadPostImage } from '../../api/storageService';

const ARTICLE_DRAFT_KEY = 'booffin_article_draft_v1';

export interface ArticleComposerProps {
  currentUser: UserProfile;
  initialData?: Partial<ArticleData>;
  onExit: () => void;
  onPublish: (article: ArticleData) => void;
  isPublishing?: boolean;
  submitButtonTitle?: string;
  isEditing?: boolean;
}

export const ArticleComposer: React.FC<ArticleComposerProps> = ({
  currentUser,
  initialData,
  onExit,
  onPublish,
  isPublishing = false,
  submitButtonTitle,
  isEditing = false,
}) => {
  // Document Structure State
  const [title, setTitle] = useState(initialData?.title || '');
  const [subheading, setSubheading] = useState(initialData?.subheading || '');
  const [authors, setAuthors] = useState<string[]>(
    initialData?.authors || [currentUser.fullName || currentUser.handle]
  );
  const [abstract, setAbstract] = useState(initialData?.abstract || '');

  // Flexible domain sections (each domain has different structure after abstract)
  const [sections, setSections] = useState<ArticleSection[]>(
    initialData?.sections && initialData.sections.length > 0
      ? initialData.sections
      : [
          {
            id: 'sec_1',
            heading: '',
            content: '',
            images: [],
          },
        ]
  );

  // Referenced papers compiled in APA format
  const [references, setReferences] = useState<ArticleReference[]>(
    initialData?.references || []
  );

  // Active focus tracking for insertion (which section body has cursor)
  const [activeSectionId, setActiveSectionId] = useState<string>('sec_1');
  const [referenceModalVisible, setReferenceModalVisible] = useState(false);
  const [addBlockMenuVisible, setAddBlockMenuVisible] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'Synchronised' | 'Saving...'>('Synchronised');

  // History stack for simple Undo feature
  const historyRef = useRef<Array<{ title: string; abstract: string; sections: ArticleSection[] }>>([]);

  // Auto-save draft effect (only when creating new article, not when editing an existing published post)
  useEffect(() => {
    if (isEditing) return;
    const timer = setTimeout(async () => {
      try {
        setAutoSaveStatus('Saving...');
        const draftPayload: ArticleData = {
          title,
          subheading,
          authors,
          abstract,
          sections,
          references,
          isDraft: true,
        };
        await SecureStore.setItemAsync(ARTICLE_DRAFT_KEY, JSON.stringify(draftPayload));
        setAutoSaveStatus('Synchronised');
      } catch {
        setAutoSaveStatus('Synchronised');
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [title, subheading, authors, abstract, sections, references, isEditing]);

  // Load existing draft if present and no initial data was passed
  useEffect(() => {
    async function loadSavedDraft() {
      if (isEditing || initialData?.title) return;
      try {
        const saved = await SecureStore.getItemAsync(ARTICLE_DRAFT_KEY);
        if (saved) {
          const parsed: ArticleData = JSON.parse(saved);
          if (parsed.title || parsed.abstract || (parsed.sections && parsed.sections[0]?.content)) {
            setTitle(parsed.title || '');
            setSubheading(parsed.subheading || '');
            setAuthors(parsed.authors || [currentUser.fullName || currentUser.handle]);
            setAbstract(parsed.abstract || '');
            if (parsed.sections && parsed.sections.length > 0) {
              setSections(parsed.sections);
            }
            if (parsed.references) {
              setReferences(parsed.references);
            }
          }
        }
      } catch {}
    }
    loadSavedDraft();
  }, [currentUser, initialData]);

  const saveToHistory = () => {
    historyRef.current.push({
      title,
      abstract,
      sections: JSON.parse(JSON.stringify(sections)),
    });
    if (historyRef.current.length > 20) {
      historyRef.current.shift();
    }
  };

  const handleUndo = () => {
    if (historyRef.current.length === 0) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const previous = historyRef.current.pop();
    if (previous) {
      setTitle(previous.title);
      setAbstract(previous.abstract);
      setSections(previous.sections);
    }
  };

  // Section Management
  const handleAddSection = (presetHeading = '') => {
    saveToHistory();
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const newId = `sec_${Date.now()}`;
    setSections((prev) => [
      ...prev,
      {
        id: newId,
        heading: presetHeading,
        content: '',
        images: [],
      },
    ]);
    setActiveSectionId(newId);
    setAddBlockMenuVisible(false);
  };

  const handleRemoveSection = (sectionId: string) => {
    if (sections.length <= 1) {
      Alert.alert('Notice', 'An article must have at least one body section.');
      return;
    }
    saveToHistory();
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
  };

  const handleUpdateSectionHeading = (sectionId: string, text: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, heading: text } : s))
    );
  };

  const handleUpdateSectionContent = (sectionId: string, text: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, content: text } : s))
    );
  };

  // Inline Image Picker & Uploader
  const handlePickInlineImage = async (useCamera = false) => {
    setAddBlockMenuVisible(false);
    try {
      let asset: any = null;
      if (useCamera) {
        const capture = await capturePostImage();
        if (capture.cancelled || !capture.asset) return;
        asset = capture.asset;
      } else {
        const pick = await pickPostImages(1);
        if (pick.cancelled || !pick.assets || pick.assets.length === 0) return;
        asset = pick.assets[0];
      }

      setIsUploadingImage(true);
      const res = await uploadPostImage(currentUser.id, asset);
      if (res.success && res.url) {
        saveToHistory();
        const totalExistingFigures = sections.reduce(
          (acc, s) => acc + (s.images?.length || 0),
          0
        );
        const newImage: ArticleImage = {
          id: `img_${Date.now()}`,
          uri: res.url,
          caption: '',
          figureNumber: totalExistingFigures + 1,
        };

        // Attach to the active section
        setSections((prev) =>
          prev.map((s) =>
            s.id === activeSectionId
              ? { ...s, images: [...(s.images || []), newImage] }
              : s
          )
        );
      } else {
        Alert.alert('Upload Failed', res.error || 'Could not upload figure image.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to attach image.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleUpdateImageCaption = (sectionId: string, imageId: string, caption: string) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          images: (s.images || []).map((img) =>
            img.id === imageId ? { ...img, caption } : img
          ),
        };
      })
    );
  };

  const handleRemoveImage = (sectionId: string, imageId: string) => {
    saveToHistory();
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          images: (s.images || []).filter((img) => img.id !== imageId),
        };
      })
    );
  };

  // Reference insertion (APA format)
  const handleInsertReference = (reference: ArticleReference) => {
    saveToHistory();
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    // Add to references list if not already there
    setReferences((prev) => {
      const exists = prev.some(
        (r) =>
          (r.doi && r.doi === reference.doi) ||
          r.title.toLowerCase() === reference.title.toLowerCase()
      );
      if (exists) return prev;
      return [...prev, reference];
    });

    // Insert in-text citation into the active section body
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== activeSectionId) return s;
        const spacingBefore = s.content.endsWith(' ') || s.content.length === 0 ? '' : ' ';
        return {
          ...s,
          content: `${s.content}${spacingBefore}${reference.apaInTextCitation} `,
        };
      })
    );
  };

  const handleRemoveReference = (refId: string) => {
    saveToHistory();
    setReferences((prev) => prev.filter((r) => r.id !== refId));
  };

  // Toolbar Formatting Helpers
  const handleInsertBulletList = () => {
    saveToHistory();
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== activeSectionId) return s;
        const prefix = s.content.endsWith('\n') || s.content.length === 0 ? '' : '\n';
        return {
          ...s,
          content: `${s.content}${prefix}• `,
        };
      })
    );
  };

  const handleInsertQuote = () => {
    saveToHistory();
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== activeSectionId) return s;
        const prefix = s.content.endsWith('\n') || s.content.length === 0 ? '' : '\n';
        return {
          ...s,
          content: `${s.content}${prefix}> "`,
        };
      })
    );
  };

  // Validation & Publish
  const handlePublishPress = () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for your research article.');
      return;
    }

    if (!abstract.trim()) {
      Alert.alert(
        'Missing Abstract',
        'Academic articles require an abstract to summarize your core findings.'
      );
      return;
    }

    const hasBodyContent = sections.some((s) => s.content.trim().length > 0);
    if (!hasBodyContent) {
      Alert.alert(
        'Incomplete Article',
        'Please write at least one section of findings or analysis.'
      );
      return;
    }

    // Estimate reading time (roughly 200 words per minute)
    const allWords = `${title} ${abstract} ${sections.map((s) => s.content).join(' ')}`
      .trim()
      .split(/\s+/).length;
    const readingTime = Math.max(1, Math.ceil(allWords / 200));

    const finalArticle: ArticleData = {
      title: title.trim(),
      subheading: subheading.trim() || undefined,
      authors: authors.filter(Boolean),
      abstract: abstract.trim(),
      sections: sections.filter((s) => s.heading.trim() || s.content.trim() || (s.images && s.images.length > 0)),
      references,
      readingTimeMinutes: readingTime,
      isDraft: false,
    };

    onPublish(finalArticle);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* Top App Header (Matching Screenshot 1) */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          onPress={onExit}
          style={styles.headerIconButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Sync Status Badge */}
        <View style={styles.syncBadge}>
          <View style={styles.syncDot} />
          <Text style={styles.syncText}>{autoSaveStatus}</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.moreIconButton}
            onPress={() => {
              Alert.alert('Article Actions', 'Options for this research paper draft:', [
                {
                  text: 'Clear All',
                  style: 'destructive',
                  onPress: () => {
                    Alert.alert('Clear Article?', 'This will erase all content.', [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Clear',
                        style: 'destructive',
                        onPress: () => {
                          setTitle('');
                          setSubheading('');
                          setAbstract('');
                          setSections([{ id: 'sec_1', heading: '', content: '', images: [] }]);
                          setReferences([]);
                        },
                      },
                    ]);
                  },
                },
                { text: 'Cancel', style: 'cancel' },
              ]);
            }}
          >
            <MoreHorizontal size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.draftsButton}
            onPress={async () => {
              Alert.alert('Auto-Save Active', 'Your draft is continuously saved locally.');
            }}
          >
            <Text style={styles.draftsButtonText}>Drafts</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.publishButton, (!title.trim() || isPublishing) && styles.publishButtonDisabled]}
            onPress={handlePublishPress}
            disabled={!title.trim() || isPublishing}
          >
            {isPublishing ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.publishButtonText}>
                {submitButtonTitle || (isEditing ? 'Save Changes' : 'Publish')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Long-Form Article Canvas */}
      <ScrollView
        style={styles.scrollCanvas}
        contentContainerStyle={styles.canvasContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Article Title Input */}
        <TextInput
          style={styles.titleInput}
          placeholder="Title"
          placeholderTextColor="#A0AEC0"
          value={title}
          onChangeText={(t) => {
            saveToHistory();
            setTitle(t);
          }}
          multiline
          scrollEnabled={false}
        />

        {/* Subheading / Authors Line */}
        <TextInput
          style={styles.subheadingInput}
          placeholder="Add a subheading or co-authors..."
          placeholderTextColor="#CBD5E0"
          value={subheading}
          onChangeText={(t) => {
            saveToHistory();
            setSubheading(t);
          }}
          multiline
          scrollEnabled={false}
        />

        <View style={styles.authorBadgeRow}>
          <Text style={styles.authorByline}>
            By {authors.join(', ')}
          </Text>
        </View>

        {/* Abstract & Key Findings Card (Matching Screenshot 2) */}
        <View style={styles.abstractCard}>
          <View style={styles.abstractHeaderRow}>
            <View style={styles.abstractBullet} />
            <Text style={styles.abstractLabel}>ABSTRACT & KEY FINDINGS</Text>
          </View>
          <TextInput
            style={styles.abstractInput}
            placeholder="Write a comprehensive abstract summarizing your research rationale, methodology, primary results, and scientific contribution..."
            placeholderTextColor="#94A3B8"
            multiline
            value={abstract}
            onChangeText={(t) => {
              saveToHistory();
              setAbstract(t);
            }}
            scrollEnabled={false}
          />
        </View>

        {/* Dynamic Body Sections */}
        {sections.map((section, sIdx) => {
          const isCurrentActive = activeSectionId === section.id;
          return (
            <View key={section.id} style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <TextInput
                  style={styles.sectionHeadingInput}
                  placeholder={sIdx === 0 ? 'Section Heading (e.g. Introduction)' : 'Section Heading (e.g. Methodology, Results, Analysis)'}
                  placeholderTextColor="#A0AEC0"
                  value={section.heading}
                  onChangeText={(text) => handleUpdateSectionHeading(section.id, text)}
                  onFocus={() => setActiveSectionId(section.id)}
                />
                {sections.length > 1 && (
                  <TouchableOpacity
                    onPress={() => handleRemoveSection(section.id)}
                    style={styles.removeSectionBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Trash2 size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Section Paragraph Text */}
              <TextInput
                style={[styles.sectionBodyInput, isCurrentActive && styles.sectionBodyInputActive]}
                placeholder="Begin composing section findings, citations, or theoretical discussion..."
                placeholderTextColor="#CBD5E1"
                multiline
                value={section.content}
                onChangeText={(text) => handleUpdateSectionContent(section.id, text)}
                onFocus={() => setActiveSectionId(section.id)}
                scrollEnabled={false}
              />

              {/* Inline Figures / Images */}
              {section.images && section.images.length > 0 && (
                <View style={styles.inlineImagesContainer}>
                  {section.images.map((img) => (
                    <View key={img.id} style={styles.figureCard}>
                      <Image source={{ uri: img.uri }} style={styles.figureImage} contentFit="contain" />
                      <View style={styles.captionRow}>
                        <TextInput
                          style={styles.captionInput}
                          placeholder={`Figure ${img.figureNumber || ''}: Add scientific figure caption...`}
                          placeholderTextColor={colors.textMuted}
                          value={img.caption}
                          onChangeText={(c) => handleUpdateImageCaption(section.id, img.id, c)}
                        />
                        <TouchableOpacity
                          onPress={() => handleRemoveImage(section.id, img.id)}
                          style={styles.removeFigureBtn}
                        >
                          <Trash2 size={15} color={colors.accentRed} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {/* References Section (Auto-generated in APA Style) */}
        {references.length > 0 && (
          <View style={styles.referencesCard}>
            <View style={styles.referencesHeaderRow}>
              <Text style={styles.referencesTitle}>References</Text>
              <Text style={styles.apaStyleBadge}>APA 7th Edition</Text>
            </View>

            {references.map((ref, idx) => (
              <View key={ref.id} style={styles.referenceItem}>
                <View style={styles.referenceNumberBadge}>
                  <Text style={styles.referenceNumberText}>{idx + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.referenceCitationText}>{ref.apaFullCitation}</Text>
                  <View style={styles.referenceMetaRow}>
                    <Text style={styles.inTextToken}>Cite: {ref.apaInTextCitation}</Text>
                    {ref.doi && <Text style={styles.referenceDoi}>DOI: {ref.doi}</Text>}
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveReference(ref.id)}
                  style={styles.removeRefBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Trash2 size={15} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Floating Exit Article Mode Pill (Matching Screenshot 1) */}
      <View style={styles.exitPillWrapper}>
        <TouchableOpacity style={styles.exitPill} onPress={onExit} activeOpacity={0.85}>
          <Undo2 size={14} color={colors.textPrimary} style={{ marginRight: 6 }} />
          <Text style={styles.exitPillText}>Exit article mode</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Academic Formatting Toolbar (Matching Screenshot 1) */}
      <View style={styles.bottomToolbar}>
        {/* + Insert Block Button */}
        <TouchableOpacity
          style={styles.toolButton}
          onPress={() => setAddBlockMenuVisible(!addBlockMenuVisible)}
        >
          <Plus size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* 🔗 Add Reference & Auto APA Generator */}
        <TouchableOpacity
          style={styles.toolButton}
          onPress={() => setReferenceModalVisible(true)}
        >
          <Link2 size={21} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* •≡ Bullet List */}
        <TouchableOpacity style={styles.toolButton} onPress={handleInsertBulletList}>
          <List size={21} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* ❝ Blockquote */}
        <TouchableOpacity style={styles.toolButton} onPress={handleInsertQuote}>
          <Quote size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* ↶ Undo */}
        <TouchableOpacity style={styles.toolButton} onPress={handleUndo}>
          <Undo2 size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Dismiss Keyboard */}
        <TouchableOpacity style={styles.toolButton} onPress={() => Keyboard.dismiss()}>
          <KeyboardIcon size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Insert Block Quick Menu */}
      {addBlockMenuVisible && (
        <View style={styles.blockMenuPopover}>
          <TouchableOpacity
            style={styles.blockMenuItem}
            onPress={() => handleAddSection('Methodology')}
          >
            <FileText size={16} color={colors.accentBlue} />
            <Text style={styles.blockMenuText}>Add Section Heading</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.blockMenuItem}
            onPress={() => handlePickInlineImage(false)}
            disabled={isUploadingImage}
          >
            <ImageIcon size={16} color={colors.accentGreen} />
            <Text style={styles.blockMenuText}>
              {isUploadingImage ? 'Uploading Figure...' : 'Insert Figure / Photo'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.blockMenuItem}
            onPress={() => handlePickInlineImage(true)}
            disabled={isUploadingImage}
          >
            <Camera size={16} color={colors.textPrimary} />
            <Text style={styles.blockMenuText}>Take Lab Camera Photo</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* APA Reference Insertion Modal */}
      <AddReferenceModal
        visible={referenceModalVisible}
        onClose={() => setReferenceModalVisible(false)}
        onInsertReference={handleInsertReference}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topHeader: {
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
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radii.full,
    gap: 6,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  syncText: {
    ...typography.captionMedium,
    fontSize: 12,
    color: '#475569',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  moreIconButton: {
    padding: 6,
  },
  draftsButton: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  draftsButtonText: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 12,
  },
  publishButton: {
    backgroundColor: colors.black,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  publishButtonDisabled: {
    opacity: 0.35,
  },
  publishButtonText: {
    ...typography.captionBold,
    color: colors.white,
    fontSize: 12,
  },
  scrollCanvas: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  canvasContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  titleInput: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 40,
    marginBottom: spacing.md,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  subheadingInput: {
    fontSize: 17,
    fontWeight: '500',
    color: '#64748B',
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  authorBadgeRow: {
    marginBottom: spacing.xl,
  },
  authorByline: {
    ...typography.captionMedium,
    color: '#64748B',
    fontSize: 13,
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
  abstractInput: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 24,
    color: '#1E293B',
    fontStyle: 'italic',
  },
  sectionCard: {
    marginBottom: spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  sectionHeadingInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    paddingVertical: 4,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  removeSectionBtn: {
    padding: 6,
  },
  sectionBodyInput: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 26,
    color: '#334155',
    minHeight: 80,
    paddingVertical: spacing.xs,
  },
  sectionBodyInputActive: {
    borderLeftWidth: 1.5,
    borderLeftColor: '#93C5FD',
    paddingLeft: spacing.sm,
  },
  inlineImagesContainer: {
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
    height: 220,
    backgroundColor: '#F1F5F9',
  },
  captionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  captionInput: {
    flex: 1,
    ...typography.captionMedium,
    fontSize: 12,
    color: '#475569',
    fontStyle: 'italic',
  },
  removeFigureBtn: {
    padding: spacing.xs,
  },
  referencesCard: {
    marginTop: spacing.xxl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginBottom: spacing.xl,
  },
  referencesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  referencesTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  apaStyleBadge: {
    ...typography.captionBold,
    fontSize: 10,
    color: colors.accentBlue,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
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
  referenceNumberBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  referenceNumberText: {
    ...typography.captionBold,
    fontSize: 10,
    color: '#64748B',
  },
  referenceCitationText: {
    ...typography.captionMedium,
    fontSize: 13,
    lineHeight: 19,
    color: '#1E293B',
  },
  referenceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: 4,
  },
  inTextToken: {
    ...typography.captionBold,
    fontSize: 11,
    color: colors.accentBlue,
  },
  referenceDoi: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  removeRefBtn: {
    padding: 4,
  },
  exitPillWrapper: {
    position: 'absolute',
    bottom: 58,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  exitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radii.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  exitPillText: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 12,
  },
  bottomToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  toolButton: {
    padding: spacing.xs,
  },
  blockMenuPopover: {
    position: 'absolute',
    bottom: 60,
    left: spacing.lg,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radii.lg,
    padding: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 20,
    minWidth: 200,
  },
  blockMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
  },
  blockMenuText: {
    ...typography.label,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
