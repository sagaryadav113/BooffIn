// ============================================================================
// BOOFFIN ADMIN PORTAL — INTERNAL TEAM COMMS TYPE DEFINITIONS
// ============================================================================

export type AdminChatChannel = 
  | 'general-ops' 
  | 'trust-safety' 
  | 'tech-incidents' 
  | 'announcements';

export interface AdminChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_email: string;
  sender_role: 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'ANALYST';
  channel: AdminChatChannel;
  message: string;
  attachments?: any[];
  is_pinned?: boolean;
  created_at: string;
}

export interface AdminPresenceUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isOnline: boolean;
  lastActive: string;
}
