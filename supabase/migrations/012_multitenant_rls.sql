-- 012: Tenant RLS — scope reads/writes by org_id + membership helpers.
-- Drops legacy policies that used user_role() / global admin.

-- Drop legacy policies from 001–007 (production names)
DROP POLICY IF EXISTS "branches_select" ON public.branches;
DROP POLICY IF EXISTS "departments_select" ON public.departments;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
DROP POLICY IF EXISTS "task_templates_select" ON public.task_templates;
DROP POLICY IF EXISTS "task_templates_insert" ON public.task_templates;
DROP POLICY IF EXISTS "task_templates_update" ON public.task_templates;
DROP POLICY IF EXISTS "task_templates_delete" ON public.task_templates;
DROP POLICY IF EXISTS "task_template_questions_select" ON public.task_template_questions;
DROP POLICY IF EXISTS "task_template_questions_insert" ON public.task_template_questions;
DROP POLICY IF EXISTS "task_template_questions_update" ON public.task_template_questions;
DROP POLICY IF EXISTS "task_template_questions_delete" ON public.task_template_questions;
DROP POLICY IF EXISTS "task_instances_select_staff" ON public.task_instances;
DROP POLICY IF EXISTS "task_instances_select_pic" ON public.task_instances;
DROP POLICY IF EXISTS "task_instances_select_admin" ON public.task_instances;
DROP POLICY IF EXISTS "task_instances_insert" ON public.task_instances;
DROP POLICY IF EXISTS "task_instances_update_staff" ON public.task_instances;
DROP POLICY IF EXISTS "task_instances_update_pic" ON public.task_instances;
DROP POLICY IF EXISTS "task_instances_update_admin" ON public.task_instances;
DROP POLICY IF EXISTS "point_settings_select" ON public.point_settings;
DROP POLICY IF EXISTS "point_settings_admin" ON public.point_settings;
DROP POLICY IF EXISTS "user_points_select" ON public.user_points;
DROP POLICY IF EXISTS "branches_insert_admin" ON public.branches;
DROP POLICY IF EXISTS "branches_update_admin" ON public.branches;
DROP POLICY IF EXISTS "branches_delete_admin" ON public.branches;
DROP POLICY IF EXISTS "departments_insert_admin" ON public.departments;
DROP POLICY IF EXISTS "departments_update_admin" ON public.departments;
DROP POLICY IF EXISTS "departments_delete_admin" ON public.departments;
DROP POLICY IF EXISTS "projects_admin_select" ON public.projects;
DROP POLICY IF EXISTS "projects_manager_select" ON public.projects;
DROP POLICY IF EXISTS "projects_member_select" ON public.projects;
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
DROP POLICY IF EXISTS "projects_update" ON public.projects;
DROP POLICY IF EXISTS "projects_delete" ON public.projects;
DROP POLICY IF EXISTS "project_members_select" ON public.project_members;
DROP POLICY IF EXISTS "project_members_insert" ON public.project_members;
DROP POLICY IF EXISTS "project_members_delete" ON public.project_members;
DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete" ON public.tasks;
DROP POLICY IF EXISTS "task_attachments_select" ON public.task_attachments;
DROP POLICY IF EXISTS "task_attachments_insert" ON public.task_attachments;
DROP POLICY IF EXISTS "task_attachments_delete" ON public.task_attachments;
DROP POLICY IF EXISTS "task_comments_select" ON public.task_comments;
DROP POLICY IF EXISTS "task_comments_insert" ON public.task_comments;
DROP POLICY IF EXISTS "task_comments_update" ON public.task_comments;
DROP POLICY IF EXISTS "task_comments_delete" ON public.task_comments;

-- branches
DROP POLICY IF EXISTS "branches_org_member_select" ON public.branches;
DROP POLICY IF EXISTS "branches_org_admin_write" ON public.branches;
CREATE POLICY "branches_org_member_select" ON public.branches FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
CREATE POLICY "branches_org_admin_write" ON public.branches FOR ALL TO authenticated
  USING (public.is_org_admin(org_id))
  WITH CHECK (public.is_org_admin(org_id));

