const assert = require('assert');

// Implementation replica of deduplicateNotificationList from src/api/notificationService.ts
function deduplicateNotificationList(notifications) {
  if (!Array.isArray(notifications) || notifications.length === 0) {
    return { uniqueNotifications: [], duplicateIds: [] };
  }

  const seenIds = new Set();
  const seenEventKeys = new Map();
  const duplicateIds = [];

  for (const notif of notifications) {
    if (!notif || !notif.id) continue;

    // 1. Direct ID deduplication
    if (seenIds.has(notif.id)) {
      duplicateIds.push(notif.id);
      continue;
    }
    seenIds.add(notif.id);

    // 2. Semantic event signature deduplication
    const actorId = notif.actor?.id || 'unknown_actor';
    const type = notif.type;
    const targetEntity =
      type === 'follow'
        ? 'follow_event'
        : notif.targetPostId || notif.targetPaperId || notif.entityId || notif.targetTopicName || '';

    const rawTime = notif.metadata?.raw_created_at;
    const timeBucket = rawTime
      ? Math.floor(new Date(rawTime).getTime() / 10000)
      : notif.createdAt || '';

    const primaryKey = `${actorId}::${type}::${targetEntity}::${timeBucket}`;
    const coarseKey = `${actorId}::${type}::${targetEntity}`;

    const existing =
      seenEventKeys.get(primaryKey) ||
      (type === 'follow' || type === 'like' ? seenEventKeys.get(coarseKey) : undefined);

    if (existing) {
      const currentScore =
        (notif.targetPostId ? 3 : 0) +
        (notif.targetPaperId ? 3 : 0) +
        (notif.entityId ? 1 : 0) +
        (notif.messageSnippet ? 2 : 0) +
        (notif.metadata && Object.keys(notif.metadata).length > 1 ? 2 : 0);

      const existingScore =
        (existing.targetPostId ? 3 : 0) +
        (existing.targetPaperId ? 3 : 0) +
        (existing.entityId ? 1 : 0) +
        (existing.messageSnippet ? 2 : 0) +
        (existing.metadata && Object.keys(existing.metadata).length > 1 ? 2 : 0);

      if (currentScore > existingScore) {
        duplicateIds.push(existing.id);
        seenEventKeys.set(primaryKey, notif);
        if (type === 'follow' || type === 'like') seenEventKeys.set(coarseKey, notif);
      } else {
        duplicateIds.push(notif.id);
      }
    } else {
      seenEventKeys.set(primaryKey, notif);
      if (type === 'follow' || type === 'like') seenEventKeys.set(coarseKey, notif);
    }
  }

  const keptIds = new Set(Array.from(seenEventKeys.values()).map((n) => n.id));
  const uniqueNotifications = notifications.filter((n) => keptIds.has(n.id));

  return { uniqueNotifications, duplicateIds };
}

function filterNotificationList(notifications, filter) {
  if (!Array.isArray(notifications)) return [];
  const { uniqueNotifications } = deduplicateNotificationList(notifications);
  const list = uniqueNotifications;

  if (filter === 'All') return list;
  if (filter === 'Mentions') {
    return list.filter((n) => n.type === 'comment' || n.type === 'reply' || n.type === 'mention');
  }
  if (filter === 'Follows') {
    return list.filter((n) => n.type === 'follow');
  }
  if (filter === 'Discussions') {
    return list.filter(
      (n) =>
        n.type === 'comment' ||
        n.type === 'reply' ||
        n.type === 'like' ||
        n.type === 'repost' ||
        n.type === 'paper_discussion'
    );
  }
  if (filter === 'Updates') {
    return list.filter(
      (n) =>
        n.type === 'researcher_post' ||
        n.type === 'topic_activity' ||
        n.type === 'trending' ||
        n.type === 'topic_update' ||
        n.type === 'publisher_update'
    );
  }
  return list;
}

// ============================================================================
// TEST SUITE
// ============================================================================
console.log('🧪 Testing Notification Deduplication System...\n');

// 1. Dual like notifications (one with snippet "liked your research post", one with post snippet)
const testLikes = [
  {
    id: 'notif_like_1',
    type: 'like',
    actor: { id: 'usr_test' },
    targetPostId: 'post_999',
    messageSnippet: 'liked your research post',
    metadata: {},
    createdAt: '2d ago',
    metadata: { raw_created_at: '2026-10-11T11:09:25.515041+00:00' },
  },
  {
    id: 'notif_like_2',
    type: 'like',
    actor: { id: 'usr_test' },
    targetPostId: 'post_999',
    messageSnippet: 'Production maintenance in progress...',
    metadata: { post_id: 'post_999', raw_created_at: '2026-10-11T11:09:25.515041+00:00' },
    createdAt: '2d ago',
  },
];

