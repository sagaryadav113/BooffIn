import { IFeedRanker, RankedPost, RankScoreBreakdown, UserRankingContext } from './types';
import { Post } from '../../types';

export class RuleBasedFeedRanker implements IFeedRanker {
  public name = 'BooffIn Rule-Based Scientific Feed Ranker (v1)';

  /**
   * Ranks an array of candidate posts and returns the sorted posts
   */
  public rank(posts: Post[], context: UserRankingContext): Post[] {
    const scored = this.rankWithDetails(posts, context);
    return scored.map((item) => item.post);
  }

  /**
   * Ranks an array of candidate posts and returns detailed score breakdowns for explainability
   */
  public rankWithDetails(posts: Post[], context: UserRankingContext): RankedPost[] {
    const now = context.currentTime || new Date();

    const scored: RankedPost[] = posts.map((post) => {
      const breakdown = this.calculateBreakdown(post, context, now);
      return {
        post,
        scoreBreakdown: breakdown,
      };
    });

    // Sort descending by total score
    return scored.sort((a, b) => b.scoreBreakdown.totalScore - a.scoreBreakdown.totalScore);
  }

  /**
   * Calculates the 6-pillar score breakdown for a single post
   */
  public calculateBreakdown(
    post: Post,
    context: UserRankingContext,
    _now: Date
  ): RankScoreBreakdown {
    // ------------------------------------------------------------------------
    // PILLAR 1: RESEARCHERS THE USER FOLLOWS (+120 pts)
    // ------------------------------------------------------------------------
    let authorAffinity = 0;
    if (context.followedUserIds.has(post.author.id) || context.followedUserIds.has(post.author.handle)) {
      authorAffinity = 120;
    }

    // ------------------------------------------------------------------------
    // PILLAR 2: TOPICS THE USER FOLLOWS (+60 pts per match, max 180)
    // ------------------------------------------------------------------------
    let topicAffinity = 0;
    if (context.followedTopicNames.size > 0 && post.topics && post.topics.length > 0) {
      const matchingCount = post.topics.filter((pt) => {
        const lower = pt.toLowerCase().trim();
        for (const ft of context.followedTopicNames) {
          if (ft.includes(lower) || lower.includes(ft)) return true;
        }
        return false;
      }).length;

      topicAffinity = Math.min(180, matchingCount * 60);
    }

    // ------------------------------------------------------------------------
    // PILLAR 3: RECENT ACTIVITY & TIME DECAY (Up to +100 pts)
    // ------------------------------------------------------------------------
    let recency = 0;
    const timeStr = post.createdAt.toLowerCase();
    if (timeStr.includes('just now') || timeStr.includes('m ago')) {
      recency = 100;
    } else if (timeStr.includes('h ago')) {
      const hours = parseInt(timeStr, 10) || 1;
      recency = Math.max(20, 95 - hours * 3.5);
    } else if (timeStr.includes('d ago')) {
      const days = parseInt(timeStr, 10) || 1;
      recency = Math.max(0, 50 - days * 7);
    } else {
      recency = 10;
    }

    // ------------------------------------------------------------------------
    // PILLAR 4: USER'S INTERACTIONS (+35 author, +25 topic, -20 if seen)
    // ------------------------------------------------------------------------
    let userInteractionAffinity = 0;
    if (context.interactedAuthorIds.has(post.author.id)) {
      userInteractionAffinity += 35;
    }
    if (post.paper && context.interactedPaperIds.has(post.paper.id)) {
      userInteractionAffinity += 30;
    }
    if (post.topics.some((t) => context.interactedTopicNames.has(t.toLowerCase()))) {
      userInteractionAffinity += 20;
    }
    // Demote already interacted posts slightly to surface unseen research
    if (
      context.userLikedPostIds.has(post.id) ||
      context.userSavedPostIds.has(post.id) ||
      context.userCommentedPostIds.has(post.id)
    ) {
      userInteractionAffinity -= 20;
    }

    // ------------------------------------------------------------------------
    // PILLAR 5: PAPER-TOPIC RELEVANCE & RESEARCH SIGNALS (+45 paper, +15 OA, +10 DOI)
    // ------------------------------------------------------------------------
    let researchPaperSignal = 0;
    if (post.paper) {
      researchPaperSignal += 45;
      if (post.paper.isOpenAccess) {
        researchPaperSignal += 15;
      }
      if (post.paper.doi) {
        researchPaperSignal += 10;
      }
    } else if (post.postType === 'research_share') {
      researchPaperSignal += 25;
    }

    // ------------------------------------------------------------------------
    // PILLAR 6: DISCUSSION ACTIVITY (Constructive comments > likes)
    // Avoids purely likes-based engagement optimization!
    // ------------------------------------------------------------------------
    let discussionActivity = 0;
    discussionActivity += (post.commentsCount || 0) * 5;  // Comments / inquiries heavily weighted
    discussionActivity += (post.repostsCount || 0) * 3;   // Reposts / shares
    discussionActivity += (post.likesCount || 0) * 0.5;   // Likes intentionally low-weighted

    // ------------------------------------------------------------------------
    // TOTAL EXPLAINABLE SCORE
    // ------------------------------------------------------------------------
    const totalScore = Math.round(
      authorAffinity +
      topicAffinity +
      recency +
      userInteractionAffinity +
      researchPaperSignal +
      discussionActivity
    );

    return {
      authorAffinity,
      topicAffinity,
      recency,
      userInteractionAffinity,
      researchPaperSignal,
      discussionActivity,
      totalScore,
    };
  }
}
