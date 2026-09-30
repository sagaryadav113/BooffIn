import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { router } from 'expo-router';
import { UserPlus, UserCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { UserProfile } from '../../types';
import { colors, radii, spacing, typography } from '../../theme';
import { Avatar } from '../core/Avatar';
import { followUser, unfollowUser } from '../../api/socialService';
import { useAuthStore } from '../../store/useAuthStore';

export interface TopResearcherCardProps {
  researcher: UserProfile;
  rank: number;
  hypeScore?: number;
  style?: ViewStyle;
}

export const TopResearcherCard: React.FC<TopResearcherCardProps> = ({
  researcher,
  rank,
  hypeScore,
  style,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const [isFollowing, setIsFollowing] = useState(Boolean(researcher.isFollowing));
  const [isSubmittingFollow, setIsSubmittingFollow] = useState(false);

  const displayScore = React.useMemo(() => {
    if (hypeScore && hypeScore > 0) {
      return hypeScore.toFixed(1);
    }
    const defaultScores = [4.9, 4.8, 4.7, 4.6, 4.5];
    return (defaultScores[rank - 1] ?? 4.4).toFixed(1);
  }, [hypeScore, rank]);

  const progressPercent = Math.min(100, Math.max(15, (parseFloat(displayScore) / 5.0) * 100));

  const getRankBadgeStyle = (r: number) => {
    if (r === 1) return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' };
    if (r === 2) return { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' };
    if (r === 3) return { bg: '#FFEDD5', text: '#C2410C', border: '#FED7AA' };
    return { bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0' };
  };

  const rankStyle = getRankBadgeStyle(rank);

  const handleCardPress = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    router.push({
      pathname: '/profile/[id]',
      params: {
        id: researcher.id,
        ...(researcher.orcidId ? { orcidId: researcher.orcidId } : {}),
      },
    });
  };

  const handleFollowToggle = async (e?: any) => {
    e?.stopPropagation?.();
    if (!currentUser?.id || isSubmittingFollow) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    const nextState = !isFollowing;
    setIsFollowing(nextState);
    setIsSubmittingFollow(true);

    try {
      if (nextState) {
        await followUser(currentUser.id, researcher.id);
      } else {
        await unfollowUser(currentUser.id, researcher.id);
      }
    } catch {
      setIsFollowing(!nextState); // Rollback
    } finally {
      setIsSubmittingFollow(false);
    }
  };

  // Extract top domain tags
  const tags = React.useMemo(() => {
    if (researcher.researchInterests && researcher.researchInterests.length > 0) {
      return researcher.researchInterests.slice(0, 2);
    }
    if (researcher.secondaryFields && researcher.secondaryFields.length > 0) {
      return researcher.secondaryFields.slice(0, 2);
    }
    if (researcher.primaryField) {
      return [researcher.primaryField];
    }
    return ['Neural Circuits', 'Optogenetics'];
  }, [researcher]);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handleCardPress}
      style={[styles.container, style]}
    >
      {/* Top Left Floating Rank Badge */}
      <View
        style={[
          styles.rankBadge,
          {
            backgroundColor: rankStyle.bg,
            borderColor: rankStyle.border,
          },
        ]}
      >
        <Text style={[styles.rankText, { color: rankStyle.text }]}>{rank}</Text>
      </View>

      {/* Centered Circular Avatar */}
      <View style={styles.avatarContainer}>
        <Avatar
          uri={researcher.avatarUrl}
          name={researcher.fullName}
          size={58}
        />
      </View>

      {/* Name and Affiliation */}
      <View style={styles.textDetails}>
        <Text style={styles.nameText} numberOfLines={1}>
          {researcher.fullName}
        </Text>
        <Text style={styles.institutionText} numberOfLines={1}>
          {researcher.institution || 'Leading Research Institution'}
        </Text>
      </View>

      {/* Researcher HYPE Score Box */}
      <View style={styles.hypeRow}>
        <Text style={styles.hypePrefix}>HYPE</Text>
        <Text style={styles.hypeScoreText}>{displayScore}</Text>
      </View>

      {/* Dark Forest Green Progress Bar */}
      <View style={styles.progressTrack}>
        <View
          style={[styles.progressBar, { width: `${progressPercent}%` }]}
        />
      </View>

      {/* Domain Specialty Tags */}
      <View style={styles.tagsContainer}>
        {tags.map((tag, idx) => (
          <View key={`${tag}-${idx}`} style={styles.tagBadge}>
            <Text style={styles.tagText} numberOfLines={1}>
              {tag}
            </Text>
          </View>
        ))}
      </View>

      {/* Actions Row (Follow Button + Connect Icon) */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          onPress={handleFollowToggle}
          activeOpacity={0.85}
          style={[
            styles.followButton,
            isFollowing && styles.followingButton,
          ]}
        >
          <Text
            style={[
              styles.followButtonText,
              isFollowing && styles.followingButtonText,
            ]}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleCardPress}
          activeOpacity={0.8}
          style={styles.connectButton}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          {isFollowing ? (
            <UserCheck size={16} color="#1B4D3E" />
          ) : (
            <UserPlus size={16} color="#1B4D3E" />
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 172,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    position: 'relative',
  },
  rankBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  rankText: {
    ...typography.microBold,
    fontSize: 11,
    fontWeight: '800',
  },
  avatarContainer: {
    marginTop: 6,
    marginBottom: 8,
  },
  textDetails: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 6,
  },
  nameText: {
    ...typography.bodyBold,
    fontSize: 13.5,
    color: '#0F172A',
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  institutionText: {
    ...typography.caption,
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
  },
  hypeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 2,
    marginBottom: 4,
  },
  hypePrefix: {
    ...typography.microBold,
    fontSize: 9.5,
    letterSpacing: 0.6,
    color: '#64748B',
  },
  hypeScoreText: {
    ...typography.h3,
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '800',
  },
  progressTrack: {
    width: '100%',
    height: 3,
    backgroundColor: '#E2E8F0',
    borderRadius: radii.full,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#1B4D3E',
    borderRadius: radii.full,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 10,
    minHeight: 22,
  },
  tagBadge: {
    backgroundColor: '#EAF3EE',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: radii.full,
    maxWidth: 78,
  },
  tagText: {
    ...typography.micro,
    fontSize: 9.5,
    color: '#1B4D3E',
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 6,
  },
  followButton: {
    flex: 1,
    backgroundColor: '#1B4D3E',
    paddingVertical: 7,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followingButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  followButtonText: {
    ...typography.captionBold,
    fontSize: 11.5,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  followingButtonText: {
    color: '#1E293B',
  },
  connectButton: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
