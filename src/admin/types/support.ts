// ============================================================================
// BOOFFIN ADMIN PORTAL — SUPPORT TICKETS & INQUIRIES TYPE DEFINITIONS
// ============================================================================

export type SupportCategory = 
  | 'GENERAL' 
  | 'ACCOUNT' 
  | 'VERIFICATION' 
  | 'BUG_REPORT' 
  | 'BILLING' 
  | 'SECURITY';

export type SupportPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type SupportStatus = 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface SupportTicket {
  id: string;
  ticket_number: string;
  sender_email: string;
  sender_name?: string | null;
  user_id?: string | null;
  category: SupportCategory;
  subject: string;
  message_body: string;
  priority: SupportPriority;
  status: SupportStatus;
  assigned_to?: string | null;
  assigned_name?: string | null;
  resolution_notes?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportTicketFilter {
  status?: SupportStatus | 'ALL';
  category?: SupportCategory | 'ALL';
  priority?: SupportPriority | 'ALL';
  search?: string;
  limit?: number;
  offset?: number;
}
