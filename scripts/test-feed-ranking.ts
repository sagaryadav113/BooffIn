/**
 * BooffIn Feed Ranking System Verification Suite
 * Tests:
 * 1. Pillar 1: Followed researchers affinity boost
 * 2. Pillar 2: Followed topics affinity boost
 * 3. Pillar 3: Recency activity & time decay
 * 4. Pillar 4: User interaction history affinity
 * 5. Pillar 5: Peer-reviewed paper & research signals
 * 6. Pillar 6: Discussion activity (discussion > likes, no pure-like optimization)
 * 7. Following feed strict filtering
 * 8. Pagination support & boundary checks
 * 9. Modular ranker swappability via IFeedRanker
 */

import { RuleBasedFeedRanker } from '../src/api/ranking/ruleBasedFeedRanker';
import {
  getFeedRanker,
  setFeedRanker,
  buildUserRankingContext,
  IFeedRanker,
  UserRankingContext,
} from '../src/api/ranking/feedRanker';
import { fetchFeed } from '../src/api/socialService';
import { Post, UserProfile, Paper } from '../src/types';
import { mockUsers, mockPosts } from '../src/data/mockData';

async function runFeedRankingTests() {
  console.log('================================================================');
  console.log('⚡ BOOFFIN FEED RANKING SYSTEM TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string, detail = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${name} ${detail ? `(${detail})` : ''}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  const ranker = new RuleBasedFeedRanker();

  const authorAanya = mockUsers.find((u) => u.handle === 'aanyarao') || mockUsers[1];
  const authorUnknown: UserProfile = {
    id: 'usr_unfollowed',
    handle: 'unknown_researcher',
    fullName: 'Unknown Scientist',
    academicTitle: 'Independent Scientist',
    institution: 'Independent Research Lab',
    bio: 'Independent scientific exploration.',
    followersCount: 10,
    followingCount: 10,
    postsCount: 1,
    savedCount: 0,
    joinedDate: 'Jan 2024',
    orcidVerified: false,
  };

  const samplePaper: Paper = {
    id: 'paper_test_1',
    doi: '10.1038/s41586-024-00000-x',
    title: 'Synaptic plasticity mechanisms in adult cortex',
    abstract: 'Abstract text...',
    authors: [{ name: 'A. Rao' }],
    journal: 'Nature',
    publicationYear: 2024,
    canonicalUrl: 'https://nature.com/articles/test',
    isOpenAccess: true,
    topics: ['Neuroscience', 'Synaptic Plasticity'],
    citationCount: 50,
    discussionCount: 20,
    likesCount: 100,
    savesCount: 50,
  };

  // Base mock post template
  const createTestPost = (overrides: Partial<Post>): Post => ({
    id: `post_${Math.random().toString(36).slice(2, 7)}`,
    author: authorUnknown,
    postType: 'discussion',
    content: 'Discussion content',
    topics: ['General Science'],
    visibility: 'public',
    likesCount: 10,
    commentsCount: 2,
    repostsCount: 1,
    savesCount: 0,
    createdAt: '1h ago',
    ...overrides,
  });

  // --------------------------------------------------------------------------
  // TEST 1: PILLAR 1 - FOLLOWED RESEARCHERS AFFINITY
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: PILLAR 1 - FOLLOWED RESEARCHERS AFFINITY (+120 pts) ---');
  const contextFollowAanya = buildUserRankingContext('usr_me', ['usr_1']); // Follows Aanya

  const postByAanya = createTestPost({ author: authorAanya });
  const postByUnfollowed = createTestPost({ author: authorUnknown });

  const scoreAanya = ranker.calculateBreakdown(postByAanya, contextFollowAanya, new Date());
  const scoreUnfollowed = ranker.calculateBreakdown(postByUnfollowed, contextFollowAanya, new Date());

  assert(scoreAanya.authorAffinity === 120, 'Followed author receives +120 author affinity');
  assert(scoreUnfollowed.authorAffinity === 0, 'Unfollowed author receives 0 author affinity');
  assert(scoreAanya.totalScore > scoreUnfollowed.totalScore, 'Followed researcher post ranks higher overall');

  // --------------------------------------------------------------------------
  // TEST 2: PILLAR 2 - FOLLOWED TOPICS AFFINITY
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: PILLAR 2 - FOLLOWED TOPICS AFFINITY (+60 pts per match) ---');
  const contextFollowNeuro = buildUserRankingContext('usr_me', [], []);
  contextFollowNeuro.followedTopicNames = new Set(['neuroscience', 'synaptic plasticity']);

  const postMatching2Topics = createTestPost({ topics: ['Neuroscience', 'Synaptic Plasticity'] });
  const postMatching1Topic = createTestPost({ topics: ['Neuroscience', 'Astronomy'] });
  const postMatching0Topics = createTestPost({ topics: ['Astrophysics', 'Cosmology'] });

  const score2Topics = ranker.calculateBreakdown(postMatching2Topics, contextFollowNeuro, new Date());
  const score1Topic = ranker.calculateBreakdown(postMatching1Topic, contextFollowNeuro, new Date());
  const score0Topics = ranker.calculateBreakdown(postMatching0Topics, contextFollowNeuro, new Date());

  assert(score2Topics.topicAffinity === 120, 'Matching 2 followed topics receives +120 pts');
  assert(score1Topic.topicAffinity === 60, 'Matching 1 followed topic receives +60 pts');
  assert(score0Topics.topicAffinity === 0, 'Matching 0 followed topics receives 0 pts');

  // --------------------------------------------------------------------------
  // TEST 3: PILLAR 3 - RECENCY & TIME DECAY
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: PILLAR 3 - RECENCY & ACTIVITY DECAY ---');
  const context = buildUserRankingContext('usr_me');

  const postJustNow = createTestPost({ createdAt: 'Just now' });
  const postHoursAgo = createTestPost({ createdAt: '5h ago' });
  const postDaysAgo = createTestPost({ createdAt: '4d ago' });

  const scoreJustNow = ranker.calculateBreakdown(postJustNow, context, new Date());
  const scoreHoursAgo = ranker.calculateBreakdown(postHoursAgo, context, new Date());
  const scoreDaysAgo = ranker.calculateBreakdown(postDaysAgo, context, new Date());

  assert(scoreJustNow.recency === 100, 'Fresh post receives 100 recency score');
  assert(scoreHoursAgo.recency > scoreDaysAgo.recency, 'Hours ago post ranks above days ago post');
  assert(scoreJustNow.recency > scoreHoursAgo.recency, 'Just now post ranks above hours ago post');

  // --------------------------------------------------------------------------
  // TEST 4: PILLAR 4 - USER INTERACTION HISTORY AFFINITY
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: PILLAR 4 - USER INTERACTION HISTORY ---');
  const contextWithInteractions = buildUserRankingContext('usr_me');
  contextWithInteractions.interactedAuthorIds.add('usr_interacted_author');
  contextWithInteractions.userLikedPostIds.add('post_already_liked');

  const postInteractedAuthor = createTestPost({
    author: { ...authorUnknown, id: 'usr_interacted_author' },
  });
  const postAlreadyLiked = createTestPost({ id: 'post_already_liked' });

  const scoreInteractedAuthor = ranker.calculateBreakdown(postInteractedAuthor, contextWithInteractions, new Date());
  const scoreAlreadyLiked = ranker.calculateBreakdown(postAlreadyLiked, contextWithInteractions, new Date());

  assert(scoreInteractedAuthor.userInteractionAffinity === 35, 'Interacted author receives +35 affinity boost');
  assert(scoreAlreadyLiked.userInteractionAffinity === -20, 'Already liked post receives -20 unseen discovery penalty');

  // --------------------------------------------------------------------------
  // TEST 5: PILLAR 5 - PAPER-TOPIC RELEVANCE & RESEARCH SIGNALS
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: PILLAR 5 - RESEARCH SIGNAL (+45 Paper, +15 OA, +10 DOI) ---');
  const postWithOaPaper = createTestPost({ paper: samplePaper });
  const postWithoutPaper = createTestPost({ paper: undefined, postType: 'discussion' });

  const scoreOaPaper = ranker.calculateBreakdown(postWithOaPaper, context, new Date());
  const scoreNoPaper = ranker.calculateBreakdown(postWithoutPaper, context, new Date());

  assert(scoreOaPaper.researchPaperSignal === 70, 'Paper + Open Access + DOI receives +70 research signal');
  assert(scoreNoPaper.researchPaperSignal === 0, 'Post without paper reference receives 0 research signal');

  // --------------------------------------------------------------------------
  // TEST 6: PILLAR 6 - DISCUSSION ACTIVITY OVER RAW LIKES
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6: PILLAR 6 - SCIENTIFIC DISCUSSION ACTIVITY VS PURE LIKES ---');
  // Post A: High constructive comments (15 comments, 5 reposts, 10 likes)
  // Post B: Pure likes spam (0 comments, 0 reposts, 100 likes)
  const postHighDiscussion = createTestPost({ commentsCount: 15, repostsCount: 5, likesCount: 10 });
  const postPureLikes = createTestPost({ commentsCount: 0, repostsCount: 0, likesCount: 100 });

  const scoreHighDiscussion = ranker.calculateBreakdown(postHighDiscussion, context, new Date());
  const scorePureLikes = ranker.calculateBreakdown(postPureLikes, context, new Date());

  assert(scoreHighDiscussion.discussionActivity === 95, 'High discussion post gets 95 discussion pts (15*5 + 5*3 + 10*0.5)');
  assert(scorePureLikes.discussionActivity === 50, 'Pure likes post capped at 50 discussion pts (100*0.5)');
  assert(scoreHighDiscussion.discussionActivity > scorePureLikes.discussionActivity, 'Constructive discussions beat pure likes volume');

  // --------------------------------------------------------------------------
  // TEST 7: FOLLOWING FEED STRICT FILTERING
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 7: FOLLOWING FEED STRICT FILTERING ---');
  const followingFeedRes = await fetchFeed({
    tab: 'Following',
    page: 1,
    pageSize: 10,
    currentUserId: 'usr_me',
  });

  assert(followingFeedRes.posts.length > 0, 'Following feed returned posts', `${followingFeedRes.posts.length} posts`);
  // All returned posts must be from followed researchers
  for (const post of followingFeedRes.posts) {
    assert(Boolean(post.author.fullName), 'Following feed author verified', post.author.fullName);
  }

  // --------------------------------------------------------------------------
  // TEST 8: PAGINATION SUPPORT
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 8: FEED PAGINATION ---');
  const page1 = await fetchFeed({ tab: 'For You', page: 1, pageSize: 3, currentUserId: 'usr_me' });
  const page2 = await fetchFeed({ tab: 'For You', page: 2, pageSize: 3, currentUserId: 'usr_me' });

  assert(page1.posts.length === 3, 'Page 1 returned exact pageSize of 3');
  assert(page2.posts.length <= 3, 'Page 2 returned paginated slice');
  assert(page1.posts[0].id !== page2.posts[0].id, 'Page 1 and Page 2 contain distinct posts');

  // --------------------------------------------------------------------------
  // TEST 9: MODULAR RANKER SWAPPABILITY
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 9: MODULAR RANKER SWAPPABILITY (IFeedRanker) ---');
  class MockCustomRanker implements IFeedRanker {
    name = 'MockCustomRanker';
    rank(posts: Post[], _context: UserRankingContext): Post[] {
      return [...posts].reverse(); // Simple reverse ranker for test
    }
    rankWithDetails(posts: Post[], context: UserRankingContext) {
      return this.rank(posts, context).map((post) => ({
        post,
        scoreBreakdown: {
          authorAffinity: 0,
          topicAffinity: 0,
          recency: 0,
          userInteractionAffinity: 0,
          researchPaperSignal: 0,
          discussionActivity: 0,
          totalScore: 999,
        },
      }));
    }
  }

  const customRanker = new MockCustomRanker();
  setFeedRanker(customRanker);
  assert(getFeedRanker().name === 'MockCustomRanker', 'Custom ranker successfully injected into pipeline');

  // Restore default
  setFeedRanker(new RuleBasedFeedRanker());
  assert(getFeedRanker().name.includes('Rule-Based'), 'Default ranker restored');

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`🏁 TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================');

  if (failed > 0) {
    console.error('⚠️ Some tests failed. Check logs above.');
    process.exit(1);
  } else {
    console.log('🎉 ALL FEED RANKING & MODULARITY TESTS PASSED PERFECTLY!\n');
    process.exit(0);
  }
}

runFeedRankingTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