-- departments
DROP POLICY IF EXISTS "departments_org_member_select" ON public.departments;
DROP POLICY IF EXISTS "departments_org_admin_write" ON public.departments;
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
DROP POLICY IF EXISTS "task_templates_org_select" ON public.task_templates;
DROP POLICY IF EXISTS "task_templates_org_manager_write" ON public.task_templates;
CREATE POLICY "task_templates_org_select" ON public.task_templates FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
CREATE POLICY "task_templates_org_manager_write" ON public.task_templates FOR ALL TO authenticated
  USING (public.is_org_manager_or_above(org_id))
  WITH CHECK (public.is_org_manager_or_above(org_id));

-- task_template_questions (scoped via template org)
DROP POLICY IF EXISTS "task_template_questions_org_select" ON public.task_template_questions;
DROP POLICY IF EXISTS "task_template_questions_org_manager_write" ON public.task_template_questions;
CREATE POLICY "task_template_questions_org_select" ON public.task_template_questions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.task_templates tt
      WHERE tt.id = template_id AND public.is_org_member(tt.org_id)
    )
  );
CREATE POLICY "task_template_questions_org_manager_write" ON public.task_template_questions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.task_templates tt
      WHERE tt.id = template_id AND public.is_org_manager_or_above(tt.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.task_templates tt
      WHERE tt.id = template_id AND public.is_org_manager_or_above(tt.org_id)
    )
  );

-- project_members (scoped via project org)
DROP POLICY IF EXISTS "project_members_org_select" ON public.project_members;
DROP POLICY IF EXISTS "project_members_org_manager_write" ON public.project_members;
CREATE POLICY "project_members_org_select" ON public.project_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND public.is_org_member(p.org_id)
    )
  );
CREATE POLICY "project_members_org_manager_write" ON public.project_members FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND public.is_org_manager_or_above(p.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND public.is_org_manager_or_above(p.org_id)
    )
  );

-- task_instances
DROP POLICY IF EXISTS "instances_select" ON public.task_instances;
DROP POLICY IF EXISTS "instances_admin_all" ON public.task_instances;
DROP POLICY IF EXISTS "task_instances_org_select" ON public.task_instances;
DROP POLICY IF EXISTS "task_instances_org_write" ON public.task_instances;
DROP POLICY IF EXISTS "task_instances_org_update" ON public.task_instances;
DROP POLICY IF EXISTS "task_instances_org_insert" ON public.task_instances;
DROP POLICY IF EXISTS "task_instances_org_delete" ON public.task_instances;
CREATE POLICY "task_instances_org_select" ON public.task_instances FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

CREATE POLICY "task_instances_org_update" ON public.task_instances FOR UPDATE TO authenticated
  USING (
    public.is_org_member(org_id)
    AND (
      assignee_profile_id = auth.uid()
      OR public.is_org_manager_or_above(org_id)
    )
  )
  WITH CHECK (public.is_org_member(org_id));

CREATE POLICY "task_instances_org_insert" ON public.task_instances FOR INSERT TO authenticated
  WITH CHECK (public.is_org_manager_or_above(org_id));

CREATE POLICY "task_instances_org_delete" ON public.task_instances FOR DELETE TO authenticated
  USING (public.is_org_manager_or_above(org_id));

-- projects / tasks (005)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects_org_member_select" ON public.projects;
DROP POLICY IF EXISTS "projects_org_manager_write" ON public.projects;

CREATE POLICY "projects_org_member_select" ON public.projects FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
CREATE POLICY "projects_org_manager_write" ON public.projects FOR ALL TO authenticated
  USING (public.is_org_manager_or_above(org_id))
  WITH CHECK (public.is_org_manager_or_above(org_id));

DROP POLICY IF EXISTS "tasks_org_member_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_org_member_insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks_org_member_update" ON public.tasks;
DROP POLICY IF EXISTS "tasks_org_manager_delete" ON public.tasks;
DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete" ON public.tasks;

