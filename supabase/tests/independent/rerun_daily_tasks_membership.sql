-- Daily task generation uses organization_members branch/department (matches members API).
\set ON_ERROR_STOP on

DO $$
DECLARE
  v_hssb UUID := 'a1000000-0000-0000-0000-000000000001'::uuid;
  v_branch UUID;
  v_dept_y UUID;
  v_dept_x UUID;
  v_member UUID := 'e5000000-0000-4000-8000-000000000201'::uuid;
  v_template_branch UUID;
  v_template_dept UUID;
  v_ids_membership UUID[];
  v_mismatch INT;
  v_old INT;
  v_new INT;
BEGIN
  SELECT id INTO v_branch FROM public.branches WHERE org_id = v_hssb ORDER BY name LIMIT 1;
  IF v_branch IS NULL THEN
    RAISE NOTICE 'Skip daily_tasks_membership: no branch';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_mismatch
  FROM public.organization_members om
  JOIN public.profiles p ON p.id = om.user_id
  WHERE om.org_id = v_hssb
    AND (
      om.branch_id IS DISTINCT FROM p.branch_id
      OR om.department_id IS DISTINCT FROM p.department_id
    );

  IF v_mismatch > 0 THEN
    RAISE EXCEPTION 'daily_tasks parity: % HSSB memberships out of sync with profiles (run 011 sync)', v_mismatch;
  END IF;

  SELECT id INTO v_dept_x FROM public.departments WHERE org_id = v_hssb AND branch_id = v_branch ORDER BY name LIMIT 1;
  IF v_dept_x IS NULL THEN
    RAISE NOTICE 'Skip daily_tasks_membership: no department';
    RETURN;
  END IF;

  INSERT INTO public.departments (id, org_id, branch_id, name)
  VALUES ('e5000000-0000-4000-8000-000000000301'::uuid, v_hssb, v_branch, 'Scope Test Dept Y')
  ON CONFLICT DO NOTHING;
  v_dept_y := 'e5000000-0000-4000-8000-000000000301'::uuid;

  INSERT INTO auth.users (id, email) VALUES (v_member, 'daily-mbr@test.local') ON CONFLICT DO NOTHING;
  INSERT INTO public.profiles (id, username, auth_email, role, status, current_org_id, branch_id, department_id)
  VALUES (v_member, 'daily_mbr_scope', 'daily-mbr@test.local', 'user', 'active', v_hssb, v_branch, v_dept_x)
  ON CONFLICT (id) DO UPDATE SET branch_id = v_branch, department_id = v_dept_x;

  -- Membership-only location (simulates Settings > Members): profile still on dept X, membership on Y
  INSERT INTO public.organization_members (org_id, user_id, role, status, branch_id, department_id)
  VALUES (v_hssb, v_member, 'member', 'active', v_branch, v_dept_y)
  ON CONFLICT (org_id, user_id) DO UPDATE
    SET branch_id = EXCLUDED.branch_id,
        department_id = EXCLUDED.department_id,
        status = 'active';

  INSERT INTO public.task_templates (
    id, org_id, title, recurrence_type, is_active, assign_to_type, assign_to_id, requires_verification
  )
  VALUES
    ('e5000000-0000-4000-8000-000000000401'::uuid, v_hssb, 'Branch scope tmpl', 'daily', true, 'branch', v_branch, false),
    ('e5000000-0000-4000-8000-000000000402'::uuid, v_hssb, 'Dept Y tmpl', 'daily', true, 'department', v_dept_y, false),
    ('e5000000-0000-4000-8000-000000000403'::uuid, v_hssb, 'Dept X tmpl', 'daily', true, 'department', v_dept_x, false)
  ON CONFLICT (id) DO UPDATE SET assign_to_id = EXCLUDED.assign_to_id, is_active = true;

  v_template_branch := 'e5000000-0000-4000-8000-000000000401'::uuid;
  v_template_dept := 'e5000000-0000-4000-8000-000000000402'::uuid;

  -- New member with branch on membership gets branch templates
  SELECT array_agg(om.user_id) INTO v_ids_membership
  FROM public.organization_members om
  JOIN public.organizations o ON o.id = om.org_id AND o.status = 'active'
  WHERE om.org_id = v_hssb AND om.status = 'active' AND om.branch_id = v_branch;

  IF NOT (v_member = ANY (v_ids_membership)) THEN
    RAISE EXCEPTION 'daily_tasks: member missing from branch membership scope';
  END IF;

  -- Department Y template includes member; department X does not
  SELECT array_agg(om.user_id) INTO v_ids_membership
  FROM public.organization_members om
  JOIN public.organizations o ON o.id = om.org_id AND o.status = 'active'
  WHERE om.org_id = v_hssb AND om.status = 'active' AND om.department_id = v_dept_y;

  IF NOT (v_member = ANY (v_ids_membership)) THEN
    RAISE EXCEPTION 'daily_tasks: member should match dept Y via membership';
  END IF;

  SELECT array_agg(om.user_id) INTO v_ids_membership
  FROM public.organization_members om
  JOIN public.organizations o ON o.id = om.org_id AND o.status = 'active'
  WHERE om.org_id = v_hssb AND om.status = 'active' AND om.department_id = v_dept_x;

  IF v_member = ANY (COALESCE(v_ids_membership, ARRAY[]::UUID[])) THEN
    RAISE EXCEPTION 'daily_tasks: member must not match dept X after move to Y';
  END IF;

  RAISE NOTICE 'daily_tasks_membership: PASS';
END $$;
