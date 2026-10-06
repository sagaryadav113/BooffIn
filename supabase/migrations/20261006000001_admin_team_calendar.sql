-- ============================================================================
-- BOOFFIN ADMIN PORTAL — TEAM TRACKING CALENDAR MIGRATION
-- Multi-Admin Realtime Color-Coded Event Tracking & Synchronization
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_all_day BOOLEAN DEFAULT FALSE,
    is_recurring BOOLEAN DEFAULT FALSE,
    color_id TEXT DEFAULT 'purple',
    color_bg TEXT DEFAULT '#F3E8FF',
    color_border TEXT DEFAULT '#D8B4FE',
    color_text TEXT DEFAULT '#581C87',
    category TEXT DEFAULT 'general',
    location TEXT DEFAULT '',
    meeting_link TEXT DEFAULT '',
    reminders JSONB DEFAULT '[]'::jsonb,
    participants JSONB DEFAULT '[]'::jsonb,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    creator_name TEXT DEFAULT 'Admin',
    creator_role TEXT DEFAULT 'ADMIN',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for rapid week/month viewport queries
CREATE INDEX IF NOT EXISTS idx_admin_cal_start_time ON public.admin_calendar_events (start_time);
CREATE INDEX IF NOT EXISTS idx_admin_cal_end_time ON public.admin_calendar_events (end_time);
CREATE INDEX IF NOT EXISTS idx_admin_cal_created_by ON public.admin_calendar_events (created_by);

-- Enable Row Level Security (RLS)
ALTER TABLE public.admin_calendar_events ENABLE ROW LEVEL SECURITY;

-- Drop prior policies if existing
DROP POLICY IF EXISTS "Admins can view calendar events" ON public.admin_calendar_events;
DROP POLICY IF EXISTS "Admins can insert calendar events" ON public.admin_calendar_events;
DROP POLICY IF EXISTS "Admins can update calendar events" ON public.admin_calendar_events;
DROP POLICY IF EXISTS "Admins can delete calendar events" ON public.admin_calendar_events;

-- RLS Policies
CREATE POLICY "Admins can view calendar events"
    ON public.admin_calendar_events
    FOR SELECT
    USING (public.is_admin() = true);

CREATE POLICY "Admins can insert calendar events"
    ON public.admin_calendar_events
    FOR INSERT
    WITH CHECK (public.is_admin() = true);

CREATE POLICY "Admins can update calendar events"
    ON public.admin_calendar_events
    FOR UPDATE
    USING (public.is_admin() = true);

CREATE POLICY "Admins can delete calendar events"
    ON public.admin_calendar_events
    FOR DELETE
    USING (public.is_admin() = true);

-- Realtime Publication for instant multi-admin live synchronization
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'admin_calendar_events'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_calendar_events;
    END IF;
END $$;
