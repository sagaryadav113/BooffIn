-- ----------------------------------------------------------------------------
-- WORKSPACE SAVED ITEMS (VAULT) POLICIES & ENHANCEMENTS
-- ----------------------------------------------------------------------------

-- 1. Ensure columns exist and nullable title
ALTER TABLE public.workspace_saved_items
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS note TEXT;

ALTER TABLE public.workspace_saved_items
  ALTER COLUMN title DROP NOT NULL;

-- 2. Expand item_type check constraint to safely include 'doi_paper' and 'paper'
DO $$
BEGIN
  ALTER TABLE public.workspace_saved_items DROP CONSTRAINT IF EXISTS workspace_saved_items_item_type_check;
  ALTER TABLE public.workspace_saved_items ADD CONSTRAINT workspace_saved_items_item_type_check
    CHECK (item_type IN ('message', 'paper', 'doi_paper', 'discussion', 'event', 'opportunity'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 3. Unique index for safe upserts per user and workspace item
CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_saved_unique
  ON public.workspace_saved_items(workspace_id, user_id, item_id);

-- 4. Enable Row Level Security
ALTER TABLE public.workspace_saved_items ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS "workspace_saved_items_select_policy" ON public.workspace_saved_items;
CREATE POLICY "workspace_saved_items_select_policy"
  ON public.workspace_saved_items
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND (public.is_workspace_member(workspace_id, auth.uid()) OR public.is_workspace_creator(workspace_id, auth.uid()))
  );

DROP POLICY IF EXISTS "workspace_saved_items_insert_policy" ON public.workspace_saved_items;
CREATE POLICY "workspace_saved_items_insert_policy"
  ON public.workspace_saved_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (public.is_workspace_member(workspace_id, auth.uid()) OR public.is_workspace_creator(workspace_id, auth.uid()))
  );

DROP POLICY IF EXISTS "workspace_saved_items_update_policy" ON public.workspace_saved_items;
CREATE POLICY "workspace_saved_items_update_policy"
  ON public.workspace_saved_items
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "workspace_saved_items_delete_policy" ON public.workspace_saved_items;
CREATE POLICY "workspace_saved_items_delete_policy"
  ON public.workspace_saved_items
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
