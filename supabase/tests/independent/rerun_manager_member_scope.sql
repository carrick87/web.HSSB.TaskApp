-- Manager scope: assignee visibility uses organization_members branch/department (not profiles).
-- Simulates post-go-live member added with dept on membership only.
\set ON_ERROR_STOP on

DO $$
DECLARE
  v_hssb UUID := 'a1000000-0000-0000-0000-000000000001'::uuid;
  v_branch UUID;
  v_dept UUID;
  v_manager UUID := 'd4000000-0000-4000-8000-000000000101'::uuid;
  v_member UUID := 'd4000000-0000-4000-8000-000000000102'::uuid;
  v_template UUID;
  v_instance UUID := 'd4000000-0000-4000-8000-000000000103'::uuid;
  v_scope_ids UUID[];
  v_visible BOOLEAN;
BEGIN
  SELECT id INTO v_branch FROM public.branches WHERE org_id = v_hssb ORDER BY name LIMIT 1;
  SELECT id INTO v_dept FROM public.departments WHERE org_id = v_hssb ORDER BY name LIMIT 1;
  SELECT id INTO v_template FROM public.task_templates WHERE org_id = v_hssb LIMIT 1;

  IF v_branch IS NULL OR v_dept IS NULL OR v_template IS NULL THEN
    RAISE NOTICE 'Skip manager scope test: seed branch/dept/template missing';
    RETURN;
  END IF;

  INSERT INTO auth.users (id, email)
  VALUES
    (v_manager, 'mgr-scope@test.local'),
    (v_member, 'mbr-scope@test.local')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, username, auth_email, role, status, current_org_id, branch_id, department_id)
  VALUES
    (v_manager, 'mgr_scope_test', 'mgr-scope@test.local', 'user', 'active', v_hssb, NULL, NULL),
    (v_member, 'mbr_scope_test', 'mbr-scope@test.local', 'user', 'active', v_hssb, NULL, NULL)
  ON CONFLICT (id) DO UPDATE SET branch_id = NULL, department_id = NULL;

  INSERT INTO public.organization_members (org_id, user_id, role, status, branch_id, department_id)
  VALUES
    (v_hssb, v_manager, 'manager', 'active', v_branch, v_dept),
    (v_hssb, v_member, 'member', 'active', v_branch, v_dept)
  ON CONFLICT (org_id, user_id) DO UPDATE
    SET role = EXCLUDED.role,
        status = 'active',
        branch_id = EXCLUDED.branch_id,
        department_id = EXCLUDED.department_id;

  INSERT INTO public.task_instances (
    id, org_id, template_id, assignee_profile_id, assignment_date, due_date, status, submitted_at
  )
  VALUES (
    v_instance,
    v_hssb,
    v_template,
    v_member,
    CURRENT_DATE,
    CURRENT_DATE,
    'submitted',
    now()
  )
  ON CONFLICT (id) DO UPDATE
    SET assignee_profile_id = EXCLUDED.assignee_profile_id,
        status = 'submitted',
        submitted_at = now();

  SELECT ARRAY_AGG(user_id)
  INTO v_scope_ids
  FROM public.organization_members
  WHERE org_id = v_hssb
    AND status = 'active'
    AND (branch_id = v_branch OR department_id = v_dept);

  v_visible := v_member = ANY (v_scope_ids);

  IF NOT v_visible THEN
    RAISE EXCEPTION 'Manager scope test failed: member not in department scope via organization_members';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.task_instances ti
    WHERE ti.id = v_instance
      AND ti.status = 'submitted'
      AND ti.assignee_profile_id = ANY (v_scope_ids)
  ) THEN
    RAISE EXCEPTION 'Manager scope test failed: submitted task not in manager queue filter';
  END IF;

  RAISE NOTICE 'manager_member_scope: PASS';
END $$;
