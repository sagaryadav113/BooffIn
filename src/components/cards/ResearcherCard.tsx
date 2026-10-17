import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { colors, spacing, layout, typography } from '../../theme';
import { UserProfile } from '../../types';
import { Avatar } from '../core/Avatar';
import { Typography } from '../core/Typography';
import { Button } from '../core/Button';
import { useAuthStore } from '../../store/useAuthStore';
import { getSharedResearchInterests } from '../../api/connectionService';
import { Sparkles } from 'lucide-react-native';

export interface ResearcherCardProps {
  researcher: UserProfile;
  onFollowToggle?: () => void;
  onRemoveFollower?: () => void;
  isRemoving?: boolean;
  style?: ViewStyle;
  showMutualInterests?: boolean;
}

export const ResearcherCard: React.FC<ResearcherCardProps> = ({
  researcher,
  onFollowToggle,
  onRemoveFollower,
  isRemoving,
  style,
  showMutualInterests = true,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const isFollowing = useAuthStore((s) => s.followingIds.has(researcher.id));
  const isRequested = useAuthStore((s) => s.requestedUserIds.has(researcher.id));
  const followsYou = useAuthStore((s) => s.followerIds.has(researcher.id));
  const isLoading = useAuthStore((s) => s.followLoadingIds.has(researcher.id));
  const isSelf = Boolean(currentUser?.id && currentUser.id === researcher.id);

  // Sync initial isFollowing flag into global store set
  React.useEffect(() => {
    if (researcher.isFollowing && researcher.id) {
      useAuthStore.setState((state) => {
        if (!state.followingIds.has(researcher.id)) {
          const next = new Set(state.followingIds);
          next.add(researcher.id);
          return { followingIds: next };
        }
        return state;
      });
    }
  }, [researcher.id, researcher.isFollowing]);

  const mutualInterests = React.useMemo(() => {
    if (!showMutualInterests || !currentUser || currentUser.id === researcher.id) return [];
    return getSharedResearchInterests(currentUser, researcher);
  }, [currentUser, researcher, showMutualInterests]);

  const handlePress = () => {
    router.push({
      pathname: '/profile/[id]',
      params: { id: researcher.id },
    });
  };

  const followButtonTitle = isFollowing
    ? 'Following'
    : isRequested
    ? 'Requested'
    : followsYou
    ? 'Follow Back'
    : 'Follow';

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handlePress}
      style={[styles.container, style]}
    >
      <Avatar
        url={researcher.avatarUrl}
        name={researcher.fullName}
        size="md"
        verified={researcher.orcidVerified}
      />

      <View style={styles.metaContainer}>
        <View style={styles.nameRow}>
          <Typography variant="bodyBold" color={colors.textPrimary} style={styles.nameText}>
            {researcher.fullName}
          </Typography>
          <Typography variant="caption" color={colors.textSecondary} style={styles.handleText}>
            @{researcher.handle}
          </Typography>
        </View>

        <Typography variant="caption" color={colors.textSecondary} numberOfLines={1} style={styles.roleText}>
          {researcher.academicTitle} · {researcher.institution}
        </Typography>

        {mutualInterests.length > 0 && (
          <View style={styles.mutualRow}>
            <Sparkles size={12} color="#2563EB" style={{ marginRight: 4 }} />
            <Typography variant="metadata" color="#1E40AF" style={{ fontWeight: '600' }} numberOfLines={1}>
              Mutual: {mutualInterests.slice(0, 2).join(', ')}{mutualInterests.length > 2 ? ` +${mutualInterests.length - 2}` : ''}
            </Typography>
          </View>
        )}
      </View>

      <View style={styles.actionsContainer}>
        {onFollowToggle && !isSelf && (
          <Button
            title={followButtonTitle}
            variant={isFollowing || isRequested ? 'outline' : 'primary'}
            size="sm"
            loading={isLoading}
            disabled={isLoading}
            onPress={onFollowToggle}
            style={styles.followButton}
          />
        )}

        {onRemoveFollower && !isSelf && (
          <Button
            title="Remove"
            variant="outline"
            size="sm"
            loading={isRemoving}
            disabled={isRemoving}
            onPress={onRemoveFollower}
            style={styles.removeButton}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    minHeight: layout.touchTargetMin + 16,
  },
  metaContainer: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    flexWrap: 'wrap',
  },
  nameText: {
    fontSize: 15,
    fontWeight: '700',
  },
  handleText: {
    fontSize: 13.5,
  },
  roleText: {
    marginTop: 2,
    fontSize: 13,
  },
  mutualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  followButton: {
    minWidth: 84,
  },
  removeButton: {
    minWidth: 70,
  },
});
