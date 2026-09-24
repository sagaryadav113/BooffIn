const assert = {
  ok: (val: any, msg?: string) => {
    if (!val) throw new Error(msg || `Expected truthy, got ${val}`);
  },
  strictEqual: (a: any, b: any, msg?: string) => {
    if (a !== b) throw new Error(msg || `Expected ${JSON.stringify(a)} === ${JSON.stringify(b)}`);
  },
  deepStrictEqual: (a: any, b: any, msg?: string) => {
    if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(msg || `Expected deep equality`);
  },
};

import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signInWithORCID,
  signOutUser,
  getInitialAuthSession,
  setStoredLocalSession,
  getStoredLocalSession,
} from '../src/api/authService';
import { mockUsers, currentUser } from '../src/data/mockData';
import { UserProfile } from '../src/types';

async function runWelcomeAuthProfileTests() {
  console.log('🧪 Running Comprehensive Welcome, Auth & Profile Lifecycle Test Suite...\n');

  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      const res = fn();
      if (res instanceof Promise) {
        return res.then(() => {
          console.log(`  ✅ [PASS] ${name}`);
          passed++;
        }).catch((err) => {
          console.error(`  ❌ [FAIL] ${name}:`, err.message);
        });
      } else {
        console.log(`  ✅ [PASS] ${name}`);
        passed++;
      }
    } catch (err: any) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message);
    }
  }

  // TEST 1: Initial state for first-time visitor
  console.log('--- 1. First-Time Visitor Flow ---');
  await test('First-time visitor returns null session to route to Welcome screen', async () => {
    // Clear any previous session
    setStoredLocalSession(null);
    const session = await getInitialAuthSession();
    assert.strictEqual(session, null, 'User must be unauthenticated on first arrival');
  });

  // TEST 2: Email Sign Up & Profile Creation Flow
  console.log('\n--- 2. Create Account / Sign Up Flow ---');
  await test('Sign up creates new researcher profile with all custom metadata', async () => {
    const res = await signUpWithEmail({
      fullName: 'Dr. Jane Smith',
      handle: 'janesmith',
      email: 'jane.smith@harvard.edu',
      password: 'securePassword123!',
      academicTitle: 'Assistant Professor of Neuroscience',
      institution: 'Harvard Medical School',
    });

    assert.strictEqual(res.error, null, 'Signup must not return an error');
    assert.ok(res.user, 'Signup must return created user profile');
    assert.strictEqual(res.user?.fullName, 'Dr. Jane Smith');
    assert.strictEqual(res.user?.handle, 'janesmith');
    assert.strictEqual(res.user?.academicTitle, 'Assistant Professor of Neuroscience');
    assert.strictEqual(res.user?.institution, 'Harvard Medical School');
    assert.strictEqual(res.user?.bio, 'Exploring literature and discussing peer-reviewed science on BooffIn.');

    // Verify session was persisted
    const restored = getStoredLocalSession();
    assert.ok(restored, 'Local session should be stored');
    assert.strictEqual(restored?.fullName, 'Dr. Jane Smith');
  });

  // TEST 3: Profile Updating Flow
  console.log('\n--- 3. Profile Tab Integration & Updates ---');
  test('Profile section receives created user profile with custom research interests and bio', () => {
    const activeUser = getStoredLocalSession()!;
    assert.ok(activeUser, 'Must have active user');

    const updatedUser: UserProfile = {
      ...activeUser,
      researchInterests: ['Neuroscience', 'Synaptic Plasticity', 'AI in Medicine'],
      bio: 'Investigating hippocampal synaptic plasticity and memory mechanisms.',
      location: 'Boston, MA',
    };
    setStoredLocalSession(updatedUser);

    const saved = getStoredLocalSession()!;
    assert.strictEqual(saved.fullName, 'Dr. Jane Smith');
    assert.strictEqual(saved.bio, 'Investigating hippocampal synaptic plasticity and memory mechanisms.');
    assert.deepStrictEqual(saved.researchInterests, ['Neuroscience', 'Synaptic Plasticity', 'AI in Medicine']);
    assert.strictEqual(saved.location, 'Boston, MA');
  });

  // TEST 4: Google OAuth Sign In Flow
  console.log('\n--- 4. Google Sign In Flow ---');
  await test('Google sign-in authenticates and sets verified Google researcher profile', async () => {
    const res = await signInWithGoogle();
    assert.strictEqual(res.error, null, 'Google sign-in should succeed without error');
    assert.ok(res.user, 'Google user profile must be present');
    assert.strictEqual(res.user?.fullName, 'Dr. Elena Rostova (Google)');
    assert.strictEqual(res.user?.academicTitle, 'Computational Biologist & AI Researcher');
    assert.strictEqual(res.user?.institution, 'Broad Institute & Google Research Partner');

    // Stored session
    const stored = getStoredLocalSession();
    assert.strictEqual(stored?.fullName, 'Dr. Elena Rostova (Google)');
  });

  // TEST 5: Sign In to Existing Account
  console.log('\n--- 5. Sign In with Existing Credentials ---');
  await test('Sign in matches researcher email or handle and loads their profile', async () => {
    const res = await signInWithEmail('elena.rostova@broadinstitute.org', 'password123');
    assert.strictEqual(res.error, null);
    assert.ok(res.user);
    assert.ok((res.user?.fullName || '').length > 0);
  });

  // TEST 6: Sign Out & Return to Welcome
  console.log('\n--- 6. Sign Out Flow ---');
  await test('Sign out clears session and restores unauthenticated state for Welcome screen', async () => {
    await signOutUser();
    const stored = getStoredLocalSession();
    assert.strictEqual(stored, null, 'Local session should be null after sign out');
    const session = await getInitialAuthSession();
    assert.strictEqual(session, null, 'getInitialAuthSession should be null after sign out');
  });

  console.log(`\n========================================`);
  console.log(`🏁 Test Summary: ${passed}/${total} tests passed successfully.`);
  console.log(`========================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runWelcomeAuthProfileTests();
