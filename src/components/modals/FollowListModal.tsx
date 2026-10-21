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
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Users } from 'lucide-react-native';
import { colors, radii, spacing, typography, useTheme } from '../../theme';
import { UserProfile } from '../../types';
import { ResearcherCard } from '../cards/ResearcherCard';
import { EmptyState } from '../feedback/EmptyState';
import { fetchFollowers, fetchFollowing } from '../../api/socialService';
import { useAuthStore } from '../../store/useAuthStore';

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
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingFollowerId, setRemovingFollowerId] = useState<string | null>(null);

  const isOwnFollowersList = type === 'followers' && Boolean(currentUserId && userId === currentUserId);

  const handleRemoveFollower = (target: UserProfile) => {
    const confirmTitle = 'Remove follower?';
    const confirmMsg = `BooffIn won't notify @${target.handle} that they were removed from your followers.`;

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
      setIsLoading(true);
    }
  }, [visible, userId, loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const title = type === 'followers' ? 'Followers' : 'Following';

  const isWeb = Platform.OS === 'web';

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isWeb ? 'fade' : 'slide'}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View
          style={[
            styles.backdrop,
            { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.78)' : 'rgba(15, 23, 42, 0.5)' },
          ]}
        />
      </TouchableWithoutFeedback>

      <View style={[styles.sheetWrapper, isWeb ? styles.sheetWrapperWeb : styles.sheetWrapperMobile]} pointerEvents="box-none">
        <View
          style={[
            styles.sheetContainer,
            isWeb ? styles.sheetContainerWeb : styles.sheetContainerMobile,
            {
              backgroundColor: isDark ? '#111622' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border,
            },
          ]}
        >
          {!isWeb && (
            <View
              style={[
                styles.dragHandle,
                { backgroundColor: isDark ? '#334155' : '#CBD5E1' },
              ]}
            />
          )}

          {/* Header */}
          <View
            style={[
              styles.header,
              {
                backgroundColor: isDark ? '#161B26' : colors.backgroundCard,
                borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.07)' : colors.border,
              },
            ]}
          >
            <View style={styles.titleContainer}>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{title}</Text>
              {userName ? (
                <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                  {userName}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeButton,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.07)' : colors.backgroundSecondary },
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <X size={18} color={colors.textPrimary} />
            </TouchableOpacity>
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
              data={researchers}
              keyExtractor={(item) => item.id}
              style={{ backgroundColor: isDark ? '#111622' : colors.background }}
              renderItem={({ item }) => (
                <ResearcherCard
                  researcher={item}
                  onFollowToggle={() => toggleFollowUser(item.id)}
                  onRemoveFollower={isOwnFollowersList ? () => handleRemoveFollower(item) : undefined}
                  isRemoving={removingFollowerId === item.id}
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
                  title={`No ${title.toLowerCase()} yet`}
                  description={
                    type === 'followers'
                      ? `${userName} does not have any followers yet.`
                      : `${userName} is not following any researchers yet.`
                  }
                />
              }
              contentContainerStyle={researchers.length === 0 ? styles.emptyListContent : styles.listContent}
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
  },
  sheetWrapperWeb: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sheetWrapperMobile: {
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    width: '100%',
    overflow: 'hidden',
  },
  sheetContainerWeb: {
    maxWidth: 580,
    maxHeight: '85%',
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 24,
  },
  sheetContainerMobile: {
    maxHeight: '88%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  titleContainer: {
    flex: 1,
  },
  headerTitle: {
    ...typography.h3,
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...typography.caption,
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    padding: 7,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    minHeight: 200,
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
    minHeight: 200,
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
    paddingBottom: spacing.xxl,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 220,
  },
});
