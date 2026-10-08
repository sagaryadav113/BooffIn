-- ============================================================================
-- BOOFFIN WORKSPACE SYSTEM - EXPAND WORKSPACE MESSAGES SCHEMA
-- ============================================================================
-- Adds all rich messaging, DOI metadata, and moderation columns to workspace_messages
-- ============================================================================

-- 1. Ensure all columns exist on workspace_messages
ALTER TABLE public.workspace_messages
  ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS doi_metadata JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS e2ee_ciphertext TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS e2ee_nonce TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.workspace_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Ensure user_id column exists on workspace_blocks
ALTER TABLE public.workspace_blocks
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Ensure foreign key on sender_id to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'workspace_messages_sender_id_fkey'
  ) THEN
    ALTER TABLE public.workspace_messages
      ADD CONSTRAINT workspace_messages_sender_id_fkey
      FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
