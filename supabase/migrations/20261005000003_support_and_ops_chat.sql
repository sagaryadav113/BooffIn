-- ============================================================================
-- BOOFFIN PLATFORM MIGRATION — SUPPORT DESK & INTERNAL ADMIN TEAM COMMS
-- Version: 20261005000003
-- Description:
--   1. public.support_tickets (Support inquiries from support@letsbooffin.com & app)
--   2. public.admin_team_messages (Real-time internal chat for admin team members)
--   3. Zero-Trust Row Level Security (RLS) guarded by public.is_admin()
-- ============================================================================

-- 1. SUPPORT INQUIRIES & TICKETS TABLE
CREATE SEQUENCE IF NOT EXISTS public.support_ticket_seq START WITH 1001;

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL DEFAULT ('TKT-' || nextval('public.support_ticket_seq'::regclass)::text),
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'GENERAL' CHECK (category IN ('GENERAL', 'ACCOUNT', 'VERIFICATION', 'BUG_REPORT', 'BILLING', 'SECURITY')),
  subject TEXT NOT NULL,
  message_body TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_name TEXT,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices for rapid support ticket querying
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON public.support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_sender_email ON public.support_tickets(sender_email);

-- 2. INTERNAL ADMIN TEAM COMMS TABLE
CREATE TABLE IF NOT EXISTS public.admin_team_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  sender_role TEXT NOT NULL DEFAULT 'ADMIN' CHECK (sender_role IN ('SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'ANALYST')),
  channel TEXT NOT NULL DEFAULT 'general-ops' CHECK (channel IN ('general-ops', 'trust-safety', 'tech-incidents', 'announcements')),
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices for internal team chat stream
CREATE INDEX IF NOT EXISTS idx_admin_team_messages_channel ON public.admin_team_messages(channel, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_admin_team_messages_created ON public.admin_team_messages(created_at DESC);

-- 3. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_team_messages ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES FOR SUPPORT TICKETS
-- Anyone authenticated or anonymous can submit a support ticket
DROP POLICY IF EXISTS "support_tickets_insert_policy" ON public.support_tickets;
CREATE POLICY "support_tickets_insert_policy"
  ON public.support_tickets
  FOR INSERT
  WITH CHECK (true);

-- Only verified admins can view all support tickets
DROP POLICY IF EXISTS "support_tickets_admin_select_policy" ON public.support_tickets;
CREATE POLICY "support_tickets_admin_select_policy"
  ON public.support_tickets
  FOR SELECT
  USING (
    public.is_admin() = true
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  );

-- Only verified admins can update support tickets (assign, change status, add notes)
DROP POLICY IF EXISTS "support_tickets_admin_update_policy" ON public.support_tickets;
CREATE POLICY "support_tickets_admin_update_policy"
  ON public.support_tickets
  FOR UPDATE
  USING (public.is_admin() = true)
  WITH CHECK (public.is_admin() = true);

-- 5. RLS POLICIES FOR INTERNAL ADMIN TEAM CHAT
-- Strictly admins only can select messages
DROP POLICY IF EXISTS "admin_chat_select_policy" ON public.admin_team_messages;
CREATE POLICY "admin_chat_select_policy"
  ON public.admin_team_messages
  FOR SELECT
  USING (public.is_admin() = true);

-- Strictly admins only can insert messages
DROP POLICY IF EXISTS "admin_chat_insert_policy" ON public.admin_team_messages;
CREATE POLICY "admin_chat_insert_policy"
  ON public.admin_team_messages
  FOR INSERT
  WITH CHECK (public.is_admin() = true AND auth.uid() = sender_id);

-- Strictly admins can update pins
DROP POLICY IF EXISTS "admin_chat_update_policy" ON public.admin_team_messages;
CREATE POLICY "admin_chat_update_policy"
  ON public.admin_team_messages
  FOR UPDATE
  USING (public.is_admin() = true)
  WITH CHECK (public.is_admin() = true);

-- 6. REALTIME REPLICATION ENABLEMENT
-- Add admin_team_messages and support_tickets to supabase_realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'admin_team_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_team_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'support_tickets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
  END IF;
END $$;
