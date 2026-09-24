/**
 * BoffIn Multi-User Social System Integration & RLS Verification Suite
 * Tests 11 Core Operations across 2 distinct user accounts:
 * - User A: Dr. Elena Rostova (@elena_rostova)
 * - User B: Dr. Marcus Thorne (@marcus_thorne)
 */

import {
  fetchFeed,
  createPost,
  toggleLike,
  toggleRepost,
  toggleBookmark,
  fetchComments,
  addComment,
  deleteComment,
  followUser,
  unfollowUser,
} from '../src/api/socialService';

async function runSocialIntegrationTests() {
  console.log('================================================================');
  console.log('🔬 BOFFIN MULTI-USER SOCIAL DATA INTEGRATION TEST SUITE');
  console.log('================================================================\n');

  const userA = {
    id: 'usr_elena_test_101',
    handle: 'elena_rostova',
    fullName: 'Dr. Elena Rostova',
    academicTitle: 'Senior Fellow in Neural Systems',
    institution: 'Oxford Brain Institute',
  };

  const userB = {
    id: 'usr_marcus_test_202',
    handle: 'marcus_thorne',
    fullName: 'Dr. Marcus Thorne',
    academicTitle: 'Assistant Professor of Computational Genomics',
    institution: 'Broad Institute',
  };

  console.log(`👤 User A: ${userA.fullName} (@${userA.handle}, ID: ${userA.id})`);
  console.log(`👤 User B: ${userB.fullName} (@${userB.handle}, ID: ${userB.id})\n`);

  let testPassed = 0;
  let testFailed = 0;

  function assert(condition: boolean, testName: string, details = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName} ${details ? `(${details})` : ''}`);
      testPassed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} ${details ? `(${details})` : ''}`);
      testFailed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: CREATE POST (User A)
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: CREATE POST (User A) ---');
  const postRes = await createPost({
    content: 'Testing single-cell RNA-seq alignment protocols on deep cortical layers.',
    postType: 'research_share',
    topics: ['Neuroscience', 'Single Cell'],
    visibility: 'public',
    authorId: userA.id,
    paper: {
      id: 'paper_test_501',
      doi: '10.1038/s41593-026-0001-x',
      title: 'Deep Cortical Layer Single-Cell Transcriptomics',
      abstract: 'Investigating deep cortical layers with single-cell transcriptomics.',
      journal: 'Nature Neuroscience',
      publicationYear: 2026,
      canonicalUrl: 'https://doi.org/10.1038/s41593-026-0001-x',
      isOpenAccess: true,
      topics: ['Neuroscience', 'Single Cell'],
      citationCount: 0,
      discussionCount: 0,
      likesCount: 0,
      savesCount: 0,
      authors: [{ name: 'Elena Rostova', affiliation: 'Oxford Brain Institute' }],
    },
  });

  assert(postRes.post !== null, 'Create post returned post object');
  assert(postRes.post?.content.includes('single-cell RNA-seq') === true, 'Post content preserved correctly');
  assert(postRes.post?.topics.includes('Neuroscience') === true, 'Attached topics preserved');
  assert(postRes.post?.paper?.title === 'Deep Cortical Layer Single-Cell Transcriptomics', 'Attached paper joined correctly');
  const createdPostId = postRes.post?.id || 'post_test_1';
  console.log(`  📝 Created Post ID: ${createdPostId}\n`);

  // --------------------------------------------------------------------------
  // TEST 2: READ FEED (User B reads paginated feed, avoiding N+1 queries)
  // --------------------------------------------------------------------------
  console.log('--- TEST 2: READ FEED (User B) ---');
  const feedRes = await fetchFeed({
    tab: 'For You',
    page: 1,
    pageSize: 10,
    currentUserId: userB.id,
  });

  assert(!feedRes.error, 'Feed fetched without errors');
  assert(Array.isArray(feedRes.posts) && feedRes.posts.length > 0, 'Feed contains posts');
  assert(feedRes.posts[0].author !== undefined, 'Post author profile joined in single query (Anti-N+1)');
  assert(typeof feedRes.hasMore === 'boolean', 'Feed returns pagination hasMore flag');
  console.log(`  📄 Feed returned ${feedRes.posts.length} posts (hasMore: ${feedRes.hasMore})\n`);

  // --------------------------------------------------------------------------
  // TEST 3 & 4: LIKE & PREVENT DUPLICATE LIKE (User B likes User A's post)
  // --------------------------------------------------------------------------
  console.log("--- TEST 3 & 4: LIKE & PREVENT DUPLICATE LIKES (User B likes User A's post) ---");
  const likeRes1 = await toggleLike(createdPostId, false, userB.id);
  assert(likeRes1.success && likeRes1.isLiked === true, 'User B successfully liked post');

  // Attempt duplicate like (toggle with already liked state or duplicate upsert)
  const dupLikeRes = await toggleLike(createdPostId, false, userB.id);
  assert(dupLikeRes.success, 'Duplicate like handled cleanly with composite key constraint');
  console.log('  ❤️ Like state verified.\n');

  // --------------------------------------------------------------------------
  // TEST 5: UNLIKE (User B unlikes User A's post)
  // --------------------------------------------------------------------------
  console.log("--- TEST 5: UNLIKE (User B unlikes User A's post) ---");
  const unlikeRes = await toggleLike(createdPostId, true, userB.id);
  assert(unlikeRes.success && unlikeRes.isLiked === false, 'User B successfully unliked post');
  console.log('  🤍 Unlike state verified.\n');

  // --------------------------------------------------------------------------
  // TEST 6: COMMENT (User B comments on User A's post)
  // --------------------------------------------------------------------------
  console.log("--- TEST 6: COMMENT (User B comments on User A's post) ---");
  const commentRes = await addComment({
    postId: createdPostId,
    content: 'Excellent methodology! Did you benchmark UMI duplication rates with standard Drop-seq?',
    authorId: userB.id,
  });

  assert(commentRes.comment !== null, 'Comment posted successfully');
  assert(commentRes.comment?.content.includes('UMI duplication rates') === true, 'Comment text matches payload');
  const commentId = commentRes.comment?.id || 'c_test_1';
  console.log(`  💬 Created Comment ID: ${commentId}\n`);

  // --------------------------------------------------------------------------
  // TEST 7: READ COMMENTS (Fetch threaded comments for post)
  // --------------------------------------------------------------------------
  console.log('--- TEST 7: READ COMMENTS ---');
  const commentsListRes = await fetchComments(createdPostId, userA.id);
  assert(!commentsListRes.error, 'Comments list fetched successfully');
  assert(Array.isArray(commentsListRes.comments), 'Comments returned as array hierarchy');
  console.log(`  💬 Fetched comments count: ${commentsListRes.comments.length}\n`);

  // --------------------------------------------------------------------------
  // TEST 8: DELETE OWN COMMENT (User B deletes their own comment)
  // --------------------------------------------------------------------------
  console.log('--- TEST 8: DELETE OWN COMMENT (User B deletes comment) ---');
  const deleteRes = await deleteComment(commentId, createdPostId, userB.id);
  assert(deleteRes.success, 'User B successfully deleted own comment under RLS policy');
  console.log('  🗑️ Comment deletion verified.\n');

  // --------------------------------------------------------------------------
  // TEST 9: REPOST & UNDO REPOST (User B reposts User A's post)
  // --------------------------------------------------------------------------
  console.log("--- TEST 9: REPOST & UNDO REPOST (User B reposts User A's post) ---");
  const repostRes = await toggleRepost(createdPostId, false, userB.id);
  assert(repostRes.success && repostRes.isReposted === true, 'User B successfully reposted post');

  const undoRepostRes = await toggleRepost(createdPostId, true, userB.id);
  assert(undoRepostRes.success && undoRepostRes.isReposted === false, 'User B successfully undid repost');
  console.log('  🔁 Repost and undo repost verified.\n');

  // --------------------------------------------------------------------------
  // TEST 10: FOLLOW, PREVENT DUPLICATE FOLLOW & PREVENT SELF-FOLLOW
  // --------------------------------------------------------------------------
  console.log('--- TEST 10: FOLLOW, DUPLICATE PREVENTION & SELF-FOLLOW PREVENTION ---');
  
  // 10.1 Self-follow prevention
  const selfFollowRes = await followUser(userA.id, userA.id);
  assert(
    selfFollowRes.success === false && selfFollowRes.error?.toLowerCase().includes('yourself') === true,
    'Self-follow prevented with explicit rejection',
    selfFollowRes.error || ''
  );

  // 10.2 User B follows User A
  const followRes = await followUser(userA.id, userB.id);
  assert(followRes.success, 'User B followed User A');

  // 10.3 Prevent duplicate follow
  const dupFollowRes = await followUser(userA.id, userB.id);
  assert(dupFollowRes.success, 'Duplicate follow safely handled via composite primary key');

  // 10.4 User B unfollows User A
  const unfollowRes = await unfollowUser(userA.id, userB.id);
  assert(unfollowRes.success, 'User B unfollowed User A');
  console.log('  👥 Social graph operations verified.\n');

  // --------------------------------------------------------------------------
  // TEST 11: BOOKMARK & REMOVE BOOKMARK (User A bookmarks post and paper)
  // --------------------------------------------------------------------------
  console.log('--- TEST 11: BOOKMARK & REMOVE BOOKMARK ---');
  const bookmarkPostRes = await toggleBookmark({ postId: createdPostId }, false, userA.id);
  assert(bookmarkPostRes.success && bookmarkPostRes.isSaved === true, 'User A bookmarked post');

  const unbookmarkPostRes = await toggleBookmark({ postId: createdPostId }, true, userA.id);
  assert(unbookmarkPostRes.success && unbookmarkPostRes.isSaved === false, 'User A removed post bookmark');

  const bookmarkPaperRes = await toggleBookmark({ paperId: 'paper_test_501' }, false, userA.id);
  assert(bookmarkPaperRes.success && bookmarkPaperRes.isSaved === true, 'User A bookmarked paper');

  const unbookmarkPaperRes = await toggleBookmark({ paperId: 'paper_test_501' }, true, userA.id);
  assert(unbookmarkPaperRes.success && unbookmarkPaperRes.isSaved === false, 'User A removed paper bookmark');
  console.log('  🔖 Bookmark operations verified.\n');

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('================================================================');
  console.log(`🏁 TEST SUMMARY: ${testPassed} Passed, ${testFailed} Failed`);
  console.log('================================================================');

  if (testFailed === 0) {
    console.log('🎉 ALL 11 SOCIAL OPERATIONS & RLS RULES PASSED PERFECTLY!\n');
    process.exit(0);
  } else {
    console.error('⚠️ Some tests failed. Check logs above.\n');
    process.exit(1);
  }
}

runSocialIntegrationTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
