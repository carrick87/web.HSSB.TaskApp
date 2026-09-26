-- =============================================================================
-- TaskApp — Consolidated Setup Script
-- =============================================================================
-- Run this entire script in the Supabase SQL Editor to set up the database.
-- This script is IDEMPOTENT — safe to run multiple times.
--
-- Storage buckets are created via SQL below. If they fail, create manually:
--   1. 'task-files' (private, 10MB limit) - for legacy task instance answers
--   2. 'task-attachments' (private, 10MB limit) - for new task attachments
-- =============================================================================

-- =============================================================================
-- EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Note: pg_cron requires enabling in Supabase Dashboard (Database > Extensions)
-- CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- =============================================================================
-- SCHEMAS
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS task_app;
CREATE SCHEMA IF NOT EXISTS private;

-- Secure private schema
REVOKE ALL ON SCHEMA private FROM public;
REVOKE ALL ON SCHEMA private FROM anon;
REVOKE ALL ON SCHEMA private FROM authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;

-- =============================================================================
-- LEGACY TABLES (001-004 migrations)
-- =============================================================================

-- 1. branches
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL
);

-- 2. departments
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

-- 3. profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  harrison_email TEXT,
  auth_email TEXT NOT NULL,
  branch_id UUID REFERENCES public.branches(id),
  department_id UUID REFERENCES public.departments(id),
  role TEXT NOT NULL CHECK (role IN ('admin', 'pic', 'staff')),
  created_at TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_auth_email_key') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_auth_email_key UNIQUE (auth_email);
  END IF;
END $$;

-- 4. task_templates (legacy recurring tasks)
CREATE TABLE IF NOT EXISTS public.task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  created_by_profile_id UUID REFERENCES public.profiles(id),
  recurrence_type TEXT NOT NULL CHECK (recurrence_type IN ('daily', 'monthly', 'custom')),
  recurrence_value INT,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  requires_verification BOOLEAN DEFAULT true,
  assign_to_type TEXT NOT NULL CHECK (assign_to_type IN ('user', 'branch', 'department')),
  assign_to_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. task_template_questions
CREATE TABLE IF NOT EXISTS public.task_template_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.task_templates(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  answer_type TEXT NOT NULL CHECK (answer_type IN ('text', 'number', 'boolean', 'choice', 'file')),
  is_required BOOLEAN DEFAULT true,
  options_json JSONB,
  sort_order INT DEFAULT 0
);

-- 6. task_instances (legacy)
CREATE TABLE IF NOT EXISTS public.task_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.task_templates(id),
  assignee_profile_id UUID NOT NULL REFERENCES public.profiles(id),
  assignment_date DATE NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'submitted', 'verified', 'rejected', 'failed')),
  accepted_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  pic_comment TEXT,
  is_late BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. task_instance_answers
CREATE TABLE IF NOT EXISTS public.task_instance_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_instance_id UUID NOT NULL REFERENCES public.task_instances(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.task_template_questions(id),
  answer_text TEXT,
  answer_number NUMERIC,
  answer_boolean BOOLEAN,
  answer_file_url TEXT
);

-- 8. task_user_stats
CREATE TABLE IF NOT EXISTS public.task_user_stats (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_completed INT DEFAULT 0,
  total_late_submissions INT DEFAULT 0,
  total_failed INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. point_settings
CREATE TABLE IF NOT EXISTS public.point_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT UNIQUE NOT NULL CHECK (event_type IN ('completed_on_time', 'completed_late', 'failed', 'not_completed')),
  points INT NOT NULL,
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. user_points
CREATE TABLE IF NOT EXISTS public.user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id),
  task_instance_id UUID REFERENCES public.task_instances(id),
  event_type TEXT,
  points_earned INT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT now(),
  month INT,
  year INT
);

-- =============================================================================
-- NEW TABLES (005 migration - Project Management)
-- =============================================================================

-- 11. projects
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 12. project_members
CREATE TABLE IF NOT EXISTS public.project_members (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (project_id, profile_id)
);

-- 13. tasks (manual tasks, distinct from task_instances)
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date DATE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assignee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 14. task_attachments
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INT,
  content_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 15. task_comments
CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_branch ON public.profiles(branch_id);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_task_instances_assignee ON public.task_instances(assignee_profile_id);
CREATE INDEX IF NOT EXISTS idx_task_instances_status ON public.task_instances(status);
CREATE INDEX IF NOT EXISTS idx_task_instances_assignment_date ON public.task_instances(assignment_date);
CREATE INDEX IF NOT EXISTS idx_task_instances_due_date ON public.task_instances(due_date);
CREATE INDEX IF NOT EXISTS idx_user_points_profile ON public.user_points(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_points_month_year ON public.user_points(month, year);
CREATE INDEX IF NOT EXISTS idx_projects_department ON public.projects(department_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS idx_project_members_profile ON public.project_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_tasks_department ON public.tasks(department_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON public.task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_uploaded_by ON public.task_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_author ON public.task_comments(author_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_task_instances_unique_assignment
  ON public.task_instances (template_id, assignee_profile_id, assignment_date);

-- =============================================================================
-- HELPER FUNCTIONS (PUBLIC - for legacy compatibility)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.user_branch_id()
RETURNS UUID AS $$
  SELECT branch_id FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.user_department_id()
RETURNS UUID AS $$
  SELECT department_id FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================================================
-- HELPER FUNCTIONS (PRIVATE - for new RLS, created AFTER tables exist)
-- =============================================================================
CREATE OR REPLACE FUNCTION private.get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())
$$;

CREATE OR REPLACE FUNCTION private.get_user_department_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT department_id FROM public.profiles WHERE id = (SELECT auth.uid())
$$;

CREATE OR REPLACE FUNCTION private.get_profile_department_id(p_profile_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT department_id FROM public.profiles WHERE id = p_profile_id
$$;

CREATE OR REPLACE FUNCTION private.get_user_project_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT project_id FROM public.project_members WHERE profile_id = (SELECT auth.uid())
$$;

-- Rules:
-- 1. Admin can view all tasks
-- 2. Manager (pic) can view all tasks in their department
-- 3. Manager (pic) can view private tasks where assignee is in their department
-- 4. Project task: user is member of the project (NOT assignee/creator alone)
-- 5. Private task: user is assignee or creator
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
  FROM public.profiles WHERE id = v_user_id;

  IF v_user_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  SELECT project_id, created_by, assignee_id, department_id
  INTO v_task
  FROM public.tasks WHERE id = p_task_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Manager can see all tasks in their department
  IF v_user_role = 'pic' AND v_task.department_id = v_user_dept THEN
    RETURN TRUE;
  END IF;

  -- Manager can see private task if assignee is in their department
  IF v_user_role = 'pic' AND v_task.project_id IS NULL THEN
    IF (SELECT department_id FROM public.profiles WHERE id = v_task.assignee_id) = v_user_dept THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- Project task: only project members (NOT assignee/creator alone)
  IF v_task.project_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = v_task.project_id AND profile_id = v_user_id
    );
  END IF;

  -- Private task: user is assignee or creator
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

  SELECT role INTO v_user_role FROM public.profiles WHERE id = v_user_id;

  IF v_user_role = 'admin' THEN
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

CREATE OR REPLACE FUNCTION private.can_access_task_file(file_path TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_task_id UUID;
BEGIN
  BEGIN
    v_task_id := (storage.foldername(file_path))[1]::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
  END;
  
  RETURN private.can_view_task(v_task_id);
END;
$$;

-- Revoke execute from public/anon on all private functions
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM public;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM anon;

-- Grant execute to authenticated
GRANT EXECUTE ON FUNCTION private.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_user_department_id() TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_profile_department_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_user_project_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_view_task(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_edit_task(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_access_task_file(TEXT) TO authenticated;

-- =============================================================================
-- TRIGGERS
-- =============================================================================
CREATE OR REPLACE FUNCTION task_app.set_user_points_month_year()
RETURNS TRIGGER AS $$
BEGIN
  NEW.month := EXTRACT(MONTH FROM NEW.earned_at)::INT;
  NEW.year := EXTRACT(YEAR FROM NEW.earned_at)::INT;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_points_set_month_year ON public.user_points;
CREATE TRIGGER user_points_set_month_year
  BEFORE INSERT OR UPDATE OF earned_at ON public.user_points
  FOR EACH ROW
  EXECUTE PROCEDURE task_app.set_user_points_month_year();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS projects_updated_at ON public.projects;
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tasks_updated_at ON public.tasks;
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS task_comments_updated_at ON public.task_comments;
CREATE TRIGGER task_comments_updated_at
  BEFORE UPDATE ON public.task_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION task_app.apply_task_points_and_stats()
RETURNS TRIGGER AS $$
DECLARE
  pts INT;
  evt TEXT;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'verified' THEN
    evt := CASE WHEN NEW.is_late THEN 'completed_late' ELSE 'completed_on_time' END;
    SELECT points INTO pts FROM public.point_settings WHERE event_type = evt LIMIT 1;
    IF pts IS NULL THEN pts := 0; END IF;

    INSERT INTO public.user_points (profile_id, task_instance_id, event_type, points_earned)
    VALUES (NEW.assignee_profile_id, NEW.id, evt, pts);

    INSERT INTO public.task_user_stats (profile_id, total_completed, total_late_submissions, updated_at)
    VALUES (
      NEW.assignee_profile_id,
      1,
      CASE WHEN NEW.is_late THEN 1 ELSE 0 END,
      now()
    )
    ON CONFLICT (profile_id) DO UPDATE SET
      total_completed = public.task_user_stats.total_completed + 1,
      total_late_submissions = public.task_user_stats.total_late_submissions + CASE WHEN NEW.is_late THEN 1 ELSE 0 END,
      updated_at = now();
  ELSIF NEW.status = 'failed' THEN
    SELECT points INTO pts FROM public.point_settings WHERE event_type = 'failed' LIMIT 1;
    IF pts IS NULL THEN pts := 0; END IF;

    INSERT INTO public.user_points (profile_id, task_instance_id, event_type, points_earned)
    VALUES (NEW.assignee_profile_id, NEW.id, 'failed', pts);

    INSERT INTO public.task_user_stats (profile_id, total_failed, updated_at)
    VALUES (NEW.assignee_profile_id, 1, now())
    ON CONFLICT (profile_id) DO UPDATE SET
      total_failed = public.task_user_stats.total_failed + 1,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS task_instances_points_trigger ON public.task_instances;
CREATE TRIGGER task_instances_points_trigger
  AFTER UPDATE OF status ON public.task_instances
  FOR EACH ROW
  EXECUTE PROCEDURE task_app.apply_task_points_and_stats();

-- =============================================================================
-- ROW LEVEL SECURITY: Enable on all tables
-- =============================================================================
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_template_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_instance_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES: Legacy tables (001-004)
-- =============================================================================

-- branches
DROP POLICY IF EXISTS "branches_select" ON public.branches;
DROP POLICY IF EXISTS "branches_insert_admin" ON public.branches;
DROP POLICY IF EXISTS "branches_update_admin" ON public.branches;
DROP POLICY IF EXISTS "branches_delete_admin" ON public.branches;

CREATE POLICY "branches_select" ON public.branches FOR SELECT TO authenticated USING (true);
CREATE POLICY "branches_insert_admin" ON public.branches FOR INSERT TO authenticated
  WITH CHECK (public.user_role() = 'admin');
CREATE POLICY "branches_update_admin" ON public.branches FOR UPDATE TO authenticated
  USING (public.user_role() = 'admin')
  WITH CHECK (public.user_role() = 'admin');
CREATE POLICY "branches_delete_admin" ON public.branches FOR DELETE TO authenticated
  USING (public.user_role() = 'admin');

-- departments
DROP POLICY IF EXISTS "departments_select" ON public.departments;
DROP POLICY IF EXISTS "departments_insert_admin" ON public.departments;
DROP POLICY IF EXISTS "departments_update_admin" ON public.departments;
DROP POLICY IF EXISTS "departments_delete_admin" ON public.departments;

CREATE POLICY "departments_select" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "departments_insert_admin" ON public.departments FOR INSERT TO authenticated
  WITH CHECK (public.user_role() = 'admin');
CREATE POLICY "departments_update_admin" ON public.departments FOR UPDATE TO authenticated
  USING (public.user_role() = 'admin')
  WITH CHECK (public.user_role() = 'admin');
CREATE POLICY "departments_delete_admin" ON public.departments FOR DELETE TO authenticated
  USING (public.user_role() = 'admin');

-- profiles
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;

CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated
  USING (public.user_role() = 'admin')
  WITH CHECK (public.user_role() = 'admin');

-- task_templates
DROP POLICY IF EXISTS "task_templates_select" ON public.task_templates;
DROP POLICY IF EXISTS "task_templates_insert" ON public.task_templates;
DROP POLICY IF EXISTS "task_templates_update" ON public.task_templates;
DROP POLICY IF EXISTS "task_templates_delete" ON public.task_templates;

CREATE POLICY "task_templates_select" ON public.task_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "task_templates_insert" ON public.task_templates FOR INSERT TO authenticated
  WITH CHECK (public.user_role() IN ('admin', 'pic'));
CREATE POLICY "task_templates_update" ON public.task_templates FOR UPDATE TO authenticated
  USING (public.user_role() IN ('admin', 'pic'))
  WITH CHECK (public.user_role() IN ('admin', 'pic'));
CREATE POLICY "task_templates_delete" ON public.task_templates FOR DELETE TO authenticated
  USING (public.user_role() = 'admin');

-- task_template_questions
DROP POLICY IF EXISTS "task_template_questions_select" ON public.task_template_questions;
DROP POLICY IF EXISTS "task_template_questions_insert" ON public.task_template_questions;
DROP POLICY IF EXISTS "task_template_questions_update" ON public.task_template_questions;
DROP POLICY IF EXISTS "task_template_questions_delete" ON public.task_template_questions;

CREATE POLICY "task_template_questions_select" ON public.task_template_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "task_template_questions_insert" ON public.task_template_questions FOR INSERT TO authenticated
  WITH CHECK (public.user_role() IN ('admin', 'pic'));
CREATE POLICY "task_template_questions_update" ON public.task_template_questions FOR UPDATE TO authenticated
  USING (public.user_role() IN ('admin', 'pic'))
  WITH CHECK (public.user_role() IN ('admin', 'pic'));
CREATE POLICY "task_template_questions_delete" ON public.task_template_questions FOR DELETE TO authenticated
  USING (public.user_role() IN ('admin', 'pic'));

-- task_instances
DROP POLICY IF EXISTS "task_instances_select_staff" ON public.task_instances;
DROP POLICY IF EXISTS "task_instances_select_pic" ON public.task_instances;
DROP POLICY IF EXISTS "task_instances_select_admin" ON public.task_instances;
DROP POLICY IF EXISTS "task_instances_insert" ON public.task_instances;
DROP POLICY IF EXISTS "task_instances_update_staff" ON public.task_instances;
DROP POLICY IF EXISTS "task_instances_update_pic" ON public.task_instances;
DROP POLICY IF EXISTS "task_instances_update_admin" ON public.task_instances;

CREATE POLICY "task_instances_select_staff" ON public.task_instances FOR SELECT TO authenticated
  USING (assignee_profile_id = auth.uid());
CREATE POLICY "task_instances_select_pic" ON public.task_instances FOR SELECT TO authenticated
  USING (
    public.user_role() = 'pic' AND (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = task_instances.assignee_profile_id
          AND (p.branch_id = public.user_branch_id() OR p.department_id = public.user_department_id())
      )
    )
  );
CREATE POLICY "task_instances_select_admin" ON public.task_instances FOR SELECT TO authenticated
  USING (public.user_role() = 'admin');
CREATE POLICY "task_instances_insert" ON public.task_instances FOR INSERT TO authenticated
  WITH CHECK (public.user_role() IN ('admin', 'pic'));
CREATE POLICY "task_instances_update_staff" ON public.task_instances FOR UPDATE TO authenticated
  USING (assignee_profile_id = auth.uid())
  WITH CHECK (assignee_profile_id = auth.uid());
CREATE POLICY "task_instances_update_pic" ON public.task_instances FOR UPDATE TO authenticated
  USING (public.user_role() = 'pic')
  WITH CHECK (public.user_role() = 'pic');
CREATE POLICY "task_instances_update_admin" ON public.task_instances FOR UPDATE TO authenticated
  USING (public.user_role() = 'admin')
  WITH CHECK (public.user_role() = 'admin');

-- task_instance_answers
DROP POLICY IF EXISTS "task_instance_answers_select" ON public.task_instance_answers;
DROP POLICY IF EXISTS "task_instance_answers_insert" ON public.task_instance_answers;
DROP POLICY IF EXISTS "task_instance_answers_update" ON public.task_instance_answers;

CREATE POLICY "task_instance_answers_select" ON public.task_instance_answers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.task_instances ti
      WHERE ti.id = task_instance_answers.task_instance_id
        AND (
          ti.assignee_profile_id = auth.uid()
          OR public.user_role() IN ('admin', 'pic')
        )
    )
  );
CREATE POLICY "task_instance_answers_insert" ON public.task_instance_answers FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.task_instances ti
      WHERE ti.id = task_instance_answers.task_instance_id AND ti.assignee_profile_id = auth.uid()
    )
  );
CREATE POLICY "task_instance_answers_update" ON public.task_instance_answers FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.task_instances ti
      WHERE ti.id = task_instance_answers.task_instance_id AND ti.assignee_profile_id = auth.uid()
    )
  );

