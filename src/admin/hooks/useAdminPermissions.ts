// ============================================================================
// BOOFFIN ADMIN PORTAL — ADMIN PERMISSIONS HOOK
// ============================================================================

import { useMemo } from 'react';
import { useAdminAuth } from './useAdminAuth';
import { AdminPermission, AdminRole } from '../types/roles';
import { hasPermission, isRoleSuperiorOrEqual } from '../lib/permissions';

export function useAdminPermissions() {
  const { role, status, isAdmin, isLoading } = useAdminAuth();

  const isSuperAdmin = role === 'SUPER_ADMIN' && status === 'ACTIVE';
  const isAdminRole = role === 'ADMIN' && status === 'ACTIVE';
  const isModerator = role === 'MODERATOR' && status === 'ACTIVE';

  const checkPermission = useMemo(() => {
    return (permission: AdminPermission): boolean => {
      if (!isAdmin || status !== 'ACTIVE') return false;
      return hasPermission(role, permission);
    };
  }, [isAdmin, role, status]);

  const canManageRole = useMemo(() => {
    return (targetRole: AdminRole): boolean => {
      if (!role || status !== 'ACTIVE') return false;
      // Only Super Admins can manage roles
      return role === 'SUPER_ADMIN' && isRoleSuperiorOrEqual(role, targetRole);
    };
  }, [role, status]);

  return {
    role,
    status,
    isAdmin,
    isLoading,
    isSuperAdmin,
    isAdminRole,
    isModerator,
    hasPermission: checkPermission,
    canManageRole,
  };
}
