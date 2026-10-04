// ============================================================================
// BOOFFIN ADMIN PORTAL — REAL SUPABASE TOTP MFA SERVICE (STAGE 3A)
// ============================================================================

import { supabase } from '../../api/client';
import { adminAuditService } from './adminAuditService';

export interface TotpFactorEnrollmentResponse {
  id: string;
  type: 'totp';
  totp: {
    qr_code: string;
    secret: string;
    uri: string;
  };
}

export interface MfaFactorSummary {
  id: string;
  friendlyName?: string;
  factorType: string;
  status: 'verified' | 'unverified';
  createdAt: string;
  updatedAt: string;
}

export interface MfaAssuranceLevel {
  currentLevel: 'aal1' | 'aal2' | null;
  nextLevel: 'aal1' | 'aal2' | null;
  currentAuthenticationMethods: Array<{
    method: string;
    timestamp: number;
  }>;
}

export const adminMfaService = {
  /**
   * Retrieves the current Authenticator Assurance Level (AAL) for the active session.
   */
  async getAssuranceLevel(): Promise<{ data: MfaAssuranceLevel | null; error: Error | null }> {
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error) {
        return { data: null, error: new Error(error.message) };
      }
      return {
        data: {
          currentLevel: (data.currentLevel as 'aal1' | 'aal2') ?? null,
          nextLevel: (data.nextLevel as 'aal1' | 'aal2') ?? null,
          currentAuthenticationMethods: (data.currentAuthenticationMethods as any) || [],
        },
        error: null,
      };
    } catch (err: any) {
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Lists all MFA factors registered for the currently authenticated administrator.
   */
  async listFactors(): Promise<{ factors: MfaFactorSummary[]; error: Error | null }> {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) {
        return { factors: [], error: new Error(error.message) };
      }

      const allFactors: MfaFactorSummary[] = (data.all || []).map((f) => ({
        id: f.id,
        friendlyName: f.friendly_name,
        factorType: f.factor_type,
        status: f.status as 'verified' | 'unverified',
        createdAt: f.created_at,
        updatedAt: f.updated_at,
      }));

      return { factors: allFactors, error: null };
    } catch (err: any) {
      return { factors: [], error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Initiates TOTP MFA enrollment using Supabase Auth.
   * Note: The returned secret/QR code is strictly in-memory and MUST NOT be logged or persisted.
   */
  async enrollTotp(params?: {
    friendlyName?: string;
    issuer?: string;
  }): Promise<{ data: TotpFactorEnrollmentResponse | null; error: Error | null }> {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: params?.friendlyName || 'BooffIn Admin Authenticator',
        issuer: params?.issuer || 'BooffIn Admin Portal',
      });

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return {
        data: data as unknown as TotpFactorEnrollmentResponse,
        error: null,
      };
    } catch (err: any) {
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Challenges and verifies a TOTP code against an enrolled factor.
   * On success, upgrades the current session JWT to AAL2.
   */
  async challengeAndVerify(params: {
    factorId: string;
    code: string;
  }): Promise<{ error: Error | null }> {
    try {
      const cleanCode = params.code.trim().replace(/[^0-9]/g, '');
      if (cleanCode.length !== 6) {
        return { error: new Error('Invalid code length. Please enter a 6-digit TOTP code.') };
      }

      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: params.factorId,
        code: cleanCode,
      });

      if (error) {
        return { error: new Error(error.message || 'TOTP code verification failed.') };
      }

      // Log successful verification in audit log
      try {
        await adminAuditService.recordAuditLog({
          action: 'MFA_CHALLENGE_VERIFIED',
          targetType: 'ADMIN_SESSION',
          targetId: params.factorId,
          reason: 'Administrator verified TOTP MFA challenge; session elevated to AAL2',
          metadata: { factor_id: params.factorId },
        });
      } catch {
        // Audit failure should not block session login
      }

      return { error: null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Unenrolls an existing MFA factor.
   * High-risk action: requires active AAL2 session.
   */
  async unenrollFactor(factorId: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId,
      });

      if (error) {
        return { error: new Error(error.message) };
      }

      // Record audit log
      try {
        await adminAuditService.recordAuditLog({
          action: 'MFA_FACTOR_UNENROLLED',
          targetType: 'ADMIN_MFA_FACTOR',
          targetId: factorId,
          reason: 'Administrator unenrolled TOTP MFA factor',
          metadata: { factor_id: factorId },
        });
      } catch {}

      return { error: null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  },
};