-- task_user_stats
DROP POLICY IF EXISTS "task_user_stats_select_own" ON public.task_user_stats;
DROP POLICY IF EXISTS "task_user_stats_select_admin" ON public.task_user_stats;
DROP POLICY IF EXISTS "task_user_stats_all_admin" ON public.task_user_stats;

CREATE POLICY "task_user_stats_select_own" ON public.task_user_stats FOR SELECT TO authenticated
  USING (profile_id = auth.uid());
CREATE POLICY "task_user_stats_select_admin" ON public.task_user_stats FOR SELECT TO authenticated
  USING (public.user_role() = 'admin');
CREATE POLICY "task_user_stats_all_admin" ON public.task_user_stats FOR ALL TO authenticated
  USING (public.user_role() = 'admin')
  WITH CHECK (public.user_role() = 'admin');

-- point_settings
DROP POLICY IF EXISTS "point_settings_select" ON public.point_settings;
DROP POLICY IF EXISTS "point_settings_admin" ON public.point_settings;

CREATE POLICY "point_settings_select" ON public.point_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "point_settings_admin" ON public.point_settings FOR ALL TO authenticated
  USING (public.user_role() = 'admin')
  WITH CHECK (public.user_role() = 'admin');

-- user_points
DROP POLICY IF EXISTS "user_points_select" ON public.user_points;

