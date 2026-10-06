-- ============================================================================
-- BOOFFIN ADMIN PORTAL — SUPER ADMIN PROFILE & CREDENTIALS SYNC
-- ============================================================================

-- Ensure columns exist in admin_members
ALTER TABLE IF EXISTS public.admin_members 
    ADD COLUMN IF NOT EXISTS full_name TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'Operations & Security',
    ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Policy ensuring admins can read & update their own admin profile
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'admin_members' 
        AND policyname = 'Admins can update own admin member profile'
    ) THEN
        CREATE POLICY "Admins can update own admin member profile"
            ON public.admin_members
            FOR UPDATE
            USING (auth.uid() = user_id OR public.is_admin() = true);
    END IF;
END $$;
