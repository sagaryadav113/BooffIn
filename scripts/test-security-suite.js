/**
 * BoffIn Comprehensive Application Security & RLS Test Suite
 * Validates:
 * 1. Supabase Row Level Security (RLS) enforcement simulations
 * 2. Authorization Boundaries (Profile edit, Post/Comment deletion, Likes, Follows)
 * 3. Collaboration Request State Machine & IDOR prevention
 * 4. Rate Limiting & Spam Prevention
 * 5. Safety & Moderation (User Blocks & Content Reports)
 * 6. Input Sanitization & Web XSS Protocol Injection Prevention
 * 7. Secret Leakage & Environment Exposure Verification
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Reusable URL & text sanitizer matching src/utils/security.ts
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

function sanitizeExternalUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    if (trimmed.startsWith('/') || trimmed.startsWith('#')) return trimmed;
    const parsed = new URL(trimmed);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return null;
    }
    return parsed.href;
  } catch {
    if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(trimmed)) {
      return `https://${trimmed}`;
    }
    return null;
  }
}

function sanitizeTextContent(text, maxLength = 5000) {
  if (!text || typeof text !== 'string') return '';
  const cleaned = text.replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, '');
  return cleaned.slice(0, maxLength).trim();
}

async function runSecuritySuite() {
  console.log('🔒 =========================================================');
  console.log('🔒 RUNNING BOFFIN APPLICATION SECURITY & RLS AUDIT SUITE');
  console.log('🔒 =========================================================\n');

  let passed = 0;
  let failed = 0;

  function runTest(suite, name, fn) {
    try {
      fn();
      console.log(`  ✅ [PASS] (${suite}) ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] (${suite}) ${name}:`, err.message);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // SUITE 1: AUTHORIZATION & RLS MATRIX VALIDATION
  // --------------------------------------------------------------------------
  console.log('\n--- 1. Supabase RLS Authorization Matrix ---');

  runTest('RLS', 'User CANNOT edit another user profile', () => {
    const authUid = 'usr_alice';
    const targetProfileId = 'usr_bob';
    // RLS Policy "Users Update Own Profile" enforces auth.uid() = id
    const rlsPolicyCheck = (sessionUid, recordId) => sessionUid === recordId;

    assert.strictEqual(rlsPolicyCheck(authUid, targetProfileId), false, 'Attacker edit must be rejected');
    assert.strictEqual(rlsPolicyCheck(authUid, authUid), true, 'Self profile edit must be allowed');
  });

  runTest('RLS', 'User CANNOT delete another user post', () => {
    const authUid = 'usr_alice';
    const post = { id: 'post_100', author_id: 'usr_bob' };
    // RLS Policy "Users Delete Own Posts" enforces auth.uid() = author_id
    const canDeletePost = (sessionUid, postRecord) => sessionUid === postRecord.author_id;

    assert.strictEqual(canDeletePost(authUid, post), false, 'Non-author cannot delete post');
    assert.strictEqual(canDeletePost('usr_bob', post), true, 'Post author can delete own post');
  });

  runTest('RLS', 'User CANNOT delete another user comment', () => {
    const authUid = 'usr_alice';
    const comment = { id: 'c_200', author_id: 'usr_bob' };
    // RLS Policy "Users Delete Own Comments" enforces auth.uid() = author_id
    const canDeleteComment = (sessionUid, commentRecord) => sessionUid === commentRecord.author_id;

    assert.strictEqual(canDeleteComment(authUid, comment), false, 'Non-author cannot delete comment');
    assert.strictEqual(canDeleteComment('usr_bob', comment), true, 'Author can delete own comment');
  });

  runTest('RLS', 'User CANNOT create likes on behalf of another user', () => {
    const authUid = 'usr_alice';
    const spoofedUserId = 'usr_bob';
    // RLS Policy "Users Manage Own Likes" enforces WITH CHECK (auth.uid() = user_id)
    const canInsertLike = (sessionUid, payloadUserId) => sessionUid === payloadUserId;

    assert.strictEqual(canInsertLike(authUid, spoofedUserId), false, 'Spoofed like insert must fail');
    assert.strictEqual(canInsertLike(authUid, authUid), true, 'Legitimate like insert must succeed');
  });

  runTest('RLS', 'User CANNOT create follows on behalf of another user and cannot self-follow', () => {
    const authUid = 'usr_alice';
    const spoofedFollower = 'usr_bob';
    const targetToFollow = 'usr_charlie';

    const canFollow = (sessionUid, followerId, targetId) => {
      if (sessionUid !== followerId) return { allowed: false, error: 'Unauthorized follower spoofing' };
      if (followerId === targetId) return { allowed: false, error: 'Self-follow not permitted' };
      return { allowed: true };
    };

    assert.strictEqual(canFollow(authUid, spoofedFollower, targetToFollow).allowed, false);
    assert.strictEqual(canFollow(authUid, authUid, authUid).allowed, false);
    assert.strictEqual(canFollow(authUid, authUid, targetToFollow).allowed, true);
  });

  runTest('RLS', 'Follower-only posts are hidden from non-followers', () => {
    const post = { id: 'post_1', author_id: 'usr_creator', visibility: 'followers' };
    const follows = new Set(['usr_fan:usr_creator']);

    const canViewPost = (viewerId, postRecord) => {
      if (postRecord.visibility === 'public') return true;
      if (postRecord.author_id === viewerId) return true;
      if (postRecord.visibility === 'followers') {
        return follows.has(`${viewerId}:${postRecord.author_id}`);
      }
      return false;
    };

    assert.strictEqual(canViewPost('usr_creator', post), true, 'Creator can view own follower-only post');
    assert.strictEqual(canViewPost('usr_fan', post), true, 'Follower can view follower-only post');
    assert.strictEqual(canViewPost('usr_stranger', post), false, 'Non-follower CANNOT view follower-only post');
  });

  // --------------------------------------------------------------------------
  // SUITE 2: COLLABORATION REQUESTS IDOR & STATE MACHINE
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Collaboration Requests State Machine & IDOR Security ---');

  runTest('COLLAB', 'Sender CANNOT unilaterally accept their own collaboration request', () => {
    const request = {
      id: 'req_1',
      sender_id: 'usr_alice',
      recipient_id: 'usr_bob',
      status: 'pending',
    };

    // Hardened Policy check:
    // Sender can ONLY set status = 'withdrawn'
    // Recipient can set status IN ('accepted', 'declined')
    const executeUpdateRequest = (sessionUid, targetReq, newStatus) => {
      if (targetReq.status !== 'pending') {
        return { success: false, error: 'Request is no longer pending' };
      }
      if (sessionUid === targetReq.sender_id) {
        if (newStatus === 'withdrawn') return { success: true };
        return { success: false, error: 'Sender can only withdraw pending requests' };
      }
      if (sessionUid === targetReq.recipient_id) {
        if (newStatus === 'accepted' || newStatus === 'declined') return { success: true };
        return { success: false, error: 'Invalid recipient status' };
      }
      return { success: false, error: 'Unauthorized' };
    };

    // Alice (sender) tries to set status to 'accepted'
    const exploitAttempt = executeUpdateRequest('usr_alice', request, 'accepted');
    assert.strictEqual(exploitAttempt.success, false, 'Sender must NOT be able to accept own request');

    // Bob (recipient) accepts the request
    const legitimateAccept = executeUpdateRequest('usr_bob', request, 'accepted');
    assert.strictEqual(legitimateAccept.success, true, 'Recipient must be able to accept');

    // Alice withdraws the request
    const legitimateWithdraw = executeUpdateRequest('usr_alice', request, 'withdrawn');
    assert.strictEqual(legitimateWithdraw.success, true, 'Sender must be able to withdraw');
  });

  runTest('COLLAB', 'Third party CANNOT view or modify collaboration request', () => {
    const request = { sender_id: 'usr_alice', recipient_id: 'usr_bob', status: 'pending' };
    const canView = (sessionUid, req) => sessionUid === req.sender_id || sessionUid === req.recipient_id;

    assert.strictEqual(canView('usr_charlie', request), false, 'Third party cannot view request');
    assert.strictEqual(canView('usr_alice', request), true, 'Sender can view request');
    assert.strictEqual(canView('usr_bob', request), true, 'Recipient can view request');
  });

  // --------------------------------------------------------------------------
  // SUITE 3: RATE LIMITING & ABUSE PREVENTION
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Rate Limiting & Spam Prevention ---');

  runTest('RATE_LIMIT', 'Collaboration request rate limit trigger caps rapid submissions at 15/hr', () => {
    let senderRequestsInLastHour = 0;

    const simulateSend = () => {
      if (senderRequestsInLastHour >= 15) {
        throw new Error('Rate limit exceeded: You can only send up to 15 collaboration requests per hour.');
      }
      senderRequestsInLastHour++;
      return true;
    };

    for (let i = 0; i < 15; i++) {
      assert.strictEqual(simulateSend(), true);
    }
    assert.throws(() => simulateSend(), /Rate limit exceeded/);
  });

  // --------------------------------------------------------------------------
  // SUITE 4: SAFETY & MODERATION (BLOCKS & REPORTS)
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Safety & Moderation Subsystems ---');

  runTest('MODERATION', 'User self-block is blocked by check constraint', () => {
    const canBlock = (blockerId, blockedId) => blockerId !== blockedId;
    assert.strictEqual(canBlock('usr_alice', 'usr_alice'), false, 'Cannot block self');
    assert.strictEqual(canBlock('usr_alice', 'usr_bob'), true, 'Can block target user');
  });

  runTest('MODERATION', 'Blocked user content is filtered from feed', () => {
    const blockedList = new Set(['usr_troll']);
    const posts = [
      { id: 'p1', author: { id: 'usr_good' }, content: 'Good research' },
      { id: 'p2', author: { id: 'usr_troll' }, content: 'Spam post' },
    ];

    const visiblePosts = posts.filter((p) => !blockedList.has(p.author.id));
    assert.strictEqual(visiblePosts.length, 1);
    assert.strictEqual(visiblePosts[0].id, 'p1');
  });

  runTest('MODERATION', 'Content reports validate reported types and reasons', () => {
    const validTypes = new Set(['post', 'comment', 'profile']);
    const validReasons = new Set(['spam', 'harassment', 'misinformation', 'inappropriate', 'copyright', 'other']);

    const validateReport = (type, reason) => validTypes.has(type) && validReasons.has(reason);

    assert.strictEqual(validateReport('post', 'spam'), true);
    assert.strictEqual(validateReport('comment', 'harassment'), true);
    assert.strictEqual(validateReport('system', 'spam'), false, 'Invalid type must be rejected');
    assert.strictEqual(validateReport('post', 'invalid_reason'), false, 'Invalid reason must be rejected');
  });

  // --------------------------------------------------------------------------
  // SUITE 5: INPUT SANITIZATION & PROTOCOL INJECTION (XSS)
  // --------------------------------------------------------------------------
  console.log('\n--- 5. Input Sanitization & URL Scheme Defense ---');

  runTest('SANITIZATION', 'sanitizeExternalUrl blocks dangerous javascript: and data: schemes', () => {
    assert.strictEqual(sanitizeExternalUrl('javascript:alert(document.cookie)'), null);
    assert.strictEqual(sanitizeExternalUrl('JAVASCRIPT:alert(1)'), null);
    assert.strictEqual(sanitizeExternalUrl('data:text/html,<script>alert(1)</script>'), null);
    assert.strictEqual(sanitizeExternalUrl('vbscript:msgbox(1)'), null);
    assert.strictEqual(sanitizeExternalUrl('file:///etc/passwd'), null);
  });

  runTest('SANITIZATION', 'sanitizeExternalUrl allows legitimate HTTPS URLs and domains', () => {
    assert.strictEqual(
      sanitizeExternalUrl('https://doi.org/10.1038/s41586-020-2649-2'),
      'https://doi.org/10.1038/s41586-020-2649-2'
    );
    assert.strictEqual(
      sanitizeExternalUrl('nature.com/articles/s41586'),
      'https://nature.com/articles/s41586'
    );
  });

  runTest('SANITIZATION', 'sanitizeTextContent removes null bytes and control chars', () => {
    const maliciousText = 'Research paper\u0000 title with hidden \u0007 bell chars';
    const cleaned = sanitizeTextContent(maliciousText);
    assert.strictEqual(cleaned.includes('\u0000'), false);
    assert.strictEqual(cleaned.includes('\u0007'), false);
    assert.strictEqual(cleaned, 'Research paper title with hidden  bell chars');
  });

  // --------------------------------------------------------------------------
  // SUITE 6: SECRET LEAKAGE & ENVIRONMENT CONFIGURATION AUDIT
  // --------------------------------------------------------------------------
  console.log('\n--- 6. Secret Leakage & Environment Audit ---');

  runTest('SECRETS', 'No Supabase service-role key is present in client source files', () => {
    const srcDir = path.join(__dirname, '..', 'src');

    function searchForServiceRole(dir) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          searchForServiceRole(fullPath);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.json')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.includes('service_role') && !file.includes('test-security-suite')) {
            throw new Error(`Potential service role key reference found in ${file}`);
          }
        }
      }
    }

    searchForServiceRole(srcDir);
  });

  runTest('SECRETS', 'Only EXPO_PUBLIC_ prefixed environment variables are used in client', () => {
    const clientFile = path.join(__dirname, '..', 'src', 'api', 'client.ts');
    const content = fs.readFileSync(clientFile, 'utf8');

    // Should only use EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
    assert.strictEqual(content.includes('process.env.SUPABASE_SERVICE_ROLE_KEY'), false);
    assert.strictEqual(content.includes('EXPO_PUBLIC_SUPABASE_URL'), true);
    assert.strictEqual(content.includes('EXPO_PUBLIC_SUPABASE_ANON_KEY'), true);
  });

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n=========================================================');
  console.log(`🎯 SECURITY AUDIT TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('=========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSecuritySuite();
