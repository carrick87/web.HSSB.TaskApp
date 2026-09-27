-- 007: Refresh RLS policies for super_admin / manager / user roles.

-- profiles
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- branches & departments (004 + base)
DROP POLICY IF EXISTS "branches_insert_admin" ON public.branches;
DROP POLICY IF EXISTS "branches_update_admin" ON public.branches;
DROP POLICY IF EXISTS "branches_delete_admin" ON public.branches;
CREATE POLICY "branches_insert_admin" ON public.branches FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());
CREATE POLICY "branches_update_admin" ON public.branches FOR UPDATE TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "branches_delete_admin" ON public.branches FOR DELETE TO authenticated
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "departments_insert_admin" ON public.departments;
DROP POLICY IF EXISTS "departments_update_admin" ON public.departments;
DROP POLICY IF EXISTS "departments_delete_admin" ON public.departments;
CREATE POLICY "departments_insert_admin" ON public.departments FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());
CREATE POLICY "departments_update_admin" ON public.departments FOR UPDATE TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "departments_delete_admin" ON public.departments FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- task_templates
DROP POLICY IF EXISTS "task_templates_insert" ON public.task_templates;
DROP POLICY IF EXISTS "task_templates_update" ON public.task_templates;
DROP POLICY IF EXISTS "task_templates_delete" ON public.task_templates;
CREATE POLICY "task_templates_insert" ON public.task_templates FOR INSERT TO authenticated
  WITH CHECK (public.is_elevated());
CREATE POLICY "task_templates_update" ON public.task_templates FOR UPDATE TO authenticated
  USING (public.is_elevated()) WITH CHECK (public.is_elevated());
CREATE POLICY "task_templates_delete" ON public.task_templates FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- task_template_questions
DROP POLICY IF EXISTS "task_template_questions_insert" ON public.task_template_questions;
DROP POLICY IF EXISTS "task_template_questions_update" ON public.task_template_questions;
DROP POLICY IF EXISTS "task_template_questions_delete" ON public.task_template_questions;
CREATE POLICY "task_template_questions_insert" ON public.task_template_questions FOR INSERT TO authenticated
  WITH CHECK (public.is_elevated());
CREATE POLICY "task_template_questions_update" ON public.task_template_questions FOR UPDATE TO authenticated
  USING (public.is_elevated()) WITH CHECK (public.is_elevated());
CREATE POLICY "task_template_questions_delete" ON public.task_template_questions FOR DELETE TO authenticated
  USING (public.is_elevated());

-- task_instances
DROP POLICY IF EXISTS "task_instances_select_pic" ON public.task_instances;
DROP POLICY IF EXISTS "task_instances_select_admin" ON public.task_instances;
DROP POLICY IF EXISTS "task_instances_insert" ON public.task_instances;
DROP POLICY IF EXISTS "task_instances_update_pic" ON public.task_instances;
DROP POLICY IF EXISTS "task_instances_update_admin" ON public.task_instances;
CREATE POLICY "task_instances_select_pic" ON public.task_instances FOR SELECT TO authenticated
  USING (
    public.is_manager() AND (
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = task_instances.assignee_profile_id
          AND (p.branch_id = public.user_branch_id() OR p.department_id = public.user_department_id())
      )
    )
  );
CREATE POLICY "task_instances_select_admin" ON public.task_instances FOR SELECT TO authenticated
  USING (public.is_super_admin());
CREATE POLICY "task_instances_insert" ON public.task_instances FOR INSERT TO authenticated
  WITH CHECK (public.is_elevated());
CREATE POLICY "task_instances_update_pic" ON public.task_instances FOR UPDATE TO authenticated
  USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "task_instances_update_admin" ON public.task_instances FOR UPDATE TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- task_instance_answers
DROP POLICY IF EXISTS "task_instance_answers_select" ON public.task_instance_answers;
CREATE POLICY "task_instance_answers_select" ON public.task_instance_answers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM task_instances ti
      WHERE ti.id = task_instance_answers.task_instance_id
        AND (
          ti.assignee_profile_id = auth.uid()
          OR public.is_elevated()
        )
    )
  );

-- task_user_stats
DROP POLICY IF EXISTS "task_user_stats_select_admin" ON public.task_user_stats;
DROP POLICY IF EXISTS "task_user_stats_all_admin" ON public.task_user_stats;
CREATE POLICY "task_user_stats_select_admin" ON public.task_user_stats FOR SELECT TO authenticated
  USING (public.is_super_admin());
CREATE POLICY "task_user_stats_all_admin" ON public.task_user_stats FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- point_settings
DROP POLICY IF EXISTS "point_settings_admin" ON public.point_settings;
CREATE POLICY "point_settings_admin" ON public.point_settings FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- projects / tasks (005) — replace admin/pic checks
DROP POLICY IF EXISTS "projects_admin_select" ON public.projects;
DROP POLICY IF EXISTS "projects_manager_select" ON public.projects;
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
DROP POLICY IF EXISTS "projects_update" ON public.projects;
DROP POLICY IF EXISTS "projects_delete" ON public.projects;

CREATE POLICY "projects_admin_select" ON public.projects FOR SELECT TO authenticated
  USING (public.is_super_admin());
CREATE POLICY "projects_manager_select" ON public.projects FOR SELECT TO authenticated
  USING (
    public.is_manager()
    AND department_id = (SELECT private.get_user_department_id())
  );
CREATE POLICY "projects_insert" ON public.projects FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_manager()
      AND department_id = (SELECT private.get_user_department_id())
    )
  );
CREATE POLICY "projects_update" ON public.projects FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (public.is_manager() AND department_id = (SELECT private.get_user_department_id()))
  )
  WITH CHECK (
    public.is_super_admin()
    OR (public.is_manager() AND department_id = (SELECT private.get_user_department_id()))
  );
CREATE POLICY "projects_delete" ON public.projects FOR DELETE TO authenticated
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "project_members_insert" ON public.project_members;
DROP POLICY IF EXISTS "project_members_delete" ON public.project_members;
CREATE POLICY "project_members_insert" ON public.project_members FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_manager()
      AND EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_members.project_id
          AND p.department_id = (SELECT private.get_user_department_id())
      )
    )
  );
CREATE POLICY "project_members_delete" ON public.project_members FOR DELETE TO authenticated
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "tasks_insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete" ON public.tasks;
CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_manager()
      AND department_id = (SELECT private.get_user_department_id())
    )
  );
CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE TO authenticated
  USING (private.can_edit_task(id))
  WITH CHECK (private.can_edit_task(id));
CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE TO authenticated
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "task_attachments_delete" ON public.task_attachments;
CREATE POLICY "task_attachments_delete" ON public.task_attachments FOR DELETE TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "task_comments_delete" ON public.task_comments;
CREATE POLICY "task_comments_delete" ON public.task_comments FOR DELETE TO authenticated
  USING (
    author_id = auth.uid()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "task_attachments_storage_delete" ON storage.objects;
CREATE POLICY "task_attachments_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'task-files'
    AND (
      (SELECT auth.uid()) = owner
      OR public.is_super_admin()
    )
  );
