-- 016: Email design prefs — date format, pause all, in-app matrix, task email threads.
-- Apply after 015. Do not run on production until reviewed.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS date_format TEXT NOT NULL DEFAULT 'DD/MM/YYYY';

ALTER TABLE public.email_preferences
  ADD COLUMN IF NOT EXISTS pause_all BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS in_app_task_activity BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS in_app_reminders BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS in_app_membership BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS in_app_invites BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.email_task_threads (
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  root_message_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, recipient_email)
);

ALTER TABLE public.email_task_threads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_task_threads FROM anon, authenticated;
