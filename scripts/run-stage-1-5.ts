// ============================================================================
// BOOFFIN ADMIN PORTAL — STAGE 1.5 DIRECT SECURITY CONFORMANCE RUNNER
// ============================================================================

import { runAdminSecurityTests } from '../src/admin/tests/adminSecurity.test';
import { runStage15DirectTests } from './test-stage-1-5-conformance';

console.log('\n================================================================');
console.log('  BOOFFIN ADMIN PORTAL — STAGE 1.5 DIRECT AUTHORIZATION AUDIT');
console.log('================================================================\n');

console.log('--- Phase 1: Application-Level Security Tests (Stage 1) ---');
const stage1 = runAdminSecurityTests();
stage1.results.forEach((r, idx) => {
  const badge = r.passed ? '✅ PASS' : '❌ FAIL';
  console.log(`  ${badge} [1.${idx + 1}] ${r.name}`);
});
console.log(`  Summary: ${stage1.summary.passed}/${stage1.summary.total} passed\n`);

console.log('--- Phase 2: Direct Database & API Security Invariant Tests (Stage 1.5) ---');
const stage15 = runStage15DirectTests();
stage15.scenarios.forEach((s) => {
  const badge = s.passed ? '✅ PASS' : '❌ FAIL';
  console.log(`  ${badge} [${s.id}] [${s.category}] ${s.name}`);
  if (!s.passed) {
    console.log(`       Reason: ${s.reason}`);
  }
});
console.log(`  Summary: ${stage15.summary.passed}/${stage15.summary.total} passed\n`);

console.log('================================================================');
const totalAll = stage1.summary.total + stage15.summary.total;
const passedAll = stage1.summary.passed + stage15.summary.passed;
const failedAll = stage1.summary.failed + stage15.summary.failed;
console.log(`  TOTAL CONFORMANCE SCORE: ${passedAll}/${totalAll} PASSED (${failedAll} FAILED)`);
console.log('================================================================\n');

if (failedAll > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL DIRECT DATABASE AUTHORIZATION & SECURITY GATES PASSED.');
  process.exit(0);
}
