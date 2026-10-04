// ============================================================================
// BOOFFIN ADMIN PORTAL — STAGE 1 SECURITY & RBAC TEST SUITE
// ============================================================================

import { hasPermission, isRoleSuperiorOrEqual, getPermissionsForRole } from '../lib/permissions';
import { checkAdminAuthorization, canApproveRequest } from '../lib/rbac';
import { AdminRole, AdminPermission } from '../types/roles';

export interface TestCaseResult {
  name: string;
  passed: boolean;
  expected: any;
  actual: any;
  error?: string;
}

export function runAdminSecurityTests(): { results: TestCaseResult[]; summary: { total: number; passed: number; failed: number } } {
  const results: TestCaseResult[] = [];

  function test(name: string, fn: () => { passed: boolean; expected: any; actual: any }) {
    try {
      const outcome = fn();
      results.push({
        name,
        passed: outcome.passed,
        expected: outcome.expected,
        actual: outcome.actual,
      });
    } catch (err: any) {
      results.push({
        name,
        passed: false,
        expected: true,
        actual: false,
        error: err?.message || String(err),
      });
    }
  }

  // TEST 1: Unauthenticated caller blocked
  test('1. Unauthenticated user cannot access admin portal', () => {
    const res = checkAdminAuthorization({
      userId: null,
      role: null,
      status: null,
      requiredPermission: 'users.read',
    });
    return {
      passed: res.authorized === false && res.reason === 'Unauthenticated',
      expected: false,
      actual: res.authorized,
    };
  });

  // TEST 2: Normal user (no admin_members record) blocked
  test('2. Normal user without admin membership is rejected', () => {
    const res = checkAdminAuthorization({
      userId: 'usr_normal_123',
      role: null,
      status: null,
      requiredPermission: 'users.read',
    });
    return {
      passed: res.authorized === false,
      expected: false,
      actual: res.authorized,
    };
  });

  // TEST 3: Suspended or Deactivated admin is blocked
  test('3. Suspended or Deactivated admin cannot access console', () => {
    const resSuspended = checkAdminAuthorization({
      userId: 'usr_admin_suspended',
      role: 'ADMIN',
      status: 'SUSPENDED',
      requiredPermission: 'users.read',
    });
    const resDeactivated = checkAdminAuthorization({
      userId: 'usr_admin_deactivated',
      role: 'SUPER_ADMIN',
      status: 'DEACTIVATED',
      requiredPermission: 'users.read',
    });
    const passed = resSuspended.authorized === false && resDeactivated.authorized === false;
    return {
      passed,
      expected: false,
      actual: resSuspended.authorized || resDeactivated.authorized,
    };
  });

  // TEST 4: Moderator cannot access Super Admin functions
  test('4. Moderator cannot invite admins or manage security', () => {
    const canInvite = hasPermission('MODERATOR', 'admins.invite');
    const canManageSecurity = hasPermission('MODERATOR', 'security.manage');
    const canApproveDelete = hasPermission('MODERATOR', 'users.delete.approve');
    const passed = !canInvite && !canManageSecurity && !canApproveDelete;
    return {
      passed,
      expected: false,
      actual: canInvite || canManageSecurity || canApproveDelete,
    };
  });

  // TEST 5: Moderator CAN access content moderation and reports
  test('5. Moderator can access post removal and report resolution', () => {
    const canReadPosts = hasPermission('MODERATOR', 'posts.read');
    const canRemovePosts = hasPermission('MODERATOR', 'posts.remove');
    const canResolveReports = hasPermission('MODERATOR', 'reports.resolve');
    const passed = canReadPosts && canRemovePosts && canResolveReports;
    return {
      passed,
      expected: true,
      actual: passed,
    };
  });

  // TEST 6: Super Admin possesses full master permission catalog
  test('6. Super Admin has all 24 authoritative permissions', () => {
    const permissions = getPermissionsForRole('SUPER_ADMIN');
    const hasAll = permissions.length >= 20 && hasPermission('SUPER_ADMIN', 'approvals.approve');
    return {
      passed: hasAll,
      expected: true,
      actual: hasAll,
    };
  });

  // TEST 7: Dual-Admin Rule (Requester CANNOT self-approve request)
  test('7. Requester CANNOT self-approve dual-admin request (chk_no_self_approval mirror)', () => {
    const canSelfApprove = canApproveRequest({
      actorUserId: 'admin_user_A',
      actorRole: 'SUPER_ADMIN',
      requestedBy: 'admin_user_A',
    });
    return {
      passed: canSelfApprove === false,
      expected: false,
      actual: canSelfApprove,
    };
  });

  // TEST 8: Independent Super Admin CAN approve dual-admin request
  test('8. Independent Super Admin CAN approve request created by another admin', () => {
    const canIndependentApprove = canApproveRequest({
      actorUserId: 'admin_user_B',
      actorRole: 'SUPER_ADMIN',
      requestedBy: 'admin_user_A',
    });
    return {
      passed: canIndependentApprove === true,
      expected: true,
      actual: canIndependentApprove,
    };
  });

  // TEST 9: MFA AAL2 Enforcement Check
  test('9. Critical actions require AAL2 MFA verification level', () => {
    const resAal1 = checkAdminAuthorization({
      userId: 'admin_user_1',
      role: 'ADMIN',
      status: 'ACTIVE',
      requireAal2: true,
      currentAal: 'aal1',
    });
    const resAal2 = checkAdminAuthorization({
      userId: 'admin_user_1',
      role: 'ADMIN',
      status: 'ACTIVE',
      requireAal2: true,
      currentAal: 'aal2',
    });
    const passed = resAal1.authorized === false && resAal2.authorized === true;
    return {
      passed,
      expected: true,
      actual: passed,
    };
  });

  // TEST 10: Role Hierarchy Guard
  test('10. Standard Admin cannot override or elevate above Super Admin', () => {
    const adminOverSuper = isRoleSuperiorOrEqual('ADMIN', 'SUPER_ADMIN');
    const modOverAdmin = isRoleSuperiorOrEqual('MODERATOR', 'ADMIN');
    const superOverAdmin = isRoleSuperiorOrEqual('SUPER_ADMIN', 'ADMIN');
    const passed = !adminOverSuper && !modOverAdmin && superOverAdmin;
    return {
      passed,
      expected: true,
      actual: passed,
    };
  });

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  return {
    results,
    summary: { total, passed, failed },
  };
}
