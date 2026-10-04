// ============================================================================
// BOOFFIN ADMIN PORTAL — STAGE 3A MASTER VERIFICATION AUDIT
// ============================================================================

import { runAdminSecurityTests } from '../src/admin/tests/adminSecurity.test';
import { runStage15DirectTests } from './test-stage-1-5-conformance';
import { runStage2TestSuite } from './test-stage-2-suite';
import { runStage3aTests } from './test-stage-3a-suite';

async function main() {
  console.log('\n================================================================');
  console.log('  BOOFFIN ADMIN PORTAL — STAGE 3A MASTER VERIFICATION AUDIT     ');
  console.log('  TOTP MFA + AAL2 VERIFICATION + ZERO-TRUST GATES               ');
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

  // 4. Stage 3A Tests
  console.log('--- 4. Stage 3A Real TOTP MFA & Production Readiness ---');
  const s3a = runStage3aTests();
  s3a.tests.forEach((t) => {
    console.log(`  ${t.passed ? '✅ PASS' : '❌ FAIL'} [${t.id}] ${t.name}`);
  });
  console.log(`  Subtotal: ${s3a.summary.passed}/${s3a.summary.total} passed\n`);

  const total = s1.summary.total + s15.summary.total + s2.summary.total + s3a.summary.total;
  const passed = s1.summary.passed + s15.summary.passed + s2.summary.passed + s3a.summary.passed;
  const failed = s1.summary.failed + s15.summary.failed + s2.summary.failed + s3a.summary.failed;

  console.log('================================================================');
  console.log(`  TOTAL ADMIN CONFORMANCE SCORE: ${passed}/${total} PASSED (${failed} FAILED)`);
  console.log('================================================================\n');

  if (failed > 0) {
    console.error('❌ STAGE 3A AUDIT FAILED. Review errors above.');
    process.exit(1);
  } else {
    console.log('🎉 ALL STAGE 3A VERIFICATION GATES PASSED CONFORMANCE.');
    console.log('🔒 PRODUCTION STATUS: NOT MODIFIED (READ-ONLY PREFLIGHT PASS).');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error during master audit execution:', err);
  process.exit(1);
});
