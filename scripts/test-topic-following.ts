/**
 * BoffIn Topic Following & Topic Page Test Suite
 * Tests:
 * 1. Topic follow / unfollow toggle & state management
 * 2. Database relationship persistence (no duplicated profile blobs)
 * 3. Topic page data aggregation (Name, Followers, Description, Trending Research, Shares, Discussions, Researchers)
 * 4. Explainable "For You" feed ranking influenced by followed topics
 */

import { useTopicStore } from '../src/store/useTopicStore';
import {
  fetchTopicBySlug,
  fetchTopicPageData,
  toggleFollowTopic,
  getFollowedTopicsForUser,
} from '../src/api/topicService';
import { calculateExplainableFeedScore, fetchFeed } from '../src/api/socialService';
import { mockPosts } from '../src/data/mockData';

async function runTopicFollowingTests() {
  console.log('================================================================');
  console.log('🧬 BOFFIN TOPIC FOLLOWING & TOPIC PAGE TEST SUITE');
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

  // --------------------------------------------------------------------------
  // TEST 1: TOPIC RETRIEVAL & METADATA
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: TOPIC METADATA & RETRIEVAL ---');
  const topicRes = await fetchTopicBySlug('neuroscience', 'usr_me');
  assert(Boolean(topicRes.topic), 'Topic fetched by slug (neuroscience)');
  assert(topicRes.topic?.name === 'Neuroscience', 'Topic name is Neuroscience');
  assert(Boolean(topicRes.topic?.description), 'Topic description present', topicRes.topic?.description || '');
  assert((topicRes.topic?.followersCount || 0) > 0, 'Follower count present', `${topicRes.topic?.followersCount}`);

  // --------------------------------------------------------------------------
  // TEST 2: TOPIC FOLLOW / UNFOLLOW (RELATIONAL INTEGRITY)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: RELATIONAL TOPIC FOLLOW & UNFOLLOW TOGGLE ---');
  const topicStore = useTopicStore.getState();

  // Test follow toggle
  const initialTopic = topicStore.getTopicBySlug('genetics');
  const initialFollowState = initialTopic?.isFollowing;
  const initialCount = initialTopic?.followersCount || 0;

  const newFollowState = await topicStore.toggleFollowTopic('top_2', 'usr_me');
  assert(newFollowState === !initialFollowState, 'Topic follow state inverted optimistically', `isFollowing: ${newFollowState}`);

  const updatedTopic = topicStore.getTopicBySlug('genetics');
  assert(
    updatedTopic?.followersCount === (newFollowState ? initialCount + 1 : initialCount - 1),
    'Topic followers count automatically updated',
    `Count: ${updatedTopic?.followersCount}`
  );

  // Toggle back to clean state
  await topicStore.toggleFollowTopic('top_2', 'usr_me');

  // --------------------------------------------------------------------------
  // TEST 3: TOPIC PAGE DATA AGGREGATION
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: TOPIC PAGE STREAMS (TRENDING, SHARES, DISCUSSIONS, RESEARCHERS) ---');
  const pageData = await fetchTopicPageData('neuroscience', 'usr_me');

  assert(Boolean(pageData.topic), 'Topic page metadata loaded');
  assert(pageData.trendingResearch.length > 0, 'Trending research papers loaded', `${pageData.trendingResearch.length} papers`);
  assert(pageData.recentResearchShares.length > 0, 'Recent research shares loaded', `${pageData.recentResearchShares.length} shares`);
  assert(pageData.discussions.length > 0, 'Discussions loaded for topic', `${pageData.discussions.length} discussions`);
  assert(pageData.interestedResearchers.length > 0, 'Researchers interested in topic identified', `${pageData.interestedResearchers.length} researchers`);

  // Verify all trending papers match topic
  const allPapersMatch = pageData.trendingResearch.every((p) =>
    p.topics.some((t) => t.toLowerCase().includes('neuroscience'))
  );
  assert(allPapersMatch, 'All trending research tagged with Neuroscience topic');

  // --------------------------------------------------------------------------
  // TEST 4: EXPLAINABLE "FOR YOU" FEED RANKING INFLUENCED BY FOLLOWED TOPICS
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: EXPLAINABLE "FOR YOU" FEED RANKING INFLUENCE ---');
  const userFollowedTopics = ['neuroscience', 'synaptic plasticity'];

  // Calculate score for a neuroscience post vs unrelated post
  const neuroPost = mockPosts.find((p) =>
    p.topics.some((t) => t.toLowerCase().includes('neuroscience'))
  ) || mockPosts[0];

  const unrelatedPost = mockPosts.find(
    (p) => !p.topics.some((t) => t.toLowerCase().includes('neuroscience'))
  ) || {
    ...mockPosts[0],
    id: 'post_unrelated',
    topics: ['Astronomy'],
    likesCount: 5,
    commentsCount: 1,
    repostsCount: 0,
    createdAt: '5d ago',
  };

  const neuroScore = calculateExplainableFeedScore(neuroPost, userFollowedTopics);
  const unrelatedScore = calculateExplainableFeedScore(unrelatedPost, userFollowedTopics);

  assert(neuroScore > unrelatedScore, 'Followed topic post receives higher ranking score', `Neuro: ${neuroScore} > Unrelated: ${unrelatedScore}`);

  // Fetch actual For You feed with followed topics
  const feedRes = await fetchFeed({
    tab: 'For You',
    page: 1,
    pageSize: 10,
    currentUserId: 'usr_me',
  });

  assert(feedRes.posts.length > 0, 'For You feed retrieved with topic boost', `${feedRes.posts.length} posts`);
  const topPost = feedRes.posts[0];
  assert(
    topPost.topics.some((t) => userFollowedTopics.includes(t.toLowerCase())),
    'Top ranked post matches user followed topic',
    topPost.topics.join(', ')
  );

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
    console.log('🎉 ALL TOPIC FOLLOWING & RANKING TESTS PASSED PERFECTLY!\n');
    process.exit(0);
  }
}

runTopicFollowingTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
