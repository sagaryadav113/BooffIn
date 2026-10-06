// ============================================================================
// BOOFFIN ADMIN PORTAL — TEAM TRACKING CALENDAR TYPES
// ============================================================================

export interface CalendarParticipant {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role?: string;
  accepted?: boolean;
}

export type CalendarColorId = 
  | 'green'      // Lime green (Lunch / breaks)
  | 'purple'     // Lavender / Light violet (Meetings / syncs)
  | 'pink'       // Rose / Pink (Social / Hobbies / Events)
  | 'yellow'     // Soft Gold / Amber (Brainstorming / Workshops)
  | 'blue'       // Sky Blue (Projects / Core dev)
  | 'orange'     // Soft Peach / Orange (Family / Deadlines)
  | 'emerald'    // Deep Emerald (BooffIn Ops / Production)
  | 'crimson';   // Urgent / High priority

export interface CalendarColorTheme {
  id: CalendarColorId;
  label: string;
  bg: string;
  border: string;
  text: string;
  dot: string;
}

export const CALENDAR_COLOR_PALETTES: Record<CalendarColorId, CalendarColorTheme> = {
  crimson: {
    id: 'crimson',
    label: 'Critical / Urgent',
    bg: '#FFE4E6',       // Rose 100
    border: '#FDA4AF',   // Rose 300
    text: '#9F1239',     // Rose 800
    dot: '#E11D48',
  },
  orange: {
    id: 'orange',
    label: 'Peach / Alert',
    bg: '#FFEDD5',       // Orange 100
    border: '#FDBA74',   // Orange 300
    text: '#9A3412',     // Orange 800
    dot: '#EA580C',
  },
  pink: {
    id: 'pink',
    label: 'Social & Events',
    bg: '#FCE7F3',       // Pink 100
    border: '#F472B6',   // Pink 400
    text: '#831843',     // Pink 900
    dot: '#EC4899',
  },
  yellow: {
    id: 'yellow',
    label: 'Brainstorm & Ideation',
    bg: '#FEF08A',       // Yellow 200
    border: '#FACC15',   // Yellow 400
    text: '#713F12',     // Yellow 900
    dot: '#EAB308',
  },
  green: {
    id: 'green',
    label: 'Routine & Lunch',
    bg: '#ECFCCB',       // Lime 100
    border: '#BEF264',   // Lime 300
    text: '#365314',     // Lime 900
    dot: '#84CC16',
  },
  blue: {
    id: 'blue',
    label: 'Projects & Tasks',
    bg: '#E0F2FE',       // Sky 100
    border: '#7DD3FC',   // Sky 300
    text: '#0C4A6E',     // Sky 900
    dot: '#0284C7',
  },
  purple: {
    id: 'purple',
    label: 'Team Sync & Meets',
    bg: '#EDE9FE',       // Violet 100
    border: '#C4B5FD',   // Violet 300
    text: '#5B21B6',     // Violet 900
    dot: '#7C3AED',
  },
  emerald: {
    id: 'emerald',
    label: 'BooffIn Operations',
    bg: '#D1FAE5',       // Emerald 100
    border: '#6EE7B7',   // Emerald 300
    text: '#064E3B',     // Emerald 900
    dot: '#059669',
  },
};

export interface AdminCalendarEvent {
  id: string;
  title: string;
  description: string;
  start_time: string; // ISO string
  end_time: string;   // ISO string
  is_all_day: boolean;
  is_recurring: boolean;
  color_id: CalendarColorId;
  color_bg: string;
  color_border: string;
  color_text: string;
  category: string;
  location: string;
  meeting_link: string;
  reminders: string[];
  participants: CalendarParticipant[];
  created_by?: string;
  creator_name: string;
  creator_role?: string;
  created_at: string;
  updated_at: string;
}

export type CalendarViewMode = 'day' | 'week' | 'month';

export interface CalendarFilterState {
  searchQuery: string;
  selectedColors: CalendarColorId[];
  selectedCategory: string | null;
  onlyMyEvents: boolean;
}