const dedupLikes = deduplicateNotificationList(testLikes);
assert.strictEqual(dedupLikes.uniqueNotifications.length, 1, 'Should reduce duplicate likes to 1');
assert.strictEqual(dedupLikes.duplicateIds.length, 1, 'Should record 1 duplicate ID');
// Richer item should be preserved (the one with post_id metadata)
assert.strictEqual(dedupLikes.uniqueNotifications[0].id, 'notif_like_2', 'Should retain the richer notification with post_id');
console.log('✅ PASS: Dual like notifications properly collapsed into single richer notification');

// 2. Dual follow notifications
const testFollows = [
  {
    id: 'notif_fol_1',
    type: 'follow',
    actor: { id: 'usr_astro' },
    entityId: 'target_user_id',
    messageSnippet: null,
    metadata: { raw_created_at: '2026-10-07T16:32:15.44067+00:00' },
    createdAt: '5d ago',
  },
  {
    id: 'notif_fol_2',
    type: 'follow',
    actor: { id: 'usr_astro' },
    entityId: 'usr_astro',
    messageSnippet: 'started following you',
    metadata: { follower_id: 'usr_astro', raw_created_at: '2026-10-07T16:32:15.44067+00:00' },
    createdAt: '5d ago',
  },
];

const dedupFollows = deduplicateNotificationList(testFollows);
assert.strictEqual(dedupFollows.uniqueNotifications.length, 1, 'Should reduce duplicate follows to 1');
assert.strictEqual(dedupFollows.uniqueNotifications[0].id, 'notif_fol_2', 'Should preserve non-null follow snippet');
console.log('✅ PASS: Dual follow notifications properly collapsed into single notification');

// 3. Dual identical comment notifications
const testComments = [
  {
    id: 'notif_com_1',
    type: 'comment',
    actor: { id: 'usr_syed' },
    targetPostId: 'post_69',
    messageSnippet: 'TBH. I Didn\'t know this fact.',
    metadata: { raw_created_at: '2026-10-09T16:39:34.292182+00:00' },
    createdAt: '3d ago',
  },
  {
    id: 'notif_com_2',
    type: 'comment',
    actor: { id: 'usr_syed' },
    targetPostId: 'post_69',
    messageSnippet: 'TBH. I Didn\'t know this fact.',
    metadata: { raw_created_at: '2026-10-09T16:39:34.292182+00:00' },
    createdAt: '3d ago',
  },
];

const dedupComments = deduplicateNotificationList(testComments);
assert.strictEqual(dedupComments.uniqueNotifications.length, 1, 'Should reduce identical comments to 1');
console.log('✅ PASS: Trigger-duplicated comments properly collapsed into single notification');

// 4. Two legit distinct comments hours apart from same user
const distinctComments = [
  {
    id: 'notif_com_morning',
    type: 'comment',
    actor: { id: 'usr_syed' },
    targetPostId: 'post_69',
    messageSnippet: 'Great work on the paper!',
    metadata: { raw_created_at: '2026-10-09T08:00:00.000000+00:00' },
    createdAt: '3d ago',
  },
  {
    id: 'notif_com_evening',
    type: 'comment',
    actor: { id: 'usr_syed' },
    targetPostId: 'post_69',
    messageSnippet: 'Where can I find the code repo?',
    metadata: { raw_created_at: '2026-10-09T16:00:00.000000+00:00' },
    createdAt: '3d ago',
  },
];

const preservedComments = deduplicateNotificationList(distinctComments);
assert.strictEqual(preservedComments.uniqueNotifications.length, 2, 'Should preserve 2 distinct comments created hours apart');
console.log('✅ PASS: Distinct legitimate comments created hours apart are both preserved');

// 5. Test filterNotificationList with duplicate input
const mixedList = [...testLikes, ...testFollows, ...testComments];
const filteredAll = filterNotificationList(mixedList, 'All');
const filteredFollows = filterNotificationList(mixedList, 'Follows');
const filteredDiscussions = filterNotificationList(mixedList, 'Discussions');

assert.strictEqual(filteredAll.length, 3, 'All tab should contain 3 unique notifications');
assert.strictEqual(filteredFollows.length, 1, 'Follows tab should contain exactly 1 notification');
assert.strictEqual(filteredDiscussions.length, 2, 'Discussions tab should contain 2 notifications (like + comment)');
console.log('✅ PASS: filterNotificationList strictly deduplicates across all tabs');

console.log('\n🎉 ALL NOTIFICATION DEDUPLICATION TESTS PASSED!');
