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
  MessageSquare,
  HelpCircle,
  Lightbulb,
  FlaskConical,
  Send,
  AtSign,
  Sparkles,
} from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { DiscussionType, UserProfile } from '../../types';
import { Avatar } from '../core/Avatar';
import { mockUsers } from '../../data/mockData';

export interface DiscussionComposerProps {
  currentUser: UserProfile;
  onSubmit: (params: {
    type: DiscussionType;
    content: string;
    title?: string;
  }) => void;
  isSubmitting?: boolean;
}

export const DiscussionComposer: React.FC<DiscussionComposerProps> = ({
  currentUser,
  onSubmit,
  isSubmitting = false,
}) => {
  const [type, setType] = useState<DiscussionType>('discussion');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMentionBar, setShowMentionBar] = useState(false);

  const availableMentions = mockUsers.filter((u) => u.id !== currentUser.id && u.id !== 'usr_me');

  const getPlaceholder = (t: DiscussionType) => {
    switch (t) {
      case 'question':
        return 'Ask a constructive question about methodology, controls, or findings...';
      case 'insight':
        return 'Share a scientific insight, synthesis across literature, or future hypothesis...';
      case 'methodology':
        return 'Discuss experimental protocols, sample preparation, or replication details...';
      default:
        return 'Start a constructive scientific discussion on this paper reference...';
    }
  };

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
      type,
      title: title.trim() || undefined,
      content: content.trim(),
    });

    setTitle('');
    setContent('');
    setIsExpanded(false);
    setShowMentionBar(false);
    Keyboard.dismiss();
  };

  const types: Array<{
    value: DiscussionType;
    label: string;
    icon: React.ComponentType<{ size: number; color: string }>;
    accentColor: string;
  }> = [
    { value: 'discussion', label: 'Discussion', icon: MessageSquare, accentColor: colors.textPrimary },
    { value: 'question', label: 'Question', icon: HelpCircle, accentColor: colors.accentBlue },
    { value: 'insight', label: 'Insight', icon: Lightbulb, accentColor: colors.journalScience },
    { value: 'methodology', label: 'Methodology', icon: FlaskConical, accentColor: colors.accentGreen },
  ];

  return (
    <View style={styles.container}>
      {/* Header with user avatar and type selector */}
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

      {/* Discussion Type Selector */}
      <View style={styles.typeSelectorRow}>
        {types.map((item) => {
          const isSelected = type === item.value;
          const IconComp = item.icon;
          return (
            <TouchableOpacity
              key={item.value}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                setType(item.value);
              }}
              activeOpacity={0.8}
              style={[
                styles.typeButton,
                isSelected && {
                  backgroundColor: colors.black,
                  borderColor: colors.black,
                },
              ]}
            >
              <IconComp
                size={13}
                color={isSelected ? colors.white : colors.textSecondary}
              />
              <Text
                style={[
                  styles.typeButtonText,
                  isSelected && styles.typeButtonTextSelected,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Optional Title Input (shown for questions & insights or when expanded) */}
      {(isExpanded || type === 'question' || type === 'insight') && (
        <TextInput
          placeholder={type === 'question' ? 'Question summary / title (optional)' : 'Key takeaway / topic title (optional)'}
          placeholderTextColor={colors.textMuted}
          value={title}
          onChangeText={setTitle}
          style={styles.titleInput}
          maxLength={120}
        />
      )}

      {/* Main Content Input */}
      <TextInput
        placeholder={getPlaceholder(type)}
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
          <Text style={styles.submitButtonText}>
            {type === 'question' ? 'Ask Question' : type === 'insight' ? 'Share Insight' : 'Post'}
          </Text>
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
    ...typography.captionBold,
    color: colors.textPrimary,
  },
  authorTitle: {
    ...typography.micro,
    color: colors.textSecondary,
    marginTop: 1,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm + 2,
    flexWrap: 'wrap',
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.md,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 5,
  },
  typeButtonText: {
    ...typography.micro,
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 12,
  },
  typeButtonTextSelected: {
    color: colors.white,
    fontWeight: '700',
  },
  titleInput: {
    ...typography.captionBold,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 4,
    borderRadius: radii.sm,
    marginBottom: spacing.xs + 2,
    fontSize: 13,
  },
  contentInput: {
    ...typography.body,
    color: colors.textPrimary,
    minHeight: 54,
    maxHeight: 180,
    lineHeight: 20,
    fontSize: 14,
    textAlignVertical: 'top',
    paddingVertical: spacing.xs,
  },
  contentInputExpanded: {
    minHeight: 88,
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
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  mentionScroll: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: 2,
  },
  mentionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.backgroundCard,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 5,
  },
  mentionChipText: {
    ...typography.micro,
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 11,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
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
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  iconButtonActive: {
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
  },
  iconButtonText: {
    ...typography.micro,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.black,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
    borderRadius: radii.md,
    gap: 6,
  },
  submitButtonDisabled: {
    backgroundColor: colors.textMuted,
    opacity: 0.6,
  },
  submitButtonText: {
    ...typography.captionBold,
    color: colors.white,
    fontSize: 13,
  },
});
