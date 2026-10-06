// ============================================================================
// BOOFFIN ADMIN PORTAL — TEAM TRACKING CALENDAR SERVICE
// Realtime synchronized multi-admin scheduling & operations tracking
// ============================================================================

import { supabase } from '../../api/client';
import { 
  AdminCalendarEvent, 
  CalendarColorId, 
  CALENDAR_COLOR_PALETTES,
  CalendarParticipant 
} from '../types/calendar';

export const adminCalendarService = {
  /**
   * Fetches all events falling within a date boundary (e.g. active week or month).
   */
  async listEvents(startDate: Date, endDate: Date): Promise<{ events: AdminCalendarEvent[]; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('admin_calendar_events')
        .select('*')
        .gte('end_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .order('start_time', { ascending: true });

      if (error) {
        console.warn('adminCalendarService listEvents error:', error.message);
        return { events: [], error: new Error(error.message) };
      }

      return { events: (data as AdminCalendarEvent[]) || [], error: null };
    } catch (err: any) {
      return { events: [], error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Creates a new calendar event and broadcasts to all logged-in admin panels.
   */
  async createEvent(params: {
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    is_all_day?: boolean;
    is_recurring?: boolean;
    color_id?: CalendarColorId;
    category?: string;
    location?: string;
    meeting_link?: string;
    reminders?: string[];
    participants?: CalendarParticipant[];
  }): Promise<{ event: AdminCalendarEvent | null; error: Error | null }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { event: null, error: new Error('Unauthorized admin session required.') };
      }

      // Fetch creator name & role from admin_members
      const { data: member } = await supabase
        .from('admin_members')
        .select('full_name, role')
        .eq('user_id', user.id)
        .maybeSingle();

      const creatorName = member?.full_name || user.email?.split('@')[0] || 'Admin';
      const creatorRole = member?.role || 'ADMIN';
      const colorId = params.color_id || 'purple';
      const palette = CALENDAR_COLOR_PALETTES[colorId] || CALENDAR_COLOR_PALETTES.purple;

      const { data, error } = await supabase
        .from('admin_calendar_events')
        .insert({
          title: params.title.trim(),
          description: params.description?.trim() || '',
          start_time: params.start_time,
          end_time: params.end_time,
          is_all_day: Boolean(params.is_all_day),
          is_recurring: Boolean(params.is_recurring),
          color_id: colorId,
          color_bg: palette.bg,
          color_border: palette.border,
          color_text: palette.text,
          category: params.category || 'general',
          location: params.location?.trim() || '',
          meeting_link: params.meeting_link?.trim() || '',
          reminders: params.reminders || [],
          participants: params.participants || [],
          created_by: user.id,
          creator_name: creatorName,
          creator_role: creatorRole,
        })
        .select()
        .single();

      if (error) {
        return { event: null, error: new Error(error.message) };
      }

      return { event: data as AdminCalendarEvent, error: null };
    } catch (err: any) {
      return { event: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Updates an existing calendar event.
   */
  async updateEvent(
    id: string, 
    updates: Partial<AdminCalendarEvent>
  ): Promise<{ event: AdminCalendarEvent | null; error: Error | null }> {
    try {
      const payload: any = { ...updates, updated_at: new Date().toISOString() };
      
      if (updates.color_id && CALENDAR_COLOR_PALETTES[updates.color_id]) {
        const pal = CALENDAR_COLOR_PALETTES[updates.color_id];
        payload.color_bg = pal.bg;
        payload.color_border = pal.border;
        payload.color_text = pal.text;
      }

      const { data, error } = await supabase
        .from('admin_calendar_events')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { event: null, error: new Error(error.message) };
      }

      return { event: data as AdminCalendarEvent, error: null };
    } catch (err: any) {
      return { event: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Deletes a calendar event.
   */
  async deleteEvent(id: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase
        .from('admin_calendar_events')
        .delete()
        .eq('id', id);

      if (error) {
        return { success: false, error: new Error(error.message) };
      }

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Fetches active admin team members for participant tagging & assignment.
   */
  async fetchTeamMembers(): Promise<CalendarParticipant[]> {
    try {
      const { data, error } = await supabase
        .from('admin_members')
        .select('user_id, full_name, role')
        .eq('status', 'active');

      if (!error && data && data.length > 0) {
        return data.map((m: any) => ({
          id: m.user_id,
          name: m.full_name || 'Admin',
          role: m.role || 'Admin',
          accepted: true,
        }));
      }

      // Fallback default participants if table is empty or loading
      return [
        { id: '1', name: 'Nazmi Javier', role: 'SUPER_ADMIN', accepted: true },
        { id: '2', name: 'Emilia Inder', role: 'MODERATOR', accepted: false },
        { id: '3', name: 'Sagar Yadav', role: 'SUPER_ADMIN', accepted: true },
        { id: '4', name: 'Ops Team', role: 'OPERATOR', accepted: true },
      ];
    } catch {
      return [
        { id: '1', name: 'Nazmi Javier', role: 'SUPER_ADMIN', accepted: true },
        { id: '2', name: 'Emilia Inder', role: 'MODERATOR', accepted: false },
        { id: '3', name: 'Sagar Yadav', role: 'SUPER_ADMIN', accepted: true },
      ];
    }
  },

  /**
   * Sets up a real-time postgres changes subscription on admin_calendar_events.
   */
  subscribe(
    onInsert: (event: AdminCalendarEvent) => void,
    onUpdate: (event: AdminCalendarEvent) => void,
    onDelete: (eventId: string) => void
  ) {
    const channel = supabase
      .channel('admin_calendar_realtime_events')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'admin_calendar_events' },
        (payload) => onInsert(payload.new as AdminCalendarEvent)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'admin_calendar_events' },
        (payload) => onUpdate(payload.new as AdminCalendarEvent)
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'admin_calendar_events' },
        (payload) => onDelete(payload.old.id)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
