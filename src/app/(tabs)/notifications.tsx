import React, { useEffect, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { colors, spacing } from '../../theme';
import { AppHeader } from '../../components/layout/AppHeader';
import { TopicChip } from '../../components/core/TopicChip';
import { NotificationRow } from '../../components/cards/NotificationRow';
import { EmptyState } from '../../components/feedback/EmptyState';
import { LoadingState } from '../../components/feedback/LoadingState';
import { Typography } from '../../components/core/Typography';
import { Icon } from '../../components/core/Icon';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useAuthStore } from '../../store/useAuthStore';
import { NotificationFilter, AppNotification } from '../../types/notification';
import { filterNotificationList } from '../../api/notificationService';

export default function NotificationsScreen() {
  const notifications = useNotificationStore((s) => s.notifications);
  const activeFilter = useNotificationStore((s) => s.activeFilter);
  const setActiveFilter = useNotificationStore((s) => s.setActiveFilter);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const loadNotifications = useNotificationStore((s) => s.loadNotifications);
  const subscribeToRealtimeNotifications = useNotificationStore((s) => s.subscribeToRealtimeNotifications);
  const isLoading = useNotificationStore((s) => s.isLoading);
  const isRefreshing = useNotificationStore((s) => s.isRefreshing);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const currentUser = useAuthStore((s) => s.user);

  useEffect(() => {
    loadNotifications();
    const unsubscribe = subscribeToRealtimeNotifications(currentUser?.id);
    return () => {
      unsubscribe();
    };
  }, [loadNotifications, subscribeToRealtimeNotifications, currentUser?.id]);

  const filteredNotifications = useMemo(() => {
    return filterNotificationList(notifications, activeFilter);
  }, [notifications, activeFilter]);

  const filterOptions: NotificationFilter[] = ['All', 'Mentions', 'Follows', 'Discussions', 'Updates'];

  const getEmptyStateContent = () => {
    switch (activeFilter) {
      case 'Mentions':
        return {
          title: 'No mentions or replies',
          description: 'When peers reply to your comments or mention your research, they will appear here.',
        };
      case 'Follows':
        return {
          title: 'No new followers',
          description: 'When researchers start following your scientific profile, they will appear here.',
        };
      case 'Discussions':
        return {
          title: 'No paper discussions yet',
          description: 'New activity on referenced papers and discussions you interacted with will show up here.',
        };
      case 'Updates':
        return {
          title: 'No updates yet',
          description: 'New publications from followed researchers and topics will appear here.',
        };
      default:
        return {
          title: 'No notifications yet',
          description: 'When researchers interact with your research discussions or citations, they will appear here.',
        };
    }
  };

  const emptyInfo = getEmptyStateContent();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <AppHeader
        title="Notifications"
        rightElement={
          unreadCount > 0 ? (
            <TouchableOpacity
              onPress={markAllAsRead}
              style={styles.markAllButton}
              activeOpacity={0.7}
            >
              <Icon name="Check" size="xs" color={colors.textSecondary} />
              <Typography variant="caption" color={colors.textSecondary}>
                Mark read
              </Typography>
            </TouchableOpacity>
          ) : null
        }
      />

      {/* Filter Tabs */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {filterOptions.map((opt) => (
            <TopicChip
              key={opt}
              label={opt}
              selected={activeFilter === opt}
              onPress={() => setActiveFilter(opt)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Notifications List */}
      {isLoading && notifications.length === 0 ? (
        <LoadingState message="Loading notifications..." />
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NotificationRow notification={item} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadNotifications(true)}
              tintColor={colors.black}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="Bell"
              title={emptyInfo.title}
              description={emptyInfo.description}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filterSection: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  filterScroll: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    flexDirection: 'row',
  },
  listContent: {
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    backgroundColor: colors.backgroundSecondary,
  },
});
