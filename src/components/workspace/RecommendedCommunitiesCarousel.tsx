import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Compass, X, Sparkles, ArrowRight, BookOpen, Users } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Avatar } from '../core/Avatar';
import { RecommendedCommunity } from '../../api/communityRecommendationService';

interface RecommendedCommunitiesCarouselProps {
  recommendations: RecommendedCommunity[];
  onDismiss: () => void;
}

export const RecommendedCommunitiesCarousel: React.FC<RecommendedCommunitiesCarouselProps> = ({
  recommendations,
  onDismiss,
}) => {
  if (!recommendations || recommendations.length === 0) return null;

  const handleViewCommunity = (communityId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    router.push(`/workspace/${communityId}` as any);
  };

  const handleDismiss = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    onDismiss();
  };

  return (
    <View style={styles.container}>
      {/* Header with Title and Dismiss (X) button */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <Compass size={17} color="#164E3F" strokeWidth={2.4} />
          </View>
          <View>
            <View style={styles.titleBadgeRow}>
              <Text style={styles.headerTitle}>Suggested Communities</Text>
              <View style={styles.trendingBadge}>
                <Sparkles size={11} color="#164E3F" strokeWidth={2.5} />
                <Text style={styles.trendingBadgeText}>Growing</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle}>
              Active research hubs in your scientific niche
            </Text>
          </View>
        </View>

        {/* Cross option to ignore recommendations */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleDismiss}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.dismissBtn}
          accessibilityLabel="Dismiss recommendations"
        >
          <X size={17} color="#64748B" strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      {/* Horizontal Scrollable Carousel Cards (Instagram style) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {recommendations.map((item) => {
          const comm = item.workspace;
          const displayTopic =
            item.matchedInterests.length > 0
              ? item.matchedInterests[0]
              : comm.topics && comm.topics.length > 0
              ? comm.topics[0]
              : 'Research Hub';

          return (
            <View key={comm.id} style={styles.card}>
              {/* Card Header Strip */}
              <View style={styles.cardTopBanner}>
                <View style={styles.topicTagPill}>
                  <Text style={styles.topicTagText} numberOfLines={1}>
                    #{displayTopic}
                  </Text>
                </View>
              </View>

              {/* Avatar & Info */}
              <View style={styles.cardBody}>
                <View style={styles.avatarWrapper}>
                  <Avatar
                    url={comm.avatar_url || undefined}
                    name={comm.name}
                    size="lg"
                  />
                </View>

                <Text numberOfLines={1} style={styles.commName}>
                  {comm.name}
                </Text>

                <Text numberOfLines={2} style={styles.commDesc}>
                  {comm.description || 'Collaborative research, open discussions, and paper sharing.'}
                </Text>

                {/* Real Member Engagement & Activity Indicator (not raw member count) */}
                <View style={styles.activityIndicatorRow}>
                  <View style={styles.activityDot} />
                  <Text numberOfLines={1} style={styles.activityText}>
                    {item.activityBadge}
                  </Text>
                </View>

                {/* View Community Button */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleViewCommunity(comm.id)}
                  style={styles.viewBtn}
                >
                  <Text style={styles.viewBtnText}>View Community</Text>
                  <ArrowRight size={13} color="#164E3F" strokeWidth={2.4} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 14,
    backgroundColor: '#FAFAF9',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E7E5E4',
    paddingVertical: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  trendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  trendingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#164E3F',
    textTransform: 'uppercase',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  dismissBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 4,
  },
  card: {
    width: 224,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTopBanner: {
    height: 48,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  topicTagPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    maxWidth: 180,
  },
  topicTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#164E3F',
  },
  cardBody: {
    padding: 12,
    alignItems: 'center',
    marginTop: -22,
  },
  avatarWrapper: {
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 26,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  commName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: -0.2,
    width: '100%',
  },
  commDesc: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 15,
    marginBottom: 10,
    height: 30,
    width: '100%',
  },
  activityIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
    width: '100%',
    justifyContent: 'center',
  },
  activityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  activityText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    width: '100%',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 8,
    borderRadius: 20,
  },
  viewBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#164E3F',
  },
});