CREATE POLICY "user_points_select" ON public.user_points FOR SELECT TO authenticated USING (true);

-- =============================================================================
-- RLS POLICIES: New tables (005 - Project Management)
-- =============================================================================

-- projects
DROP POLICY IF EXISTS "projects_admin_select" ON public.projects;
DROP POLICY IF EXISTS "projects_manager_select" ON public.projects;
DROP POLICY IF EXISTS "projects_member_select" ON public.projects;
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
DROP POLICY IF EXISTS "projects_update" ON public.projects;
DROP POLICY IF EXISTS "projects_delete" ON public.projects;

CREATE POLICY "projects_admin_select" ON public.projects FOR SELECT TO authenticated
  USING ((SELECT private.get_user_role()) = 'admin');
CREATE POLICY "projects_manager_select" ON public.projects FOR SELECT TO authenticated
  USING (
    (SELECT private.get_user_role()) = 'pic'
    AND department_id = (SELECT private.get_user_department_id())
  );
CREATE POLICY "projects_member_select" ON public.projects FOR SELECT TO authenticated
  USING (id IN (SELECT private.get_user_project_ids()));
CREATE POLICY "projects_insert" ON public.projects FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.get_user_role()) IN ('admin', 'pic')
    AND (
      (SELECT private.get_user_role()) = 'admin'
      OR department_id = (SELECT private.get_user_department_id())
    )
  );
