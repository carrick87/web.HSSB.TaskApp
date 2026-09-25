-- Migration 005: Projects, Tasks (manual), Task Attachments, Comments
-- Implements department-based visibility with private tasks and project-based collaboration
-- Uses SECURITY DEFINER helper functions to avoid recursive RLS policies

-- =============================================================================
-- PRIVATE SCHEMA FOR SECURITY DEFINER HELPERS
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS private;

-- Revoke direct access to private schema from public roles
REVOKE ALL ON SCHEMA private FROM public;
REVOKE ALL ON SCHEMA private FROM anon;
REVOKE ALL ON SCHEMA private FROM authenticated;

-- Grant usage to authenticated (they can execute functions but not see schema objects)
GRANT USAGE ON SCHEMA private TO authenticated;

-- =============================================================================
-- SECURITY DEFINER HELPER FUNCTIONS
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
-- 2. Project task: user is member of the project
-- 3. Private task: user is assignee, creator, or manager/admin in same department as assignee
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
  v_assignee_dept UUID;
BEGIN
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get user's role and department
  SELECT role, department_id INTO v_user_role, v_user_dept
  FROM public.profiles WHERE id = v_user_id;

  -- Admin can see all
  IF v_user_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- Get task details
  SELECT project_id, created_by, assignee_id, department_id
  INTO v_task
  FROM public.tasks WHERE id = p_task_id;

  IF v_task IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Project task: check project membership
  IF v_task.project_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = v_task.project_id AND profile_id = v_user_id
    );
  END IF;

  -- Private task: check direct access
  -- User is assignee
  IF v_task.assignee_id = v_user_id THEN
    RETURN TRUE;
  END IF;

  -- User is creator
  IF v_task.created_by = v_user_id THEN
    RETURN TRUE;
  END IF;

  -- User is manager/admin in same department as assignee
  IF v_user_role IN ('admin', 'pic') THEN
    -- Get assignee's department
    SELECT department_id INTO v_assignee_dept
    FROM public.profiles WHERE id = v_task.assignee_id;
    
    IF v_assignee_dept IS NOT NULL AND v_assignee_dept = v_user_dept THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$;

-- Check if user can edit a task (more restrictive than view)
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

  -- Admin can edit all
  IF v_user_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  SELECT created_by, assignee_id INTO v_task FROM public.tasks WHERE id = p_task_id;

  -- Creator can edit
  IF v_task.created_by = v_user_id THEN
    RETURN TRUE;
  END IF;

  -- Assignee can update status (limited edit)
  IF v_task.assignee_id = v_user_id THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- Grant execute on helper functions to authenticated
GRANT EXECUTE ON FUNCTION private.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_user_department_id() TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_user_project_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_view_task(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_edit_task(UUID) TO authenticated;

-- =============================================================================
-- TABLES
-- =============================================================================

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Project members junction table
CREATE TABLE IF NOT EXISTS project_members (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (project_id, profile_id)
);

-- Tasks table (manual tasks, distinct from template-generated task_instances)
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date DATE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assignee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Task attachments
CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INT,
  content_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Task comments (nice-to-have)
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_projects_department ON projects(department_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_project_members_profile ON project_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_tasks_department ON tasks(department_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);

-- =============================================================================
-- TRIGGERS: updated_at
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tasks_updated_at ON tasks;
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS task_comments_updated_at ON task_comments;
CREATE TRIGGER task_comments_updated_at
  BEFORE UPDATE ON task_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- PROJECTS RLS
-- -----------------------------------------------------------------------------
-- Admin can see all projects
CREATE POLICY "projects_admin_select" ON projects FOR SELECT TO authenticated
  USING ((SELECT private.get_user_role()) = 'admin');

-- Manager can see projects in their department
CREATE POLICY "projects_manager_select" ON projects FOR SELECT TO authenticated
  USING (
    (SELECT private.get_user_role()) = 'pic'
    AND department_id = (SELECT private.get_user_department_id())
  );

-- Members can see projects they're part of
CREATE POLICY "projects_member_select" ON projects FOR SELECT TO authenticated
  USING (id IN (SELECT private.get_user_project_ids()));

-- Admin and managers can create projects in their department
CREATE POLICY "projects_insert" ON projects FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.get_user_role()) IN ('admin', 'pic')
    AND (
      (SELECT private.get_user_role()) = 'admin'
      OR department_id = (SELECT private.get_user_department_id())
    )
  );

-- Admin and creator can update projects
CREATE POLICY "projects_update" ON projects FOR UPDATE TO authenticated
  USING (
    (SELECT private.get_user_role()) = 'admin'
    OR created_by = (SELECT auth.uid())
  )
  WITH CHECK (
    (SELECT private.get_user_role()) = 'admin'
    OR created_by = (SELECT auth.uid())
  );

-- Admin and creator can delete projects
CREATE POLICY "projects_delete" ON projects FOR DELETE TO authenticated
  USING (
    (SELECT private.get_user_role()) = 'admin'
    OR created_by = (SELECT auth.uid())
  );

