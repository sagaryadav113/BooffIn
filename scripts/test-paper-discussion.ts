/**
 * BoffIn Paper Discussion Experience Test Suite
 * Tests:
 * 1. Paper metadata verification (Title, Authors, Journal, Date, Abstract, Topics, Canonical URL)
 * 2. Structured discussion types (Discussion, Question, Insight, Methodology)
 * 3. Adding structured contributions & threaded replies
 * 4. Researcher mention extraction & linking
 * 5. Participating researchers resolution
 * 6. Deterministic "People interested in this" recommendations (non-AI)
 * 7. Verification: Zero simplistic numerical research-quality ratings
 */

import { useDiscussionStore } from '../src/store/useDiscussionStore';
import { usePaperStore } from '../src/store/usePaperStore';
import { mockUsers, currentUser } from '../src/data/mockData';
import { DiscussionType } from '../src/types';

async function runPaperDiscussionTests() {
  console.log('================================================================');
  console.log('💬 BOFFIN PAPER DISCUSSION EXPERIENCE TEST SUITE');
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
  // TEST 1: PAPER REFERENCE METADATA
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: PAPER REFERENCE METADATA & EXTERNAL ATTRIBUTION ---');
  const paperStore = usePaperStore.getState();
  const paper = paperStore.getPaperById('paper_1');

  assert(Boolean(paper), 'Paper reference found (paper_1)');
  assert(Boolean(paper?.title), 'Paper title present', paper?.title || '');
  assert(Boolean(paper?.authors && paper.authors.length > 0), 'Paper authors present', `${paper?.authors.length} authors`);
  assert(Boolean(paper?.journal), 'Journal identified', paper?.journal || '');
  assert(Boolean(paper?.publicationDate || paper?.publicationYear), 'Publication date present');
  assert(Boolean(paper?.abstract), 'Abstract present for paper');
  assert(Boolean(paper?.topics && paper.topics.length > 0), 'Topics present', paper?.topics.join(', ') || '');
  assert(Boolean(paper?.canonicalUrl.startsWith('http')), 'Canonical external URL preserved for Read Paper', paper?.canonicalUrl || '');

  // --------------------------------------------------------------------------
  // TEST 2: STRUCTURED DISCUSSION TYPES & RETRIEVAL
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: STRUCTURED DISCUSSION TYPES (DISCUSSION, QUESTION, INSIGHT, METHODOLOGY) ---');
  const discStore = useDiscussionStore.getState();
  const allDiscussions = discStore.getDiscussionsForPaper('paper_1', 'all');

  assert(allDiscussions.length >= 4, 'Pre-seeded scientific discussions loaded', `${allDiscussions.length} discussions`);

  const insights = discStore.getDiscussionsForPaper('paper_1', 'insight');
  assert(insights.length > 0, 'Insight contributions filtered', `${insights.length} insights`);
  assert(insights[0].type === 'insight', 'Insight contribution type verified');

  const questions = discStore.getDiscussionsForPaper('paper_1', 'question');
  assert(questions.length > 0, 'Question contributions filtered', `${questions.length} questions`);
  assert(questions[0].type === 'question', 'Question contribution type verified');

  const discussions = discStore.getDiscussionsForPaper('paper_1', 'discussion');
  assert(discussions.length > 0, 'General discussions filtered', `${discussions.length} discussions`);

  const methodologies = discStore.getDiscussionsForPaper('paper_1', 'methodology');
  assert(methodologies.length > 0, 'Methodology critique filtered', `${methodologies.length} methodology posts`);

  // --------------------------------------------------------------------------
  // TEST 3: CONTRIBUTION POSTING & THREADED REPLIES
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: CONTRIBUTION POSTING & THREADED REPLIES ---');
  const newQuestion = discStore.addDiscussion({
    paperId: 'paper_1',
    author: currentUser,
    type: 'question',
    title: 'Electrophysiological verification of dendritic branch saturation?',
    content: 'Has anyone attempted whole-cell patch clamp recording of these stabilized branches to confirm NMDA spike generation? Mentioning @aanyarao for insight.',
  });

  assert(Boolean(newQuestion.id), 'New discussion contribution created with unique ID', newQuestion.id);
  assert(newQuestion.type === 'question', 'Discussion type correctly assigned as question');
  assert(newQuestion.mentions?.includes('aanyarao') === true, 'Mention @aanyarao extracted automatically');

  // Add threaded reply
  const reply = discStore.addReply({
    paperId: 'paper_1',
    discussionId: newQuestion.id,
    author: mockUsers[1], // Dr. Aanya Rao
    content: '@sidhantmishra Yes, we conducted dual dendritic patching and observed robust local plateau potentials.',
  });

  assert(Boolean(reply?.id), 'Threaded reply created under discussion', reply?.id || '');
  assert(reply?.mentions?.includes('sidhantmishra') === true, 'Mention @sidhantmishra extracted in reply');

  // Verify updated discussion state
  const updatedDiscussion = discStore.getDiscussionsForPaper('paper_1', 'all').find((d) => d.id === newQuestion.id);
  assert(updatedDiscussion?.repliesCount === 1, 'Parent discussion repliesCount incremented to 1');
  assert(updatedDiscussion?.replies?.[0].content.includes('dual dendritic patching') === true, 'Nested reply content stored in thread');

  // --------------------------------------------------------------------------
  // TEST 4: PARTICIPATING RESEARCHERS DISCOVERY
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: PARTICIPATING RESEARCHERS BANNER ---');
  const participating = discStore.getParticipatingResearchers('paper_1');
  assert(participating.length >= 3, 'Participating researchers identified', `${participating.length} researchers`);
  assert(participating.some((u) => u.handle === 'aanyarao'), 'Dr. Aanya Rao in participating list');
  assert(participating.some((u) => u.handle === 'elenapark'), 'Dr. Elena Park in participating list');
  assert(participating.some((u) => u.handle === 'phddiaries'), 'PhD Diary in participating list');

  // --------------------------------------------------------------------------
  // TEST 5: DETERMINISTIC "PEOPLE INTERESTED IN THIS" (NON-AI)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: DETERMINISTIC "PEOPLE INTERESTED IN THIS" RECOMMENDATIONS ---');
  if (paper) {
    const interested = discStore.getInterestedPeople(paper, currentUser.id);
    assert(interested.length > 0, 'Interested people generated via deterministic topic matching', `${interested.length} candidates`);

    for (const item of interested) {
      assert(Boolean(item.user.fullName), 'Candidate has valid researcher name', item.user.fullName);
      assert(Boolean(item.reason), 'Explicit non-AI reason provided', item.reason);
      assert(Boolean(item.matchedTopics && item.matchedTopics.length > 0), 'Matched topic interests verified', item.matchedTopics.join(', '));
    }
  }

  // --------------------------------------------------------------------------
  // TEST 6: SCIENTIFIC ETHICS & NO SIMPLISTIC NUMERICAL SCORES
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6: SCIENTIFIC DISCOURSE INTEGRITY (NO NUMERICAL QUALITY SCORES) ---');
  const paperKeys = Object.keys(paper || {});
  const discKeys = Object.keys(allDiscussions[0] || {});

  assert(!paperKeys.includes('qualityScore'), 'No simplistic numerical paper quality score on Paper entity');
  assert(!paperKeys.includes('ratingStars'), 'No arbitrary star rating on Paper entity');
  assert(!discKeys.includes('paperGrade'), 'No pseudo-scientific paper grade on Discussion entity');
  console.log('  🎯 Constructive scientific discussion architecture verified.');

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
    console.log('🎉 ALL PAPER DISCUSSION TESTS PASSED PERFECTLY!\n');
    process.exit(0);
  }
}

runPaperDiscussionTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
