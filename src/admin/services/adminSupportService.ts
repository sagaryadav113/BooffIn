// ============================================================================
// BOOFFIN ADMIN PORTAL — SUPPORT TICKETS & INQUIRIES SERVICE
// ============================================================================

import { supabase } from '../../api/client';
import { SupportTicket, SupportTicketFilter, SupportStatus, SupportPriority, SupportCategory } from '../types/support';
import { adminAuditService } from './adminAuditService';

export const adminSupportService = {
  /**
   * Lists support tickets with optional filtering, search, and pagination.
   */
  async listTickets(options?: SupportTicketFilter): Promise<{ tickets: SupportTicket[]; count: number; error: Error | null }> {
    try {
      const limit = Math.min(options?.limit ?? 50, 100);
      const offset = options?.offset ?? 0;

      let query = supabase
        .from('support_tickets')
        .select('*', { count: 'exact' });

      if (options?.status && options.status !== 'ALL') {
        query = query.eq('status', options.status);
      }
      if (options?.category && options.category !== 'ALL') {
        query = query.eq('category', options.category);
      }
      if (options?.priority && options.priority !== 'ALL') {
        query = query.eq('priority', options.priority);
      }
      if (options?.search && options.search.trim()) {
        const s = options.search.trim();
        query = query.or(`subject.ilike.%${s}%,sender_email.ilike.%${s}%,ticket_number.ilike.%${s}%,message_body.ilike.%${s}%`);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.warn('adminSupportService listTickets error:', error.message);
        return { tickets: [], count: 0, error: new Error(error.message) };
      }

      return {
        tickets: (data as SupportTicket[]) || [],
        count: count ?? (data?.length || 0),
        error: null,
      };
    } catch (err: any) {
      return { tickets: [], count: 0, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Retrieves single ticket by ID or ticket number.
   */
  async getTicketById(ticketId: string): Promise<{ ticket: SupportTicket | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', ticketId)
        .maybeSingle();

      if (error) return { ticket: null, error: new Error(error.message) };
      return { ticket: data as SupportTicket, error: null };
    } catch (err: any) {
      return { ticket: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Updates a support ticket (status, assignment, priority, or resolution notes).
   */
  async updateTicket(params: {
    ticketId: string;
    status?: SupportStatus;
    priority?: SupportPriority;
    assignedTo?: string | null;
    assignedName?: string | null;
    resolutionNotes?: string;
  }): Promise<{ error: Error | null }> {
    try {
      const updates: any = {
        updated_at: new Date().toISOString(),
      };

      if (params.status !== undefined) {
        updates.status = params.status;
        if (params.status === 'RESOLVED' || params.status === 'CLOSED') {
          updates.resolved_at = new Date().toISOString();
        }
      }
      if (params.priority !== undefined) updates.priority = params.priority;
      if (params.assignedTo !== undefined) updates.assigned_to = params.assignedTo;
      if (params.assignedName !== undefined) updates.assigned_name = params.assignedName;
      if (params.resolutionNotes !== undefined) updates.resolution_notes = params.resolutionNotes;

      const { error } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', params.ticketId);

      if (error) return { error: new Error(error.message) };

      // Log audit trail
      await adminAuditService.recordAuditLog({
        action: 'UPDATE_REPORT',
        targetType: 'SUPPORT_TICKET',
        targetId: params.ticketId,
        reason: `Admin updated support ticket: ${JSON.stringify(updates)}`,
        metadata: updates,
      });

      return { error: null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Creates a new support ticket (used for testing or from app reporting).
   */
  async createTicket(params: {
    senderEmail: string;
    senderName?: string;
    userId?: string;
    category: SupportCategory;
    subject: string;
    messageBody: string;
    priority?: SupportPriority;
  }): Promise<{ ticket: SupportTicket | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          sender_email: params.senderEmail,
          sender_name: params.senderName,
          user_id: params.userId,
          category: params.category || 'GENERAL',
          subject: params.subject,
          message_body: params.messageBody,
          priority: params.priority || 'NORMAL',
          status: 'NEW',
        })
        .select('*')
        .single();

      if (error) return { ticket: null, error: new Error(error.message) };
      return { ticket: data as SupportTicket, error: null };
    } catch (err: any) {
      return { ticket: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Gets counts of new / pending tickets for badge notifications.
   */
  async getOpenTicketCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .in('status', ['NEW', 'ASSIGNED', 'IN_PROGRESS']);

      if (error) return 0;
      return count ?? 0;
    } catch {
      return 0;
    }
  }
};
