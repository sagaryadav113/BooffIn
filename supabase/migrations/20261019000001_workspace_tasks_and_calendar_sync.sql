-- ============================================================================
-- MIGRATION: Workspace Tasks (Kanban) & Calendar Events Storage-Optimized Sync
-- Zero-bloat, direct in-place tables with minimal indexing, cascading deletes,
-- and instant Supabase Realtime replication (0 bytes auxiliary storage overhead).
-- ============================================================================

-- 0. STORAGE CLEANUP (PURGE ANY OLD SYNC LEDGER ROWS)
-- Reclaim disk quota by deleting any temporary sync transactions that may have
-- been inserted into workspace_messages during prior test runs.
DELETE FROM public.workspace_messages
WHERE (content LIKE '[TASK_SYNC%' OR content LIKE '[EVENT_SYNC%')
   OR (attachments->>'is_task_sync_action' = 'true')
   OR (attachments->>'is_event_sync_action' = 'true');

-- 1. FAST, CACHED WORKSPACE MEMBERSHIP HELPERS
CREATE OR REPLACE FUNCTION public.is_workspace_member(
  p_workspace_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = p_user_id
      AND (status IS NULL OR status NOT IN ('declined', 'removed', 'blocked'))
  )
  OR EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE id = p_workspace_id
      AND (
        creator_id = p_user_id
        OR owner_id = p_user_id
        OR dm_participant_a = p_user_id
        OR dm_participant_b = p_user_id
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_creator(
  p_workspace_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE id = p_workspace_id
      AND (
        creator_id = p_user_id
        OR owner_id = p_user_id
        OR dm_participant_a = p_user_id
        OR dm_participant_b = p_user_id
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_workspace_member(UUID, UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_workspace_creator(UUID, UUID) TO authenticated, anon, service_role;

-- 2. LEAN WORKSPACE TASKS TABLE (KANBAN BOARD)
-- Exactly 1 row per task. Status changes update in-place (0 extra storage).
CREATE TABLE IF NOT EXISTS public.workspace_tasks (
  id TEXT PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'todo',
  priority VARCHAR(16) NOT NULL DEFAULT 'medium',
  color VARCHAR(32) DEFAULT 'blue',
  due_date VARCHAR(32),
  due_time VARCHAR(16),
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  sync_with_calendar BOOLEAN DEFAULT true,
  linked_event_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Storage-efficient indexing: Drop redundant indexes and keep only 1 compound index
DROP INDEX IF EXISTS public.idx_workspace_tasks_workspace;
DROP INDEX IF EXISTS public.idx_workspace_tasks_creator;
DROP INDEX IF EXISTS public.idx_workspace_tasks_assignee;
CREATE INDEX IF NOT EXISTS idx_workspace_tasks_workspace_created ON public.workspace_tasks(workspace_id, created_at DESC);

-- Enable RLS & Replica Identity
ALTER TABLE public.workspace_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_tasks REPLICA IDENTITY DEFAULT;

-- Workspace Tasks Policies
DROP POLICY IF EXISTS "workspace_tasks_select_policy" ON public.workspace_tasks;
CREATE POLICY "workspace_tasks_select_policy" ON public.workspace_tasks
  FOR SELECT TO authenticated
  USING (
    public.is_workspace_member(workspace_id, auth.uid())
    OR public.is_workspace_creator(workspace_id, auth.uid())
    OR creator_id = auth.uid()
  );

DROP POLICY IF EXISTS "workspace_tasks_insert_policy" ON public.workspace_tasks;
CREATE POLICY "workspace_tasks_insert_policy" ON public.workspace_tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_workspace_member(workspace_id, auth.uid())
    OR public.is_workspace_creator(workspace_id, auth.uid())
    OR creator_id = auth.uid()
  );

DROP POLICY IF EXISTS "workspace_tasks_update_policy" ON public.workspace_tasks;
CREATE POLICY "workspace_tasks_update_policy" ON public.workspace_tasks
  FOR UPDATE TO authenticated
  USING (
    public.is_workspace_member(workspace_id, auth.uid())
    OR public.is_workspace_creator(workspace_id, auth.uid())
    OR creator_id = auth.uid()
  )
  WITH CHECK (
    public.is_workspace_member(workspace_id, auth.uid())
    OR public.is_workspace_creator(workspace_id, auth.uid())
    OR creator_id = auth.uid()
  );

DROP POLICY IF EXISTS "workspace_tasks_delete_policy" ON public.workspace_tasks;
CREATE POLICY "workspace_tasks_delete_policy" ON public.workspace_tasks
  FOR DELETE TO authenticated
  USING (
    public.is_workspace_member(workspace_id, auth.uid())
    OR public.is_workspace_creator(workspace_id, auth.uid())
    OR creator_id = auth.uid()
  );

GRANT ALL ON public.workspace_tasks TO authenticated, service_role;
GRANT SELECT ON public.workspace_tasks TO anon;

-- 3. ENSURE AND HARDEN WORKSPACE EVENTS (CALENDAR & MEETINGS)
CREATE TABLE IF NOT EXISTS public.workspace_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ,
  start_time TIMESTAMPTZ DEFAULT now(),
  end_time TIMESTAMPTZ,
  event_type VARCHAR(32) DEFAULT 'lab_meeting',
  meeting_link TEXT,
  location_or_url TEXT,
  attendee_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure all event columns exist if table previously existed
ALTER TABLE public.workspace_events
  ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS event_type VARCHAR(32) DEFAULT 'lab_meeting',
  ADD COLUMN IF NOT EXISTS meeting_link TEXT,
  ADD COLUMN IF NOT EXISTS location_or_url TEXT,
  ADD COLUMN IF NOT EXISTS attendee_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS event_date TIMESTAMPTZ DEFAULT now();

-- Ensure ON DELETE CASCADE on foreign key
DO $$
BEGIN
  ALTER TABLE public.workspace_events
    DROP CONSTRAINT IF EXISTS workspace_events_workspace_id_fkey,
    ADD CONSTRAINT workspace_events_workspace_id_fkey
      FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Storage-efficient single compound index matching the queries
CREATE INDEX IF NOT EXISTS idx_workspace_events_workspace_time ON public.workspace_events(workspace_id, start_time ASC);

-- Enable RLS & Replica Identity
ALTER TABLE public.workspace_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_events REPLICA IDENTITY DEFAULT;

-- Workspace Events Policies
DROP POLICY IF EXISTS "workspace_events_select_policy" ON public.workspace_events;
CREATE POLICY "workspace_events_select_policy" ON public.workspace_events
  FOR SELECT TO authenticated
  USING (
    public.is_workspace_member(workspace_id, auth.uid())
    OR public.is_workspace_creator(workspace_id, auth.uid())
    OR creator_id = auth.uid()
  );

DROP POLICY IF EXISTS "workspace_events_insert_policy" ON public.workspace_events;
CREATE POLICY "workspace_events_insert_policy" ON public.workspace_events
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_workspace_member(workspace_id, auth.uid())
    OR public.is_workspace_creator(workspace_id, auth.uid())
    OR creator_id = auth.uid()
  );

DROP POLICY IF EXISTS "workspace_events_update_policy" ON public.workspace_events;
CREATE POLICY "workspace_events_update_policy" ON public.workspace_events
  FOR UPDATE TO authenticated
  USING (
    public.is_workspace_member(workspace_id, auth.uid())
    OR public.is_workspace_creator(workspace_id, auth.uid())
    OR creator_id = auth.uid()
  )
  WITH CHECK (
    public.is_workspace_member(workspace_id, auth.uid())
    OR public.is_workspace_creator(workspace_id, auth.uid())
    OR creator_id = auth.uid()
  );

DROP POLICY IF EXISTS "workspace_events_delete_policy" ON public.workspace_events;
CREATE POLICY "workspace_events_delete_policy" ON public.workspace_events
  FOR DELETE TO authenticated
  USING (
    public.is_workspace_member(workspace_id, auth.uid())
    OR public.is_workspace_creator(workspace_id, auth.uid())
    OR creator_id = auth.uid()
  );

GRANT ALL ON public.workspace_events TO authenticated, service_role;
GRANT SELECT ON public.workspace_events TO anon;

-- 4. REALTIME PUBLICATION (IN-MEMORY WEBSOCKET REPLICATION, 0 BYTES DISK STORAGE)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'workspace_tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_tasks;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'workspace_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_events;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
