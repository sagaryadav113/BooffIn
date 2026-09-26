import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Users, Sparkles, CheckCircle2 } from 'lucide-react-native';
import { colors, radii, spacing, fontSizes, shadows } from '../../theme';
import { Avatar } from '../core/Avatar';
import { UserProfile } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';
import { fetchFollowing } from '../../api/socialService';
import { supabase } from '../../api/client';
import { mapSupabaseProfile } from '../../api/socialService';

export interface MentionSuggestionsProps {
  query: string;
  onSelectUser: (handle: string, user: UserProfile) => void;
  maxResults?: number;
}

export const MentionSuggestions: React.FC<MentionSuggestionsProps> = ({
  query,
  onSelectUser,
  maxResults = 6,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const [followingList, setFollowingList] = useState<UserProfile[]>([]);
  const [searchedUsers, setSearchedUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 1. Fetch user's following list on mount
  useEffect(() => {
    let isMounted = true;
    async function loadFollowing() {
      if (!currentUser?.id) return;
      try {
        const res = await fetchFollowing(currentUser.id, currentUser.id, 50, 0);
        if (isMounted && res.researchers) {
          setFollowingList(res.researchers);
        }
      } catch (err) {
        console.warn('Failed to fetch following for mentions:', err);
      }
    }
    loadFollowing();
    return () => {
      isMounted = false;
    };
  }, [currentUser?.id]);

  // 2. Query other users from Supabase if searching
  useEffect(() => {
    let isMounted = true;
    const cleanQuery = query.trim().toLowerCase();

    if (!cleanQuery) {
      setSearchedUsers([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .or(`username.ilike.%${cleanQuery}%,full_name.ilike.%${cleanQuery}%`)
          .neq('id', currentUser.id)
          .limit(10);

        if (isMounted && !error && data) {
          const mapped = data.map((p) => mapSupabaseProfile(p));
          setSearchedUsers(mapped);
        }
      } catch {
        // Ignore search errors
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [query, currentUser.id]);

  // 3. Combine following matches first, then searched public users
  const suggestions = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    // Matching following users
    const matchedFollowing = cleanQuery
      ? followingList.filter(
          (u) =>
            u.handle.toLowerCase().includes(cleanQuery) ||
            u.fullName.toLowerCase().includes(cleanQuery)
        )
      : followingList;

    const followingIds = new Set(matchedFollowing.map((u) => u.id));

    // Matching other public users not in following
    const otherMatched = searchedUsers.filter((u) => !followingIds.has(u.id));

    return [...matchedFollowing, ...otherMatched].slice(0, maxResults);
  }, [query, followingList, searchedUsers, maxResults]);

  if (suggestions.length === 0 && !isLoading) {
    if (!query) return null;
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No researchers matching "@{query}"</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitleRow}>
          <Users size={13} color={colors.accentBlue} />
          <Text style={styles.headerTitle}>
            {query ? `Mentioning "${query}"` : 'Mention a colleague you follow'}
          </Text>
        </View>
        {isLoading && <ActivityIndicator size="small" color={colors.accentBlue} />}
      </View>

      <ScrollView
        style={styles.scrollList}
        keyboardShouldPersistTaps="always"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        {suggestions.map((user) => {
          const isFollowed = followingList.some((f) => f.id === user.id);
          return (
            <TouchableOpacity
              key={user.id}
              style={styles.userRow}
              onPress={() => onSelectUser(user.handle, user)}
              activeOpacity={0.7}
            >
              <Avatar
                url={user.avatarUrl}
                name={user.fullName}
                size="sm"
                verified={user.orcidVerified}
              />
              <View style={styles.userMeta}>
                <View style={styles.nameRow}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {user.fullName}
                  </Text>
                  {user.orcidVerified && (
                    <CheckCircle2 size={12} color={colors.accentGreen} style={{ marginLeft: 3 }} />
                  )}
                </View>
                <Text style={styles.userHandle}>@{user.handle}</Text>
                {user.institution ? (
                  <Text style={styles.userAffiliation} numberOfLines={1}>
                    {user.institution}
                  </Text>
                ) : null}
              </View>

              {isFollowed && (
                <View style={styles.followingBadge}>
                  <Text style={styles.followingBadgeText}>Following</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    maxHeight: 230,
    marginBottom: spacing.xs,
    overflow: 'hidden',
    ...shadows.floating,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    backgroundColor: colors.surfaceHover,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: fontSizes.micro,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  scrollList: {
    maxHeight: 180,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  userMeta: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: fontSizes.captionSmall,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  userHandle: {
    fontSize: fontSizes.micro,
    color: colors.accentBlue,
    fontWeight: '600',
    marginTop: 1,
  },
  userAffiliation: {
    fontSize: fontSizes.micro,
    color: colors.textSecondary,
    marginTop: 1,
  },
  followingBadge: {
    backgroundColor: colors.accentBlue + '12',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  followingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accentBlue,
  },
  emptyContainer: {
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: fontSizes.micro,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
