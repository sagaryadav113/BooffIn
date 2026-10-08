import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Shield, Users, Lock, MessageSquare, CheckCircle2 } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { Avatar } from '../core/Avatar';
import { Workspace } from '../../types/workspace';

interface WorkspaceCardProps {
  workspace: Workspace;
  onPress?: () => void;
}

export const WorkspaceCard: React.FC<WorkspaceCardProps> = ({ workspace, onPress }) => {
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/workspace/${workspace.id}` as any);
    }
  };

  const isDM = workspace.type === 'dm';
  const isCommunity = workspace.type === 'community';
  const isInnerCircle = workspace.type === 'inner_circle';

  const unreadCount = workspace.unread_count || 0;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      style={[styles.container, unreadCount > 0 && styles.unreadBorder]}
    >
      {/* Avatar / Icon Section */}
      <View style={styles.avatarWrapper}>
        {isDM ? (
          <Avatar
            uri={workspace.other_user?.avatarUrl || workspace.avatar_url || undefined}
            name={workspace.other_user?.fullName || workspace.name}
            size="md"
          />
        ) : isInnerCircle ? (
          <View style={styles.innerCircleAvatar}>
            <Lock size={20} color="#064E3B" />
          </View>
        ) : (
          <View style={styles.communityAvatar}>
            <Users size={20} color="#1E3A8A" />
          </View>
        )}

        {/* Small Type Icon overlay */}
        <View style={styles.typeBadgeWrapper}>
          {isDM ? (
            <MessageSquare size={10} color="#FFFFFF" />
          ) : isInnerCircle ? (
            <Shield size={10} color="#FFFFFF" />
          ) : (
            <Users size={10} color="#FFFFFF" />
          )}
        </View>
      </View>

      {/* Main Info */}
      <View style={styles.infoSection}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>
            {isDM
              ? workspace.other_user?.fullName || workspace.name || 'Researcher'
              : workspace.name}
          </Text>

          {isDM && workspace.other_user?.orcidVerified && (
            <CheckCircle2 size={13} color={colors.accentGreen} style={{ marginLeft: 4 }} />
          )}

          {/* Unread badge */}
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>

        {/* Subtitle / Details */}
        <View style={styles.metaRow}>
          {isDM ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {workspace.other_user?.academicTitle
                ? `${workspace.other_user.academicTitle}${workspace.other_user.institution ? ' · ' + workspace.other_user.institution : ''}`
                : workspace.other_user?.institution ||
                  (workspace.other_user?.handle ? `@${workspace.other_user.handle}` : '1-on-1 DM · Mutual Follow')}
            </Text>
          ) : isInnerCircle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {workspace.description || 'Private research pod (max 25 members · E2EE)'}
            </Text>
          ) : (
            <Text style={styles.subtitle} numberOfLines={1}>
              {workspace.description || 'Research community & discussions'}
            </Text>
          )}
        </View>

        {/* Tags Row: Type, Price Tier, Members */}
        <View style={styles.tagsRow}>
          {isDM ? (
            <View style={[styles.tag, styles.tagDM]}>
              <Text style={styles.tagTextDM}>1-on-1 DM · Mutual Follow</Text>
            </View>
          ) : isInnerCircle ? (
            <>
              <View style={[styles.tag, styles.tagInner]}>
                <Text style={styles.tagTextInner}>Inner Circle · Max 25</Text>
              </View>
              {workspace.e2ee_enabled && (
                <View style={[styles.tag, styles.tagE2EE]}>
                  <Text style={styles.tagTextE2EE}>E2EE Encrypted</Text>
                </View>
              )}
            </>
          ) : (
            <>
              <View style={[styles.tag, styles.tagCommunity]}>
                <Text style={styles.tagTextCommunity}>Community</Text>
              </View>
              {workspace.subscription_price_inr > 0 ? (
                <View style={[styles.tag, styles.tagPaid]}>
                  <Text style={styles.tagTextPaid}>₹{workspace.subscription_price_inr}/mo</Text>
                </View>
              ) : (
                <View style={[styles.tag, styles.tagFree]}>
                  <Text style={styles.tagTextFree}>Free Access</Text>
                </View>
              )}
              {workspace.members_count !== undefined && (
                <Text style={styles.memberCountText}>
                  {workspace.members_count} {workspace.members_count === 1 ? 'member' : 'members'}
                </Text>
              )}
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: spacing.sm,
  },
  unreadBorder: {
    borderColor: '#064E3B',
    backgroundColor: '#F8FCF9',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: spacing.md,
  },
  innerCircleAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  communityAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  typeBadgeWrapper: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#064E3B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  infoSection: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  unreadBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  metaRow: {
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagDM: {
    backgroundColor: '#F1F5F9',
  },
  tagTextDM: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  tagInner: {
    backgroundColor: '#ECFDF5',
  },
  tagTextInner: {
    fontSize: 11,
    fontWeight: '600',
    color: '#064E3B',
  },
  tagE2EE: {
    backgroundColor: '#FEF3C7',
  },
  tagTextE2EE: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
  },
  tagCommunity: {
    backgroundColor: '#EFF6FF',
  },
  tagTextCommunity: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  tagPaid: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  tagTextPaid: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7E22CE',
  },
  tagFree: {
    backgroundColor: '#F0FDF4',
  },
  tagTextFree: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16A34A',
  },
  memberCountText: {
    fontSize: 11,
    color: '#94A3B8',
    marginLeft: 4,
  },
});
