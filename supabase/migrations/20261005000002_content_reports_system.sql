-- ============================================================================
-- BOOFFIN PLATFORM: CONTENT & USER MODERATION REPORTS SYSTEM
-- ============================================================================
-- Enables mobile & web users to submit structured reports for posts, comments,
-- and profiles, and routes them to the BooffIn Admin Control Center.

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
);

-- Policy 3: Platform Administrators can view all reports
DROP POLICY IF EXISTS "Admins can view all reports" ON public.reports;
CREATE POLICY "Admins can view all reports"
ON public.reports
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.admin_roles
        WHERE admin_roles.user_id = auth.uid()
        AND admin_roles.status = 'active'
    )
);

-- Policy 4: Platform Administrators can update / resolve reports
DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;
CREATE POLICY "Admins can update reports"
ON public.reports
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.admin_roles
        WHERE admin_roles.user_id = auth.uid()
        AND admin_roles.status = 'active'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.admin_roles
        WHERE admin_roles.user_id = auth.uid()
        AND admin_roles.status = 'active'
    )
);

-- Auto-update updated_at timestamp trigger
CREATE OR REPLACE FUNCTION public.handle_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS tr_reports_updated_at ON public.reports;
CREATE TRIGGER tr_reports_updated_at
BEFORE UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.handle_reports_updated_at();
