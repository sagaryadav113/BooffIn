-- ============================================================================
-- BOOFFIN RESEARCHER CONNECTIONS & COLLABORATION REQUESTS MIGRATION
-- Enables distinct research collaboration proposals, mutual interest discovery,
-- and clean future collaboration workflow expansion.
-- ============================================================================

-- 1. Create collaboration_requests table
CREATE TABLE IF NOT EXISTS public.collaboration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'withdrawn')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_no_self_collaboration CHECK (sender_id <> recipient_id)
);

-- 2. Indexes for efficient lookup
CREATE INDEX IF NOT EXISTS idx_collaboration_requests_sender 
  ON public.collaboration_requests(sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_collaboration_requests_recipient 
  ON public.collaboration_requests(recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_collaboration_requests_pair 
  ON public.collaboration_requests(sender_id, recipient_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_collaboration_requests_active_unique 
  ON public.collaboration_requests(sender_id, recipient_id, LOWER(topic))
  WHERE status = 'pending';

-- 3. Row Level Security (RLS)
ALTER TABLE public.collaboration_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view collaboration requests they sent or received
DROP POLICY IF EXISTS "Users can view collaboration requests they are involved in" ON public.collaboration_requests;
CREATE POLICY "Users can view collaboration requests they are involved in"
  ON public.collaboration_requests FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Policy: Users can send collaboration requests
DROP POLICY IF EXISTS "Users can send collaboration requests" ON public.collaboration_requests;
CREATE POLICY "Users can send collaboration requests"
  ON public.collaboration_requests FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Policy: Users can update status of requests (recipient accepts/declines, sender withdraws)
DROP POLICY IF EXISTS "Users can update their collaboration requests" ON public.collaboration_requests;
CREATE POLICY "Users can update their collaboration requests"
  ON public.collaboration_requests FOR UPDATE
  USING (auth.uid() = recipient_id OR auth.uid() = sender_id)
  WITH CHECK (auth.uid() = recipient_id OR auth.uid() = sender_id);

-- 4. Notification Integration Trigger
CREATE OR REPLACE FUNCTION public.fn_notify_on_collaboration_request()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    notification_type,
    entity_id,
    entity_type,
    title,
    message,
    metadata,
    created_at
  ) VALUES (
    NEW.recipient_id,
    NEW.sender_id,
    'collaboration_request',
    NEW.id,
    'profile',
    'Collaboration Request',
    'expressed interest in research collaboration regarding ' || NEW.topic,
    jsonb_build_object(
      'topic', NEW.topic,
      'request_id', NEW.id,
      'status', NEW.status,
      'message', NEW.message
    ),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_collaboration_request ON public.collaboration_requests;
CREATE TRIGGER trg_notify_collaboration_request
  AFTER INSERT ON public.collaboration_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_on_collaboration_request();
