import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  Flame,
  TrendingUp,
  Hash,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';
import { TrendingTag } from '../../types/trending';

interface TrendingTagsSectionProps {
  tags: TrendingTag[];
  isLoading?: boolean;
  onSelectTag: (tag: string) => void;
}

export const TrendingTagsSection: React.FC<TrendingTagsSectionProps> = ({
  tags,
  isLoading = false,
  onSelectTag,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isLoading && (!tags || tags.length === 0)) {
    return null;
  }

  const displayedTags = isExpanded ? tags.slice(0, 10) : tags.slice(0, 5);

  const handlePressTag = (tag: string) => {
    Haptics.selectionAsync().catch(() => {});
    onSelectTag(tag);
  };

  const handleToggleExpand = () => {
    Haptics.selectionAsync().catch(() => {});
    setIsExpanded((prev) => !prev);
  };

  return (
    <View style={styles.container}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Flame size={18} color="#D97706" />
          </View>
          <View>
            <View style={styles.titleWithBadge}>
              <Text style={styles.mainTitle}>Trending in Science</Text>
              <View style={styles.timeBadge}>
                <Sparkles size={10} color="#1B4D3E" />
                <Text style={styles.timeBadgeText}>Past 24h</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>
              Fastest-accelerating research topics & tags on BoffIn
            </Text>
          </View>
        </View>
      </View>

      {/* Loading Skeleton */}
      {isLoading && tags.length === 0 ? (
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="small" color="#1B4D3E" />
          <Text style={styles.loadingText}>Calculating 24-hour trending velocity...</Text>
        </View>
      ) : (
        <View style={styles.cardContainer}>
          {displayedTags.map((item, index) => {
            const isLast = index === displayedTags.length - 1;
            return (
              <TouchableOpacity
                key={item.id || item.tag}
                activeOpacity={0.7}
                onPress={() => handlePressTag(item.tag)}
                style={[styles.trendItem, !isLast && styles.trendItemDivider]}
              >
                <View style={styles.trendItemContent}>
                  {/* Category & Rank Line */}
                  <View style={styles.metaRow}>
                    <Text style={styles.rankText}>
                      {item.rank} · {item.category}
                    </Text>
                    {item.growthRatePct && item.growthRatePct > 50 ? (
                      <View style={styles.growthBadge}>
                        <TrendingUp size={10} color="#059669" />
                        <Text style={styles.growthBadgeText}>+{item.growthRatePct}%</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Main Tag Line */}
                  <View style={styles.tagRow}>
                    <Text style={styles.tagName}>{item.tag}</Text>
                  </View>

                  {/* Discussion Volume Subtitle */}
                  <View style={styles.statsRow}>
                    <Text style={styles.statsText}>
                      {item.postsCount24h.toLocaleString()} discussions
                      {item.authorsCount24h > 1
                        ? ` · ${item.authorsCount24h} researchers`
                        : ''}
                    </Text>
                  </View>
                </View>

                {/* Right Action Icon */}
                <View style={styles.trendArrow}>
                  <Hash size={16} color="#94A3B8" />
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Show More / Show Less Toggle Button */}
          {tags.length > 5 && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleToggleExpand}
              style={styles.expandButton}
            >
              <Text style={styles.expandButtonText}>
                {isExpanded ? 'Show less' : `Show ${tags.length - 5} more trends`}
              </Text>
              {isExpanded ? (
                <ChevronUp size={16} color="#1B4D3E" />
              ) : (
                <ChevronDown size={16} color="#1B4D3E" />
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconContainer: {
    width: 34,
    height: 34,
    borderRadius: radii.full,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mainTitle: {
    ...typography.h3,
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EAF3EE',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: radii.full,
  },
  timeBadgeText: {
    ...typography.caption,
    fontSize: 10.5,
    fontWeight: '700',
    color: '#1B4D3E',
  },
  subtitle: {
    ...typography.caption,
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  trendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  trendItemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  trendItemContent: {
    flex: 1,
    paddingRight: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  rankText: {
    ...typography.caption,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radii.sm,
  },
  growthBadgeText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  tagRow: {
    marginVertical: 1,
  },
  tagName: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  statsRow: {
    marginTop: 2,
  },
  statsText: {
    ...typography.caption,
    fontSize: 12,
    color: '#94A3B8',
  },
  trendArrow: {
    paddingLeft: 8,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  expandButtonText: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
    color: '#1B4D3E',
  },
  loadingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 24,
    backgroundColor: '#F8FAFC',
    borderRadius: radii.xl,
  },
  loadingText: {
    ...typography.caption,
    fontSize: 13,
    color: '#64748B',
  },
});
