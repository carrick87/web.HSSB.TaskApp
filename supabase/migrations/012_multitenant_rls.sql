-- 012: Tenant RLS — scope reads/writes by org_id + membership helpers.
-- Drops legacy policies that used user_role() / global admin.

-- branches
DROP POLICY IF EXISTS "branches_select" ON public.branches;
DROP POLICY IF EXISTS "branches_admin_all" ON public.branches;
CREATE POLICY "branches_org_member_select" ON public.branches FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
CREATE POLICY "branches_org_admin_write" ON public.branches FOR ALL TO authenticated
  USING (public.is_org_admin(org_id))
  WITH CHECK (public.is_org_admin(org_id));

-- departments
DROP POLICY IF EXISTS "departments_select" ON public.departments;
DROP POLICY IF EXISTS "departments_admin_all" ON public.departments;
CREATE POLICY "departments_org_member_select" ON public.departments FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
CREATE POLICY "departments_org_admin_write" ON public.departments FOR ALL TO authenticated
  USING (public.is_org_admin(org_id))
  WITH CHECK (public.is_org_admin(org_id));

-- task_templates
DROP POLICY IF EXISTS "templates_select" ON public.task_templates;
DROP POLICY IF EXISTS "templates_admin_all" ON public.task_templates;
CREATE POLICY "task_templates_org_select" ON public.task_templates FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
CREATE POLICY "task_templates_org_manager_write" ON public.task_templates FOR ALL TO authenticated
  USING (public.is_org_manager_or_above(org_id))
  WITH CHECK (public.is_org_manager_or_above(org_id));

-- task_instances
DROP POLICY IF EXISTS "instances_select" ON public.task_instances;
DROP POLICY IF EXISTS "instances_admin_all" ON public.task_instances;
CREATE POLICY "task_instances_org_select" ON public.task_instances FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
CREATE POLICY "task_instances_org_write" ON public.task_instances FOR ALL TO authenticated
  USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

-- projects / tasks (005)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects_select" ON public.projects;
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
DROP POLICY IF EXISTS "projects_update" ON public.projects;
DROP POLICY IF EXISTS "projects_delete" ON public.projects;

CREATE POLICY "projects_org_member_select" ON public.projects FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
CREATE POLICY "projects_org_manager_write" ON public.projects FOR ALL TO authenticated
  USING (public.is_org_manager_or_above(org_id))
  WITH CHECK (public.is_org_manager_or_above(org_id));

DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete" ON public.tasks;

CREATE POLICY "tasks_org_member_select" ON public.tasks FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
CREATE POLICY "tasks_org_member_write" ON public.tasks FOR ALL TO authenticated
  USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

-- Attachments/comments inherit org via task join in app; add org_id denormalized optional later
-- For now restrict via task_id subquery
CREATE POLICY "task_attachments_org" ON public.task_attachments FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND public.is_org_member(t.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND public.is_org_member(t.org_id)
    )
  );

CREATE POLICY "task_comments_org" ON public.task_comments FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND public.is_org_member(t.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND public.is_org_member(t.org_id)
    )
  );

-- point_settings / user_points
CREATE POLICY "point_settings_org" ON public.point_settings FOR ALL TO authenticated
  USING (public.is_org_admin(org_id))
  WITH CHECK (public.is_org_admin(org_id));

CREATE POLICY "user_points_org_select" ON public.user_points FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

CREATE POLICY "user_points_org_insert" ON public.user_points FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id));

-- profiles: users read self; org members see co-members in same org
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_select_org_peers" ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.organization_members m1
      JOIN public.organization_members m2 ON m1.org_id = m2.org_id
      WHERE m1.user_id = auth.uid() AND m2.user_id = profiles.id
        AND m1.status = 'active' AND m2.status = 'active'
    )
  );
