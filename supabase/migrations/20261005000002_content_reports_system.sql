-- ============================================================================
-- BOOFFIN PLATFORM: CONTENT & USER MODERATION REPORTS SYSTEM
-- ============================================================================
-- Enables mobile & web users to submit structured reports for posts, comments,
-- and profiles, and routes them to the BooffIn Admin Control Center.

-- 1. Ensure admin_members table exists for RBAC
CREATE TABLE IF NOT EXISTS public.admin_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'SUPER_ADMIN' CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'MODERATOR')),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('INVITED', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED')),
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create reports table
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reported_type TEXT NOT NULL CHECK (reported_type IN ('post', 'comment', 'profile', 'user')),
    reported_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed', 'investigating')),
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    admin_notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indices for rapid querying by Admin Moderation Desk
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_reported_id ON public.reports(reported_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON public.reports(reporter_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_members ENABLE ROW LEVEL SECURITY;

-- Policy 1: Authenticated users can insert their own reports
DROP POLICY IF EXISTS "Users can file reports" ON public.reports;
CREATE POLICY "Users can file reports"
ON public.reports
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = reporter_id
);

-- Policy 2: Users can view their own filed reports
DROP POLICY IF EXISTS "Users can view their own reports" ON public.reports;
CREATE POLICY "Users can view their own reports"
ON public.reports
FOR SELECT
TO authenticated
USING (
    auth.uid() = reporter_id
    OR EXISTS (
        SELECT 1 FROM public.admin_members
        WHERE admin_members.user_id = auth.uid()
        AND admin_members.status = 'ACTIVE'
    )
);

-- Policy 3: Platform Administrators can update / resolve reports
DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;
CREATE POLICY "Admins can update reports"
ON public.reports
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.admin_members
        WHERE admin_members.user_id = auth.uid()
        AND admin_members.status = 'ACTIVE'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.admin_members
        WHERE admin_members.user_id = auth.uid()
        AND admin_members.status = 'ACTIVE'
    )
);

-- Policy 4: Admin members read policy
DROP POLICY IF EXISTS "Admins can read admin_members" ON public.admin_members;
CREATE POLICY "Admins can read admin_members"
ON public.admin_members
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.admin_members am
        WHERE am.user_id = auth.uid()
        AND am.status = 'ACTIVE'
    )
);
