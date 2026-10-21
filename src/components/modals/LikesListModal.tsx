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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Search } from 'lucide-react-native';
import { colors as defaultColors, radii, spacing, typography, useTheme } from '../../theme';
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
  const { colors, isDark } = useTheme();
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
              <View style={styles.titleRow}>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Liked by</Text>
                {(likers.length > 0 || (likesCount !== undefined && likesCount > 0)) && (
                  <View
                    style={[
                      styles.countBadge,
                      {
                        backgroundColor: isDark ? 'rgba(16, 185, 129, 0.14)' : 'rgba(6, 78, 59, 0.08)',
                        borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(6, 78, 59, 0.2)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.countBadgeText,
                        { color: isDark ? '#34D399' : '#064E3B' },
                      ]}
                    >
                      {likers.length > 0 ? likers.length : likesCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                Researchers who endorsed this post
              </Text>
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

          {/* Optional Search Bar when there are multiple likers */}
          {likers.length > 4 && (
            <View
              style={[
                styles.searchBarContainer,
                {
                  backgroundColor: isDark ? '#161D2A' : colors.backgroundSecondary,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border,
                },
              ]}
            >
              <Search size={16} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
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
              <ActivityIndicator size="small" color={isDark ? '#10B981' : '#064E3B'} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading endorsements...</Text>
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
              data={filteredLikers}
              keyExtractor={(item) => item.id}
              style={{ backgroundColor: isDark ? '#111622' : colors.background }}
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
                  tintColor={isDark ? '#10B981' : '#064E3B'}
                  colors={[isDark ? '#10B981' : '#064E3B']}
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    ...typography.h3,
    fontSize: 18,
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  countBadgeText: {
    ...typography.microBold,
    fontSize: 11,
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
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    height: 38,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    fontSize: 13.5,
    paddingVertical: 0,
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

