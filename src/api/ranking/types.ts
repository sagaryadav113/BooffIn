import { Post } from '../../types';

/**
 * User Context for Feed Ranking
 */
export interface UserRankingContext {
  userId?: string;
  followedUserIds: Set<string>;
  followedTopicNames: Set<string>;
  interactedAuthorIds: Set<string>;
  interactedPaperIds: Set<string>;
  interactedTopicNames: Set<string>;
  userLikedPostIds: Set<string>;
  userSavedPostIds: Set<string>;
  userCommentedPostIds: Set<string>;
  currentTime?: Date;
}

/**
 * Transparent breakdown of ranking score components
 */
export interface RankScoreBreakdown {
  authorAffinity: number;         // Pillar 1: Researchers followed (+120)
  topicAffinity: number;          // Pillar 2: Topics followed (+60 per topic)
  recency: number;                // Pillar 3: Recent activity (decay curve)
  userInteractionAffinity: number;// Pillar 4: Prior interactions with author/paper/topic
  researchPaperSignal: number;    // Pillar 5: Peer-reviewed paper, DOI, Open Access
  discussionActivity: number;     // Pillar 6: Constructive commentary and debate
  totalScore: number;
}

export interface RankedPost {
  post: Post;
  scoreBreakdown: RankScoreBreakdown;
}

/**
 * Pluggable Feed Ranker Interface
 * Allows seamless replacement with ML / Vector ranking models in the future.
 */
export interface IFeedRanker {
  name: string;
  rank(posts: Post[], context: UserRankingContext): Post[];
  rankWithDetails(posts: Post[], context: UserRankingContext): RankedPost[];
}