CREATE POLICY "projects_update" ON public.projects FOR UPDATE TO authenticated
  USING (
    (SELECT private.get_user_role()) = 'admin'
    OR created_by = (SELECT auth.uid())
  )
  WITH CHECK (
    (SELECT private.get_user_role()) = 'admin'
    OR created_by = (SELECT auth.uid())
  );
CREATE POLICY "projects_delete" ON public.projects FOR DELETE TO authenticated
  USING (
    (SELECT private.get_user_role()) = 'admin'
    OR created_by = (SELECT auth.uid())
  );

-- project_members
DROP POLICY IF EXISTS "project_members_select" ON public.project_members;
DROP POLICY IF EXISTS "project_members_insert" ON public.project_members;
DROP POLICY IF EXISTS "project_members_delete" ON public.project_members;

CREATE POLICY "project_members_select" ON public.project_members FOR SELECT TO authenticated
  USING (
    (SELECT private.get_user_role()) = 'admin'
    OR project_id IN (SELECT private.get_user_project_ids())
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_members.project_id
      AND p.department_id = (SELECT private.get_user_department_id())
      AND (SELECT private.get_user_role()) = 'pic'
    )
  );
CREATE POLICY "project_members_insert" ON public.project_members FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.get_user_role()) = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_members.project_id
      AND p.created_by = (SELECT auth.uid())
    )
  );
