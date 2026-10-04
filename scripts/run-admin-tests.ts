// ============================================================================
// BOOFFIN ADMIN PORTAL — TEST RUNNER SCRIPT
// ============================================================================

import { runAdminSecurityTests } from '../src/admin/tests/adminSecurity.test';

console.log('\n======================================================');
console.log('  BOOFFIN ADMIN PORTAL — STAGE 1 SECURITY TEST SUITE');
console.log('======================================================\n');

const { results, summary } = runAdminSecurityTests();

results.forEach((r, idx) => {
  const status = r.passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} [${idx + 1}] ${r.name}`);
  if (!r.passed) {
    console.log(`    Expected: ${JSON.stringify(r.expected)}`);
    console.log(`    Actual:   ${JSON.stringify(r.actual)}`);
    if (r.error) console.log(`    Error:    ${r.error}`);
  }
});

console.log('\n------------------------------------------------------');
console.log(`Summary: ${summary.passed}/${summary.total} tests passed (${summary.failed} failed)`);
console.log('------------------------------------------------------\n');

if (summary.failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL STAGE 1 SECURITY TESTS PASSED CONFORMANCE.');
  process.exit(0);
}
