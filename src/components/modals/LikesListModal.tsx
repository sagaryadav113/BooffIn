import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Search } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { UserProfile } from '../../types';
import { ResearcherCard } from '../cards/ResearcherCard';
import { EmptyState } from '../feedback/EmptyState';
import { fetchPostLikers } from '../../api/socialService';
import { useAuthStore } from '../../store/useAuthStore';

export interface LikesListModalProps {
  visible: boolean;
  postId: string;
  onClose: () => void;
  likesCount?: number;
}

export const LikesListModal: React.FC<LikesListModalProps> = ({
  visible,
  postId,
  onClose,
  likesCount,
}) => {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const toggleFollowUser = useAuthStore((s) => s.toggleFollowUser);

  const [likers, setLikers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!postId) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetchPostLikers(postId, currentUserId);
      if (res.error) {
        setError(res.error);
      } else {
        setLikers(res.researchers);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load endorsements');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [postId, currentUserId]);

  useEffect(() => {
    if (visible && postId) {
      loadData();
    } else {
      setLikers([]);
      setSearchQuery('');
      setIsLoading(true);
    }
  }, [visible, postId, loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const filteredLikers = likers.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.fullName?.toLowerCase().includes(q) ||
      r.handle?.toLowerCase().includes(q) ||
      r.institution?.toLowerCase().includes(q) ||
      r.academicTitle?.toLowerCase().includes(q)
    );
  });


  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.headerTitle}>Liked by</Text>
              {(likers.length > 0 || (likesCount !== undefined && likesCount > 0)) && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>
                    {likers.length > 0 ? likers.length : likesCount}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.headerSubtitle}>
              Researchers who endorsed this post
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <X size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Optional Search Bar when there are multiple likers */}
        {likers.length > 4 && (
          <View style={styles.searchBarContainer}>
            <Search size={16} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search researchers..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
          </View>
        )}

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#064E3B" />
            <Text style={styles.loadingText}>Loading endorsements...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadData} style={styles.retryButton}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredLikers}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ResearcherCard
                researcher={item}
                onFollowToggle={() => toggleFollowUser(item.id)}
              />
            )}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor="#064E3B"
                colors={['#064E3B']}
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon="Users"
                title={searchQuery ? 'No matching researchers' : 'No endorsements yet'}
                description={
                  searchQuery
                    ? `No researchers found matching "${searchQuery}".`
                    : 'Be the first to endorse this scientific post.'
                }
              />
            }
            contentContainerStyle={
              filteredLikers.length === 0 ? styles.emptyListContent : styles.listContent
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.white,
  },
  titleContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    ...typography.h3,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  countBadge: {
    backgroundColor: 'rgba(6, 78, 59, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(6, 78, 59, 0.2)',
  },
  countBadgeText: {
    ...typography.microBold,
    fontSize: 11,
    color: '#064E3B',
    fontWeight: '700',
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    padding: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: colors.backgroundSecondary,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    height: 38,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    fontSize: 13.5,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorText: {
    ...typography.body,
    color: colors.accentRed,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: '#064E3B',
    borderRadius: radii.md,
  },
  retryText: {
    ...typography.captionBold,
    color: colors.white,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
});