CREATE POLICY "tasks_org_member_select" ON public.tasks FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

CREATE POLICY "tasks_org_member_insert" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(org_id)
    AND (created_by = auth.uid() OR public.is_org_manager_or_above(org_id))
  );

CREATE POLICY "tasks_org_member_update" ON public.tasks FOR UPDATE TO authenticated
  USING (
    public.is_org_member(org_id)
    AND (
      created_by = auth.uid()
      OR assignee_id = auth.uid()
      OR public.is_org_manager_or_above(org_id)
    )
  )
  WITH CHECK (public.is_org_member(org_id));

CREATE POLICY "tasks_org_manager_delete" ON public.tasks FOR DELETE TO authenticated
  USING (public.is_org_manager_or_above(org_id));

DROP POLICY IF EXISTS "task_attachments_org" ON public.task_attachments;
DROP POLICY IF EXISTS "task_comments_org" ON public.task_comments;
DROP POLICY IF EXISTS "task_attachments_org_select" ON public.task_attachments;
DROP POLICY IF EXISTS "task_attachments_org_insert" ON public.task_attachments;
DROP POLICY IF EXISTS "task_attachments_org_update" ON public.task_attachments;
DROP POLICY IF EXISTS "task_attachments_org_delete" ON public.task_attachments;
DROP POLICY IF EXISTS "task_comments_org_select" ON public.task_comments;
DROP POLICY IF EXISTS "task_comments_org_insert" ON public.task_comments;
DROP POLICY IF EXISTS "task_comments_org_update" ON public.task_comments;
DROP POLICY IF EXISTS "task_comments_org_delete" ON public.task_comments;
DROP POLICY IF EXISTS "point_settings_org" ON public.point_settings;
DROP POLICY IF EXISTS "point_settings_org_select" ON public.point_settings;
DROP POLICY IF EXISTS "point_settings_org_admin_write" ON public.point_settings;
DROP POLICY IF EXISTS "user_points_org_select" ON public.user_points;
DROP POLICY IF EXISTS "user_points_org_insert" ON public.user_points;
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_org_peers" ON public.profiles;

CREATE POLICY "task_attachments_org_select" ON public.task_attachments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND public.is_org_member(t.org_id)
    )
  );

CREATE POLICY "task_attachments_org_insert" ON public.task_attachments FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND public.is_org_member(t.org_id)
    )
  );

CREATE POLICY "task_attachments_org_update" ON public.task_attachments FOR UPDATE TO authenticated
  USING (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND public.is_org_member(t.org_id)
    )
  )
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "task_attachments_org_delete" ON public.task_attachments FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id
        AND public.is_org_member(t.org_id)
        AND (
          task_attachments.uploaded_by = auth.uid()
          OR public.is_org_manager_or_above(t.org_id)
        )
    )
  );

CREATE POLICY "task_comments_org_select" ON public.task_comments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND public.is_org_member(t.org_id)
    )
  );

CREATE POLICY "task_comments_org_insert" ON public.task_comments FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND public.is_org_member(t.org_id)
    )
  );

CREATE POLICY "task_comments_org_update" ON public.task_comments FOR UPDATE TO authenticated
  USING (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND public.is_org_member(t.org_id)
    )
  )
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "task_comments_org_delete" ON public.task_comments FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id
        AND public.is_org_member(t.org_id)
        AND (
          task_comments.author_id = auth.uid()
          OR public.is_org_manager_or_above(t.org_id)
        )
    )
  );

-- point_settings / user_points
CREATE POLICY "point_settings_org_select" ON public.point_settings FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

CREATE POLICY "point_settings_org_admin_write" ON public.point_settings FOR ALL TO authenticated
  USING (public.is_org_admin(org_id))
  WITH CHECK (public.is_org_admin(org_id));

CREATE POLICY "user_points_org_select" ON public.user_points FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

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
