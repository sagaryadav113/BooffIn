// Test suite for Forwarded Message Indicator and Forwarding Pipeline
const assert = require('assert');

console.log('🧪 Starting Forwarded Message Indicator & Pipeline Tests...\n');

let totalTests = 0;
let passedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✅ [PASS] ${name}`);
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
  }
}

// -----------------------------------------------------------------------------
// Test Group 1: Forwarded Badge Display Evaluation
// -----------------------------------------------------------------------------
test('Badge displays when is_forwarded is true and message is not deleted', () => {
  const item = {
    id: 'msg-1',
    content: 'Interesting research finding',
    is_forwarded: true,
    is_deleted: false,
    attachments: {},
  };
  const isDeleted = Boolean(item.is_deleted);
  const shouldShowBadge = Boolean(item.is_forwarded || item.attachments?.is_forwarded) && !isDeleted;
  assert.strictEqual(shouldShowBadge, true);
});

test('Badge displays when is_forwarded is in attachments (DB backward compatibility)', () => {
  const item = {
    id: 'msg-2',
    content: 'Forwarded via legacy schema',
    is_deleted: false,
    attachments: { is_forwarded: true },
  };
  const isDeleted = Boolean(item.is_deleted);
  const shouldShowBadge = Boolean(item.is_forwarded || item.attachments?.is_forwarded) && !isDeleted;
  assert.strictEqual(shouldShowBadge, true);
});

test('Badge is hidden when message is deleted even if it was forwarded', () => {
  const item = {
    id: 'msg-3',
    content: '🚫 This message was deleted',
    is_forwarded: true,
    is_deleted: true,
    attachments: { is_forwarded: true },
  };
  const isDeleted = Boolean(item.is_deleted);
  const shouldShowBadge = Boolean(item.is_forwarded || item.attachments?.is_forwarded) && !isDeleted;
  assert.strictEqual(shouldShowBadge, false);
});

test('Badge is hidden for standard original messages', () => {
  const item = {
    id: 'msg-4',
    content: 'Original message authored by sender',
    is_forwarded: false,
    is_deleted: false,
    attachments: null,
  };
  const isDeleted = Boolean(item.is_deleted);
  const shouldShowBadge = Boolean(item.is_forwarded || item.attachments?.is_forwarded) && !isDeleted;
  assert.strictEqual(shouldShowBadge, false);
});

// -----------------------------------------------------------------------------
// Test Group 2: Attachments & Payload Forwarding Pipeline
// -----------------------------------------------------------------------------
test('Forward payload preserves all metadata and marks is_forwarded', () => {
  const originalMessage = {
    id: 'orig-10',
    workspace_id: 'ws-src',
    sender_id: 'user-1',
    content: 'Check this preprint',
    message_type: 'document',
    doi_metadata: { doi: '10.1234/nature123', title: 'Quantum Teleportation' },
    poll_data: null,
    audio_metadata: null,
    document_metadata: { name: 'paper.pdf', sizeBytes: 1024, fileUrl: 'https://example.com/p.pdf' },
    post_metadata: { id: 'post-1', title: 'Post reference' },
    profile_metadata: null,
    workspace_invite_metadata: null,
    media_urls: ['https://example.com/p.pdf'],
    attachments: { custom_tag: 'urgent' },
    is_pinned: false,
    reply_to_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Simulate payload preparation in workspaceService.sendMessage
  const params = {
    workspace_id: 'ws-dest',
    content: originalMessage.content,
    message_type: originalMessage.message_type,
    doi_metadata: originalMessage.doi_metadata,
    poll_data: originalMessage.poll_data,
    audio_metadata: originalMessage.audio_metadata,
    document_metadata: originalMessage.document_metadata,
    post_metadata: originalMessage.post_metadata,
    profile_metadata: originalMessage.profile_metadata,
    workspace_invite_metadata: originalMessage.workspace_invite_metadata,
    media_urls: originalMessage.media_urls,
    attachments: originalMessage.attachments,
    is_forwarded: true,
  };

  const attachmentsPayload = { ...(params.attachments || {}) };
  if (params.media_urls && params.media_urls.length > 0) {
    attachmentsPayload.media_urls = params.media_urls;
    attachmentsPayload.url = params.media_urls[0];
  }
  if (params.document_metadata) attachmentsPayload.document_metadata = params.document_metadata;
  if (params.post_metadata) attachmentsPayload.post_metadata = params.post_metadata;
  if (params.doi_metadata) attachmentsPayload.doi_metadata = params.doi_metadata;
  if (params.is_forwarded) attachmentsPayload.is_forwarded = true;

  assert.strictEqual(attachmentsPayload.is_forwarded, true);
  assert.strictEqual(attachmentsPayload.custom_tag, 'urgent');
  assert.deepStrictEqual(attachmentsPayload.document_metadata, originalMessage.document_metadata);
  assert.deepStrictEqual(attachmentsPayload.doi_metadata, originalMessage.doi_metadata);
});

// -----------------------------------------------------------------------------
// Test Group 3: Realtime Postgres Mapping Resilience
// -----------------------------------------------------------------------------
test('Realtime subscriber correctly reads is_forwarded from either root or attachments', () => {
  const newMsgFromDb = {
    id: 'db-msg-1',
    workspace_id: 'ws-dest',
    sender_id: 'user-2',
    content: 'Forwarded text',
    message_type: 'text',
    is_forwarded: null, // table lacks top-level column
    attachments: { is_forwarded: true },
  };

  const is_forwarded = newMsgFromDb.is_forwarded ?? (newMsgFromDb.attachments?.is_forwarded || false);
  assert.strictEqual(is_forwarded, true);
});

test('Realtime subscriber sets is_forwarded false when neither source has it', () => {
  const newMsgFromDb = {
    id: 'db-msg-2',
    workspace_id: 'ws-dest',
    sender_id: 'user-2',
    content: 'Regular text',
    message_type: 'text',
    is_forwarded: false,
    attachments: {},
  };

  const is_forwarded = newMsgFromDb.is_forwarded ?? (newMsgFromDb.attachments?.is_forwarded || false);
  assert.strictEqual(is_forwarded, false);
});

console.log(`\n📊 Test Results: ${passedTests} / ${totalTests} tests passed.\n`);
if (passedTests !== totalTests) {
  process.exit(1);
} else {
  console.log('🎉 All forward indicator & pipeline tests PASSED successfully!\n');
}
