import { IFeedRanker, UserRankingContext } from './types';
import { RuleBasedFeedRanker } from './ruleBasedFeedRanker';
import { getFollowedTopicsForUser } from '../topicService';

// Active global feed ranker instance (defaults to RuleBasedFeedRanker)
let activeFeedRanker: IFeedRanker = new RuleBasedFeedRanker();

/**
 * Gets the current active feed ranker
 */
export function getFeedRanker(): IFeedRanker {
  return activeFeedRanker;
}

/**
 * Swappable ranker setter (allows plugging in ML, Vector, or Hybrid rankers in the future)
 */
export function setFeedRanker(ranker: IFeedRanker): void {
  activeFeedRanker = ranker;
}

/**
 * Builds the UserRankingContext from current user data and interaction graph
 */
export function buildUserRankingContext(
  userId?: string,
  extraFollowedUserIds: string[] = ['usr_1', 'usr_2'], // Dr. Aanya Rao, PhD Diary followed by default
  extraInteractedAuthors: string[] = ['usr_1', 'usr_3']
): UserRankingContext {
  const followedTopics = userId ? getFollowedTopicsForUser(userId) : ['neuroscience', 'molecular biology', 'ai in science'];

  return {
    userId,
    followedUserIds: new Set<string>(extraFollowedUserIds),
    followedTopicNames: new Set<string>(followedTopics.map((t) => t.toLowerCase())),
    interactedAuthorIds: new Set<string>(extraInteractedAuthors),
    interactedPaperIds: new Set<string>(['paper_1', 'paper_2']),
    interactedTopicNames: new Set<string>(['neuroscience', 'synaptic plasticity', 'cell atlas']),
    userLikedPostIds: new Set<string>(),
    userSavedPostIds: new Set<string>(),
    userCommentedPostIds: new Set<string>(),
    currentTime: new Date(),
  };
}

export * from './types';
export * from './ruleBasedFeedRanker';
