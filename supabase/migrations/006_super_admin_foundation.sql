-- 006: Role migration (admin→super_admin, pic→manager, staff→user),
-- profile status, company profile, audit log, helpers, last-super-admin guard.

-- =============================================================================
-- PROFILE: status + role migration
-- =============================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'deactivated'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ;

UPDATE public.profiles SET role = 'super_admin' WHERE role = 'admin';
UPDATE public.profiles SET role = 'manager' WHERE role = 'pic';
UPDATE public.profiles SET role = 'user' WHERE role = 'staff';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'manager', 'user'));

CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- =============================================================================
-- ROLE HELPERS (public schema)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.user_is_active()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT status = 'active' FROM public.profiles WHERE id = auth.uid()),
    false
  )
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.user_is_active() AND public.user_role() = 'super_admin'
$$;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.user_is_active() AND public.user_role() = 'manager'
$$;

CREATE OR REPLACE FUNCTION public.is_elevated()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.user_is_active() AND public.user_role() IN ('super_admin', 'manager')
$$;

-- =============================================================================
-- COMPANY PROFILE (singleton row)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.company_profile (
  id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001'::UUID,
  name TEXT NOT NULL DEFAULT 'TaskApp' CHECK (char_length(name) <= 80),
  short_name TEXT CHECK (short_name IS NULL OR char_length(short_name) <= 40),
  logo_path TEXT,
  registration_no TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id)
);

INSERT INTO public.company_profile (id, name, short_name)
VALUES ('00000000-0000-0000-0000-000000000001'::UUID, 'TaskApp', 'TaskApp')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.company_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_profile_select_all"
  ON public.company_profile FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "company_profile_update_super_admin"
  ON public.company_profile FOR UPDATE
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "company_profile_insert_super_admin"
  ON public.company_profile FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

-- =============================================================================
-- ADMIN AUDIT LOG
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_id UUID,
  action TEXT NOT NULL,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created ON public.admin_audit_log(created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_audit_log_select_super_admin"
  ON public.admin_audit_log FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "admin_audit_log_insert_super_admin"
  ON public.admin_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

-- =============================================================================
-- LAST SUPER ADMIN GUARD
-- =============================================================================
CREATE OR REPLACE FUNCTION task_app.enforce_last_super_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  remaining INT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.role = 'super_admin' AND OLD.status = 'active' THEN
      SELECT COUNT(*) INTO remaining
      FROM public.profiles
      WHERE role = 'super_admin' AND status = 'active' AND id <> OLD.id;
      IF remaining = 0 THEN
        RAISE EXCEPTION 'Cannot delete the last active super admin';
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.role = 'super_admin' AND OLD.status = 'active' THEN
    IF NEW.role <> 'super_admin' OR NEW.status <> 'active' THEN
      SELECT COUNT(*) INTO remaining
      FROM public.profiles
      WHERE role = 'super_admin' AND status = 'active' AND id <> OLD.id;
      IF remaining = 0 THEN
        RAISE EXCEPTION 'Cannot demote or deactivate the last active super admin';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_last_super_admin ON public.profiles;
CREATE TRIGGER profiles_last_super_admin
  BEFORE UPDATE OR DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE task_app.enforce_last_super_admin();

-- =============================================================================
-- UPDATE PRIVATE TASK HELPERS FOR NEW ROLES
-- =============================================================================
CREATE OR REPLACE FUNCTION private.can_view_task(p_task_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_user_dept UUID;
  v_task RECORD;
BEGIN
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT role, department_id INTO v_user_role, v_user_dept
  FROM public.profiles WHERE id = v_user_id AND status = 'active';

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_user_role = 'super_admin' THEN
    RETURN TRUE;
  END IF;

  SELECT project_id, created_by, assignee_id, department_id
  INTO v_task
  FROM public.tasks WHERE id = p_task_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_user_role = 'manager' AND v_task.department_id = v_user_dept THEN
    RETURN TRUE;
  END IF;

  IF v_user_role = 'manager' AND v_task.project_id IS NULL THEN
    IF (SELECT department_id FROM public.profiles WHERE id = v_task.assignee_id) = v_user_dept THEN
      RETURN TRUE;
    END IF;
  END IF;

  IF v_task.project_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = v_task.project_id AND profile_id = v_user_id
    );
  END IF;

  IF v_task.assignee_id = v_user_id OR v_task.created_by = v_user_id THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION private.can_edit_task(p_task_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_task RECORD;
BEGIN
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT role INTO v_user_role FROM public.profiles WHERE id = v_user_id AND status = 'active';

  IF v_user_role = 'super_admin' THEN
    RETURN TRUE;
  END IF;

  SELECT created_by, assignee_id INTO v_task FROM public.tasks WHERE id = p_task_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_task.created_by = v_user_id OR v_task.assignee_id = v_user_id THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- Daily task generation: assign to users (formerly staff)
CREATE OR REPLACE FUNCTION task_app.generate_daily_tasks()
RETURNS void AS $$
DECLARE
  t RECORD;
  assignee_ids UUID[];
  aid UUID;
  due_ts TIMESTAMPTZ;
  today_date DATE := CURRENT_DATE;
BEGIN
  due_ts := (today_date + INTERVAL '1 day')::date::timestamp - INTERVAL '1 second';

  FOR t IN
    SELECT tt.id AS template_id, tt.assign_to_type, tt.assign_to_id
    FROM task_templates tt
    WHERE tt.is_active = true
      AND (tt.start_date IS NULL OR tt.start_date <= today_date)
      AND (tt.end_date IS NULL OR tt.end_date >= today_date)
      AND (
        (tt.recurrence_type = 'daily')
        OR (tt.recurrence_type = 'monthly' AND EXTRACT(DAY FROM today_date) = 1)
        OR (tt.recurrence_type = 'custom' AND tt.recurrence_value > 0 AND tt.start_date IS NOT NULL
            AND ((today_date - tt.start_date) % tt.recurrence_value = 0))
      )
  LOOP
    assignee_ids := ARRAY[]::UUID[];

    IF t.assign_to_type = 'user' AND t.assign_to_id IS NOT NULL THEN
      assignee_ids := array_append(assignee_ids, t.assign_to_id);
    ELSIF t.assign_to_type = 'branch' AND t.assign_to_id IS NOT NULL THEN
      SELECT array_agg(id) INTO assignee_ids FROM profiles WHERE branch_id = t.assign_to_id AND role = 'user' AND status = 'active';
    ELSIF t.assign_to_type = 'department' AND t.assign_to_id IS NOT NULL THEN
      SELECT array_agg(id) INTO assignee_ids FROM profiles WHERE department_id = t.assign_to_id AND role = 'user' AND status = 'active';
    END IF;

    IF assignee_ids IS NULL THEN assignee_ids := ARRAY[]::UUID[]; END IF;

    FOREACH aid IN ARRAY assignee_ids
    LOOP
      INSERT INTO task_instances (template_id, assignee_profile_id, assignment_date, due_date, status)
      VALUES (t.template_id, aid, today_date, due_ts, 'pending')
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
