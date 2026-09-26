-- 015: Unified notification events, email outbox, preferences, task watchers, profile timezone.
-- Service role sends email; users manage preferences. Do not run on production until reviewed.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Asia/Kuching',
  ADD COLUMN IF NOT EXISTS email_suppressed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_suppression_reason TEXT;

CREATE TABLE IF NOT EXISTS public.notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_events_user ON public.notification_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_events_org ON public.notification_events(org_id, created_at DESC);

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS notification_event_id UUID REFERENCES public.notification_events(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.email_preferences (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  task_activity BOOLEAN NOT NULL DEFAULT true,
  reminders BOOLEAN NOT NULL DEFAULT true,
  digest_frequency TEXT NOT NULL DEFAULT 'off' CHECK (digest_frequency IN ('off', 'daily', 'weekly')),
  membership_updates BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, org_id)
);

CREATE TABLE IF NOT EXISTS public.task_watchers (
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_watchers_user ON public.task_watchers(user_id, org_id);

CREATE TABLE IF NOT EXISTS public.email_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  template TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'suppressed', 'cancelled')),
  attempts INT NOT NULL DEFAULT 0,
  send_after TIMESTAMPTZ NOT NULL DEFAULT now(),
  resend_id TEXT,
  error TEXT,
  idempotency_key TEXT,
  batch_key TEXT,
  notification_event_id UUID REFERENCES public.notification_events(id) ON DELETE SET NULL,
  mandatory BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_outbox_idempotency ON public.email_outbox(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_outbox_pending ON public.email_outbox(status, send_after) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_email_outbox_batch ON public.email_outbox(batch_key, status) WHERE batch_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.email_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  template TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  category TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_reminder_state (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reminder_date DATE NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, org_id, reminder_date)
);

ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_watchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_events_select_own ON public.notification_events
  FOR SELECT USING (user_id = auth.uid() AND task_app.is_org_member(org_id));

CREATE POLICY email_preferences_own ON public.email_preferences
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY task_watchers_select ON public.task_watchers
  FOR SELECT USING (user_id = auth.uid() AND task_app.is_org_member(org_id));

CREATE POLICY task_watchers_mutate ON public.task_watchers
  FOR ALL USING (user_id = auth.uid() AND task_app.is_org_member(org_id))
  WITH CHECK (user_id = auth.uid() AND task_app.is_org_member(org_id));

-- Outbox: no policies for authenticated users (service role only)
