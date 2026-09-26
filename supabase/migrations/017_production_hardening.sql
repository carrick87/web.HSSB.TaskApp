-- 017: Production hardening — privilege guards, org_id safety, legacy policy cleanup, audit.

-- =============================================================================
-- Public branding via invite token / slug (no anon org table scan)
-- =============================================================================
DROP POLICY IF EXISTS "organizations_select_public_branding" ON public.organizations;

CREATE OR REPLACE FUNCTION public.get_organization_branding_for_invite(p_token TEXT)
RETURNS TABLE (name TEXT, short_name TEXT, logo_wide_path TEXT, logo_square_path TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT o.name, o.short_name, o.logo_wide_path, o.logo_square_path
  FROM public.organization_invites i
  JOIN public.organizations o ON o.id = i.org_id
  WHERE i.token = p_token
    AND i.status = 'pending'
    AND i.expires_at > now()
    AND o.status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_organization_branding_by_slug(p_slug TEXT)
RETURNS TABLE (name TEXT, short_name TEXT, logo_wide_path TEXT, logo_square_path TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT o.name, o.short_name, o.logo_wide_path, o.logo_square_path
  FROM public.organizations o
  WHERE o.slug = p_slug AND o.status = 'active'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_organization_branding_for_invite(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_organization_branding_by_slug(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_organization_branding_for_invite(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_organization_branding_by_slug(TEXT) TO anon, authenticated;

-- =============================================================================
-- Platform admin source of truth
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = auth.uid()
  )
$$;

-- =============================================================================
-- Drop remaining legacy policies (007 storage + answers/stats)
-- =============================================================================
DROP POLICY IF EXISTS "task_instance_answers_select" ON public.task_instance_answers;
DROP POLICY IF EXISTS "task_instance_answers_insert" ON public.task_instance_answers;
DROP POLICY IF EXISTS "task_instance_answers_update" ON public.task_instance_answers;
DROP POLICY IF EXISTS "task_user_stats_select_own" ON public.task_user_stats;
DROP POLICY IF EXISTS "task_user_stats_select_admin" ON public.task_user_stats;
DROP POLICY IF EXISTS "task_user_stats_all_admin" ON public.task_user_stats;
DROP POLICY IF EXISTS "task_attachments_delete" ON public.task_attachments;
DROP POLICY IF EXISTS "task_comments_delete" ON public.task_comments;
DROP POLICY IF EXISTS "task_attachments_storage_delete" ON storage.objects;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS harrison_email_domain;

-- =============================================================================
-- Profile UPDATE: column grants + trigger for sensitive fields
-- =============================================================================
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (
  username,
  timezone,
  date_format
) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION task_app.enforce_profiles_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  jwt_role TEXT := current_setting('request.jwt.claim.role', true);
BEGIN
  IF jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.is_platform_admin IS DISTINCT FROM OLD.is_platform_admin
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.must_change_password IS DISTINCT FROM OLD.must_change_password
     OR NEW.auth_email IS DISTINCT FROM OLD.auth_email
     OR NEW.harrison_email IS DISTINCT FROM OLD.harrison_email
     OR NEW.branch_id IS DISTINCT FROM OLD.branch_id
     OR NEW.department_id IS DISTINCT FROM OLD.department_id
  THEN
    RAISE EXCEPTION 'Cannot modify protected profile fields';
  END IF;

  IF NEW.current_org_id IS DISTINCT FROM OLD.current_org_id THEN
    IF NEW.current_org_id IS NULL THEN
      RAISE EXCEPTION 'current_org_id cannot be cleared';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.org_id = NEW.current_org_id
        AND m.user_id = NEW.id
        AND m.status = 'active'
    ) THEN
      RAISE EXCEPTION 'current_org_id must be an organization you belong to';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_self_update_guard ON public.profiles;
CREATE TRIGGER profiles_self_update_guard
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (auth.uid() = id)
  EXECUTE FUNCTION task_app.enforce_profiles_self_update();

-- =============================================================================
-- org_id safety on tenant INSERTs
-- =============================================================================
CREATE OR REPLACE FUNCTION task_app.tenant_fill_org_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_org UUID;
BEGIN
  IF NEW.org_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'task_instances' THEN
    SELECT org_id INTO v_org FROM public.task_templates WHERE id = NEW.template_id;
  ELSIF TG_TABLE_NAME = 'tasks' AND NEW.project_id IS NOT NULL THEN
    SELECT org_id INTO v_org FROM public.projects WHERE id = NEW.project_id;
  ELSIF TG_TABLE_NAME = 'tasks' AND NEW.department_id IS NOT NULL THEN
    SELECT org_id INTO v_org FROM public.departments WHERE id = NEW.department_id;
  ELSIF TG_TABLE_NAME = 'projects' AND NEW.department_id IS NOT NULL THEN
    SELECT org_id INTO v_org FROM public.departments WHERE id = NEW.department_id;
  ELSIF TG_TABLE_NAME = 'departments' AND NEW.branch_id IS NOT NULL THEN
    SELECT org_id INTO v_org FROM public.branches WHERE id = NEW.branch_id;
  END IF;

  IF v_org IS NULL THEN
    v_org := public.current_org_id();
  END IF;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'org_id is required';
  END IF;

  NEW.org_id := v_org;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS branches_fill_org_id ON public.branches;
CREATE TRIGGER branches_fill_org_id BEFORE INSERT ON public.branches
  FOR EACH ROW EXECUTE FUNCTION task_app.tenant_fill_org_id();

DROP TRIGGER IF EXISTS departments_fill_org_id ON public.departments;
CREATE TRIGGER departments_fill_org_id BEFORE INSERT ON public.departments
  FOR EACH ROW EXECUTE FUNCTION task_app.tenant_fill_org_id();

DROP TRIGGER IF EXISTS task_templates_fill_org_id ON public.task_templates;
CREATE TRIGGER task_templates_fill_org_id BEFORE INSERT ON public.task_templates
  FOR EACH ROW EXECUTE FUNCTION task_app.tenant_fill_org_id();

DROP TRIGGER IF EXISTS task_instances_fill_org_id ON public.task_instances;
CREATE TRIGGER task_instances_fill_org_id BEFORE INSERT ON public.task_instances
  FOR EACH ROW EXECUTE FUNCTION task_app.tenant_fill_org_id();

DROP TRIGGER IF EXISTS projects_fill_org_id ON public.projects;
CREATE TRIGGER projects_fill_org_id BEFORE INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION task_app.tenant_fill_org_id();

DROP TRIGGER IF EXISTS tasks_fill_org_id ON public.tasks;
CREATE TRIGGER tasks_fill_org_id BEFORE INSERT ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION task_app.tenant_fill_org_id();

DROP TRIGGER IF EXISTS user_points_fill_org_id ON public.user_points;
CREATE TRIGGER user_points_fill_org_id BEFORE INSERT ON public.user_points
  FOR EACH ROW EXECUTE FUNCTION task_app.tenant_fill_org_id();

-- =============================================================================
-- Points trigger + daily generation (org-aware)
-- =============================================================================
ALTER TABLE public.user_points DROP CONSTRAINT IF EXISTS user_points_profile_id_fkey;
ALTER TABLE public.user_points
  ADD CONSTRAINT user_points_profile_id_fkey
  FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION task_app.apply_task_points_and_stats()
RETURNS TRIGGER AS $$
DECLARE
  pts INT;
  evt TEXT;
  v_org UUID;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  v_org := NEW.org_id;
  IF v_org IS NULL THEN
    SELECT org_id INTO v_org FROM public.task_templates WHERE id = NEW.template_id;
  END IF;

  IF NEW.status = 'verified' THEN
    evt := CASE WHEN NEW.is_late THEN 'completed_late' ELSE 'completed_on_time' END;
    SELECT points INTO pts FROM point_settings WHERE event_type = evt AND org_id = v_org LIMIT 1;
    IF pts IS NULL THEN pts := 0; END IF;

    INSERT INTO user_points (profile_id, task_instance_id, event_type, points_earned, org_id)
    VALUES (NEW.assignee_profile_id, NEW.id, evt, pts, v_org);

    INSERT INTO task_user_stats (profile_id, org_id, total_completed, total_late_submissions, updated_at)
    VALUES (
      NEW.assignee_profile_id,
      v_org,
      1,
      CASE WHEN NEW.is_late THEN 1 ELSE 0 END,
      now()
    )
    ON CONFLICT (org_id, profile_id) DO UPDATE SET
      total_completed = task_user_stats.total_completed + 1,
      total_late_submissions = task_user_stats.total_late_submissions + CASE WHEN NEW.is_late THEN 1 ELSE 0 END,
      updated_at = now();
  ELSIF NEW.status = 'failed' THEN
    SELECT points INTO pts FROM point_settings WHERE event_type = 'failed' AND org_id = v_org LIMIT 1;
    IF pts IS NULL THEN pts := 0; END IF;

    INSERT INTO user_points (profile_id, task_instance_id, event_type, points_earned, org_id)
    VALUES (NEW.assignee_profile_id, NEW.id, 'failed', pts, v_org);

    INSERT INTO task_user_stats (profile_id, org_id, total_failed, updated_at)
    VALUES (NEW.assignee_profile_id, v_org, 1, now())
    ON CONFLICT (org_id, profile_id) DO UPDATE SET
      total_failed = task_user_stats.total_failed + 1,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
    SELECT tt.id AS template_id, tt.org_id AS template_org_id, tt.assign_to_type, tt.assign_to_id
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
      SELECT array_agg(p.id) INTO assignee_ids
      FROM profiles p
      JOIN organization_members om ON om.user_id = p.id AND om.org_id = t.template_org_id AND om.status = 'active'
      WHERE p.branch_id = t.assign_to_id AND p.role IN ('user', 'staff') AND p.status = 'active';
    ELSIF t.assign_to_type = 'department' AND t.assign_to_id IS NOT NULL THEN
      SELECT array_agg(p.id) INTO assignee_ids
      FROM profiles p
      JOIN organization_members om ON om.user_id = p.id AND om.org_id = t.template_org_id AND om.status = 'active'
      WHERE p.department_id = t.assign_to_id AND p.role IN ('user', 'staff') AND p.status = 'active';
    END IF;

    IF assignee_ids IS NULL THEN assignee_ids := ARRAY[]::UUID[]; END IF;

    FOREACH aid IN ARRAY assignee_ids
    LOOP
      INSERT INTO task_instances (template_id, assignee_profile_id, assignment_date, due_date, status, org_id)
      VALUES (t.template_id, aid, today_date, due_ts, 'pending', t.template_org_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Tenant RLS policy audit (fail migration if policies omit org membership)
-- =============================================================================
ALTER TABLE public.task_user_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_user_stats_org_select" ON public.task_user_stats;
CREATE POLICY "task_user_stats_org_select" ON public.task_user_stats FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

CREATE OR REPLACE FUNCTION task_app.assert_tenant_policies_reference_org()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  bad RECORD;
BEGIN
  FOR bad IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'branches','departments','task_templates','task_instances','projects','tasks',
        'point_settings','user_points','task_user_stats','notifications','notification_events',
        'email_preferences','task_watchers'
      )
      AND COALESCE(qual, '') || ' ' || COALESCE(with_check, '') NOT ILIKE '%is_org_member%'
      AND COALESCE(qual, '') || ' ' || COALESCE(with_check, '') NOT ILIKE '%is_org_admin%'
      AND COALESCE(qual, '') || ' ' || COALESCE(with_check, '') NOT ILIKE '%is_org_manager_or_above%'
      AND COALESCE(qual, '') || ' ' || COALESCE(with_check, '') NOT ILIKE '%org_role%'
      AND policyname NOT IN ('profiles_self_update', 'profiles_select_org_peers', 'email_preferences_own', 'push_tokens_own')
  LOOP
    RAISE EXCEPTION 'Policy % on %.% must reference org membership helpers', bad.policyname, bad.schemaname, bad.tablename;
  END LOOP;
END;
$$;

SELECT task_app.assert_tenant_policies_reference_org();

-- task_instance_answers org-scoped (legacy 001/007 policies dropped above)
ALTER TABLE public.task_instance_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_instance_answers_org_select" ON public.task_instance_answers;
DROP POLICY IF EXISTS "task_instance_answers_org_write" ON public.task_instance_answers;
CREATE POLICY "task_instance_answers_org_select" ON public.task_instance_answers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.task_instances ti
      WHERE ti.id = task_instance_id AND public.is_org_member(ti.org_id)
    )
  );
CREATE POLICY "task_instance_answers_org_write" ON public.task_instance_answers FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.task_instances ti
      WHERE ti.id = task_instance_id AND public.is_org_member(ti.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.task_instances ti
      WHERE ti.id = task_instance_id AND public.is_org_member(ti.org_id)
    )
  );
