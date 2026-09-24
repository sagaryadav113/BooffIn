import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { colors, spacing } from '../../theme';
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
  style?: ViewStyle;
  showMutualInterests?: boolean;
}

export const ResearcherCard: React.FC<ResearcherCardProps> = ({
  researcher,
  onFollowToggle,
  style,
  showMutualInterests = true,
}) => {
  const currentUser = useAuthStore((s) => s.user);

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

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handlePress}
      style={[styles.container, style]}
    >
      <Avatar
        url={researcher.avatarUrl}
        name={researcher.fullName}
        size={44}
        verified={researcher.orcidVerified}
      />

      <View style={styles.metaContainer}>
        <View style={styles.nameRow}>
          <Typography variant="captionBold" color={colors.textPrimary}>
            {researcher.fullName}
          </Typography>
          <Typography variant="micro" color={colors.textSecondary}>
            @{researcher.handle}
          </Typography>
        </View>

        <Typography variant="micro" color={colors.textSecondary} numberOfLines={1} style={styles.roleText}>
          {researcher.academicTitle} · {researcher.institution}
        </Typography>

        {mutualInterests.length > 0 && (
          <View style={styles.mutualRow}>
            <Sparkles size={11} color="#2563EB" style={{ marginRight: 3 }} />
            <Typography variant="micro" color="#1E40AF" style={{ fontSize: 10, fontWeight: '600' }} numberOfLines={1}>
              Mutual: {mutualInterests.slice(0, 2).join(', ')}{mutualInterests.length > 2 ? ` +${mutualInterests.length - 2}` : ''}
            </Typography>
          </View>
        )}
      </View>

      {onFollowToggle && (
        <Button
          title={researcher.isFollowing ? 'Following' : 'Follow'}
          variant={researcher.isFollowing ? 'outline' : 'primary'}
          size="sm"
          onPress={onFollowToggle}
          style={styles.followButton}
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  metaContainer: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  roleText: {
    marginTop: 2,
  },
  mutualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  followButton: {
    minWidth: 86,
  },
});