CREATE POLICY "project_members_delete" ON public.project_members FOR DELETE TO authenticated
  USING (
    (SELECT private.get_user_role()) = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_members.project_id
      AND p.created_by = (SELECT auth.uid())
    )
  );

-- tasks
DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete" ON public.tasks;

-- Rules:
-- 1. Admin sees all
-- 2. Manager sees all tasks in their department
-- 3. Manager sees private tasks where assignee is in their department
-- 4. Project task: only project members (NOT assignee/creator alone)
-- 5. Private task: assignee or creator
CREATE POLICY "tasks_select" ON public.tasks FOR SELECT TO authenticated
  USING (
    (SELECT private.get_user_role()) = 'admin'
    OR (
      (SELECT private.get_user_role()) = 'pic'
      AND department_id = (SELECT private.get_user_department_id())
    )
    OR (
      (SELECT private.get_user_role()) = 'pic'
      AND project_id IS NULL
      AND (SELECT private.get_profile_department_id(assignee_id)) = (SELECT private.get_user_department_id())
    )
    OR (
      project_id IS NOT NULL
      AND project_id IN (SELECT private.get_user_project_ids())
    )
    OR (
      project_id IS NULL
      AND (assignee_id = (SELECT auth.uid()) OR created_by = (SELECT auth.uid()))
    )
  );
CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.get_user_role()) IN ('admin', 'pic')
    AND (
      (SELECT private.get_user_role()) = 'admin'
      OR department_id = (SELECT private.get_user_department_id())
    )
    AND created_by = (SELECT auth.uid())
  );
CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE TO authenticated
  USING (
    (SELECT private.get_user_role()) = 'admin'
    OR created_by = (SELECT auth.uid())
    OR assignee_id = (SELECT auth.uid())
  )
  WITH CHECK (
    (SELECT private.get_user_role()) = 'admin'
    OR created_by = (SELECT auth.uid())
    OR assignee_id = (SELECT auth.uid())
  );
CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE TO authenticated
  USING (
    (SELECT private.get_user_role()) = 'admin'
    OR created_by = (SELECT auth.uid())
  );

-- task_attachments
DROP POLICY IF EXISTS "task_attachments_select" ON public.task_attachments;
DROP POLICY IF EXISTS "task_attachments_insert" ON public.task_attachments;
DROP POLICY IF EXISTS "task_attachments_delete" ON public.task_attachments;

CREATE POLICY "task_attachments_select" ON public.task_attachments FOR SELECT TO authenticated
  USING ((SELECT private.can_view_task(task_id)));
CREATE POLICY "task_attachments_insert" ON public.task_attachments FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.can_view_task(task_id))
    AND uploaded_by = (SELECT auth.uid())
  );
CREATE POLICY "task_attachments_delete" ON public.task_attachments FOR DELETE TO authenticated
  USING (
    uploaded_by = (SELECT auth.uid())
    OR (SELECT private.get_user_role()) = 'admin'
  );

