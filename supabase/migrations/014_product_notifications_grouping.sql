-- 014: Workspace grouping labels, in-app notifications, push token storage (no provider wired).
-- Do not run on production from CI; apply after 010–013.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS group_tier1_label TEXT NOT NULL DEFAULT 'Team',
  ADD COLUMN IF NOT EXISTS group_tier2_label TEXT NOT NULL DEFAULT 'Sub-team',
  ADD COLUMN IF NOT EXISTS hide_group_tier1 BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hide_group_tier2 BOOLEAN NOT NULL DEFAULT true;

-- HSSB keeps familiar labels
UPDATE public.organizations
SET
  group_tier1_label = 'Branch',
  group_tier2_label = 'Department',
  hide_group_tier1 = false,
  hide_group_tier2 = false
WHERE slug = 'hssb';

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  link_path TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_org ON public.notifications(user_id, org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id) WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS public.push_device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform, token)
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_device_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
DROP POLICY IF EXISTS "push_tokens_own" ON public.push_device_tokens;

CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT USING (
    user_id = auth.uid()
    AND public.is_org_member(org_id)
  );

CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE USING (user_id = auth.uid() AND public.is_org_member(org_id));

CREATE POLICY push_tokens_own ON public.push_device_tokens
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