-- -----------------------------------------------------------------------------
-- PROJECT_MEMBERS RLS
-- -----------------------------------------------------------------------------
-- Can see project members if you can see the project
CREATE POLICY "project_members_select" ON project_members FOR SELECT TO authenticated
  USING (
    (SELECT private.get_user_role()) = 'admin'
    OR project_id IN (SELECT private.get_user_project_ids())
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_members.project_id
      AND p.department_id = (SELECT private.get_user_department_id())
      AND (SELECT private.get_user_role()) = 'pic'
    )
  );

-- Admin and project creator can manage members
CREATE POLICY "project_members_insert" ON project_members FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.get_user_role()) = 'admin'
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_members.project_id
      AND p.created_by = (SELECT auth.uid())
    )
  );

CREATE POLICY "project_members_delete" ON project_members FOR DELETE TO authenticated
  USING (
    (SELECT private.get_user_role()) = 'admin'
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_members.project_id
      AND p.created_by = (SELECT auth.uid())
    )
  );

-- -----------------------------------------------------------------------------
-- TASKS RLS
-- -----------------------------------------------------------------------------
-- Select: use the can_view_task helper
CREATE POLICY "tasks_select" ON tasks FOR SELECT TO authenticated
  USING ((SELECT private.can_view_task(id)));

-- Insert: admin/manager can create tasks
-- Manager can only create in their department
CREATE POLICY "tasks_insert" ON tasks FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.get_user_role()) IN ('admin', 'pic')
    AND (
      (SELECT private.get_user_role()) = 'admin'
      OR department_id = (SELECT private.get_user_department_id())
    )
    AND created_by = (SELECT auth.uid())
  );

-- Update: use can_edit_task helper
CREATE POLICY "tasks_update" ON tasks FOR UPDATE TO authenticated
  USING ((SELECT private.can_edit_task(id)))
  WITH CHECK ((SELECT private.can_edit_task(id)));

-- Delete: admin or creator
CREATE POLICY "tasks_delete" ON tasks FOR DELETE TO authenticated
  USING (
    (SELECT private.get_user_role()) = 'admin'
    OR created_by = (SELECT auth.uid())
  );

-- -----------------------------------------------------------------------------
-- TASK_ATTACHMENTS RLS
-- -----------------------------------------------------------------------------
-- Can view attachments if you can view the task
CREATE POLICY "task_attachments_select" ON task_attachments FOR SELECT TO authenticated
  USING ((SELECT private.can_view_task(task_id)));

-- Can upload if you can view the task (assignee or creator typically)
CREATE POLICY "task_attachments_insert" ON task_attachments FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.can_view_task(task_id))
    AND uploaded_by = (SELECT auth.uid())
  );

-- Can delete own uploads or admin
CREATE POLICY "task_attachments_delete" ON task_attachments FOR DELETE TO authenticated
  USING (
    uploaded_by = (SELECT auth.uid())
    OR (SELECT private.get_user_role()) = 'admin'
  );

-- -----------------------------------------------------------------------------
-- TASK_COMMENTS RLS
-- -----------------------------------------------------------------------------
-- Can view comments if you can view the task
CREATE POLICY "task_comments_select" ON task_comments FOR SELECT TO authenticated
  USING ((SELECT private.can_view_task(task_id)));

-- Can add comment if you can view the task
CREATE POLICY "task_comments_insert" ON task_comments FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.can_view_task(task_id))
    AND author_id = (SELECT auth.uid())
  );

-- Can update own comments
CREATE POLICY "task_comments_update" ON task_comments FOR UPDATE TO authenticated
  USING (author_id = (SELECT auth.uid()))
  WITH CHECK (author_id = (SELECT auth.uid()));

-- Can delete own comments or admin
CREATE POLICY "task_comments_delete" ON task_comments FOR DELETE TO authenticated
  USING (
    author_id = (SELECT auth.uid())
    OR (SELECT private.get_user_role()) = 'admin'
  );

-- =============================================================================
-- STORAGE POLICIES FOR TASK ATTACHMENTS
-- =============================================================================
-- Create bucket (run in Dashboard: task-attachments, private, 10MB limit)
-- Files stored as: task-attachments/{task_id}/{filename}

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "task_attachments_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "task_attachments_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "task_attachments_storage_delete" ON storage.objects;

-- Helper to check task visibility for storage (needs to extract task_id from path)
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
  -- Path format: task_id/filename
  -- Extract first folder as task_id
  BEGIN
    v_task_id := (storage.foldername(file_path))[1]::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
  END;
  
  RETURN private.can_view_task(v_task_id);
END;
$$;

GRANT EXECUTE ON FUNCTION private.can_access_task_file(TEXT) TO authenticated;

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

-- Storage DELETE: can delete if uploaded by self or admin
CREATE POLICY "task_attachments_storage_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'task-attachments'
  AND (
    owner = (SELECT auth.uid())
    OR (SELECT private.get_user_role()) = 'admin'
  )
);
