// ============================================================================
// BOOFFIN ADMIN PORTAL — ADMIN AUTH HOOK
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
import { adminAuthService } from '../services/adminAuthService';
import { AdminSessionState } from '../types/roles';

export function useAdminAuth() {
  const [state, setState] = useState<AdminSessionState>({
    isAuthenticated: false,
    isAdmin: false,
    userId: null,
    email: null,
    role: null,
    status: null,
    aal: null,
    isMfaRequired: false,
    isMfaVerified: false,
    permissions: [],
    isLoading: true,
    error: null,
  });

  const refreshSession = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    const nextState = await adminAuthService.getAdminSession();
    setState(nextState);
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const signOut = async () => {
    await adminAuthService.signOut();
    await refreshSession();
  };

  return {
    ...state,
    refreshSession,
    signOut,
  };
}
