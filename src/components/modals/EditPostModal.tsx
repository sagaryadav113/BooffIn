import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { X, Lock, Plus, Tag, AlertCircle, FileText, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Post } from '../../types';
import { colors, radii, spacing, fontSizes, typography, shadows } from '../../theme';
import { usePostStore } from '../../store/usePostStore';

export interface EditPostModalProps {
  visible: boolean;
  onClose: () => void;
  post: Post;
  onSaveSuccess?: () => void;
}

const POPULAR_TOPICS = [
  'Neuroscience',
  'Machine Learning',
  'Genomics',
  'Biophysics',
  'Immunology',
  'Computer Science',
  'Physics',
  'Biomedicine',
];

export const EditPostModal: React.FC<EditPostModalProps> = ({
  visible,
  onClose,
  post,
  onSaveSuccess,
}) => {
  const updatePost = usePostStore((s) => s.updatePost);

  const [content, setContent] = useState(post.content || '');
  const [topics, setTopics] = useState<string[]>(post.topics || []);
  const [newTopicInput, setNewTopicInput] = useState('');
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync state if post changes
  React.useEffect(() => {
    if (visible) {
      setContent(post.content || '');
      setTopics(post.topics || []);
      setNewTopicInput('');
      setShowAddTopic(false);
      setErrorMsg(null);
      setIsSaving(false);
    }
  }, [visible, post]);

  const handleAddTopic = (topicName: string) => {
    const cleaned = topicName.trim().replace(/^#/, '');
    if (!cleaned) return;
    if (topics.some((t) => t.toLowerCase() === cleaned.toLowerCase())) {
      setNewTopicInput('');
      return;
    }
    if (topics.length >= 6) {
      Alert.alert('Topic Limit', 'You can associate up to 6 topics per post.');
      return;
    }
    setTopics([...topics, cleaned]);
    setNewTopicInput('');
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const handleRemoveTopic = (topicToRemove: string) => {
    setTopics(topics.filter((t) => t !== topicToRemove));
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const handleSave = async () => {
    if (!content.trim()) {
      setErrorMsg('Post text cannot be empty.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const success = await updatePost(post.id, content.trim(), topics);
      setIsSaving(false);

      if (success) {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        onSaveSuccess?.();
        onClose();
      } else {
        setErrorMsg('Failed to save changes. Please try again.');
      }
    } catch (err: any) {
      setIsSaving(false);
      setErrorMsg(err?.message || 'Failed to update post.');
    }
  };

  const hasImages = Boolean(post.images && post.images.length > 0);
  const hasPoll = Boolean(post.poll);
  const hasPaper = Boolean(post.paper);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          <View style={styles.modalCard}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={onClose}
                disabled={isSaving}
                style={styles.headerButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>

              <Text style={styles.headerTitle}>Edit Post</Text>

              <TouchableOpacity
                onPress={handleSave}
                disabled={isSaving || !content.trim()}
                style={[
                  styles.saveButton,
                  (!content.trim() || isSaving) && styles.saveButtonDisabled,
                ]}
                activeOpacity={0.8}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Error Message */}
            {errorMsg && (
              <View style={styles.errorBanner}>
                <AlertCircle size={15} color={colors.accentRed} />
                <Text style={styles.errorBannerText}>{errorMsg}</Text>
              </View>
            )}

            <ScrollView
              style={styles.scrollBody}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Text Content Editor */}
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionLabel}>Written Content</Text>
                  <Text style={styles.charCount}>{content.length} / 5000</Text>
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="Share your research hypothesis, critique, or update..."
                  placeholderTextColor={colors.textMuted}
                  value={content}
                  onChangeText={(text) => {
                    setContent(text);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  multiline
                  autoFocus
                  maxLength={5000}
                  editable={!isSaving}
                />
              </View>

              {/* Topic Tags Editor */}
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.labelWithIcon}>
                    <Tag size={15} color={colors.accentBlue} />
                    <Text style={[styles.sectionLabel, { marginLeft: 6 }]}>
                      Research Topics ({topics.length}/6)
                    </Text>
                  </View>
                  {!showAddTopic && topics.length < 6 && (
                    <TouchableOpacity
                      onPress={() => setShowAddTopic(true)}
                      style={styles.addTagToggle}
                    >
                      <Plus size={13} color={colors.accentBlue} />
                      <Text style={styles.addTagToggleText}>Add Topic</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Active Topics Chips */}
                <View style={styles.tagChipsContainer}>
                  {topics.map((t) => (
                    <View key={t} style={styles.topicChip}>
                      <Text style={styles.topicChipText}>#{t}</Text>
                      <TouchableOpacity
                        onPress={() => handleRemoveTopic(t)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        style={styles.removeTopicBtn}
                      >
                        <X size={12} color={colors.accentBlue} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {topics.length === 0 && (
                    <Text style={styles.emptyTopicsNotice}>
                      No research tags selected. Add relevant fields to help colleagues discover your post.
                    </Text>
                  )}
                </View>

                {/* Add Topic Input or Popular Topic Suggestions */}
                {showAddTopic && (
                  <View style={styles.addTopicBox}>
                    <View style={styles.topicInputRow}>
                      <TextInput
                        style={styles.topicInputField}
                        placeholder="e.g. Molecular Biology"
                        placeholderTextColor={colors.textMuted}
                        value={newTopicInput}
                        onChangeText={setNewTopicInput}
                        onSubmitEditing={() => handleAddTopic(newTopicInput)}
                        returnKeyType="done"
                        autoCapitalize="words"
                      />
                      <TouchableOpacity
                        onPress={() => handleAddTopic(newTopicInput)}
                        disabled={!newTopicInput.trim()}
                        style={[
                          styles.addTopicSubmitBtn,
                          !newTopicInput.trim() && { opacity: 0.5 },
                        ]}
                      >
                        <Check size={14} color={colors.white} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setShowAddTopic(false);
                          setNewTopicInput('');
                        }}
                        style={styles.cancelAddTopicBtn}
                      >
                        <X size={14} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>

                    {/* Quick Suggestions */}
                    <Text style={styles.suggestionsLabel}>Suggested Topics:</Text>
                    <View style={styles.suggestionsRow}>
                      {POPULAR_TOPICS.filter((pt) => !topics.includes(pt)).map((st) => (
                        <TouchableOpacity
                          key={st}
                          style={styles.suggestionChip}
                          onPress={() => handleAddTopic(st)}
                        >
                          <Plus size={11} color={colors.textSecondary} />
                          <Text style={styles.suggestionChipText}>{st}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* Locked Attachments Section */}
              {(hasImages || hasPoll || hasPaper) && (
                <View style={styles.lockedSection}>
                  <View style={styles.lockedHeaderBanner}>
                    <Lock size={14} color={colors.textSecondary} />
                    <Text style={styles.lockedHeaderTitle}>
                      Locked Attachments (Academic Provenance)
                    </Text>
                  </View>
                  <Text style={styles.lockedExplainer}>
                    To preserve scientific integrity and reviewer context, figures, polls, and paper citations cannot be altered or swapped after publication.
                  </Text>

                  {/* Locked Images Preview */}
                  {hasImages && (
                    <View style={styles.lockedItem}>
                      <Text style={styles.lockedItemLabel}>
                        Attached Figures ({post.images!.length})
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.lockedImagesScroll}
                      >
                        {post.images!.map((uri, idx) => (
                          <View key={idx} style={styles.lockedImageThumbWrapper}>
                            <Image
                              source={{ uri }}
                              style={styles.lockedImageThumb}
                              contentFit="cover"
                            />
                            <View style={styles.lockBadge}>
                              <Lock size={10} color={colors.white} />
                            </View>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {/* Locked Poll Preview */}
                  {hasPoll && (
                    <View style={styles.lockedItem}>
                      <Text style={styles.lockedItemLabel}>
                        Attached Poll: "{post.poll!.question}"
                      </Text>
                      <View style={styles.lockedPollOptions}>
                        {post.poll!.options.map((opt, idx) => (
                          <View key={idx} style={styles.lockedPollOptionRow}>
                            <Text style={styles.lockedPollOptionText}>
                              • {opt.text}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Locked Paper Preview */}
                  {hasPaper && (
                    <View style={styles.lockedItem}>
                      <Text style={styles.lockedItemLabel}>
                        Linked Paper Reference
                      </Text>
                      <View style={styles.lockedPaperCard}>
                        <FileText size={16} color={colors.accentBlue} />
                        <Text style={styles.lockedPaperTitle} numberOfLines={2}>
                          {post.paper!.title}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    height: '92%',
    display: 'flex',
    flexDirection: 'column',
    ...shadows.floating,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  headerButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: fontSizes.bodyLarge,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  saveButton: {
    backgroundColor: colors.accentBlue,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.md,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: fontSizes.body,
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentRed + '15',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  errorBannerText: {
    fontSize: fontSizes.micro,
    color: colors.accentRed,
    fontWeight: '600',
    flex: 1,
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  sectionLabel: {
    fontSize: fontSizes.bodySmall,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  charCount: {
    fontSize: fontSizes.micro,
    color: colors.textSecondary,
  },
  labelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    fontSize: fontSizes.body,
    color: colors.textPrimary,
    minHeight: 140,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  addTagToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.accentBlue + '10',
    borderRadius: radii.full,
    gap: 4,
  },
  addTagToggleText: {
    fontSize: fontSizes.micro,
    color: colors.accentBlue,
    fontWeight: '600',
  },
  tagChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentBlue + '12',
    borderWidth: 1,
    borderColor: colors.accentBlue + '30',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.full,
    gap: 6,
  },
  topicChipText: {
    fontSize: fontSizes.micro,
    fontWeight: '600',
    color: colors.accentBlue,
  },
  removeTopicBtn: {
    padding: 2,
  },
  emptyTopicsNotice: {
    fontSize: fontSizes.micro,
    color: colors.textSecondary,
    fontStyle: 'italic',
    paddingVertical: spacing.xs,
  },
  addTopicBox: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  topicInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  topicInputField: {
    flex: 1,
    backgroundColor: colors.surfaceHover,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    fontSize: fontSizes.micro,
    color: colors.textPrimary,
  },
  addTopicSubmitBtn: {
    backgroundColor: colors.accentBlue,
    borderRadius: radii.sm,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelAddTopicBtn: {
    padding: 6,
  },
  suggestionsLabel: {
    fontSize: fontSizes.micro,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceHover,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
    gap: 4,
  },
  suggestionChipText: {
    fontSize: fontSizes.micro,
    color: colors.textSecondary,
  },
  lockedSection: {
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  lockedHeaderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  lockedHeaderTitle: {
    fontSize: fontSizes.captionSmall,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  lockedExplainer: {
    fontSize: fontSizes.micro,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: spacing.md,
  },
  lockedItem: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  lockedItemLabel: {
    fontSize: fontSizes.captionSmall,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  lockedImagesScroll: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  lockedImageThumbWrapper: {
    position: 'relative',
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  lockedImageThumb: {
    width: 64,
    height: 64,
    borderRadius: radii.md,
  },
  lockBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: radii.full,
    padding: 3,
  },
  lockedPollOptions: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.sm,
    padding: spacing.sm,
    gap: 4,
  },
  lockedPollOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockedPollOptionText: {
    fontSize: fontSizes.micro,
    color: colors.textSecondary,
  },
  lockedPaperCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    padding: spacing.sm,
    borderRadius: radii.md,
    gap: spacing.sm,
  },
  lockedPaperTitle: {
    flex: 1,
    fontSize: fontSizes.micro,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
