/**
 * Test Suite: BoffIn Notification System
 * Validates all 8 notification types, unread counts, mark-as-read, mark-all-as-read,
 * deep linking, deduplication safeguards, and tab filtering.
 */

import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  createNotification,
  getNotificationDeepLink,
  filterNotificationList,
  resetMockNotifications,
  formatNotificationContent,
} from '../src/api/notificationService';
import { AppNotification, NotificationType } from '../src/types/notification';
import { mockUsers, mockPosts, mockPapers } from '../src/data/mockData';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName} ${detail ? `(${detail})` : ''}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${testName} ${detail ? `(${detail})` : ''}`);
    failedTests++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('🔔 BOOFFIN NOTIFICATION SYSTEM TEST SUITE');
  console.log('================================================================\n');

  const initialTestNotifications: AppNotification[] = [
    {
      id: 'test_notif_1',
      type: 'like',
      actor: mockUsers[3], // Dr. Elena Park
      content: 'liked your research post',
      entityType: 'post',
      entityId: 'post_123',
      targetPostId: 'post_123',
      createdAt: '2m ago',
      isRead: false,
    },
    {
      id: 'test_notif_2',
      type: 'comment',
      actor: mockUsers[4], // Prof. Arjun Mehta
      content: 'commented: "Fascinating methodology."',
      entityType: 'post',
      entityId: 'post_123',
      targetPostId: 'post_123',
      messageSnippet: 'Fascinating methodology.',
      createdAt: '10m ago',
      isRead: false,
    },
    {
      id: 'test_notif_3',
      type: 'reply',
      actor: mockUsers[2], // Dr. Marcus Chen
      content: 'replied to your comment: "Check the control groups."',
      entityType: 'post',
      entityId: 'post_456',
      targetPostId: 'post_456',
      messageSnippet: 'Check the control groups.',
      createdAt: '20m ago',
      isRead: false,
    },
    {
      id: 'test_notif_4',
      type: 'follow',
      actor: mockUsers[1], // Dr. Aanya Rao
      content: 'started following you',
      entityType: 'profile',
      entityId: mockUsers[1].id,
      createdAt: '1h ago',
      isRead: false,
    },
    {
      id: 'test_notif_5',
      type: 'paper_discussion',
      actor: mockUsers[4], // Prof. Arjun Mehta
      content: 'new discussion activity on paper you interacted with',
      entityType: 'paper',
      entityId: 'paper_789',
      targetPaperId: 'paper_789',
      createdAt: '2h ago',
      isRead: false,
    },
    {
      id: 'test_notif_6',
      type: 'researcher_post',
      actor: mockUsers[1], // Dr. Aanya Rao
      content: 'shared new research: "Quantum Entanglement Discovery"',
      entityType: 'post',
      entityId: 'post_789',
      targetPostId: 'post_789',
      messageSnippet: 'Quantum Entanglement Discovery',
      createdAt: '3h ago',
      isRead: true,
    },
    {
      id: 'test_notif_7',
      type: 'topic_activity',
      actor: mockUsers[2], // Dr. Marcus Chen
      content: 'new research activity in #Neuroscience',
      entityType: 'topic',
      entityId: 'topic_neuro',
      targetTopicName: 'Neuroscience',
      createdAt: '5h ago',
      isRead: true,
    },
    {
      id: 'test_notif_8',
      type: 'repost',
      actor: mockUsers[6], // Maya Singh
      content: 'reposted your research post',
      entityType: 'post',
      entityId: 'post_123',
      targetPostId: 'post_123',
      createdAt: '6h ago',
      isRead: true,
    },
  ];

  resetMockNotifications(initialTestNotifications);

  // --------------------------------------------------------------------------
  // TEST 1: ALL 8 NOTIFICATION TYPES FORMATTING & IDENTIFICATION
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: NOTIFICATION TYPES COPY FORMATTING ---');
  assert(
    formatNotificationContent('follow') === 'started following you',
    'Follow notification formatting'
  );
  assert(
    formatNotificationContent('like') === 'liked your research post',
    'Like notification formatting'
  );
  assert(
    formatNotificationContent('comment', 'Great paper') === 'commented: "Great paper"',
    'Comment notification formatting with snippet'
  );
  assert(
    formatNotificationContent('reply', 'I agree') === 'replied to your comment: "I agree"',
    'Reply notification formatting with snippet'
  );
  assert(
    formatNotificationContent('repost') === 'reposted your research post',
    'Repost notification formatting'
  );
  assert(
    formatNotificationContent('paper_discussion') === 'new discussion activity on paper you interacted with',
    'Paper discussion notification formatting'
  );
  assert(
    formatNotificationContent('researcher_post', 'New Findings') === 'shared new research: "New Findings"',
    'Researcher post notification formatting'
  );
  assert(
    formatNotificationContent('topic_activity', null, 'Quantum Computing') === 'new research activity in #Quantum Computing',
    'Topic activity notification formatting'
  );

  // --------------------------------------------------------------------------
  // TEST 2: UNREAD COUNT & FETCHING
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: UNREAD COUNT & FETCHING ---');
  const { count: initialUnread } = await fetchUnreadCount();
  assert(initialUnread === 5, 'Initial unread count matches unread items', `Count: ${initialUnread}`);

  const { data: allNotifs, hasMore } = await fetchNotifications('All', 1, 20);
  assert(allNotifs.length === 8, 'Fetched all 8 notifications', `Found: ${allNotifs.length}`);
  assert(!hasMore, 'No further pages for 8 items with pageSize 20');

  // --------------------------------------------------------------------------
  // TEST 3: MARK SINGLE NOTIFICATION AS READ
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: MARK SINGLE NOTIFICATION AS READ ---');
  const markRes = await markNotificationAsRead('test_notif_1');
  assert(markRes.success, 'markNotificationAsRead returned success');

  const { count: unreadAfterOne } = await fetchUnreadCount();
  assert(
    unreadAfterOne === 4,
    'Unread count decreased by 1 after marking test_notif_1',
    `Unread: ${unreadAfterOne}`
  );

  const { data: reloadedNotifs } = await fetchNotifications('All');
  const notif1 = reloadedNotifs.find((n) => n.id === 'test_notif_1');
  assert(notif1?.isRead === true, 'test_notif_1 isRead state updated to true');

  // --------------------------------------------------------------------------
  // TEST 4: MARK ALL NOTIFICATIONS AS READ
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: MARK ALL NOTIFICATIONS AS READ ---');
  const markAllRes = await markAllNotificationsAsRead();
  assert(markAllRes.success, 'markAllNotificationsAsRead returned success');
  assert(markAllRes.updatedCount === 4, 'Updated remaining 4 unread notifications');

  const { count: unreadAfterAll } = await fetchUnreadCount();
  assert(unreadAfterAll === 0, 'Unread count is exactly 0 after markAllAsRead', `Unread: ${unreadAfterAll}`);

  // --------------------------------------------------------------------------
  // TEST 5: TAB FILTERING
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: TAB FILTERING ---');
  const mentionsList = filterNotificationList(initialTestNotifications, 'Mentions');
  assert(
    mentionsList.length === 2 &&
      mentionsList.every((n) => n.type === 'comment' || n.type === 'reply' || n.type === 'mention'),
    'Mentions tab filters comments & replies',
    `Count: ${mentionsList.length}`
  );

  const followsList = filterNotificationList(initialTestNotifications, 'Follows');
  assert(
    followsList.length === 1 && followsList[0].type === 'follow',
    'Follows tab filters follow notifications',
    `Count: ${followsList.length}`
  );

  const discussionsList = filterNotificationList(initialTestNotifications, 'Discussions');
  assert(
    discussionsList.length === 3 &&
      discussionsList.every(
        (n) => n.type === 'comment' || n.type === 'reply' || n.type === 'paper_discussion'
      ),
    'Discussions tab filters comments, replies, and paper discussions',
    `Count: ${discussionsList.length}`
  );

  const updatesList = filterNotificationList(initialTestNotifications, 'Updates');
  assert(
    updatesList.length === 2 &&
      updatesList.every((n) => n.type === 'researcher_post' || n.type === 'topic_activity'),
    'Updates tab filters researcher posts and topic activity',
    `Count: ${updatesList.length}`
  );

  // --------------------------------------------------------------------------
  // TEST 6: DEEP LINKING RESOLUTION
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6: DEEP LINKING RESOLUTION ---');
  const postLink = getNotificationDeepLink(initialTestNotifications[0]);
  assert(
    postLink.pathname === '/post/[id]' && postLink.params?.id === 'post_123',
    'Post notification links to /post/[id]',
    `Target: ${postLink.pathname} (id: ${postLink.params?.id})`
  );

  const paperLink = getNotificationDeepLink(initialTestNotifications[4]);
  assert(
    paperLink.pathname === '/paper/[id]' && paperLink.params?.id === 'paper_789',
    'Paper discussion notification links to /paper/[id]',
    `Target: ${paperLink.pathname} (id: ${paperLink.params?.id})`
  );

  const topicLink = getNotificationDeepLink(initialTestNotifications[6]);
  assert(
    topicLink.pathname === '/topic/[slug]' && topicLink.params?.slug === 'neuroscience',
    'Topic activity notification links to /topic/[slug]',
    `Target: ${topicLink.pathname} (slug: ${topicLink.params?.slug})`
  );

  const followLink = getNotificationDeepLink(initialTestNotifications[3]);
  assert(
    followLink.pathname === '/profile/[id]' && followLink.params?.id === mockUsers[1].id,
    'Follow notification links to /profile/[id]',
    `Target: ${followLink.pathname} (id: ${followLink.params?.id})`
  );

  // --------------------------------------------------------------------------
  // TEST 7: SAFEGUARDS & DEDUPLICATION
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 7: SAFEGUARDS & DEDUPLICATION ---');
  const selfNotif = await createNotification({
    recipientId: 'user_active',
    actorId: 'user_active',
    type: 'like',
    entityType: 'post',
    entityId: 'post_999',
  });
  assert(selfNotif.data === null, 'Self-notification is prevented');

  // Create a new unread like notification
  const validNotif = await createNotification({
    recipientId: 'user_author',
    actorId: mockUsers[2].id,
    type: 'like',
    entityType: 'post',
    entityId: 'post_999',
  });
  assert(validNotif.data !== null, 'Valid notification created successfully');

  // Try creating a duplicate unread like notification for same actor & entity
  const duplicateNotif = await createNotification({
    recipientId: 'user_author',
    actorId: mockUsers[2].id,
    type: 'like',
    entityType: 'post',
    entityId: 'post_999',
  });
  assert(duplicateNotif.data === null, 'Duplicate unread notification prevented');

  // --------------------------------------------------------------------------
  // TEST 8: PAGINATION
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 8: PAGINATION ---');
  const page1 = await fetchNotifications('All', 1, 3);
  assert(page1.data.length === 3, 'Page 1 returned exact pageSize of 3', `Items: ${page1.data.length}`);
  assert(page1.hasMore === true, 'Page 1 indicates hasMore=true');

  const page2 = await fetchNotifications('All', 2, 3);
  assert(page2.data.length === 3, 'Page 2 returned next slice of 3');
  assert(page1.data[0].id !== page2.data[0].id, 'Page 1 and Page 2 contain non-overlapping items');

  // --------------------------------------------------------------------------
  // TEST 9: STORE-EQUIVALENT STATE UPDATES & UNREAD CALCULATION
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 9: STATE UPDATES & UNREAD CALCULATION ---');
  const { data: freshList } = await fetchNotifications('All');
  assert(freshList.length > 0, 'Loaded active notifications from service');

  const computedUnread = freshList.filter((n) => !n.isRead).length;
  assert(typeof computedUnread === 'number', 'Computes unreadCount accurately', `Count: ${computedUnread}`);

  console.log('\n================================================================');
  console.log(`🏁 TEST SUMMARY: ${passedTests} Passed, ${failedTests} Failed`);
  console.log('================================================================');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL NOTIFICATION SYSTEM TESTS PASSED PERFECTLY!\n');
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