-- task_comments
DROP POLICY IF EXISTS "task_comments_select" ON public.task_comments;
DROP POLICY IF EXISTS "task_comments_insert" ON public.task_comments;
DROP POLICY IF EXISTS "task_comments_update" ON public.task_comments;
DROP POLICY IF EXISTS "task_comments_delete" ON public.task_comments;

CREATE POLICY "task_comments_select" ON public.task_comments FOR SELECT TO authenticated
  USING ((SELECT private.can_view_task(task_id)));
CREATE POLICY "task_comments_insert" ON public.task_comments FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.can_view_task(task_id))
    AND author_id = (SELECT auth.uid())
  );
CREATE POLICY "task_comments_update" ON public.task_comments FOR UPDATE TO authenticated
  USING (author_id = (SELECT auth.uid()))
  WITH CHECK (author_id = (SELECT auth.uid()));
CREATE POLICY "task_comments_delete" ON public.task_comments FOR DELETE TO authenticated
  USING (
    author_id = (SELECT auth.uid())
    OR (SELECT private.get_user_role()) = 'admin'
  );

-- =============================================================================
-- STORAGE BUCKETS (created via SQL)
-- =============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('task-files', 'task-files', false, 10485760)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('task-attachments', 'task-attachments', false, 10485760)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- STORAGE POLICIES
-- =============================================================================

-- Legacy task-files bucket
DROP POLICY IF EXISTS "task_files_upload" ON storage.objects;
DROP POLICY IF EXISTS "task_files_select_own" ON storage.objects;
DROP POLICY IF EXISTS "task_files_update_own" ON storage.objects;
DROP POLICY IF EXISTS "task_files_delete_own" ON storage.objects;

CREATE POLICY "task_files_upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'task-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "task_files_select_own" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'task-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "task_files_update_own" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'task-files' AND owner = auth.uid())
WITH CHECK (bucket_id = 'task-files' AND owner = auth.uid());

CREATE POLICY "task_files_delete_own" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'task-files' AND owner = auth.uid());

-- New task-attachments bucket
DROP POLICY IF EXISTS "task_attachments_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "task_attachments_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "task_attachments_storage_delete" ON storage.objects;

CREATE POLICY "task_attachments_storage_select" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'task-attachments'
  AND (SELECT private.can_access_task_file(name))
);

CREATE POLICY "task_attachments_storage_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'task-attachments'
  AND (SELECT private.can_access_task_file(name))
);

CREATE POLICY "task_attachments_storage_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'task-attachments'
  AND (
    owner_id = (SELECT auth.uid())::text
    OR (SELECT private.get_user_role()) = 'admin'
  )
);

-- =============================================================================
-- SEED DATA: point_settings (if not exists)
-- =============================================================================
INSERT INTO public.point_settings (event_type, points)
VALUES
  ('completed_on_time', 10),
  ('completed_late', 5),
  ('failed', -3),
  ('not_completed', 0)
ON CONFLICT (event_type) DO NOTHING;

-- =============================================================================
-- DAILY TASK GENERATION FUNCTION (for pg_cron)
-- =============================================================================
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
    FROM public.task_templates tt
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
      SELECT array_agg(id) INTO assignee_ids FROM public.profiles WHERE branch_id = t.assign_to_id AND role = 'staff';
    ELSIF t.assign_to_type = 'department' AND t.assign_to_id IS NOT NULL THEN
      SELECT array_agg(id) INTO assignee_ids FROM public.profiles WHERE department_id = t.assign_to_id AND role = 'staff';
    END IF;

    IF assignee_ids IS NULL THEN assignee_ids := ARRAY[]::UUID[]; END IF;

    FOREACH aid IN ARRAY assignee_ids
    LOOP
      INSERT INTO public.task_instances (template_id, assignee_profile_id, assignment_date, due_date, status)
      VALUES (t.template_id, aid, today_date, due_ts, 'pending')
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- To schedule with pg_cron (run in Supabase dashboard after enabling extension):
-- SELECT cron.schedule('generate-daily-tasks', '1 0 * * *', 'SELECT task_app.generate_daily_tasks()');

-- =============================================================================
-- DONE!
-- =============================================================================
