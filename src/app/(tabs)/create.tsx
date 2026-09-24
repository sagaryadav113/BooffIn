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
} from 'react-native';
import { router } from 'expo-router';
import {
  X,
  FileText,
  Image as ImageIcon,
  BarChart2,
  Tag,
  Globe,
  Users,
} from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { Avatar } from '../../components/core/Avatar';
import { Button } from '../../components/core/Button';
import { PaperCard } from '../../components/cards/PaperCard';
import { PaperLookupModal } from '../../components/modals/PaperLookupModal';
import { useAuthStore } from '../../store/useAuthStore';
import { usePostStore } from '../../store/usePostStore';
import { Paper, PostType } from '../../types';

export default function CreatePostScreen() {
  const user = useAuthStore((s) => s.user);
  const createPost = usePostStore((s) => s.createPost);

  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<PostType>('discussion');
  const [attachedPaper, setAttachedPaper] = useState<Paper | null>(null);
  const [paperModalVisible, setPaperModalVisible] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(['Neuroscience']);
  const [visibility, setVisibility] = useState<'public' | 'followers'>('public');
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async () => {
    if ((!content.trim() && !attachedPaper) || isPublishing) return;

    setIsPublishing(true);
    try {
      await createPost(
        {
          content: content.trim(),
          postType: attachedPaper ? 'research_share' : postType,
          paper: attachedPaper || undefined,
          topics: selectedTopics,
          visibility,
        },
        user.id
      );

      setContent('');
      setAttachedPaper(null);
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
            disabled={isPublishing || (!content.trim() && !attachedPaper)}
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
              url={user.avatarUrl}
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

          {/* Tagged Topics Chips */}
          <View style={styles.topicTagsWrap}>
            {selectedTopics.map((topic) => (
              <View key={topic} style={styles.topicTagChip}>
                <Text style={styles.topicTagChipText}>#{topic}</Text>
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
                {attachedPaper ? 'Paper attached' : 'Add paper'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {}}
              style={styles.toolbarAction}
            >
              <ImageIcon size={18} color={colors.textPrimary} />
              <Text style={styles.toolbarActionText}>Image</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {}}
              style={styles.toolbarAction}
            >
              <BarChart2 size={18} color={colors.textPrimary} />
              <Text style={styles.toolbarActionText}>Poll</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                const nextTopics = ['Neuroscience', 'Genetics', 'AI in Science', 'Cancer', 'Bioinformatics'];
                const current = selectedTopics[0] || 'Neuroscience';
                const nextIdx = (nextTopics.indexOf(current) + 1) % nextTopics.length;
                setSelectedTopics([nextTopics[nextIdx]]);
              }}
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
    backgroundColor: colors.backgroundTertiary,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xxs + 1,
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
});
