// ============================================================================
// BOOFFIN ADMIN PORTAL — PERMISSION GATE COMPONENT
// ============================================================================

import React from 'react';
import { useAdminPermissions } from '../hooks/useAdminPermissions';
import { AdminPermission } from '../types/roles';

interface PermissionGateProps {
  permission: AdminPermission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  children,
  fallback = null,
}) => {
  const { hasPermission } = useAdminPermissions();

  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
