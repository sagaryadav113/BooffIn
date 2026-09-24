import React from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  ScrollView,
} from 'react-native';
import { colors, spacing } from '../../theme';
import { AppHeader } from '../../components/layout/AppHeader';
import { TopicChip } from '../../components/core/TopicChip';
import { NotificationRow } from '../../components/cards/NotificationRow';
import { EmptyState } from '../../components/feedback/EmptyState';
import { useNotificationStore } from '../../store/useNotificationStore';

export default function NotificationsScreen() {
  const activeFilter = useNotificationStore((s) => s.activeFilter);
  const setActiveFilter = useNotificationStore((s) => s.setActiveFilter);
  const getFilteredNotifications = useNotificationStore((s) => s.getFilteredNotifications);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);

  const notifications = getFilteredNotifications();
  const filterOptions = ['All', 'Mentions', 'Follows', 'Updates'];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <AppHeader
        title="Notifications"
        rightIcon="Check"
        onRightIconPress={markAllAsRead}
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
              onPress={() => setActiveFilter(opt as any)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Notifications List */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NotificationRow notification={item} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="Bell"
            title="No notifications yet"
            description="When researchers interact with your research discussions or citations, they will appear here."
          />
        }
      />
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
  },
});
