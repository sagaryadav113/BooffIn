import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Keyboard,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  HelpCircle,
  Lightbulb,
  FlaskConical,
  Send,
  AtSign,
  Sparkles,
} from 'lucide-react-native';
import { colors, radii, spacing, typography, layout } from '../../theme';
import { DiscussionType, UserProfile } from '../../types';
import { Avatar } from '../core/Avatar';
import { DiscussionIcon } from '../core/DiscussionIcon';

export interface DiscussionComposerProps {
  currentUser: UserProfile;
  onSubmit: (params: {
    type: DiscussionType;
    content: string;
    title?: string;
  }) => void;
  isSubmitting?: boolean;
  availableMentions?: UserProfile[];
}

export const DiscussionComposer: React.FC<DiscussionComposerProps> = ({
  currentUser,
  onSubmit,
  isSubmitting = false,
  availableMentions = [],
}) => {
  const [content, setContent] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMentionBar, setShowMentionBar] = useState(false);

  const handleMentionInsert = (handle: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setContent((prev) => `${prev.trimEnd()} @${handle} `);
  };

  const handleSubmit = () => {
    if (!content.trim()) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    onSubmit({
      type: 'discussion',
      content: content.trim(),
    });

    setContent('');
    setIsExpanded(false);
    setShowMentionBar(false);
    Keyboard.dismiss();
  };

  return (
    <View style={styles.container}>
      {/* Header with user avatar and name */}
      <View style={styles.headerRow}>
        <Avatar
          url={currentUser.avatarUrl}
          name={currentUser.fullName}
          size={36}
          verified={currentUser.orcidVerified}
        />
        <View style={styles.headerMeta}>
          <Text style={styles.authorName}>{currentUser.fullName}</Text>
          <Text style={styles.authorTitle}>
            {currentUser.academicTitle || 'Researcher'}
          </Text>
        </View>
      </View>

      {/* Main Content Input */}
      <TextInput
        placeholder="Start a constructive scientific discussion on this paper reference..."
        placeholderTextColor={colors.textMuted}
        value={content}
        onChangeText={(text) => {
          setContent(text);
          if (text.endsWith('@')) {
            setShowMentionBar(true);
          }
        }}
        onFocus={() => setIsExpanded(true)}
        multiline
        style={[styles.contentInput, isExpanded && styles.contentInputExpanded]}
      />

      {/* Quick Mention Toolbar */}
      {showMentionBar && (
        <View style={styles.mentionBar}>
          <View style={styles.mentionBarHeader}>
            <AtSign size={12} color={colors.accentBlue} />
            <Text style={styles.mentionBarTitle}>Mention a participating researcher:</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.mentionScroll}
          >
            {availableMentions.map((user) => (
              <TouchableOpacity
                key={user.id}
                onPress={() => handleMentionInsert(user.handle)}
                style={styles.mentionChip}
                activeOpacity={0.7}
              >
                <Avatar url={user.avatarUrl} name={user.fullName} size={18} />
                <Text style={styles.mentionChipText}>@{user.handle}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Footer / Action Bar */}
      <View style={styles.footerRow}>
        <View style={styles.footerLeft}>
          <TouchableOpacity
            onPress={() => setShowMentionBar(!showMentionBar)}
            style={[styles.iconButton, showMentionBar && styles.iconButtonActive]}
            activeOpacity={0.7}
          >
            <AtSign
              size={16}
              color={showMentionBar ? colors.accentBlue : colors.textSecondary}
            />
            <Text
              style={[
                styles.iconButtonText,
                showMentionBar && { color: colors.accentBlue },
              ]}
            >
              Mention
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!content.trim() || isSubmitting}
          style={[
            styles.submitButton,
            (!content.trim() || isSubmitting) && styles.submitButtonDisabled,
          ]}
          activeOpacity={0.85}
        >
          <Send size={14} color={colors.white} />
          <Text style={styles.submitButtonText}>Post</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm + 2,
    gap: spacing.sm,
  },
  headerMeta: {
    flex: 1,
  },
  authorName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 15,
  },
  authorTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12.5,
    marginTop: 1,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    marginBottom: spacing.sm + 2,
    flexWrap: 'wrap',
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.md,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 6,
    minHeight: layout.touchTargetMin - 10,
  },
  typeButtonText: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  typeButtonTextSelected: {
    color: colors.white,
    fontWeight: '700',
  },
  titleInput: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm + 2,
    marginBottom: spacing.xs + 2,
    fontSize: 14.5,
  },
  contentInput: {
    ...typography.body,
    color: colors.textPrimary,
    minHeight: 64,
    maxHeight: 200,
    lineHeight: 22,
    fontSize: 15,
    textAlignVertical: 'top',
    paddingVertical: spacing.xs + 2,
  },
  contentInputExpanded: {
    minHeight: 96,
  },
  mentionBar: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.sm,
    padding: spacing.xs + 2,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  mentionBarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  mentionBarTitle: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  mentionScroll: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    paddingVertical: 2,
  },
  mentionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    backgroundColor: colors.backgroundCard,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 6,
  },
  mentionChipText: {
    ...typography.captionMedium,
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm + 2,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: spacing.xs,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.sm,
    minHeight: layout.touchTargetMin - 8,
  },
  iconButtonActive: {
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
  },
  iconButtonText: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 12.5,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.black,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    gap: 6,
    minHeight: layout.touchTargetMin - 4,
  },
  submitButtonDisabled: {
    backgroundColor: colors.textMuted,
    opacity: 0.6,
  },
  submitButtonText: {
    ...typography.labelBold,
    color: colors.white,
    fontSize: 14,
  },
});
