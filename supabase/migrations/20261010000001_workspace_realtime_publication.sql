-- ============================================================================
-- BOOFFIN WORKSPACE REALTIME REPLICATION PUBLICATION MIGRATION
-- Enables instant postgres changes for workspace messages, members, and rooms
-- ============================================================================

DO $$
BEGIN
    -- 1. Ensure REPLICA IDENTITY is FULL for reliable UPDATE/DELETE payload streaming
    ALTER TABLE IF EXISTS public.workspace_messages REPLICA IDENTITY FULL;
    ALTER TABLE IF EXISTS public.workspace_members REPLICA IDENTITY FULL;
    ALTER TABLE IF EXISTS public.workspaces REPLICA IDENTITY FULL;

    -- 2. Add tables to supabase_realtime publication if not already present
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'workspace_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_messages;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'workspace_members'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_members;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'workspaces'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.workspaces;
    END IF;
END $$;
