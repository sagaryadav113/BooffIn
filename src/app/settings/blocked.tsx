import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, radii, spacing } from '../../theme';
import { SettingsLayout } from '../../components/settings/SettingsLayout';
import { SettingsCardGroup } from '../../components/settings/SettingsCardGroup';
import { Typography } from '../../components/core/Typography';
import { Avatar } from '../../components/core/Avatar';
import { Icon } from '../../components/core/Icon';
import { fetchBlockedProfiles } from '../../api/settingsService';
import { unblockUser } from '../../api/moderationService';

interface BlockedItem {
  id: string;
  fullName: string;
  handle: string;
  avatarUrl?: string;
  academicTitle?: string;
}

export default function BlockedUsersScreen() {
  const [blockedUsers, setBlockedUsers] = useState<BlockedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  useEffect(() => {
    loadBlockedList();
  }, []);

  const loadBlockedList = async () => {
    setIsLoading(true);
    const list = await fetchBlockedProfiles();
    setBlockedUsers(list);
    setIsLoading(false);
  };

  const handleUnblock = async (targetUserId: string) => {
    setUnblockingId(targetUserId);
    const res = await unblockUser(targetUserId);
    setUnblockingId(null);

    if (res.success) {
      setBlockedUsers((prev) => prev.filter((u) => u.id !== targetUserId));
    }
  };

  return (
    <SettingsLayout
      title="Blocked Researchers"
      subtitle="Blocked accounts cannot view your research posts, cite your notes, or send you connection requests."
      isLoading={isLoading}
    >
      {blockedUsers.length > 0 ? (
        <SettingsCardGroup>
          {blockedUsers.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.userRow,
                index !== blockedUsers.length - 1 && styles.rowBorder,
              ]}
            >
              <Avatar
                uri={item.avatarUrl}
                name={item.fullName}
                size="md"
              />

              <View style={styles.userMeta}>
                <Typography variant="captionBold" color={colors.textPrimary}>
                  {item.fullName}
                </Typography>
                <Typography variant="micro" color={colors.textSecondary}>
                  @{item.handle} {item.academicTitle ? `· ${item.academicTitle}` : ''}
                </Typography>
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.unblockBtn}
                onPress={() => handleUnblock(item.id)}
                disabled={unblockingId === item.id}
              >
                {unblockingId === item.id ? (
                  <ActivityIndicator size="small" color={colors.textPrimary} />
                ) : (
                  <Typography variant="captionBold" color={colors.textPrimary}>
                    Unblock
                  </Typography>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </SettingsCardGroup>
      ) : (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Icon name="UserCheck" size="md" color={colors.textSecondary} />
          </View>
          <Typography variant="h3" color={colors.textPrimary} align="center">
            No Blocked Accounts
          </Typography>
          <Typography
            variant="caption"
            color={colors.textSecondary}
            align="center"
            style={styles.emptyDescription}
          >
            You haven't blocked any researchers. If someone violates community guidelines, you can block them directly from their profile menu.
          </Typography>
        </View>
      )}
    </SettingsLayout>
  );
}

const styles = StyleSheet.create({
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.cardBackground,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  userMeta: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  unblockBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderDark,
    backgroundColor: colors.cardBackground,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.lg,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyDescription: {
    marginTop: spacing.xs,
    maxWidth: 380,
    lineHeight: 18,
  },
});
