import React, { useState } from 'react';
import {
  Platform,
  Alert,
} from 'react-native';
import {
  Edit3,
  Share2,
  Trash2,
  Link as LinkIcon,
  Flag,
  UserX,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { Post } from '../../types';
import { usePostStore } from '../../store/usePostStore';
import { useAuthStore } from '../../store/useAuthStore';
import { blockUser } from '../../api/moderationService';
import { ContentReportModal } from './ContentReportModal';
import { Popover, PopoverItem, PopoverDivider } from '../core/Popover';

export interface PostOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  post: Post;
  onEditPress: () => void;
  onSharePress: () => void;
  onDeleteSuccess?: () => void;
  anchorRef?: React.RefObject<any>;
}

export const PostOptionsModal: React.FC<PostOptionsModalProps> = ({
  visible,
  onClose,
  post,
  onEditPress,
  onSharePress,
  onDeleteSuccess,
  anchorRef,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const deletePost = usePostStore((s) => s.deletePost);
  const toggleSave = usePostStore((s) => s.toggleSavePost);
  const [reportModalVisible, setReportModalVisible] = useState(false);

  const isAuthor = currentUser?.id === post.author.id;

  const handleCopyLink = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const postUrl = `https://www.letsbooffin.com/post/${post.id}`;
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

  const handleBlockAuthor = () => {
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
  };

  return (
    <>
      <Popover
        visible={visible && !reportModalVisible}
        onClose={onClose}
        anchorRef={anchorRef}
        align="end"
        position="bottom"
        estimatedWidth={210}
        estimatedHeight={isAuthor ? 175 : 210}
      >
        <PopoverItem
          icon={<LinkIcon size={16} color="#475569" />}
          label="Copy link"
          onPress={handleCopyLink}
        />
        <PopoverItem
          icon={post.isSaved ? <BookmarkCheck size={16} color="#059669" /> : <Bookmark size={16} color="#475569" />}
          label={post.isSaved ? 'Saved to library' : 'Save post'}
          active={Boolean(post.isSaved)}
          activeColor="#059669"
          onPress={handleSaveToggle}
        />
        <PopoverItem
          icon={<Share2 size={16} color="#475569" />}
          label="Share via..."
          onPress={handleShare}
        />

        {isAuthor ? (
          <>
            <PopoverDivider />
            <PopoverItem
              icon={<Edit3 size={16} color="#2563EB" />}
              label="Edit post"
              onPress={handleEdit}
            />
            <PopoverDivider />
            <PopoverItem
              icon={<Trash2 size={16} color="#EF4444" />}
              label="Delete post"
              destructive
              onPress={handleDeletePress}
            />
          </>
        ) : (
          <>
            <PopoverDivider />
            <PopoverItem
              icon={<Flag size={16} color="#475569" />}
              label="Report post"
              onPress={() => {
                setReportModalVisible(true);
              }}
            />
            <PopoverItem
              icon={<UserX size={16} color="#EF4444" />}
              label="Block researcher"
              destructive
              onPress={handleBlockAuthor}
            />
          </>
        )}
      </Popover>

      {/* Structured Content Report Modal */}
      {reportModalVisible && (
        <ContentReportModal
          visible={reportModalVisible}
          onClose={() => {
            setReportModalVisible(false);
            onClose();
          }}
          reportedType="post"
          reportedId={post.id}
          targetTitle={post.content}
          targetAuthorName={post.author.handle || post.author.fullName}
          targetAuthorId={post.author.id}
          onReportSuccess={() => {
            setReportModalVisible(false);
            onClose();
          }}
        />
      )}
    </>
  );
};
