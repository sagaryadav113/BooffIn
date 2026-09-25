import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  X,
  FileText,
  Image as ImageIcon,
  BarChart2,
  Tag,
  Globe,
  Users,
  Plus,
  Trash2,
  Check,
} from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { Avatar } from '../../components/core/Avatar';
import { Button } from '../../components/core/Button';
import { PaperCard } from '../../components/cards/PaperCard';
import { PaperLookupModal } from '../../components/modals/PaperLookupModal';
import { useAuthStore } from '../../store/useAuthStore';
import { usePostStore } from '../../store/usePostStore';
import { Paper, PostType, Poll } from '../../types';

const POPULAR_TOPICS = [
  'Neuroscience',
  'AI & Bio',
  'Genetics',
  'Cancer',
  'Immunology',
  'Bioinformatics',
  'Physics',
  'Quantum Computing',
  'Chemistry',
  'Biophysics',
  'Materials Science',
  'Ecology',
];

export default function CreatePostScreen() {
  const user = useAuthStore((s) => s.user);
  const createPost = usePostStore((s) => s.createPost);

  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<PostType>('discussion');
  const [attachedPaper, setAttachedPaper] = useState<Paper | null>(null);
  const [paperModalVisible, setPaperModalVisible] = useState(false);

  // Attached Images
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');

  // Attached Poll
  const [attachedPoll, setAttachedPoll] = useState<Poll | null>(null);
  const [pollModalVisible, setPollModalVisible] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  // Selected Topics
  const [selectedTopics, setSelectedTopics] = useState<string[]>(['Neuroscience']);
  const [topicModalVisible, setTopicModalVisible] = useState(false);
  const [customTopicInput, setCustomTopicInput] = useState('');

  const [visibility, setVisibility] = useState<'public' | 'followers'>('public');
  const [isPublishing, setIsPublishing] = useState(false);

  const handleAddImage = () => {
    const trimmed = imageUrlInput.trim();
    if (trimmed) {
      setAttachedImages([...attachedImages, trimmed]);
      setImageUrlInput('');
      setImageModalVisible(false);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setAttachedImages(attachedImages.filter((_, idx) => idx !== indexToRemove));
  };

  const handleAddPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const handlePollOptionChange = (text: string, index: number) => {
    const updated = [...pollOptions];
    updated[index] = text;
    setPollOptions(updated);
  };

  const handleRemovePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, idx) => idx !== index));
    }
  };

  const handleSavePoll = () => {
    const validOptions = pollOptions.filter((o) => o.trim().length > 0);
    if (!pollQuestion.trim() || validOptions.length < 2) return;

    setAttachedPoll({
      question: pollQuestion.trim(),
      options: validOptions.map((text, idx) => ({
        id: `opt_${idx + 1}`,
        text: text.trim(),
        votesCount: 0,
      })),
      totalVotes: 0,
    });
    setPollModalVisible(false);
  };

  const handleToggleTopic = (topic: string) => {
    if (selectedTopics.includes(topic)) {
      if (selectedTopics.length > 1) {
        setSelectedTopics(selectedTopics.filter((t) => t !== topic));
      }
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

  const handleAddCustomTopic = () => {
    const trimmed = customTopicInput.trim().replace(/^#/, '');
    if (trimmed && !selectedTopics.includes(trimmed)) {
      setSelectedTopics([...selectedTopics, trimmed]);
      setCustomTopicInput('');
    }
  };

  const handlePublish = async () => {
    const hasContent = content.trim().length > 0;
    const hasAttachments = attachedPaper || attachedImages.length > 0 || attachedPoll;

    if ((!hasContent && !hasAttachments) || isPublishing) return;

    setIsPublishing(true);
    try {
      await createPost(
        {
          content: content.trim(),
          postType: attachedPaper ? 'research_share' : postType,
          paper: attachedPaper || undefined,
          images: attachedImages.length > 0 ? attachedImages : undefined,
          poll: attachedPoll || undefined,
          topics: selectedTopics,
          visibility,
        },
        user.id
      );

      setContent('');
      setAttachedPaper(null);
      setAttachedImages([]);
      setAttachedPoll(null);
      router.replace('/(tabs)');
    } catch (err) {
      console.error('[CreatePost] Error publishing post:', err);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCancel = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const canPost = (content.trim().length > 0 || attachedPaper || attachedImages.length > 0 || attachedPoll) && !isPublishing;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
            <X size={22} color={colors.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Create Post</Text>

          <Button
            title={isPublishing ? 'Posting...' : 'Post'}
            variant="primary"
            size="sm"
            onPress={handlePublish}
            disabled={!canPost}
            style={styles.postButton}
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Post Type Selector Pills */}
          <View style={styles.postTypeRow}>
            {(['discussion', 'question', 'insight'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setPostType(type)}
                style={[
                  styles.postTypePill,
                  postType === type && styles.postTypePillActive,
                ]}
              >
                <Text
                  style={[
                    styles.postTypePillText,
                    postType === type && styles.postTypePillTextActive,
                  ]}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* User Info & Text Input */}
          <View style={styles.inputContainer}>
            <Avatar
              uri={user.avatarUrl}
              name={user.fullName}
              size={40}
              verified={user.orcidVerified}
              style={styles.avatar}
            />

            <TextInput
              style={styles.textInput}
              placeholder="What research are you thinking about, critiquing, or sharing?"
              placeholderTextColor={colors.textMuted}
              multiline
              autoFocus
              value={content}
              onChangeText={setContent}
            />
          </View>

          {/* Attached Images Preview Grid */}
          {attachedImages.length > 0 && (
            <View style={styles.imagesGrid}>
              {attachedImages.map((url, idx) => (
                <View key={idx} style={styles.imagePreviewWrapper}>
                  <Image
                    source={{ uri: url }}
                    style={styles.imagePreview}
                    contentFit="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeMediaBtn}
                    onPress={() => handleRemoveImage(idx)}
                  >
                    <X size={14} color={colors.white} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Attached Poll Preview */}
          {attachedPoll && (
            <View style={styles.pollPreviewCard}>
              <View style={styles.pollPreviewHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <BarChart2 size={16} color={colors.textPrimary} />
                  <Text style={styles.pollPreviewTitle}>Poll Attachment</Text>
                </View>
                <TouchableOpacity onPress={() => setAttachedPoll(null)}>
                  <X size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.pollPreviewQuestion}>{attachedPoll.question}</Text>

              {attachedPoll.options.map((opt) => (
                <View key={opt.id} style={styles.pollPreviewOption}>
                  <Text style={styles.pollPreviewOptionText}>{opt.text}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Tagged Topics Chips */}
          <View style={styles.topicTagsWrap}>
            {selectedTopics.map((topic) => (
              <View key={topic} style={styles.topicTagChip}>
                <Text style={styles.topicTagChipText}>#{topic}</Text>
                {selectedTopics.length > 1 && (
                  <TouchableOpacity
                    onPress={() => handleToggleTopic(topic)}
                    style={{ marginLeft: 4 }}
                  >
                    <X size={12} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          {/* Attached Paper Preview Card */}
          {attachedPaper && (
            <View style={styles.paperWrapper}>
              <PaperCard
                paper={attachedPaper}
                onRemove={() => setAttachedPaper(null)}
              />
            </View>
          )}
        </ScrollView>

        {/* Action Toolbar */}
        <View style={styles.bottomToolbar}>
          {/* Media & Research Actions */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              onPress={() => setPaperModalVisible(true)}
              style={styles.toolbarAction}
            >
              <FileText size={18} color={attachedPaper ? colors.accentLink : colors.textPrimary} />
              <Text
                style={[
                  styles.toolbarActionText,
                  attachedPaper && { color: colors.accentLink, fontWeight: '700' },
                ]}
              >
                {attachedPaper ? 'Paper added' : 'Add paper'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setImageModalVisible(true)}
              style={styles.toolbarAction}
            >
              <ImageIcon
                size={18}
                color={attachedImages.length > 0 ? colors.accentLink : colors.textPrimary}
              />
              <Text
                style={[
                  styles.toolbarActionText,
                  attachedImages.length > 0 && { color: colors.accentLink, fontWeight: '700' },
                ]}
              >
                {attachedImages.length > 0 ? `Image (${attachedImages.length})` : 'Image'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (attachedPoll) {
                  setPollQuestion(attachedPoll.question);
                  setPollOptions(attachedPoll.options.map((o) => o.text));
                }
                setPollModalVisible(true);
              }}
              style={styles.toolbarAction}
            >
              <BarChart2
                size={18}
                color={attachedPoll ? colors.accentLink : colors.textPrimary}
              />
              <Text
                style={[
                  styles.toolbarActionText,
                  attachedPoll && { color: colors.accentLink, fontWeight: '700' },
                ]}
              >
                {attachedPoll ? 'Poll added' : 'Poll'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setTopicModalVisible(true)}
              style={styles.toolbarAction}
            >
              <Tag size={18} color={colors.textPrimary} />
              <Text style={styles.toolbarActionText}>Tag topics</Text>
            </TouchableOpacity>
          </View>

          {/* Visibility Selector */}
          <View style={styles.visibilityRow}>
            <TouchableOpacity
              onPress={() => setVisibility(visibility === 'public' ? 'followers' : 'public')}
              style={styles.visibilitySelector}
            >
              {visibility === 'public' ? (
                <Globe size={14} color={colors.textSecondary} />
              ) : (
                <Users size={14} color={colors.textSecondary} />
              )}
              <Text style={styles.visibilityText}>
                {visibility === 'public' ? 'Anyone can view' : 'Followers only'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Paper Lookup Modal */}
        <PaperLookupModal
          visible={paperModalVisible}
          onClose={() => setPaperModalVisible(false)}
          onSelectPaper={(paper) => setAttachedPaper(paper)}
        />

        {/* Image Attachment Modal */}
        <Modal
          visible={imageModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setImageModalVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setImageModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalCard}>
                  <Text style={styles.modalTitle}>Attach Figure / Image</Text>
                  <Text style={styles.modalSubtitle}>
                    Enter a direct URL for your scientific diagram, chart, or microscope figure.
                  </Text>

                  <TextInput
                    style={styles.modalInput}
                    placeholder="https://example.com/figure.png"
                    placeholderTextColor={colors.textMuted}
                    value={imageUrlInput}
                    onChangeText={setImageUrlInput}
                    autoCapitalize="none"
                    autoFocus
                  />

                  <View style={styles.modalBtnRow}>
                    <Button
                      title="Cancel"
                      variant="secondary"
                      size="sm"
                      onPress={() => setImageModalVisible(false)}
                      style={{ flex: 1, marginRight: spacing.sm }}
                    />
                    <Button
                      title="Attach Image"
                      variant="primary"
                      size="sm"
                      onPress={handleAddImage}
                      disabled={!imageUrlInput.trim()}
                      style={{ flex: 1.5 }}
                    />
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Poll Creator Modal */}
        <Modal
          visible={pollModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setPollModalVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setPollModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalCard}>
                  <Text style={styles.modalTitle}>Create Research Poll</Text>
                  <Text style={styles.modalSubtitle}>
                    Poll peers on methodologies, hypotheses, or scientific opinions.
                  </Text>

                  <TextInput
                    style={styles.modalInput}
                    placeholder="Ask a question..."
                    placeholderTextColor={colors.textMuted}
                    value={pollQuestion}
                    onChangeText={setPollQuestion}
                  />

                  <View style={{ gap: 8, marginVertical: spacing.xs }}>
                    {pollOptions.map((opt, idx) => (
                      <View key={idx} style={styles.pollOptionInputRow}>
                        <TextInput
                          style={[styles.modalInput, { flex: 1, marginBottom: 0 }]}
                          placeholder={`Option ${idx + 1}`}
                          placeholderTextColor={colors.textMuted}
                          value={opt}
                          onChangeText={(val) => handlePollOptionChange(val, idx)}
                        />
                        {pollOptions.length > 2 && (
                          <TouchableOpacity
                            onPress={() => handleRemovePollOption(idx)}
                            style={{ padding: spacing.xs }}
                          >
                            <Trash2 size={16} color={colors.textMuted} />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>

                  {pollOptions.length < 4 && (
                    <TouchableOpacity
                      onPress={handleAddPollOption}
                      style={styles.addOptionBtn}
                    >
                      <Plus size={14} color={colors.textPrimary} />
                      <Text style={styles.addOptionBtnText}>Add Option</Text>
                    </TouchableOpacity>
                  )}

                  <View style={[styles.modalBtnRow, { marginTop: spacing.md }]}>
                    <Button
                      title="Cancel"
                      variant="secondary"
                      size="sm"
                      onPress={() => setPollModalVisible(false)}
                      style={{ flex: 1, marginRight: spacing.sm }}
                    />
                    <Button
                      title="Save Poll"
                      variant="primary"
                      size="sm"
                      onPress={handleSavePoll}
                      disabled={!pollQuestion.trim() || pollOptions.filter((o) => o.trim()).length < 2}
                      style={{ flex: 1.5 }}
                    />
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Tag Topics Modal */}
        <Modal
          visible={topicModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setTopicModalVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setTopicModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalCard}>
                  <Text style={styles.modalTitle}>Tag Research Topics</Text>
                  <Text style={styles.modalSubtitle}>
                    Select disciplines to ensure your post reaches relevant researchers.
                  </Text>

                  {/* Custom topic input */}
                  <View style={styles.customTopicRow}>
                    <TextInput
                      style={[styles.modalInput, { flex: 1, marginBottom: 0 }]}
                      placeholder="Add custom topic (e.g. Epigenetics)"
                      placeholderTextColor={colors.textMuted}
                      value={customTopicInput}
                      onChangeText={setCustomTopicInput}
                      onSubmitEditing={handleAddCustomTopic}
                    />
                    <TouchableOpacity
                      onPress={handleAddCustomTopic}
                      style={styles.addCustomTopicBtn}
                    >
                      <Plus size={16} color={colors.white} />
                    </TouchableOpacity>
                  </View>

                  {/* Popular topics grid */}
                  <View style={styles.topicSelectionWrap}>
                    {POPULAR_TOPICS.map((topic) => {
                      const isSelected = selectedTopics.includes(topic);
                      return (
                        <TouchableOpacity
                          key={topic}
                          onPress={() => handleToggleTopic(topic)}
                          style={[
                            styles.topicSelectPill,
                            isSelected && styles.topicSelectPillActive,
                          ]}
                        >
                          {isSelected && <Check size={12} color={colors.white} style={{ marginRight: 4 }} />}
                          <Text
                            style={[
                              styles.topicSelectPillText,
                              isSelected && styles.topicSelectPillTextActive,
                            ]}
                          >
                            {topic}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Button
                    title="Done"
                    variant="primary"
                    size="sm"
                    onPress={() => setTopicModalVisible(false)}
                    style={{ marginTop: spacing.md }}
                  />
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
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
  closeButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.captionBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  postButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + 3,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  postTypeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  postTypePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: radii.full,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  postTypePillActive: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  postTypePillText: {
    ...typography.micro,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  postTypePillTextActive: {
    color: colors.white,
  },
  topicTagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  topicTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundTertiary,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xxs + 2,
    borderRadius: radii.sm,
  },
  topicTagChipText: {
    ...typography.micro,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    marginRight: spacing.md,
    marginTop: 2,
  },
  textInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 22,
    minHeight: 120,
    textAlignVertical: 'top',
    paddingTop: 0,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  imagePreviewWrapper: {
    position: 'relative',
    width: 110,
    height: 110,
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeMediaBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: radii.full,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pollPreviewCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  pollPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  pollPreviewTitle: {
    ...typography.microBold,
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pollPreviewQuestion: {
    ...typography.captionBold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    fontSize: 14,
  },
  pollPreviewOption: {
    backgroundColor: colors.cardBackground,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  pollPreviewOptionText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  paperWrapper: {
    marginTop: spacing.md,
  },
  bottomToolbar: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  toolbarAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  toolbarActionText: {
    ...typography.micro,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  visibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  visibilitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    backgroundColor: colors.backgroundSecondary,
    alignSelf: 'flex-start',
  },
  visibilityText: {
    ...typography.micro,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  modalSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  modalInput: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundSecondary,
    marginBottom: spacing.sm,
  },
  modalBtnRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  pollOptionInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  addOptionBtnText: {
    ...typography.captionBold,
    color: colors.textPrimary,
  },
  customTopicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  addCustomTopicBtn: {
    width: 44,
    height: 44,
    backgroundColor: colors.black,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicSelectionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginVertical: spacing.xs,
  },
  topicSelectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  topicSelectPillActive: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  topicSelectPillText: {
    ...typography.micro,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  topicSelectPillTextActive: {
    color: colors.white,
  },
});
