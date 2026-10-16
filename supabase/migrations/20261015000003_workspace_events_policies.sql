-- ----------------------------------------------------------------------------
-- WORKSPACE EVENTS (CALENDAR) RLS POLICIES & ATTENDEES ENHANCEMENT
-- ----------------------------------------------------------------------------

-- 1. Ensure required columns exist on public.workspace_events
ALTER TABLE public.workspace_events
  ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'lab_meeting',
  ADD COLUMN IF NOT EXISTS meeting_link TEXT,
  ADD COLUMN IF NOT EXISTS location_or_url TEXT,
  ADD COLUMN IF NOT EXISTS attendee_ids UUID[] DEFAULT '{}';

-- 2. Enable Row Level Security
ALTER TABLE public.workspace_events ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for workspace_events
DROP POLICY IF EXISTS "workspace_events_select_policy" ON public.workspace_events;
CREATE POLICY "workspace_events_select_policy"
  ON public.workspace_events
  FOR SELECT
  TO authenticated
  USING (
    public.is_workspace_member(workspace_id, auth.uid())
    OR public.is_workspace_creator(workspace_id, auth.uid())
  );

DROP POLICY IF EXISTS "workspace_events_insert_policy" ON public.workspace_events;
CREATE POLICY "workspace_events_insert_policy"
  ON public.workspace_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = creator_id
    AND (
      public.is_workspace_member(workspace_id, auth.uid())
      OR public.is_workspace_creator(workspace_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "workspace_events_update_policy" ON public.workspace_events;
CREATE POLICY "workspace_events_update_policy"
  ON public.workspace_events
  FOR UPDATE
  TO authenticated
  USING (
    creator_id = auth.uid()
    OR public.is_workspace_creator(workspace_id, auth.uid())
  )
  WITH CHECK (
    creator_id = auth.uid()
    OR public.is_workspace_creator(workspace_id, auth.uid())
  );

DROP POLICY IF EXISTS "workspace_events_delete_policy" ON public.workspace_events;
CREATE POLICY "workspace_events_delete_policy"
  ON public.workspace_events
  FOR DELETE
  TO authenticated
  USING (
    creator_id = auth.uid()
    OR public.is_workspace_creator(workspace_id, auth.uid())
  );
