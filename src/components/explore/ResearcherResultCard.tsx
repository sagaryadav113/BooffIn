import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { Award, GraduationCap, Building2 } from 'lucide-react-native';
import { Avatar } from '../core/Avatar';
import { ResearcherSearchResult } from '../../api/search/types';
import { colors, radii, spacing, typography } from '../../theme';

interface ResearcherResultCardProps {
  researcher: ResearcherSearchResult;
  style?: ViewStyle;
}

export const ResearcherResultCard: React.FC<ResearcherResultCardProps> = ({
  researcher,
  style,
}) => {
  const handlePress = () => {
    if (researcher.isRegisteredUser) {
      router.push({
        pathname: '/profile/[id]',
        params: { id: researcher.id },
      });
    } else if (researcher.orcidId) {
      router.push({
        pathname: '/profile/[id]',
        params: { id: researcher.id, orcidId: researcher.orcidId },
      });
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      style={[styles.container, style]}
    >
      <Avatar
        uri={researcher.avatarUrl}
        name={researcher.fullName}
        size={46}
      />

      <View style={styles.infoCol}>
        <View style={styles.nameRow}>
          <Text style={styles.nameText} numberOfLines={1}>
            {researcher.fullName}
          </Text>
          {researcher.orcidVerified && (
            <View style={styles.orcidBadge}>
              <Award size={12} color="#A6CE39" />
              <Text style={styles.orcidBadgeText}>ORCID</Text>
            </View>
          )}
        </View>

        <Text style={styles.handleText} numberOfLines={1}>
          @{researcher.handle}
          {researcher.academicTitle ? ` · ${researcher.academicTitle}` : ''}
        </Text>

        {researcher.institution ? (
          <View style={styles.institutionRow}>
            <Building2 size={12} color={colors.textSecondary} />
            <Text style={styles.institutionText} numberOfLines={1}>
              {researcher.institution}
            </Text>
          </View>
        ) : null}

        {researcher.worksCount !== undefined && researcher.worksCount > 0 && (
          <View style={styles.statsRow}>
            <GraduationCap size={12} color={colors.accentLink} />
            <Text style={styles.statsText}>
              {researcher.worksCount} verified publications
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.cardBackground,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  infoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  nameText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 15,
  },
  orcidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F3F8EA',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: radii.full,
    borderWidth: 0.5,
    borderColor: '#D4E8B0',
  },
  orcidBadgeText: {
    ...typography.microBold,
    color: '#4D6B18',
    fontSize: 10,
  },
  handleText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12.5,
    marginBottom: 3,
  },
  institutionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  institutionText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  statsText: {
    ...typography.microBold,
    color: colors.accentLink,
    fontSize: 11.5,
  },
});
