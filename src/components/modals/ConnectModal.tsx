import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Sparkles, Send, CheckCircle2, FlaskConical, BookOpen, Database } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';
import { UserProfile } from '../../types';
import { Avatar } from '../core/Avatar';
import { Button } from '../core/Button';
import { TopicChip } from '../core/TopicChip';
import {
  sendCollaborationRequest,
  getSharedResearchInterests,
  getResearcherDiscussedTopics,
} from '../../api/connectionService';
import { useAuthStore } from '../../store/useAuthStore';

interface ConnectModalProps {
  visible: boolean;
  onClose: () => void;
  recipient: UserProfile;
  onSuccess?: () => void;
}

const TEMPLATES = [
  {
    icon: Database,
    label: 'Dataset & Methods Exchange',
    text: 'I am researching related mechanisms and would love to discuss exchanging datasets, methodologies, and analytical approaches.',
  },
  {
    icon: FlaskConical,
    label: 'Experimental Protocols',
    text: 'Read your recent updates and would appreciate discussing replication protocols and experimental techniques.',
  },
  {
    icon: BookOpen,
    label: 'Preprint Discussion & Feedback',
    text: 'Interested in your perspectives on current literature in this domain and potential collaborative synthesis.',
  },
];

export const ConnectModal: React.FC<ConnectModalProps> = ({
  visible,
  onClose,
  recipient,
  onSuccess,
}) => {
  const currentUser = useAuthStore((s) => s.user);

  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [customTopic, setCustomTopic] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Derive mutual interests and discussed topics
  const mutualInterests = React.useMemo(() => {
    return getSharedResearchInterests(currentUser, recipient);
  }, [currentUser, recipient]);

  const discussedTopics = React.useMemo(() => {
    return getResearcherDiscussedTopics(recipient.id).slice(0, 6);
  }, [recipient.id]);

  useEffect(() => {
    if (visible) {
      setIsSuccess(false);
      setErrorText(null);
      setMessage('');
      if (mutualInterests.length > 0) {
        setSelectedTopic(mutualInterests[0]);
      } else if (recipient.researchInterests && recipient.researchInterests.length > 0) {
        setSelectedTopic(recipient.researchInterests[0]);
      } else if (discussedTopics.length > 0) {
        setSelectedTopic(discussedTopics[0].topic);
      } else {
        setSelectedTopic('');
      }
    }
  }, [visible, mutualInterests, recipient, discussedTopics]);

  const activeTopic = selectedTopic === '__custom__' ? customTopic.trim() : selectedTopic;

  const handleSubmit = async () => {
    setErrorText(null);

    if (!activeTopic) {
      setErrorText('Please select or specify a research topic.');
      return;
    }

    if (!message.trim()) {
      setErrorText('Please include a brief note explaining your collaboration interest.');
      return;
    }

    setIsSubmitting(true);
    const res = await sendCollaborationRequest(currentUser.id, {
      recipientId: recipient.id,
      topic: activeTopic,
      message: message.trim(),
    });
    setIsSubmitting(false);

    if (!res.success) {
      setErrorText(res.error || 'Failed to send collaboration request.');
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    setIsSuccess(true);
    if (onSuccess) {
      onSuccess();
    }

    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const handleSelectTemplate = (templateText: string) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setMessage(templateText);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.modalCard}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          {isSuccess ? (
            <View style={styles.successContainer}>
              <CheckCircle2 size={48} color={colors.accentGreen} />
              <Text style={styles.successTitle}>Collaboration Request Sent</Text>
              <Text style={styles.successSubtitle}>
                {recipient.fullName} has been notified of your research interest in{' '}
                <Text style={{ fontWeight: '700' }}>{activeTopic}</Text>.
              </Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Header */}
              <View style={styles.header}>
                <Avatar
                  url={recipient.avatarUrl}
                  name={recipient.fullName}
                  size={52}
                  verified={recipient.orcidVerified}
                  style={styles.recipientAvatar}
                />
                <View style={styles.headerMeta}>
                  <Text style={styles.title}>Connect with {recipient.fullName}</Text>
                  <Text style={styles.subtitle} numberOfLines={2}>
                    {recipient.academicTitle} · {recipient.institution}
                  </Text>
                </View>
              </View>

              <View style={styles.bannerInfo}>
                <Sparkles size={16} color={colors.textPrimary} style={{ marginRight: 6 }} />
                <Text style={styles.bannerInfoText}>
                  Connecting signals interest in research discussions, dataset exchanges, or paper collaboration.
                </Text>
              </View>

              {/* Topic Selection */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  1. Select Research Topic / Overlap
                </Text>
                <Text style={styles.sectionHint}>
                  {mutualInterests.length > 0
                    ? 'Highlighted from your mutual research interests:'
                    : 'Choose a primary topic or type a custom one:'}
                </Text>

                <View style={styles.chipsWrap}>
                  {mutualInterests.map((interest) => {
                    const isSelected = selectedTopic === interest;
                    return (
                      <TouchableOpacity
                        key={interest}
                        style={[
                          styles.mutualTopicChip,
                          isSelected && styles.topicChipSelected,
                        ]}
                        onPress={() => {
                          setSelectedTopic(interest);
                          setErrorText(null);
                        }}
                        activeOpacity={0.8}
                      >
                        <Sparkles size={11} color={isSelected ? colors.white : colors.accentBlue} style={{ marginRight: 4 }} />
                        <Text
                          style={[
                            styles.mutualTopicText,
                            isSelected && styles.topicTextSelected,
                          ]}
                        >
                          {interest} (Mutual)
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  {recipient.researchInterests
                    ?.filter((ri) => !mutualInterests.includes(ri))
                    .map((interest) => {
                      const isSelected = selectedTopic === interest;
                      return (
                        <TouchableOpacity
                          key={interest}
                          style={[
                            styles.topicChip,
                            isSelected && styles.topicChipSelected,
                          ]}
                          onPress={() => {
                            setSelectedTopic(interest);
                            setErrorText(null);
                          }}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.topicText,
                              isSelected && styles.topicTextSelected,
                            ]}
                          >
                            {interest}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}

                  <TouchableOpacity
                    style={[
                      styles.topicChip,
                      selectedTopic === '__custom__' && styles.topicChipSelected,
                    ]}
                    onPress={() => setSelectedTopic('__custom__')}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.topicText,
                        selectedTopic === '__custom__' && styles.topicTextSelected,
                      ]}
                    >
                      + Custom Topic
                    </Text>
                  </TouchableOpacity>
                </View>

                {selectedTopic === '__custom__' && (
                  <TextInput
                    style={styles.customTopicInput}
                    placeholder="Enter specific topic or subfield..."
                    placeholderTextColor={colors.textMuted}
                    value={customTopic}
                    onChangeText={setCustomTopic}
                    autoFocus
                  />
                )}
              </View>

              {/* Message Note */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  2. Collaboration Proposal / Message
                </Text>

                {/* Quick Starter Templates */}
                <View style={styles.templatesContainer}>
                  {TEMPLATES.map((tmpl, idx) => {
                    const IconComp = tmpl.icon;
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={styles.templatePill}
                        onPress={() => handleSelectTemplate(tmpl.text)}
                        activeOpacity={0.8}
                      >
                        <IconComp size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={styles.templatePillText}>{tmpl.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TextInput
                  style={styles.messageInput}
                  multiline
                  numberOfLines={4}
                  placeholder={`Hi ${recipient.fullName.split(' ')[0] || 'there'}, I would love to connect regarding our mutual work in ${activeTopic || 'this field'}...`}
                  placeholderTextColor={colors.textMuted}
                  value={message}
                  onChangeText={(txt) => {
                    setMessage(txt);
                    setErrorText(null);
                  }}
                  maxLength={500}
                />
                <Text style={styles.charCount}>{message.length}/500</Text>
              </View>

              {errorText ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{errorText}</Text>
                </View>
              ) : null}

              {/* Actions */}
              <View style={styles.actionRow}>
                <Button
                  title="Send Request"
                  variant="primary"
                  size="md"
                  onPress={handleSubmit}
                  loading={isSubmitting}
                  iconLeft={
                    !isSubmitting ? (
                      <Send size={15} color={colors.white} style={{ marginRight: 6 }} />
                    ) : undefined
                  }
                  style={styles.submitButton}
                />
                <Button
                  title="Cancel"
                  variant="outline"
                  size="md"
                  onPress={onClose}
                  disabled={isSubmitting}
                />
              </View>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '92%',
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingRight: spacing.xl,
  },
  recipientAvatar: {
    marginRight: spacing.md,
  },
  headerMeta: {
    flex: 1,
  },
  title: {
    ...typography.h3,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
    fontSize: 12,
  },
  bannerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  bannerInfoText: {
    ...typography.micro,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.captionBold,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  sectionHint: {
    ...typography.micro,
    color: colors.textMuted,
    marginBottom: spacing.xs + 2,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 2,
  },
  mutualTopicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  mutualTopicText: {
    ...typography.captionMedium,
    color: '#1E40AF',
    fontSize: 12,
    fontWeight: '600',
  },
  topicChip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  topicText: {
    ...typography.captionMedium,
    color: colors.textPrimary,
    fontSize: 12,
  },
  topicChipSelected: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  topicTextSelected: {
    color: colors.white,
    fontWeight: '700',
  },
  customTopicInput: {
    marginTop: spacing.xs,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    fontSize: 13,
    color: colors.textPrimary,
  },
  templatesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.xs,
  },
  templatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  templatePillText: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 11,
  },
  messageInput: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: radii.md,
    padding: spacing.md,
    fontSize: 13,
    color: colors.textPrimary,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  charCount: {
    ...typography.micro,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 3,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.caption,
    color: colors.accentRed,
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  submitButton: {
    minWidth: 140,
  },
  successContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    fontWeight: '700',
  },
  successSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
