const assert = require('assert');

// 1. Replicas of enhanced notificationService functions
function getNotificationDeepLink(notification) {
  const targetCommentId = notification.targetCommentId || notification.metadata?.comment_id;

  if (notification.targetPostId || (notification.entityType === 'post' && notification.entityId)) {
    const postId = notification.targetPostId || notification.entityId || '';
    const params = { id: postId };
    if (targetCommentId) {
      params.commentId = targetCommentId;
    }
    return {
      pathname: '/post/[id]',
      params,
    };
  }

  if (notification.targetPaperId || (notification.entityType === 'paper' && notification.entityId)) {
    const paperId = notification.targetPaperId || notification.entityId || '';
    return {
      pathname: '/paper/[id]',
      params: { id: paperId },
    };
  }

  if (notification.type === 'collaboration_request') {
    return {
      pathname: '/profile/[id]',
      params: {
        id: notification.actor.id,
        action: 'collaboration',
        requestId: notification.entityId || notification.metadata?.request_id || '',
      },
    };
  }

  if (notification.targetTopicName || (notification.entityType === 'topic' && (notification.targetTopicName || notification.entityId))) {
    const slug = (notification.targetTopicName || notification.entityId || 'general')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-');
    return {
      pathname: '/topic/[slug]',
      params: { slug },
    };
  }

  if (
    notification.type === 'workspace_invitation' ||
    notification.type === 'workspace_message' ||
    notification.type === 'workspace_event' ||
    notification.entityType === 'workspace'
  ) {
    const workspaceId = notification.entityId || notification.metadata?.workspace_id;
    if (workspaceId) {
      return {
        pathname: '/workspace/[id]',
        params: { id: workspaceId },
      };
    }
    return {
      pathname: '/workspace',
    };
  }

  return {
    pathname: '/profile/[id]',
    params: { id: notification.actor.id },
  };
}

function deduplicateNotificationList(notifications) {
  if (!Array.isArray(notifications) || notifications.length === 0) {
    return { uniqueNotifications: [], duplicateIds: [] };
  }

  const seenIds = new Set();
  const seenEventKeys = new Map();
  const duplicateIds = [];

  for (const notif of notifications) {
    if (!notif || !notif.id) continue;

    if (seenIds.has(notif.id)) {
      duplicateIds.push(notif.id);
      continue;
    }
    seenIds.add(notif.id);

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
        n.type === 'paper_discussion' ||
        n.type === 'collaboration_request' ||
        n.type === 'workspace_message' ||
        n.type === 'workspace_invitation'
    );
  }
  if (filter === 'Updates') {
    return list.filter(
      (n) =>
        n.type === 'researcher_post' ||
        n.type === 'topic_activity' ||
        n.type === 'trending' ||
        n.type === 'topic_update' ||
        n.type === 'publisher_update' ||
        n.type === 'workspace_event' ||
        n.type === 'workspace_block' ||
        n.type === 'subscription_active'
    );
  }
  return list;
}

// ==========================================
// TEST EXECUTION
// ==========================================
console.log('🧪 Running Comprehensive Notification System Test Suite...\n');

// Test 1: Deep Link with Comment ID
const commentNotif = {
  id: 'notif_1',
  type: 'reply',
  actor: { id: 'usr_alice' },
  entityType: 'post',
  entityId: 'post_100',
  targetPostId: 'post_100',
  targetCommentId: 'comment_999',
};
const commentLink = getNotificationDeepLink(commentNotif);
assert.strictEqual(commentLink.pathname, '/post/[id]');
assert.strictEqual(commentLink.params.id, 'post_100');
assert.strictEqual(commentLink.params.commentId, 'comment_999');
console.log('✅ TEST 1: Comment notification correctly generates deep link with commentId param');

// Test 2: Collaboration Request Deep Link
const collabNotif = {
  id: 'notif_2',
  type: 'collaboration_request',
  actor: { id: 'usr_bob' },
  entityType: 'profile',
  entityId: 'req_555',
  metadata: { request_id: 'req_555' },
};
const collabLink = getNotificationDeepLink(collabNotif);
assert.strictEqual(collabLink.pathname, '/profile/[id]');
assert.strictEqual(collabLink.params.id, 'usr_bob');
assert.strictEqual(collabLink.params.action, 'collaboration');
assert.strictEqual(collabLink.params.requestId, 'req_555');
console.log('✅ TEST 2: Collaboration request routes to profile with action and requestId');

// Test 3: Discussions Filter Includes Collaboration Requests
const sampleList = [
  { id: '1', type: 'comment', actor: { id: 'a' } },
  { id: '2', type: 'like', actor: { id: 'b' } },
  { id: '3', type: 'repost', actor: { id: 'c' } },
  { id: '4', type: 'paper_discussion', actor: { id: 'd' } },
  { id: '5', type: 'collaboration_request', actor: { id: 'e' } },
  { id: '6', type: 'follow', actor: { id: 'f' } },
  { id: '7', type: 'researcher_post', actor: { id: 'g' } },
];
const discussions = filterNotificationList(sampleList, 'Discussions');
const discussionTypes = discussions.map((d) => d.type);
assert(discussionTypes.includes('comment'));
assert(discussionTypes.includes('like'));
assert(discussionTypes.includes('repost'));
assert(discussionTypes.includes('paper_discussion'));
assert(discussionTypes.includes('collaboration_request'));
assert(!discussionTypes.includes('follow'));
assert(!discussionTypes.includes('researcher_post'));
console.log('✅ TEST 3: Discussions tab filter includes comments, likes, reposts, paper discussions, and collaboration requests');

// Test 4: Mentions Tab Filter
const mentions = filterNotificationList(
  [
    { id: 'm1', type: 'mention', actor: { id: 'a' } },
    { id: 'm2', type: 'reply', actor: { id: 'b' } },
    { id: 'm3', type: 'comment', actor: { id: 'c' } },
    { id: 'm4', type: 'follow', actor: { id: 'd' } },
  ],
  'Mentions'
);
assert.strictEqual(mentions.length, 3);
console.log('✅ TEST 4: Mentions tab properly filters mentions, replies, and comments');

// Test 5: Real-time incremental deduplication
const baseNotifs = [
  { id: 'n1', type: 'like', actor: { id: 'usr_1' }, targetPostId: 'p1' },
];
const incomingDup = { id: 'n1_dup', type: 'like', actor: { id: 'usr_1' }, targetPostId: 'p1' };
const { uniqueNotifications } = deduplicateNotificationList([incomingDup, ...baseNotifs]);
assert.strictEqual(uniqueNotifications.length, 1);
console.log('✅ TEST 5: Real-time incoming duplicate like notification correctly deduplicated');

// Test 6: Workspace Notification Deep Link and Filtering
const wsInviteNotif = {
  id: 'notif_ws',
  type: 'workspace_invitation',
  actor: { id: 'usr_leader' },
  entityType: 'workspace',
  entityId: 'ws_789',
};
const wsLink = getNotificationDeepLink(wsInviteNotif);
assert.strictEqual(wsLink.pathname, '/workspace/[id]');
assert.strictEqual(wsLink.params.id, 'ws_789');

const wsFiltered = filterNotificationList([wsInviteNotif], 'Discussions');
assert.strictEqual(wsFiltered.length, 1);
assert.strictEqual(wsFiltered[0].id, 'notif_ws');
console.log('✅ TEST 6: Workspace invitation routes to /workspace/[id] and is included in Discussions filter');

console.log('\n🎉 ALL NOTIFICATION SYSTEM SUITE TESTS PASSED SUCCESSFULLY!\n');
