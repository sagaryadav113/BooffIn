import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { colors, spacing } from '../../theme';
import { SearchBar } from '../../components/core/SearchBar';
import { TopicChip } from '../../components/core/TopicChip';
import { Typography } from '../../components/core/Typography';
import { Icon } from '../../components/core/Icon';
import { TrendingPaperCard } from '../../components/cards/TrendingPaperCard';
import { TopicCard } from '../../components/cards/TopicCard';
import { ResearcherCard } from '../../components/cards/ResearcherCard';
import { EmptyState } from '../../components/feedback/EmptyState';
import { usePaperStore } from '../../store/usePaperStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useTopicStore } from '../../store/useTopicStore';

export default function SearchScreen() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(q || '');
  const [activeCategory, setActiveCategory] = useState<'All' | 'Papers' | 'People' | 'Topics'>('All');

  const searchPapers = usePaperStore((s) => s.searchPapers);
  const users = useAuthStore((s) => s.users);
  const toggleFollowUser = useAuthStore((s) => s.toggleFollowUser);
  const topics = useTopicStore((s) => s.topics);

  const filterOptions = ['All', 'Papers', 'People', 'Topics'];

  const matchedPapers = searchPapers(query);
  const matchedUsers = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(query.toLowerCase()) ||
      u.handle.toLowerCase().includes(query.toLowerCase()) ||
      u.academicTitle.toLowerCase().includes(query.toLowerCase()) ||
      u.institution.toLowerCase().includes(query.toLowerCase())
  );
  const matchedTopics = topics.filter(
    (t) =>
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header with Search Input */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="ArrowLeft" size="md" color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.searchWrapper}>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="Search papers, topics, researchers..."
            autoFocus={!q}
          />
        </View>
      </View>

      {/* Filter Category Chips */}
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
              selected={activeCategory === opt}
              onPress={() => setActiveCategory(opt as any)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Results Content */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* People Results */}
        {(activeCategory === 'All' || activeCategory === 'People') && matchedUsers.length > 0 && (
          <View style={styles.section}>
            <Typography variant="captionBold" color={colors.textSecondary} style={styles.sectionTitle}>
              RESEARCHERS
            </Typography>
            {matchedUsers.map((u) => (
              <ResearcherCard
                key={u.id}
                researcher={u}
                onFollowToggle={() => toggleFollowUser(u.id)}
              />
            ))}
          </View>
        )}

        {/* Papers Results */}
        {(activeCategory === 'All' || activeCategory === 'Papers') && matchedPapers.length > 0 && (
          <View style={styles.section}>
            <Typography variant="captionBold" color={colors.textSecondary} style={styles.sectionTitle}>
              RESEARCH PAPERS
            </Typography>
            {matchedPapers.map((p) => (
              <TrendingPaperCard key={p.id} paper={p} />
            ))}
          </View>
        )}

        {/* Topics Results */}
        {(activeCategory === 'All' || activeCategory === 'Topics') && matchedTopics.length > 0 && (
          <View style={styles.section}>
            <Typography variant="captionBold" color={colors.textSecondary} style={styles.sectionTitle}>
              TOPICS & DISCIPLINES
            </Typography>
            {matchedTopics.map((t) => (
              <TopicCard key={t.id} topic={t} />
            ))}
          </View>
        )}

        {/* Empty State */}
        {matchedPapers.length === 0 && matchedUsers.length === 0 && matchedTopics.length === 0 && (
          <EmptyState
            icon="Search"
            title="No results found"
            description="Try searching by DOI, paper title, researcher name, or scientific discipline."
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  backButton: {
    padding: spacing.xs,
  },
  searchWrapper: {
    flex: 1,
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
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  section: {
    paddingTop: spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    letterSpacing: 0.5,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
});
