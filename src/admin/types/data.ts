// ============================================================================
// BOOFFIN ADMIN PORTAL — REAL ENTITY DATA TYPES
// ============================================================================

export interface AdminUserProfile {
  id: string;
  username: string;
  display_name: string;
  email?: string;
  bio?: string;
  avatar_url?: string;
  is_private: boolean;
  institution?: string;
  field_of_study?: string;
  orcid?: string;
  is_orcid_verified?: boolean;
  followers_count?: number;
  following_count?: number;
  created_at: string;
  updated_at: string;
  status?: 'ACTIVE' | 'SUSPENDED' | 'FLAGGED';
}

export interface AdminReport {
  id: string;
  reporter_id: string;
  reported_user_id?: string | null;
  post_id?: string | null;
  comment_id?: string | null;
  reason: string;
  details?: string | null;
  status: 'PENDING' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';
  resolved_by?: string | null;
  resolved_at?: string | null;
  created_at: string;
  reporter_name?: string;
  target_summary?: string;
}

export interface AdminModerationItem {
  id: string;
  item_type: 'POST' | 'COMMENT' | 'PROFILE';
  content_preview: string;
  author_id: string;
  author_name: string;
  reports_count: number;
  created_at: string;
  status: 'PENDING' | 'APPROVED' | 'REMOVED';
}

export interface SystemHealthMetric {
  service: string;
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  latencyMs: number;
  lastChecked: string;
  details?: string;
}
