import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { X, Search } from 'lucide-react-native';
import { radii, spacing, typography, useTheme } from '../../theme';
import { UserProfile } from '../../types';
import { ResearcherCard } from '../cards/ResearcherCard';
import { EmptyState } from '../feedback/EmptyState';
import { fetchFollowers, fetchFollowing } from '../../api/socialService';
import { useAuthStore } from '../../store/useAuthStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface FollowListModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  type: 'followers' | 'following';
  userName?: string;
}

export const FollowListModal: React.FC<FollowListModalProps> = ({
  visible,
  onClose,
  userId,
  type,
  userName = 'Researcher',
}) => {
  const { colors, isDark } = useTheme();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const toggleFollowUser = useAuthStore((s) => s.toggleFollowUser);
  const removeFollowerUser = useAuthStore((s) => s.removeFollowerUser);

  const [researchers, setResearchers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingFollowerId, setRemovingFollowerId] = useState<string | null>(null);

  const isOwnFollowersList = currentUserId === userId && type === 'followers';

  const handleRemoveFollower = (target: UserProfile) => {
    const confirmTitle = 'Remove Follower?';
    const confirmMsg = `Are you sure you want to remove @${target.handle} from your followers? They will not be notified.`;

    const executeRemove = async () => {
      setRemovingFollowerId(target.id);
      try {
        await removeFollowerUser(target.id);
        setResearchers((prev) => prev.filter((r) => r.id !== target.id));
      } finally {
        setRemovingFollowerId(null);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`${confirmTitle}\n${confirmMsg}`)) {
        executeRemove();
      }
    } else {
      Alert.alert(
        confirmTitle,
        confirmMsg,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: executeRemove },
        ]
      );
    }
  };

  const loadData = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);

    try {
      const res =
        type === 'followers'
          ? await fetchFollowers(userId, currentUserId)
          : await fetchFollowing(userId, currentUserId);

      if (res.error) {
        setError(res.error);
      } else {
        setResearchers(res.researchers);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load list');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userId, type, currentUserId]);

  useEffect(() => {
    if (visible && userId) {
      loadData();
    } else {
      setResearchers([]);
      setSearchQuery('');
      setIsLoading(true);
    }
  }, [visible, userId, loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const filteredResearchers = researchers.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.fullName?.toLowerCase().includes(q) ||
      r.handle?.toLowerCase().includes(q) ||
      r.institution?.toLowerCase().includes(q) ||
      r.academicTitle?.toLowerCase().includes(q)
    );
  });

  const title = type === 'followers' ? 'Followers' : 'Following';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Dimmed backdrop - tap outside to dismiss */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View
          style={[
            styles.backdrop,
            { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.72)' : 'rgba(15, 23, 42, 0.45)' },
          ]}
        />
      </TouchableWithoutFeedback>

      {/* Instagram-style Bottom Sheet Wrapper */}
      <View style={styles.sheetWrapper} pointerEvents="box-none">
        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: isDark ? '#111622' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            },
          ]}
        >
          {/* Centered Drag Handle */}
          <View style={styles.dragHandleContainer}>
            <View
              style={[
                styles.dragHandle,
                { backgroundColor: isDark ? '#3E4C63' : '#D1D5DB' },
              ]}
            />
          </View>

          {/* Centered Header */}
          <View
            style={[
              styles.header,
              { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)' },
            ]}
          >
            <View style={styles.headerTitleWrap}>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{title}</Text>
              {researchers.length > 0 && (
                <View
                  style={[
                    styles.countBadge,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.countBadgeText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {researchers.length}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeButton,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.04)' },
              ]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Instagram-style Search Bar */}
          <View
            style={[
              styles.searchBarContainer,
              {
                backgroundColor: isDark ? '#1C2434' : '#F1F3F5',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
              },
            ]}
          >
            <Search size={16} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search"
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
          </View>

          {/* Content */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={isDark ? '#10B981' : colors.textPrimary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading {title.toLowerCase()}...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              <TouchableOpacity
                onPress={loadData}
                style={[styles.retryButton, { backgroundColor: isDark ? '#10B981' : '#064E3B' }]}
              >
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredResearchers}
              keyExtractor={(item) => item.id}
              style={{ backgroundColor: 'transparent' }}
              renderItem={({ item }) => (
                <ResearcherCard
                  researcher={item}
                  onFollowToggle={() => toggleFollowUser(item.id)}
                  onRemoveFollower={isOwnFollowersList ? () => handleRemoveFollower(item) : undefined}
                  isRemoving={removingFollowerId === item.id}
                  style={{
                    backgroundColor: 'transparent',
                    borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                  }}
                />
              )}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                  tintColor={isDark ? '#10B981' : colors.textPrimary}
                  colors={[isDark ? '#10B981' : '#064E3B']}
                />
              }
              ListEmptyComponent={
                <EmptyState
                  icon="Users"
                  title={searchQuery ? 'No results found' : `No ${title.toLowerCase()} yet`}
                  description={
                    searchQuery
                      ? `No accounts found for "${searchQuery}".`
                      : type === 'followers'
                      ? `${userName} does not have any followers yet.`
                      : `${userName} is not following any researchers yet.`
                  }
                />
              }
              contentContainerStyle={
                filteredResearchers.length === 0 ? styles.emptyListContent : styles.listContent
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheetContainer: {
    width: '100%',
    maxWidth: 560,
    height: Math.min(SCREEN_HEIGHT * 0.62, 540),
    maxHeight: '75%',
    minHeight: 360,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 24,
  },
  dragHandleContainer: {
    paddingTop: 10,
    paddingBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    position: 'relative',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  countBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  closeButton: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 8,
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    height: 38,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    fontSize: 14,
    paddingVertical: 0,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    minHeight: 180,
  },
  loadingText: {
    ...typography.caption,
    marginTop: spacing.sm,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    minHeight: 180,
  },
  errorText: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  retryText: {
    ...typography.captionBold,
    color: '#FFFFFF',
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 200,
  },
});
