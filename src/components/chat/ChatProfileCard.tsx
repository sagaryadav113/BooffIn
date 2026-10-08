import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { CheckCircle2, User, ArrowUpRight } from 'lucide-react-native';
import { WorkspaceProfileMetadata } from '../../types/workspace';
import { Avatar } from '../core/Avatar';

interface ChatProfileCardProps {
  profileMeta: WorkspaceProfileMetadata;
  isMe?: boolean;
}

export const ChatProfileCard: React.FC<ChatProfileCardProps> = ({ profileMeta, isMe = false }) => {
  const handleOpenProfile = () => {
    if (profileMeta.id) {
      router.push(`/profile/${profileMeta.id}` as any);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handleOpenProfile}
      style={[
        styles.cardContainer,
        isMe ? styles.cardMy : styles.cardOther,
      ]}
    >
      <View style={styles.headerBadgeRow}>
        <View style={styles.badgePill}>
          <User size={11} color="#164E3F" />
          <Text style={styles.badgePillText}>RESEARCHER PROFILE</Text>
        </View>
        <ArrowUpRight size={14} color="#64748B" />
      </View>

      <View style={styles.profileRow}>
        <Avatar
          uri={profileMeta.avatarUrl || undefined}
          name={profileMeta.fullName || 'Researcher'}
          size="md"
        />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={styles.fullNameText} numberOfLines={1}>
              {profileMeta.fullName || 'Researcher'}
            </Text>
            {profileMeta.orcidVerified && (
              <CheckCircle2 size={13} color="#10B981" />
            )}
          </View>
          <Text style={styles.handleText} numberOfLines={1}>
            @{profileMeta.handle || 'researcher'}
          </Text>
          <Text style={styles.academicTitleText} numberOfLines={1}>
            {profileMeta.academicTitle || 'Academic Researcher'}
          </Text>
          {profileMeta.institution ? (
            <Text style={styles.institutionText} numberOfLines={1}>
              🏛️ {profileMeta.institution}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.viewProfileBtnText}>View Full Profile</Text>
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
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fullNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  handleText: {
    fontSize: 12,
    color: '#64748B',
  },
  academicTitleText: {
    fontSize: 11,
    color: '#334155',
    marginTop: 2,
  },
  institutionText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    alignItems: 'center',
  },
  viewProfileBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#164E3F',
  },
});
