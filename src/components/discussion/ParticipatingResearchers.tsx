import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Users } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { UserProfile } from '../../types';
import { Avatar } from '../core/Avatar';

export interface ParticipatingResearchersProps {
  researchers: UserProfile[];
}

export const ParticipatingResearchers: React.FC<ParticipatingResearchersProps> = ({
  researchers,
}) => {
  if (!researchers || researchers.length === 0) return null;

  const handlePress = (id: string) => {
    router.push({
      pathname: '/profile/[id]',
      params: { id },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Users size={15} color={colors.textPrimary} />
          <Text style={styles.headerTitle}>Participating Researchers</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{researchers.length}</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
      >
        {researchers.map((user) => (
          <TouchableOpacity
            key={user.id}
            onPress={() => handlePress(user.id)}
            style={styles.researcherCard}
            activeOpacity={0.8}
          >
            <Avatar
              url={user.avatarUrl}
              name={user.fullName}
              size={42}
              verified={user.orcidVerified}
            />
            <Text style={styles.nameText} numberOfLines={1}>
              {user.fullName}
            </Text>
            <Text style={styles.roleText} numberOfLines={1}>
              {user.academicTitle || user.institution || 'Researcher'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingVertical: spacing.sm + 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs + 2,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 13,
  },
  countBadge: {
    backgroundColor: colors.backgroundTertiary,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: radii.full,
  },
  countText: {
    ...typography.micro,
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 11,
  },
  scrollList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  researcherCard: {
    alignItems: 'center',
    width: 96,
    paddingVertical: spacing.xs,
    paddingHorizontal: 4,
    backgroundColor: colors.backgroundCard,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  nameText: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 11.5,
    marginTop: 6,
    textAlign: 'center',
  },
  roleText: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 1,
    textAlign: 'center',
  },
});
