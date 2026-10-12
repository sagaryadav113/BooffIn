import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './client';
import { Workspace } from '../types/workspace';

export interface RecommendedCommunity {
  workspace: Workspace;
  matchedInterests: string[];
  activityStats: {
    recentMessagesCount: number;
    activeSendersCount: number;
    paperSharesCount: number;
    lastActivityAt: string | null;
  };
  rankingScore: number;
  activityBadge: string;
}

const DISMISSED_TIMESTAMP_KEY = '@booffin_recommended_communities_dismissed_at';
const LAST_SHOWN_TIMESTAMP_KEY = '@booffin_recommended_communities_last_shown_at';

// Dismiss cooldown: 4 days before showing recommendations again after user taps (X)
const DISMISS_COOLDOWN_MS = 4 * 24 * 60 * 60 * 1000;
// Session cooldown: Do not show on every single quick app open (at least 18 hours between appearances)
const SESSION_COOLDOWN_MS = 18 * 60 * 60 * 1000;

export const communityRecommendationService = {
  /**
   * Check whether recommendations should be displayed in the home feed.
   * Prevents user irritation by enforcing dismissal cooldown and session cooldown.
   */
  async shouldDisplayRecommendations(): Promise<boolean> {
    try {
      const now = Date.now();

      // 1. Check if user explicitly dismissed with (X)
      const dismissedRaw = await AsyncStorage.getItem(DISMISSED_TIMESTAMP_KEY);
      if (dismissedRaw) {
        const dismissedAt = parseInt(dismissedRaw, 10);
        if (!isNaN(dismissedAt) && now - dismissedAt < DISMISS_COOLDOWN_MS) {
          return false;
        }
      }

      // 2. Check frequency cap between app sessions
      const lastShownRaw = await AsyncStorage.getItem(LAST_SHOWN_TIMESTAMP_KEY);
      if (lastShownRaw) {
        const lastShownAt = parseInt(lastShownRaw, 10);
        if (!isNaN(lastShownAt) && now - lastShownAt < SESSION_COOLDOWN_MS) {
          return false;
        }
      }

      return true;
    } catch {
      return true;
    }
  },

  /**
   * Record that the recommendation carousel was shown to the user
   */
  async recordRecommendationsShown(): Promise<void> {
    try {
      await AsyncStorage.setItem(LAST_SHOWN_TIMESTAMP_KEY, Date.now().toString());
    } catch (e) {
      console.warn('[communityRecommendationService] recordRecommendationsShown error:', e);
    }
  },

  /**
   * User tapped (X) to ignore / dismiss recommendations
   */
  async dismissRecommendations(): Promise<void> {
    try {
      await AsyncStorage.setItem(DISMISSED_TIMESTAMP_KEY, Date.now().toString());
    } catch (e) {
      console.warn('[communityRecommendationService] dismissRecommendations error:', e);
    }
  },

  /**
   * Fetches real, personalized community recommendations ranked by scientific interest
   * and member engagement velocity (NOT raw member count).
   */
  async getPersonalizedRecommendations(
    currentUserId?: string,
    userInterests: string[] = []
  ): Promise<RecommendedCommunity[]> {
    try {
      // 1. Fetch public communities from workspaces table
      const { data: publicWorkspaces, error: wsError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('type', 'community')
        .eq('is_private', false)
        .order('created_at', { ascending: false })
        .limit(40);

      if (wsError || !Array.isArray(publicWorkspaces) || publicWorkspaces.length === 0) {
        return [];
      }

      // 2. Filter out disabled communities
      const activeCommunities = publicWorkspaces.filter((c: any) => {
        const isDisabled =
          c.is_disabled ||
          c.status === 'disabled' ||
          c.settings?.is_disabled === true ||
          c.settings?.status === 'disabled' ||
          c.settings?.is_deleted === true;
        return !isDisabled;
      });

      if (activeCommunities.length === 0) return [];

      // 3. If authenticated, fetch user's joined workspace IDs and owned workspaces to exclude them
      const excludedWorkspaceIds = new Set<string>();
      if (currentUserId) {
        const { data: memberships } = await supabase
          .from('workspace_members')
          .select('workspace_id')
          .eq('user_id', currentUserId)
          .eq('status', 'active');

        (memberships || []).forEach((m: any) => {
          if (m.workspace_id) excludedWorkspaceIds.add(m.workspace_id);
        });

        // Also exclude communities created by the user
        activeCommunities.forEach((c: any) => {
          if (c.owner_id === currentUserId || c.creator_id === currentUserId) {
            excludedWorkspaceIds.add(c.id);
          }
        });
      }

      // Filter to unjoined candidate communities
      const candidates = activeCommunities.filter((c: any) => !excludedWorkspaceIds.has(c.id));
      if (candidates.length === 0) return [];

      const candidateIds = candidates.map((c: any) => c.id);

      // 4. Fetch real recent engagement data (past 7 days messages & discussions)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recentMsgs } = await supabase
        .from('workspace_messages')
        .select('workspace_id, user_id, message_type, created_at')
        .in('workspace_id', candidateIds)
        .gte('created_at', sevenDaysAgo);

      // Map engagement stats per community
      const statsMap = new Map<
        string,
        {
          messagesCount: number;
          senders: Set<string>;
          paperShares: number;
          lastActivityAt: string | null;
        }
      >();

      candidateIds.forEach((id) => {
        statsMap.set(id, {
          messagesCount: 0,
          senders: new Set<string>(),
          paperShares: 0,
          lastActivityAt: null,
        });
      });

      if (Array.isArray(recentMsgs)) {
        recentMsgs.forEach((msg: any) => {
          const entry = statsMap.get(msg.workspace_id);
          if (entry) {
            entry.messagesCount += 1;
            if (msg.user_id) entry.senders.add(msg.user_id);
            if (msg.message_type === 'paper_doi') entry.paperShares += 1;

            if (
              !entry.lastActivityAt ||
              new Date(msg.created_at).getTime() > new Date(entry.lastActivityAt).getTime()
            ) {
              entry.lastActivityAt = msg.created_at;
            }
          }
        });
      }

      // Normalized user interest tokens for flexible matching
      const normalizedUserInterests = userInterests
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);

      // 5. Calculate engagement and personalization score for each community
      const scoredList: RecommendedCommunity[] = candidates.map((comm: any) => {
        const stats = statsMap.get(comm.id) || {
          messagesCount: 0,
          senders: new Set<string>(),
          paperShares: 0,
          lastActivityAt: null,
        };

        const commTopics: string[] = [
          ...(Array.isArray(comm.settings?.topics) ? comm.settings.topics : []),
          ...(Array.isArray(comm.settings?.research_fields) ? comm.settings.research_fields : []),
          ...(Array.isArray(comm.topics) ? comm.topics : []),
        ];

        const matchedInterests: string[] = [];
        let interestMatchScore = 0;

        // Check topic overlaps
        commTopics.forEach((t) => {
          const tLower = t.toLowerCase();
          const isDirectMatch = normalizedUserInterests.some(
            (ui) => ui === tLower || tLower.includes(ui) || ui.includes(tLower)
          );
          if (isDirectMatch) {
            matchedInterests.push(t);
            interestMatchScore += 50;
          }
        });

        // Also check if community name or description mentions user's field
        const commText = `${comm.name} ${comm.description || ''}`.toLowerCase();
        normalizedUserInterests.forEach((ui) => {
          if (commText.includes(ui) && !matchedInterests.some((m) => m.toLowerCase().includes(ui))) {
            interestMatchScore += 30;
          }
        });

        // Activity & Engagement Velocity (Strictly engagement-based: discussions, active members, papers)
        const activeSendersCount = stats.senders.size;
        const messagesCount = stats.messagesCount;
        const paperSharesCount = stats.paperShares;

        // Senders weight: 12 pts each, Messages: 3 pts each, Paper shares: 15 pts each
        const activityScore =
          activeSendersCount * 12 + messagesCount * 3 + paperSharesCount * 15;

        // Recency bonus: activity within last 24h
        let recencyBonus = 0;
        if (stats.lastActivityAt) {
          const ageMs = Date.now() - new Date(stats.lastActivityAt).getTime();
          if (ageMs < 24 * 60 * 60 * 1000) {
            recencyBonus = 35;
          } else if (ageMs < 48 * 60 * 60 * 1000) {
            recencyBonus = 20;
          }
        }

        // Total Ranking Score
        const totalScore = interestMatchScore * 2 + activityScore + recencyBonus;

        // Dynamic, friendly activity badge
        let activityBadge = 'Growing Community';
        if (paperSharesCount > 0) {
          activityBadge = `${paperSharesCount} papers shared this week`;
        } else if (activeSendersCount >= 2) {
          activityBadge = `${activeSendersCount} active researchers discussing`;
        } else if (messagesCount > 0) {
          activityBadge = `${messagesCount} new discussions this week`;
        } else if (matchedInterests.length > 0) {
          activityBadge = `Hot in ${matchedInterests[0]}`;
        }

        return {
          workspace: {
            ...comm,
            topics: commTopics,
          },
          matchedInterests,
          activityStats: {
            recentMessagesCount: messagesCount,
            activeSendersCount,
            paperSharesCount,
            lastActivityAt: stats.lastActivityAt,
          },
          rankingScore: totalScore,
          activityBadge,
        };
      });

      // 6. Sort descending by ranking score
      scoredList.sort((a, b) => b.rankingScore - a.rankingScore);

      // Return top 8 most engaging & niche-relevant communities
      return scoredList.slice(0, 8);
    } catch (err) {
      console.error('[communityRecommendationService] getPersonalizedRecommendations error:', err);
      return [];
    }
  },
};
