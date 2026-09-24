import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { UserCheck, UserPlus, Compass } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { InterestedPerson } from '../../types';
import { Avatar } from '../core/Avatar';

export interface PeopleInterestedSectionProps {
  people: InterestedPerson[];
  onFollowToggle?: (userId: string, isNowFollowing: boolean) => void;
}

export const PeopleInterestedSection: React.FC<PeopleInterestedSectionProps> = ({
  people,
  onFollowToggle,
}) => {
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  if (!people || people.length === 0) return null;

  const handleToggleFollow = (userId: string, currentFollowing: boolean) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const isNow = !currentFollowing;
    setFollowingMap((prev) => ({ ...prev, [userId]: isNow }));
    if (onFollowToggle) {
      onFollowToggle(userId, isNow);
    }
  };

  const handleProfilePress = (userId: string) => {
    router.push({
      pathname: '/profile/[id]',
      params: { id: userId },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Compass size={16} color={colors.textPrimary} />
          <Text style={styles.headerTitle}>People interested in this</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          Based on topic follows and research interactions
        </Text>
      </View>

      <View style={styles.list}>
        {people.map((item) => {
          const user = item.user;
          const isFollowing =
            followingMap[user.id] !== undefined
              ? followingMap[user.id]
              : Boolean(user.isFollowing);

          return (
            <View key={user.id} style={styles.personRow}>
              <TouchableOpacity
                onPress={() => handleProfilePress(user.id)}
                style={styles.personMeta}
                activeOpacity={0.8}
              >
                <Avatar
                  url={user.avatarUrl}
                  name={user.fullName}
                  size={42}
                  verified={user.orcidVerified}
                />
                <View style={styles.personTextContainer}>
                  <View style={styles.personNameRow}>
                    <Text style={styles.personName}>{user.fullName}</Text>
                    <Text style={styles.personHandle}>@{user.handle}</Text>
                  </View>

                  <Text style={styles.personTitle} numberOfLines={1}>
                    {user.academicTitle} · {user.institution}
                  </Text>

                  {/* Explicit Relevance Reason */}
                  <View style={styles.reasonBadge}>
                    <Text style={styles.reasonText}>{item.reason}</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Follow Button */}
              <TouchableOpacity
                onPress={() => handleToggleFollow(user.id, isFollowing)}
                style={[
                  styles.followButton,
                  isFollowing && styles.followingButton,
                ]}
                activeOpacity={0.8}
              >
                {isFollowing ? (
                  <>
                    <UserCheck size={13} color={colors.textPrimary} />
                    <Text style={styles.followingButtonText}>Following</Text>
                  </>
                ) : (
                  <>
                    <UserPlus size={13} color={colors.white} />
                    <Text style={styles.followButtonText}>Follow</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundCard,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  header: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 14,
  },
  headerSubtitle: {
    ...typography.micro,
    color: colors.textSecondary,
    marginTop: 2,
    fontSize: 11,
  },
  list: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  personMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
    gap: spacing.sm,
  },
  personTextContainer: {
    flex: 1,
  },
  personNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  personName: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 13,
  },
  personHandle: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 11.5,
  },
  personTitle: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  reasonBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radii.sm,
    marginTop: 3,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  reasonText: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.black,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    gap: 4,
    minWidth: 80,
    justifyContent: 'center',
  },
  followingButton: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  followButtonText: {
    ...typography.micro,
    color: colors.white,
    fontWeight: '700',
    fontSize: 12,
  },
  followingButtonText: {
    ...typography.micro,
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 12,
  },
});
