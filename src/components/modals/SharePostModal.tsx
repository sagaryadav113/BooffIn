import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Share,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import {
  Share2,
  Link as LinkIcon,
  Image as ImageIcon,
  Copy,
  Layers,
  Check,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { Post } from '../../types';
import { colors, radii, spacing, fontSizes, typography, shadows } from '../../theme';
import { Avatar } from '../core/Avatar';

export interface SharePostModalProps {
  visible: boolean;
  onClose: () => void;
  post: Post;
}

export const SharePostModal: React.FC<SharePostModalProps> = ({
  visible,
  onClose,
  post,
}) => {
  const [copiedType, setCopiedType] = useState<'link' | 'text' | 'image' | null>(null);

  const postUrl = `https://booffin.app/post/${post.id}`;
  const hasImages = Boolean(post.images && post.images.length > 0);

  const showCopiedFeedback = (type: 'link' | 'text' | 'image') => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setCopiedType(type);
    setTimeout(() => {
      setCopiedType(null);
    }, 2500);
  };

  // 1. Share via Link & Short summary
  const handleShareLink = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const message = `${post.author.fullName} on BooffIn: "${post.content.slice(0, 180)}${
        post.content.length > 180 ? '...' : ''
      }"\n\nRead more: ${postUrl}`;

      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: `Research by ${post.author.fullName}`,
          text: message,
          url: postUrl,
        });
      } else {
        await Share.share({
          title: `Research by ${post.author.fullName}`,
          message: Platform.OS === 'ios' ? message : `${message}\n${postUrl}`,
          url: postUrl,
        });
      }
      onClose();
    } catch (err: any) {
      if (err?.message && !err.message.includes('dismissed') && !err.message.includes('canceled')) {
        console.warn('Share error:', err);
      }
    }
  };

  // 2. Share Images
  const handleShareImages = async () => {
    if (!hasImages) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const primaryImage = post.images![0];
      const imageMessage = `Figure shared from ${post.author.fullName}'s post on BooffIn:\n${primaryImage}\n\nView discussion: ${postUrl}`;

      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: `Research Figure · ${post.author.fullName}`,
          text: imageMessage,
          url: primaryImage,
        });
      } else {
        await Share.share({
          title: `Research Figure · ${post.author.fullName}`,
          message: Platform.OS === 'ios' ? imageMessage : `${imageMessage}\n${primaryImage}`,
          url: primaryImage,
        });
      }
      onClose();
    } catch (err: any) {
      if (err?.message && !err.message.includes('dismissed') && !err.message.includes('canceled')) {
        console.warn('Share images error:', err);
      }
    }
  };

  // 3. Share Both (Complete text, citation, link, and figures)
  const handleShareBoth = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      let combinedMessage = `🔬 ${post.author.fullName} (@${post.author.handle})\n${post.content}\n\n`;

      if (post.topics && post.topics.length > 0) {
        combinedMessage += `Topics: ${post.topics.map((t) => `#${t}`).join(' ')}\n\n`;
      }

      if (hasImages) {
        combinedMessage += `Figures (${post.images!.length}):\n${post.images!.join('\n')}\n\n`;
      }

      if (post.paper) {
        combinedMessage += `Linked Paper: ${post.paper.title} (${post.paper.doi || ''})\n\n`;
      }

      combinedMessage += `Read full discussion on BooffIn: ${postUrl}`;

      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: `Research Discussion · ${post.author.fullName}`,
          text: combinedMessage,
          url: postUrl,
        });
      } else {
        await Share.share({
          title: `Research Discussion · ${post.author.fullName}`,
          message: combinedMessage,
          url: postUrl,
        });
      }
      onClose();
    } catch (err: any) {
      if (err?.message && !err.message.includes('dismissed') && !err.message.includes('canceled')) {
        console.warn('Share both error:', err);
      }
    }
  };

  // 4. Copy Post Link
  const handleCopyLink = async () => {
    try {
      await Clipboard.setStringAsync(postUrl);
      showCopiedFeedback('link');
    } catch {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
        await navigator.clipboard.writeText(postUrl);
        showCopiedFeedback('link');
      }
    }
  };

  // 5. Copy Post Text Content
  const handleCopyText = async () => {
    try {
      await Clipboard.setStringAsync(post.content);
      showCopiedFeedback('text');
    } catch {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
        await navigator.clipboard.writeText(post.content);
        showCopiedFeedback('text');
      }
    }
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

          {/* Header with Post Snippet */}
          <View style={styles.header}>
            <Text style={styles.title}>Share Research Post</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Snippet Card */}
          <View style={styles.snippetCard}>
            <View style={styles.snippetAuthorRow}>
              <Avatar
                url={post.author.avatarUrl}
                name={post.author.fullName}
                size="sm"
              />
              <View style={styles.snippetAuthorMeta}>
                <Text style={styles.snippetAuthorName} numberOfLines={1}>
                  {post.author.fullName}
                </Text>
                <Text style={styles.snippetAuthorHandle}>
                  @{post.author.handle}
                </Text>
              </View>
            </View>
            <Text style={styles.snippetBody} numberOfLines={2}>
              {post.content || 'Attached research update...'}
            </Text>
            {hasImages && (
              <View style={styles.snippetImagesRow}>
                {post.images!.slice(0, 3).map((img, i) => (
                  <Image
                    key={i}
                    source={{ uri: img }}
                    style={styles.snippetThumb}
                    contentFit="cover"
                  />
                ))}
                {post.images!.length > 3 && (
                  <View style={styles.moreThumbBadge}>
                    <Text style={styles.moreThumbText}>
                      +{post.images!.length - 3}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Copied Banner Alert */}
          {copiedType && (
            <View style={styles.copiedBanner}>
              <Check size={14} color={colors.accentGreen} />
              <Text style={styles.copiedBannerText}>
                {copiedType === 'link'
                  ? 'Link copied to clipboard!'
                  : 'Post text copied to clipboard!'}
              </Text>
            </View>
          )}

          {/* Share Actions */}
          <ScrollView style={styles.actionsList} bounces={false}>
            {/* 1. Share Link & Text */}
            <TouchableOpacity
              style={styles.actionItem}
              onPress={handleShareLink}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.accentBlue + '15' }]}>
                <Share2 size={20} color={colors.accentBlue} />
              </View>
              <View style={styles.actionTextCol}>
                <Text style={styles.actionTitle}>Share Link & Text</Text>
                <Text style={styles.actionSubtitle}>
                  Share via WhatsApp, Twitter, Slack, or Email
                </Text>
              </View>
            </TouchableOpacity>

            {/* 2. Share Both (Text, Link, & Images) */}
            <TouchableOpacity
              style={styles.actionItem}
              onPress={handleShareBoth}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.accentGreen + '15' }]}>
                <Layers size={20} color={colors.accentGreen} />
              </View>
              <View style={styles.actionTextCol}>
                <Text style={styles.actionTitle}>Share Everything (Both)</Text>
                <Text style={styles.actionSubtitle}>
                  Complete summary with citation, link, and figures
                </Text>
              </View>
            </TouchableOpacity>

            {/* 3. Share Image (if present) */}
            {hasImages && (
              <TouchableOpacity
                style={styles.actionItem}
                onPress={handleShareImages}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: colors.accentOrange + '20' }]}>
                  <ImageIcon size={20} color={colors.accentOrange} />
                </View>
                <View style={styles.actionTextCol}>
                  <Text style={styles.actionTitle}>Share Attached Figures</Text>
                  <Text style={styles.actionSubtitle}>
                    Share {post.images!.length} research image{post.images!.length > 1 ? 's' : ''} directly
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            <View style={styles.separator} />

            {/* 4. Copy Link */}
            <TouchableOpacity
              style={styles.actionItem}
              onPress={handleCopyLink}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.surfaceHover }]}>
                {copiedType === 'link' ? (
                  <Check size={20} color={colors.accentGreen} />
                ) : (
                  <LinkIcon size={20} color={colors.textPrimary} />
                )}
              </View>
              <View style={styles.actionTextCol}>
                <Text style={styles.actionTitle}>
                  {copiedType === 'link' ? 'Copied!' : 'Copy Link'}
                </Text>
                <Text style={styles.actionSubtitle}>{postUrl}</Text>
              </View>
            </TouchableOpacity>

            {/* 5. Copy Text */}
            <TouchableOpacity
              style={styles.actionItem}
              onPress={handleCopyText}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.surfaceHover }]}>
                {copiedType === 'text' ? (
                  <Check size={20} color={colors.accentGreen} />
                ) : (
                  <Copy size={20} color={colors.textPrimary} />
                )}
              </View>
              <View style={styles.actionTextCol}>
                <Text style={styles.actionTitle}>
                  {copiedType === 'text' ? 'Copied!' : 'Copy Post Text'}
                </Text>
                <Text style={styles.actionSubtitle}>
                  Copy raw text without URLs
                </Text>
              </View>
            </TouchableOpacity>
          </ScrollView>

          {/* Close Button */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelButtonText}>Done</Text>
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
    maxHeight: '85%',
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSizes.bodyLarge,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  snippetCard: {
    backgroundColor: colors.surfaceHover,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  snippetAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  snippetAuthorMeta: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  snippetAuthorName: {
    fontSize: fontSizes.caption,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  snippetAuthorHandle: {
    fontSize: fontSizes.micro,
    color: colors.textSecondary,
  },
  snippetBody: {
    fontSize: fontSizes.captionSmall,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  snippetImagesRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: spacing.xs,
  },
  snippetThumb: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
  },
  moreThumbBadge: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreThumbText: {
    color: colors.white,
    fontSize: fontSizes.micro,
    fontWeight: '700',
  },
  copiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentGreen + '18',
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    gap: 6,
    marginBottom: spacing.sm,
  },
  copiedBannerText: {
    fontSize: fontSizes.captionSmall,
    fontWeight: '600',
    color: colors.accentGreen,
  },
  actionsList: {
    maxHeight: 320,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  actionTextCol: {
    flex: 1,
  },
  actionTitle: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  actionSubtitle: {
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
    color: colors.textPrimary,
  },
});
