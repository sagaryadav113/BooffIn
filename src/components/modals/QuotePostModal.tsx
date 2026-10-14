import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { Image } from 'expo-image';
import { X, Globe } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Post } from '../../types';
import { colors, radii, spacing, typography } from '../../theme';
import { Avatar } from '../core/Avatar';
import { usePostStore } from '../../store/usePostStore';
import { useAuthStore } from '../../store/useAuthStore';

export interface QuotePostModalProps {
  visible: boolean;
  onClose: () => void;
  post: Post;
  onSuccess?: (newPost: Post) => void;
}

export const QuotePostModal: React.FC<QuotePostModalProps> = ({
  visible,
  onClose,
  post,
  onSuccess,
}) => {
  const [thoughts, setThoughts] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentUser = useAuthStore((s) => s.user);
  const repostWithThoughts = usePostStore((s) => s.repostWithThoughts);

  const handleSubmit = async () => {
    const trimmed = thoughts.trim();
    if (!trimmed || isSubmitting) return;

    try {
      setIsSubmitting(true);
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}

      const created = await repostWithThoughts(post, trimmed, currentUser?.id);
      if (created) {
        onSuccess?.(created);
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }
      setThoughts('');
      onClose();
    } catch (err) {
      console.error('[QuotePostModal] Error reposting with thoughts:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setThoughts('');
    onClose();
  };

  const quotedAuthorName = post.author?.fullName || post.author?.handle || 'Researcher';
  const quotedAuthorHandle = post.author?.handle ? `@${post.author.handle}` : '';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.backdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoid}
          >
            <TouchableWithoutFeedback>
              <View style={styles.modalCard}>
                {/* Modal Header */}
                <View style={styles.header}>
                  <TouchableOpacity
                    onPress={handleClose}
                    style={styles.closeBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityLabel="Close"
                  >
                    <X size={20} color="#64748B" />
                  </TouchableOpacity>

                  <Text style={styles.headerTitle}>Repost with thoughts</Text>

                  <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={!thoughts.trim() || isSubmitting}
                    style={[
                      styles.repostActionBtn,
                      (!thoughts.trim() || isSubmitting) && styles.repostActionBtnDisabled,
                    ]}
                    activeOpacity={0.8}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.repostActionBtnText}>Repost</Text>
                    )}
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.scrollArea}
                  contentContainerStyle={styles.scrollContent}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Current User Row */}
                  <View style={styles.userRow}>
                    <Avatar
                      uri={currentUser?.avatarUrl || undefined}
                      name={currentUser?.fullName || currentUser?.handle || 'You'}
                      size="sm"
                    />
                    <View style={styles.userInfoCol}>
                      <Text style={styles.userName} numberOfLines={1}>
                        {currentUser?.fullName || 'You'}
                      </Text>
                      <View style={styles.audiencePill}>
                        <Globe size={11} color="#164E3F" />
                        <Text style={styles.audiencePillText}>Public</Text>
                      </View>
                    </View>
                  </View>

                  {/* Thoughts Input */}
                  <TextInput
                    value={thoughts}
                    onChangeText={setThoughts}
                    placeholder="Add your thoughts..."
                    placeholderTextColor="#94A3B8"
                    multiline
                    autoFocus
                    maxLength={1000}
                    style={styles.thoughtsInput}
                  />

                  {/* Twitter-Style Embedded Quoted Post Card */}
                  <View style={styles.embeddedPostCard}>
                    <View style={styles.embeddedHeader}>
                      <Avatar
                        uri={post.author?.avatarUrl || undefined}
                        name={quotedAuthorName}
                        size="xs"
                      />
                      <Text style={styles.embeddedAuthorName} numberOfLines={1}>
                        {quotedAuthorName}
                      </Text>
                      {quotedAuthorHandle ? (
                        <Text style={styles.embeddedAuthorHandle} numberOfLines={1}>
                          {quotedAuthorHandle}
                        </Text>
                      ) : null}
                      {post.createdAt ? (
                        <>
                          <Text style={styles.embeddedDot}>·</Text>
                          <Text style={styles.embeddedTime}>{post.createdAt}</Text>
                        </>
                      ) : null}
                    </View>

                    {post.content ? (
                      <Text style={styles.embeddedContent} numberOfLines={3}>
                        {post.content}
                      </Text>
                    ) : null}

                    {/* Attached Paper Preview (if any) */}
                    {post.paper && (
                      <View style={styles.embeddedPaperBadge}>
                        <Text style={styles.embeddedPaperIcon}>🔬</Text>
                        <Text style={styles.embeddedPaperTitle} numberOfLines={1}>
                          {post.paper.title}
                        </Text>
                      </View>
                    )}

                    {/* Attached Image Preview (if any) */}
                    {post.images && post.images.length > 0 && (
                      <View style={styles.embeddedImageWrap}>
                        <Image
                          source={{ uri: post.images[0] }}
                          style={styles.embeddedImage}
                          contentFit="cover"
                        />
                      </View>
                    )}
                  </View>

                  <View style={styles.charCountRow}>
                    <Text style={styles.charCountText}>
                      {1000 - thoughts.length} characters remaining
                    </Text>
                  </View>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  keyboardAvoid: {
    width: '100%',
    maxWidth: 560,
    alignItems: 'center',
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 16,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  repostActionBtn: {
    backgroundColor: '#164E3F',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    minWidth: 74,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repostActionBtnDisabled: {
    opacity: 0.45,
  },
  repostActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  scrollArea: {
    maxHeight: 520,
  },
  scrollContent: {
    padding: 18,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  userInfoCol: {
    flexDirection: 'column',
    gap: 2,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  audiencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(22, 78, 63, 0.08)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  audiencePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#164E3F',
  },
  thoughtsInput: {
    fontSize: 16,
    color: '#0F172A',
    lineHeight: 23,
    minHeight: 85,
    textAlignVertical: 'top',
    padding: 0,
    marginBottom: 14,
  },
  embeddedPostCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
  },
  embeddedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  embeddedAuthorName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    maxWidth: 160,
  },
  embeddedAuthorHandle: {
    fontSize: 12.5,
    color: '#64748B',
    maxWidth: 120,
  },
  embeddedDot: {
    fontSize: 12,
    color: '#94A3B8',
  },
  embeddedTime: {
    fontSize: 12,
    color: '#94A3B8',
  },
  embeddedContent: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 6,
  },
  embeddedPaperBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: 4,
  },
  embeddedPaperIcon: {
    fontSize: 13,
  },
  embeddedPaperTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
  },
  embeddedImageWrap: {
    marginTop: 6,
    borderRadius: 8,
    overflow: 'hidden',
    height: 110,
    backgroundColor: '#E2E8F0',
  },
  embeddedImage: {
    width: '100%',
    height: '100%',
  },
  charCountRow: {
    marginTop: 10,
    alignItems: 'flex-end',
  },
  charCountText: {
    fontSize: 11.5,
    color: '#94A3B8',
  },
});
