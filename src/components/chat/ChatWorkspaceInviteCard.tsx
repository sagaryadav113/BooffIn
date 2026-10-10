import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Users, Shield, ArrowUpRight } from 'lucide-react-native';
import { WorkspaceInviteMetadata } from '../../types/workspace';
import { Avatar } from '../core/Avatar';

interface ChatWorkspaceInviteCardProps {
  inviteMeta: WorkspaceInviteMetadata;
  isMe?: boolean;
}

export const ChatWorkspaceInviteCard: React.FC<ChatWorkspaceInviteCardProps> = ({
  inviteMeta,
  isMe = false,
}) => {
  const handleOpenWorkspace = () => {
    if (inviteMeta.id) {
      router.push(`/workspace/${inviteMeta.id}` as any);
    }
  };

  const isInnerCircle = inviteMeta.type === 'inner_circle';

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handleOpenWorkspace}
      style={[
        styles.cardContainer,
        isMe ? styles.cardMy : styles.cardOther,
      ]}
    >
      <View style={styles.headerBadgeRow}>
        <View
          style={[
            styles.badgePill,
            { backgroundColor: isInnerCircle ? '#ECFDF5' : '#EFF6FF' },
          ]}
        >
          {isInnerCircle ? (
            <Shield size={11} color="#164E3F" />
          ) : (
            <Users size={11} color="#2563EB" />
          )}
          <Text
            style={[
              styles.badgePillText,
              { color: isInnerCircle ? '#164E3F' : '#2563EB' },
            ]}
          >
            {isInnerCircle ? 'INNER CIRCLE POD' : 'COMMUNITY WORKSPACE'}
          </Text>
        </View>
        <ArrowUpRight size={14} color="#64748B" />
      </View>

      <View style={styles.workspaceRow}>
        <Avatar uri={inviteMeta.avatarUrl || undefined} name={inviteMeta.name} size="sm" />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.workspaceTitle} numberOfLines={1}>
            {inviteMeta.name || 'Workspace Pod'}
          </Text>
          {typeof inviteMeta.members_count === 'number' && (
            <Text style={styles.membersCountText}>
              👥 {inviteMeta.members_count} researcher{inviteMeta.members_count === 1 ? '' : 's'}
            </Text>
          )}
        </View>
      </View>

      {inviteMeta.description ? (
        <Text style={styles.descText} numberOfLines={2}>
          {inviteMeta.description}
        </Text>
      ) : null}

      <View style={styles.cardFooter}>
        <View style={styles.joinActionBtn}>
          <Text style={styles.joinActionBtnText}>View & Join Workspace</Text>
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
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgePillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  workspaceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  workspaceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  membersCountText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  descText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
    marginBottom: 8,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    alignItems: 'center',
  },
  joinActionBtn: {
    backgroundColor: '#164E3F',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  joinActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
