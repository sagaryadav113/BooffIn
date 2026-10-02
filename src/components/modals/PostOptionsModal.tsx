import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
  Alert,
} from 'react-native';
import {
  Edit3,
  Share2,
  Trash2,
  Link as LinkIcon,
  Flag,
  Copy,
  UserX,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { Post } from '../../types';
import { colors, radii, spacing, fontSizes, shadows } from '../../theme';
import { SaveIcon } from '../core/SaveIcon';
import { usePostStore } from '../../store/usePostStore';
import { useAuthStore } from '../../store/useAuthStore';
import { blockUser } from '../../api/moderationService';

export interface PostOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  post: Post;
  onEditPress: () => void;
  onSharePress: () => void;
  onDeleteSuccess?: () => void;
}

export const PostOptionsModal: React.FC<PostOptionsModalProps> = ({
  visible,
  onClose,
  post,
  onEditPress,
  onSharePress,
  onDeleteSuccess,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const deletePost = usePostStore((s) => s.deletePost);
  const toggleSave = usePostStore((s) => s.toggleSavePost);

  const isAuthor = currentUser?.id === post.author.id;

  const handleCopyLink = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const postUrl = `https://booffin.app/post/${post.id}`;
    if (Clipboard?.setStringAsync) {
      await Clipboard.setStringAsync(postUrl);
    }
    onClose();
    if (Platform.OS === 'web') {
      window.alert('Post link copied to clipboard!');
    } else {
      Alert.alert('Link Copied', 'Post link has been copied to your clipboard.');
    }
  };

  const handleSaveToggle = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    toggleSave(post.id, currentUser?.id);
    onClose();
  };

  const handleDeletePress = () => {
    onClose();

    const executeDelete = async () => {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch {}
      const success = await deletePost(post.id, currentUser?.id);
      if (success) {
        onDeleteSuccess?.();
      } else {
        if (Platform.OS === 'web') {
          window.alert('Failed to delete post. Please try again.');
        } else {
          Alert.alert('Error', 'Failed to delete post. Please try again.');
        }
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        'Are you sure you want to delete this post?\n\nThis action cannot be undone and will permanently remove your research post.'
      );
      if (confirmed) {
        executeDelete();
      }
    } else {
      Alert.alert(
        'Delete Post',
        'Are you sure you want to delete this post? This action cannot be undone and will permanently remove your research post.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: executeDelete,
          },
        ],
        { cancelable: true }
      );
    }
  };

  const handleEdit = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onClose();
    onEditPress();
  };

  const handleShare = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onClose();
    onSharePress();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View style={styles.sheetWrapper} pointerEvents="box-none">
        <View style={styles.sheetContainer}>
          <View style={styles.dragHandle} />

          {/* Actions List */}
          <View style={styles.menuList}>
            {isAuthor ? (
              <>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleEdit}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconContainer, { backgroundColor: colors.accentBlue + '15' }]}>
                    <Edit3 size={18} color={colors.accentBlue} />
                  </View>
                  <View style={styles.itemTextContainer}>
                    <Text style={styles.itemTitle}>Edit Post</Text>
                    <Text style={styles.itemSubtitle}>
                      Modify text content and topic tags
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleShare}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconContainer, { backgroundColor: colors.accentGreen + '15' }]}>
                    <Share2 size={18} color={colors.accentGreen} />
                  </View>
                  <View style={styles.itemTextContainer}>
                    <Text style={styles.itemTitle}>Share Post</Text>
                    <Text style={styles.itemSubtitle}>
                      Share via link, images, or social sheet
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleCopyLink}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconContainer, { backgroundColor: colors.surfaceHover }]}>
                    <LinkIcon size={18} color={colors.textPrimary} />
                  </View>
                  <View style={styles.itemTextContainer}>
                    <Text style={styles.itemTitle}>Copy Link</Text>
                    <Text style={styles.itemSubtitle}>
                      Copy direct link to clipboard
                    </Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.separator} />

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleDeletePress}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconContainer, { backgroundColor: colors.accentRed + '15' }]}>
                    <Trash2 size={18} color={colors.accentRed} />
                  </View>
                  <View style={styles.itemTextContainer}>
                    <Text style={[styles.itemTitle, { color: colors.accentRed }]}>
                      Delete Post
                    </Text>
                    <Text style={styles.itemSubtitle}>
                      Permanently remove this publication
                    </Text>
                  </View>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleShare}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconContainer, { backgroundColor: colors.accentBlue + '15' }]}>
                    <Share2 size={18} color={colors.accentBlue} />
                  </View>
                  <View style={styles.itemTextContainer}>
                    <Text style={styles.itemTitle}>Share Post</Text>
                    <Text style={styles.itemSubtitle}>
                      Share via link, images, or native sheet
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleSaveToggle}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconContainer, { backgroundColor: colors.accentGreen + '15' }]}>
                    <SaveIcon
                      size={18}
                      isSaved={Boolean(post.isSaved)}
                      color={colors.accentGreen}
                      ribbonColor={colors.accentGreen}
                    />
                  </View>
                  <View style={styles.itemTextContainer}>
                    <Text style={styles.itemTitle}>
                      {post.isSaved ? 'Remove from Saved' : 'Save Post'}
                    </Text>
                    <Text style={styles.itemSubtitle}>
                      {post.isSaved
                        ? 'Remove from your saved research list'
                        : 'Save to your research library'}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleCopyLink}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconContainer, { backgroundColor: colors.surfaceHover }]}>
                    <Copy size={18} color={colors.textPrimary} />
                  </View>
                  <View style={styles.itemTextContainer}>
                    <Text style={styles.itemTitle}>Copy Link</Text>
                    <Text style={styles.itemSubtitle}>
                      Copy link to clipboard
                    </Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.separator} />

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    onClose();
                    Alert.alert(
                      'Report Post',
                      'Thank you for helping keep BooffIn a safe research environment. Our academic review team has been notified.',
                      [{ text: 'OK' }]
                    );
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconContainer, { backgroundColor: colors.surfaceHover }]}>
                    <Flag size={18} color={colors.textSecondary} />
                  </View>
                  <View style={styles.itemTextContainer}>
                    <Text style={styles.itemTitle}>Report Post</Text>
                    <Text style={styles.itemSubtitle}>
                      Flag inappropriate or non-academic content
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    onClose();
                    const executeBlock = async () => {
                      const res = await blockUser(post.author.id);
                      if (res.success) {
                        usePostStore.setState((state) => ({
                          posts: state.posts.filter((p) => p.author.id !== post.author.id),
                        }));
                        if (Platform.OS === 'web') {
                          window.alert(`${post.author.fullName || 'Researcher'} has been blocked.`);
                        } else {
                          Alert.alert('Blocked', `${post.author.fullName || 'Researcher'} has been blocked.`);
                        }
                      } else {
                        if (Platform.OS === 'web') {
                          window.alert(res.error || 'Failed to block user.');
                        } else {
                          Alert.alert('Error', res.error || 'Failed to block user.');
                        }
                      }
                    };

                    const promptText = `Are you sure you want to block ${post.author.fullName || '@' + post.author.handle}? They will not be able to follow you, view your posts, or interact with your research notes.`;

                    if (Platform.OS === 'web') {
                      if (window.confirm(promptText)) {
                        executeBlock();
                      }
                    } else {
                      Alert.alert(
                        'Block Researcher',
                        promptText,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Block', style: 'destructive', onPress: executeBlock },
                        ],
                        { cancelable: true }
                      );
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconContainer, { backgroundColor: colors.accentRed + '15' }]}>
                    <UserX size={18} color={colors.accentRed} />
                  </View>
                  <View style={styles.itemTextContainer}>
                    <Text style={[styles.itemTitle, { color: colors.accentRed }]}>
                      Block Researcher
                    </Text>
                    <Text style={styles.itemSubtitle}>
                      Prevent interactions and hide research updates
                    </Text>
                  </View>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Cancel Button */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheetWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xxl : spacing.lg,
    ...shadows.floating,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: radii.full,
    backgroundColor: colors.borderDark,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  menuList: {
    paddingVertical: spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  itemSubtitle: {
    fontSize: fontSizes.micro,
    color: colors.textSecondary,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.xs,
  },
  cancelButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceHover,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
