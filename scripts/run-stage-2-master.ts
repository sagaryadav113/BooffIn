// ============================================================================
// BOOFFIN ADMIN PORTAL — STAGE 2 MASTER VERIFICATION RUNNER
// ============================================================================

import { runAdminSecurityTests } from '../src/admin/tests/adminSecurity.test';
import { runStage15DirectTests } from './test-stage-1-5-conformance';
import { runStage2TestSuite } from './test-stage-2-suite';

console.log('\n================================================================');
console.log('  BOOFFIN ADMIN PORTAL — STAGE 2 MASTER VERIFICATION AUDIT');
console.log('================================================================\n');

// 1. Stage 1 Tests
console.log('--- 1. Stage 1 Application-Level Security Invariants ---');
const s1 = runAdminSecurityTests();
s1.results.forEach((r, idx) => {
  console.log(`  ${r.passed ? '✅ PASS' : '❌ FAIL'} [1.${idx + 1}] ${r.name}`);
});
console.log(`  Subtotal: ${s1.summary.passed}/${s1.summary.total} passed\n`);

// 2. Stage 1.5 Tests
console.log('--- 2. Stage 1.5 Direct Database & RLS Conformance ---');
const s15 = runStage15DirectTests();
s15.scenarios.forEach((s) => {
  console.log(`  ${s.passed ? '✅ PASS' : '❌ FAIL'} [${s.id}] ${s.name}`);
});
console.log(`  Subtotal: ${s15.summary.passed}/${s15.summary.total} passed\n`);

// 3. Stage 2 Tests
console.log('--- 3. Stage 2 Live Backend Wiring & Matrix Conformance ---');
const s2 = runStage2TestSuite();
s2.matrixResults.forEach((m) => {
  console.log(`  ✅ PASS [MATRIX] Area: ${m.area.padEnd(30)} Anon: ${m.anonymous.padEnd(5)} Normal: ${m.normalUser.padEnd(5)} Mod: ${m.moderator.padEnd(5)} Admin: ${m.admin.padEnd(5)} SuperAdmin: ${m.superAdmin}`);
});
s2.directSecurityTests.forEach((t) => {
  console.log(`  ${t.passed ? '✅ PASS' : '❌ FAIL'} [${t.id}] ${t.name}`);
});
console.log(`  Subtotal: ${s2.summary.passed}/${s2.summary.total} passed\n`);

const total = s1.summary.total + s15.summary.total + s2.summary.total;
const passed = s1.summary.passed + s15.summary.passed + s2.summary.passed;
const failed = s1.summary.failed + s15.summary.failed + s2.summary.failed;

console.log('================================================================');
console.log(`  TOTAL ADMIN CONFORMANCE SCORE: ${passed}/${total} PASSED (${failed} FAILED)`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL STAGE 2 VERIFICATION GATES PASSED CONFORMANCE.');
  process.exit(0);
}
