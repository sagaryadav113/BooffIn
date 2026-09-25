-- ============================================================================
-- BOOFFIN PLATFORM SECURITY HARDENING & ABUSE PREVENTION MIGRATION
-- 1. Fixes IDOR and state tampering on collaboration requests.
-- 2. Restricts mutation access to global papers & authors.
-- 3. Implements rate limiting & spam prevention on collaboration requests.
-- 4. Introduces user block & content reporting moderation systems with RLS.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. COLLABORATION REQUESTS RLS & STATE MACHINE HARDENING
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update their collaboration requests" ON public.collaboration_requests;
DROP POLICY IF EXISTS "Sender can withdraw pending collaboration request" ON public.collaboration_requests;
DROP POLICY IF EXISTS "Recipient can respond to collaboration request" ON public.collaboration_requests;

-- Policy 1A: Senders can ONLY withdraw requests that are currently pending
CREATE POLICY "Sender can withdraw pending collaboration request"
  ON public.collaboration_requests FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = sender_id AND status = 'pending'
  )
  WITH CHECK (
    auth.uid() = sender_id AND status = 'withdrawn'
  );

-- Policy 1B: Recipients can ONLY accept or decline requests that are currently pending
CREATE POLICY "Recipient can respond to collaboration request"
  ON public.collaboration_requests FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = recipient_id AND status = 'pending'
  )
  WITH CHECK (
    auth.uid() = recipient_id AND status IN ('accepted', 'declined')
  );

-- Function & Trigger: Enforce immutable fields during update
CREATE OR REPLACE FUNCTION public.fn_validate_collaboration_request_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent modifying core immutable request metadata
  IF (OLD.sender_id <> NEW.sender_id OR OLD.recipient_id <> NEW.recipient_id OR OLD.topic <> NEW.topic OR OLD.message <> NEW.message) THEN
    RAISE EXCEPTION 'Cannot modify sender, recipient, topic, or message of an existing collaboration request.';
  END IF;

  -- Prevent re-opening non-pending requests
  IF (OLD.status <> 'pending' AND NEW.status <> OLD.status) THEN
    RAISE EXCEPTION 'Cannot transition a collaboration request that has already been %.', OLD.status;
  END IF;

  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_validate_collaboration_request_transition ON public.collaboration_requests;
CREATE TRIGGER trg_validate_collaboration_request_transition
  BEFORE UPDATE ON public.collaboration_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_validate_collaboration_request_transition();

-- Function & Trigger: Rate limit and spam prevention for collaboration requests
CREATE OR REPLACE FUNCTION public.fn_enforce_collaboration_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  recent_pending_count INT;
BEGIN
  -- Check rolling window of requests created by sender in the last 1 hour
  SELECT COUNT(*) INTO recent_pending_count
  FROM public.collaboration_requests
  WHERE sender_id = NEW.sender_id
    AND created_at > (NOW() - INTERVAL '1 hour');

  IF recent_pending_count >= 15 THEN
    RAISE EXCEPTION 'Rate limit exceeded: You can only send up to 15 collaboration requests per hour.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_collaboration_rate_limit ON public.collaboration_requests;
CREATE TRIGGER trg_enforce_collaboration_rate_limit
  BEFORE INSERT ON public.collaboration_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_enforce_collaboration_rate_limit();


-- ----------------------------------------------------------------------------
-- 2. HARDEN PAPERS & PAPER AUTHORS POLICIES (PREVENT GLOBAL OVERWRITE)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated Users Update Papers" ON public.papers;
DROP POLICY IF EXISTS "Authenticated Users Manage Authors" ON public.paper_authors;
DROP POLICY IF EXISTS "Authenticated Users Insert Paper Authors" ON public.paper_authors;

-- Recreate author insert policy strictly
CREATE POLICY "Authenticated Users Insert Paper Authors"
  ON public.paper_authors FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');


-- ----------------------------------------------------------------------------
-- 3. USER BLOCKS & ABUSE PREVENTION
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT chk_no_self_block CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks(blocked_id);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own blocks" ON public.user_blocks;
CREATE POLICY "Users can view own blocks"
  ON public.user_blocks FOR SELECT
  TO authenticated
  USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can block other users" ON public.user_blocks;
CREATE POLICY "Users can block other users"
  ON public.user_blocks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can unblock other users" ON public.user_blocks;
CREATE POLICY "Users can unblock other users"
  ON public.user_blocks FOR DELETE
  TO authenticated
  USING (auth.uid() = blocker_id);


-- ----------------------------------------------------------------------------
-- 4. CONTENT & BEHAVIOR REPORTING SYSTEM
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_type TEXT NOT NULL CHECK (reported_type IN ('post', 'comment', 'profile')),
  reported_id TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'misinformation', 'inappropriate', 'copyright', 'other')),
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_reporter ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_target ON public.reports(reported_type, reported_id);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can file reports" ON public.reports;
CREATE POLICY "Users can file reports"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users can view their filed reports" ON public.reports;
CREATE POLICY "Users can view their filed reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);
