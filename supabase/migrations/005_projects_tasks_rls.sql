-- Migration 005: Projects, Tasks (manual), Task Attachments, Comments
-- Implements department-based visibility with private tasks and project-based collaboration
-- Uses SECURITY DEFINER helper functions to avoid recursive RLS policies
-- Split into 005a-005e for the live DB; this file mirrors the combined result.

-- =============================================================================
-- PRIVATE SCHEMA FOR SECURITY DEFINER HELPERS
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS private;

-- Secure private schema
REVOKE ALL ON SCHEMA private FROM public;
REVOKE ALL ON SCHEMA private FROM anon;
REVOKE ALL ON SCHEMA private FROM authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;

-- =============================================================================
-- TABLES (created first so SQL function bodies can reference them)
-- =============================================================================

-- Projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Project members junction table
CREATE TABLE IF NOT EXISTS public.project_members (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (project_id, profile_id)
);

-- Tasks table (manual tasks, distinct from template-generated task_instances)
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

-- Task attachments
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

-- Task comments
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

-- =============================================================================
-- TRIGGERS: updated_at
-- =============================================================================
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

-- =============================================================================
-- SECURITY DEFINER HELPER FUNCTIONS (created after tables exist)
-- =============================================================================

-- Get current user's role (bypasses RLS on profiles)
CREATE OR REPLACE FUNCTION private.get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())
$$;

-- Get current user's department_id (bypasses RLS on profiles)
CREATE OR REPLACE FUNCTION private.get_user_department_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT department_id FROM public.profiles WHERE id = (SELECT auth.uid())
$$;

-- Get a profile's department_id by profile id
CREATE OR REPLACE FUNCTION private.get_profile_department_id(p_profile_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT department_id FROM public.profiles WHERE id = p_profile_id
$$;

-- Get project IDs the current user is a member of
CREATE OR REPLACE FUNCTION private.get_user_project_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT project_id FROM public.project_members WHERE profile_id = (SELECT auth.uid())
$$;

-- Check if user can view a specific task
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

-- Check if user can edit a task
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

-- Helper to check task visibility for storage (extract task_id from path)
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
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- PROJECTS RLS
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- PROJECT_MEMBERS RLS
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- TASKS RLS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete" ON public.tasks;

-- SELECT: Check visibility using row columns directly (not a function that re-reads)
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

-- INSERT: admin/manager can create; manager only in their department
CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.get_user_role()) IN ('admin', 'pic')
    AND (
      (SELECT private.get_user_role()) = 'admin'
      OR department_id = (SELECT private.get_user_department_id())
    )
    AND created_by = (SELECT auth.uid())
  );

-- UPDATE: admin, creator, or assignee can update
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

-- DELETE: admin or creator
CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE TO authenticated
  USING (
    (SELECT private.get_user_role()) = 'admin'
    OR created_by = (SELECT auth.uid())
  );

-- -----------------------------------------------------------------------------
-- TASK_ATTACHMENTS RLS
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- TASK_COMMENTS RLS
-- -----------------------------------------------------------------------------
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
-- STORAGE BUCKET AND POLICIES
-- =============================================================================
-- Create the bucket via SQL (no need for Dashboard)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('task-attachments', 'task-attachments', false, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies for idempotency
DROP POLICY IF EXISTS "task_attachments_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "task_attachments_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "task_attachments_storage_delete" ON storage.objects;

-- Storage SELECT: can download if can view task
CREATE POLICY "task_attachments_storage_select" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'task-attachments'
  AND (SELECT private.can_access_task_file(name))
);

-- Storage INSERT: can upload if can view task
CREATE POLICY "task_attachments_storage_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'task-attachments'
  AND (SELECT private.can_access_task_file(name))
);

-- Storage DELETE: can delete own uploads or admin (use owner_id, not deprecated owner)
CREATE POLICY "task_attachments_storage_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'task-attachments'
  AND (
    owner_id = (SELECT auth.uid())::text
    OR (SELECT private.get_user_role()) = 'admin'
  )
);
