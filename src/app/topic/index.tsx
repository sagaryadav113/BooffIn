import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { colors, spacing } from '../../theme';
import { AppHeader } from '../../components/layout/AppHeader';
import { SearchBar } from '../../components/core/SearchBar';
import { FilterPills } from '../../components/core/FilterPills';
import { TopicCard } from '../../components/cards/TopicCard';
import { EmptyState } from '../../components/feedback/EmptyState';
import { useTopicStore } from '../../store/useTopicStore';

export default function TopicsDirectoryScreen() {
  const [activeTab, setActiveTab] = useState<'All Topics' | 'My Topics'>('All Topics');
  const [searchQuery, setSearchQuery] = useState('');
  const topics = useTopicStore((s) => s.topics);

  const filteredTopics = topics.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === 'My Topics') {
      return matchesSearch && t.isFollowing;
    }
    return matchesSearch;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <AppHeader
        showBack
        title="Research Disciplines"
        showSearch
        onSearch={() => router.push('/search')}
      />

      {/* Filter Tabs */}
      <View style={styles.pillsContainer}>
        <FilterPills
          tabs={['All Topics', 'My Topics']}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as 'All Topics' | 'My Topics')}
        />
      </View>

      {/* Search Filter Input */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Filter disciplines (e.g. Neuroscience, AI)..."
          showFilterButton={false}
        />
      </View>

      {/* Topics List */}
      <FlatList
        data={filteredTopics}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TopicCard topic={item} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="Brain"
            title={activeTab === 'My Topics' ? "No followed topics yet" : 'No topics found'}
            description={
              activeTab === 'My Topics'
                ? "Follow scientific fields to personalize your research feeds and discovery."
                : 'Try adjusting your search query to find relevant research disciplines.'
            }
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
  pillsContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.background,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingBottom: spacing.xxxl,
  },
});
