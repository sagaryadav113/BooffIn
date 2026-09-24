import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { colors, spacing } from '../../theme';
import { UserProfile } from '../../types';
import { Avatar } from '../core/Avatar';
import { Typography } from '../core/Typography';
import { Button } from '../core/Button';

export interface ResearcherCardProps {
  researcher: UserProfile;
  onFollowToggle?: () => void;
  style?: ViewStyle;
}

export const ResearcherCard: React.FC<ResearcherCardProps> = ({
  researcher,
  onFollowToggle,
  style,
}) => {
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
  followButton: {
    minWidth: 86,
  },
});
