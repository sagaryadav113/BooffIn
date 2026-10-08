import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Sparkles, ThumbsUp, ArrowUpRight, MessageSquare } from 'lucide-react-native';
import { WorkspacePostMetadata } from '../../types/workspace';
import { Avatar } from '../core/Avatar';

interface ChatPostCardProps {
  postMeta: WorkspacePostMetadata;
  isMe?: boolean;
}

export const ChatPostCard: React.FC<ChatPostCardProps> = ({ postMeta, isMe = false }) => {
  const handleOpenPost = () => {
    if (postMeta.id) {
      router.push(`/post/${postMeta.id}` as any);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handleOpenPost}
      style={[
        styles.cardContainer,
        isMe ? styles.cardMy : styles.cardOther,
      ]}
    >
      {/* Header Pill */}
      <View style={styles.headerBadgeRow}>
        <View style={styles.badgePill}>
          <Sparkles size={11} color="#164E3F" />
          <Text style={styles.badgePillText}>BOOFFIN POST</Text>
        </View>
        <ArrowUpRight size={14} color="#64748B" />
      </View>

      {/* Author Details */}
      <View style={styles.authorRow}>
        <Avatar
          uri={postMeta.author_avatar || undefined}
          name={postMeta.author_name || 'Researcher'}
          size="xs"
        />
        <Text style={styles.authorNameText} numberOfLines={1}>
          {postMeta.author_name || 'Researcher'}
        </Text>
      </View>

      {/* Title */}
      <Text style={styles.postTitle} numberOfLines={2}>
        {postMeta.title}
      </Text>

      {/* Snippet Excerpt */}
      {postMeta.snippet ? (
        <Text style={styles.postSnippet} numberOfLines={2}>
          {postMeta.snippet}
        </Text>
      ) : null}

      {/* Footer Stats / Button */}
      <View style={styles.cardFooter}>
        <View style={styles.statsRow}>
          {typeof postMeta.upvotes === 'number' && (
            <View style={styles.statItem}>
              <ThumbsUp size={12} color="#164E3F" />
              <Text style={styles.statText}>{postMeta.upvotes} upvotes</Text>
            </View>
          )}
        </View>

        <View style={styles.viewPostAction}>
          <Text style={styles.viewPostActionText}>View Post</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardMy: {
    borderColor: '#A7F3D0',
  },
  cardOther: {
    borderColor: '#E2E8F0',
  },
  headerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#164E3F',
    letterSpacing: 0.5,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  authorNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  postTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 18,
    marginBottom: 4,
  },
  postSnippet: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#164E3F',
  },
  viewPostAction: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  viewPostActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#164E3F',
  },
});
