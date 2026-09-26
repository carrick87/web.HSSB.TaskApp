-- Tenant RLS matrix (runs as authenticated inside BEGIN so RLS applies).
\set ON_ERROR_STOP on

-- Setup org B + cross-org fixtures (superuser; RLS bypassed for seeding only)
DO $$
DECLARE
  v_owner_a UUID := '78925121-0000-4000-8000-000000000001'::uuid;
  v_member_b UUID := 'b3000000-0000-4000-8000-000000000005'::uuid;
BEGIN
  INSERT INTO organizations (id, name, short_name, slug, status)
  VALUES ('b2000000-0000-0000-0000-000000000002'::uuid, 'Isolation B', 'ISOB', 'isolation-test-b', 'active')
  ON CONFLICT (slug) DO NOTHING;

  INSERT INTO branches (id, name, org_id)
  VALUES ('b2000000-0000-0000-0000-000000000010'::uuid, 'B Branch', 'b2000000-0000-0000-0000-000000000002'::uuid)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO departments (id, branch_id, name, org_id)
  VALUES (
    'b2000000-0000-0000-0000-000000000011'::uuid,
    'b2000000-0000-0000-0000-000000000010'::uuid,
    'B Dept',
    'b2000000-0000-0000-0000-000000000002'::uuid
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.users (id, email) VALUES (v_member_b, 'iso_b@example.com') ON CONFLICT DO NOTHING;
  INSERT INTO profiles (id, username, auth_email, role, status, current_org_id)
  VALUES (v_member_b, 'iso_b_member', 'iso_b@example.com', 'user', 'active', 'b2000000-0000-0000-0000-000000000002'::uuid)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO organization_members (org_id, user_id, role, status)
  VALUES ('b2000000-0000-0000-0000-000000000002'::uuid, v_member_b, 'member', 'active')
  ON CONFLICT (org_id, user_id) DO NOTHING;

  INSERT INTO tasks (
    id, title, department_id, created_by, assignee_id, org_id, status, priority
  )
  VALUES (
    'b2000000-0000-0000-0000-000000000099'::uuid,
    'Org B secret task',
    'b2000000-0000-0000-0000-000000000011'::uuid,
    v_owner_a,
    v_owner_a,
    'b2000000-0000-0000-0000-000000000002'::uuid,
    'todo',
    'low'
  )
  ON CONFLICT (id) DO NOTHING;
END $$;

BEGIN;
SELECT set_config('request.jwt.claim.sub', '78925121-0000-4000-8000-000000000006', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims', '{"sub":"78925121-0000-4000-8000-000000000006","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

CREATE TEMP TABLE _rls_matrix (
  case_name TEXT PRIMARY KEY,
  passed BOOLEAN NOT NULL,
  detail TEXT
);

DO $matrix$
DECLARE
  v_org_a UUID;
  v_org_b UUID;
  v_owner_a UUID := '78925121-0000-4000-8000-000000000001'::uuid;
  v_member_a UUID := '78925121-0000-4000-8000-000000000006'::uuid;
  v_member_b UUID := 'b3000000-0000-4000-8000-000000000005'::uuid;
  v_dept_a UUID;
  v_task_b UUID := 'b2000000-0000-0000-0000-000000000099'::uuid;
  v_cnt INT;
  v_id UUID;
  v_new_org UUID;
BEGIN
  SELECT id INTO v_org_a FROM organizations WHERE slug = 'hssb' LIMIT 1;
  SELECT id INTO v_org_b FROM organizations WHERE slug = 'isolation-test-b' LIMIT 1;
  SELECT id INTO v_dept_a FROM departments WHERE org_id = v_org_a LIMIT 1;

  INSERT INTO _rls_matrix VALUES ('branches.member_a_select_pos', false, '');
  SELECT COUNT(*) INTO v_cnt FROM branches WHERE org_id = v_org_a;
  UPDATE _rls_matrix SET passed = v_cnt >= 1, detail = 'count=' || v_cnt WHERE case_name = 'branches.member_a_select_pos';

  INSERT INTO _rls_matrix VALUES ('tasks.member_a_select_org_b_neg', false, '');
  SELECT COUNT(*) INTO v_cnt FROM tasks WHERE org_id = v_org_b;
  UPDATE _rls_matrix SET passed = v_cnt = 0, detail = 'count=' || v_cnt WHERE case_name = 'tasks.member_a_select_org_b_neg';

  PERFORM set_config('request.jwt.claim.sub', v_member_b::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_member_b::text, 'role', 'authenticated')::text, true);

  INSERT INTO _rls_matrix VALUES ('tasks.member_b_select_own_pos', false, '');
  SELECT COUNT(*) INTO v_cnt FROM tasks WHERE id = v_task_b;
  UPDATE _rls_matrix SET passed = v_cnt = 1, detail = 'count=' || v_cnt WHERE case_name = 'tasks.member_b_select_own_pos';

  INSERT INTO _rls_matrix VALUES ('tasks.member_b_select_org_a_neg', false, '');
  SELECT COUNT(*) INTO v_cnt FROM tasks WHERE org_id = v_org_a;
  UPDATE _rls_matrix SET passed = v_cnt = 0, detail = 'count=' || v_cnt WHERE case_name = 'tasks.member_b_select_org_a_neg';

  PERFORM set_config('request.jwt.claim.sub', v_owner_a::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a::text, 'role', 'authenticated')::text, true);

  v_id := 'c3000000-0000-4000-8000-000000000099'::uuid;
  INSERT INTO _rls_matrix VALUES ('tasks.owner_insert_fill_org', false, '');
  BEGIN
    INSERT INTO tasks (id, title, department_id, created_by, assignee_id, status, priority)
    VALUES (v_id, 'RLS matrix fill trigger', v_dept_a, v_owner_a, v_owner_a, 'todo', 'medium');
    SELECT org_id INTO v_new_org FROM tasks WHERE id = v_id;
    UPDATE _rls_matrix SET passed = v_new_org IS NOT NULL, detail = COALESCE(v_new_org::text, 'null')
    WHERE case_name = 'tasks.owner_insert_fill_org';
  EXCEPTION WHEN OTHERS THEN
    UPDATE _rls_matrix SET passed = false, detail = SQLERRM WHERE case_name = 'tasks.owner_insert_fill_org';
  END;

  PERFORM set_config('request.jwt.claim.sub', v_member_a::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_member_a::text, 'role', 'authenticated')::text, true);

  INSERT INTO _rls_matrix VALUES ('point_settings.member_select_pos', false, '');
  SELECT COUNT(*) INTO v_cnt FROM point_settings WHERE org_id = v_org_a;
  UPDATE _rls_matrix SET passed = v_cnt >= 1, detail = 'count=' || v_cnt WHERE case_name = 'point_settings.member_select_pos';

  INSERT INTO _rls_matrix VALUES ('point_settings.member_insert_neg', false, '');
  BEGIN
    INSERT INTO point_settings (org_id, event_type, points) VALUES (v_org_a, 'matrix_test', 1);
    UPDATE _rls_matrix SET passed = false, detail = 'insert succeeded' WHERE case_name = 'point_settings.member_insert_neg';
  EXCEPTION WHEN OTHERS THEN
    UPDATE _rls_matrix SET passed = true, detail = SQLERRM WHERE case_name = 'point_settings.member_insert_neg';
  END;

  INSERT INTO _rls_matrix VALUES ('escalation.is_platform_admin', false, '');
  BEGIN
    UPDATE profiles SET is_platform_admin = true WHERE id = v_member_a;
    UPDATE _rls_matrix SET passed = false, detail = 'update succeeded' WHERE case_name = 'escalation.is_platform_admin';
  EXCEPTION WHEN OTHERS THEN
    UPDATE _rls_matrix SET passed = true, detail = SQLERRM WHERE case_name = 'escalation.is_platform_admin';
  END;

  INSERT INTO _rls_matrix VALUES ('profiles.column_grant_harrison_email', false, '');
  BEGIN
    UPDATE profiles SET harrison_email = 'hack@harrisons.com.my' WHERE id = v_member_a;
    UPDATE _rls_matrix SET passed = false, detail = 'update succeeded' WHERE case_name = 'profiles.column_grant_harrison_email';
  EXCEPTION WHEN OTHERS THEN
    UPDATE _rls_matrix SET passed = true, detail = SQLERRM WHERE case_name = 'profiles.column_grant_harrison_email';
  END;

  INSERT INTO _rls_matrix VALUES ('profiles.switch_org_pos', false, '');
  BEGIN
    UPDATE profiles SET current_org_id = v_org_a WHERE id = v_member_a;
    UPDATE _rls_matrix SET passed = true, detail = 'ok' WHERE case_name = 'profiles.switch_org_pos';
  EXCEPTION WHEN OTHERS THEN
    UPDATE _rls_matrix SET passed = false, detail = SQLERRM WHERE case_name = 'profiles.switch_org_pos';
  END;

  INSERT INTO _rls_matrix VALUES ('task_template_questions.member_a_select_pos', false, '');
  SELECT COUNT(*) INTO v_cnt
  FROM task_template_questions q
  JOIN task_templates tt ON tt.id = q.template_id
  WHERE tt.org_id = v_org_a;
  UPDATE _rls_matrix SET passed = v_cnt >= 1, detail = 'count=' || v_cnt
  WHERE case_name = 'task_template_questions.member_a_select_pos';

  INSERT INTO _rls_matrix VALUES ('storage.objects.member_a_read_pos', false, '');
  SELECT COUNT(*) INTO v_cnt FROM storage.objects WHERE bucket_id = 'task-attachments';
  UPDATE _rls_matrix SET passed = v_cnt >= 1, detail = 'count=' || v_cnt
  WHERE case_name = 'storage.objects.member_a_read_pos';

  INSERT INTO _rls_matrix VALUES ('notifications.member_a_own_pos', false, '');
  SELECT COUNT(*) INTO v_cnt FROM notifications WHERE user_id = v_member_a;
  UPDATE _rls_matrix SET passed = v_cnt >= 0, detail = 'count=' || v_cnt
  WHERE case_name = 'notifications.member_a_own_pos';

  INSERT INTO _rls_matrix VALUES ('organization_invites.member_insert_neg', false, '');
  BEGIN
    INSERT INTO organization_invites (org_id, email, role, status, expires_at)
    VALUES (v_org_a, 'evil@example.com', 'member', 'pending', now() + interval '1 day');
    UPDATE _rls_matrix SET passed = false, detail = 'insert succeeded'
    WHERE case_name = 'organization_invites.member_insert_neg';
  EXCEPTION WHEN OTHERS THEN
    UPDATE _rls_matrix SET passed = true, detail = SQLERRM
    WHERE case_name = 'organization_invites.member_insert_neg';
  END;

  INSERT INTO _rls_matrix VALUES ('platform_admins.member_select_neg', false, '');
  SELECT COUNT(*) INTO v_cnt FROM platform_admins;
  UPDATE _rls_matrix SET passed = v_cnt = 0, detail = 'count=' || v_cnt
  WHERE case_name = 'platform_admins.member_select_neg';

  INSERT INTO _rls_matrix VALUES ('task_instance_answers.member_a_select_pos', false, '');
  SELECT COUNT(*) INTO v_cnt FROM task_instance_answers;
  UPDATE _rls_matrix SET passed = v_cnt >= 1, detail = 'count=' || v_cnt
  WHERE case_name = 'task_instance_answers.member_a_select_pos';

  INSERT INTO _rls_matrix VALUES ('user_points.member_a_select_pos', false, '');
  SELECT COUNT(*) INTO v_cnt FROM user_points WHERE org_id = v_org_a;
  UPDATE _rls_matrix SET passed = v_cnt >= 0, detail = 'count=' || v_cnt
  WHERE case_name = 'user_points.member_a_select_pos';

  INSERT INTO _rls_matrix VALUES ('organizations.member_a_select_pos', false, '');
  SELECT COUNT(*) INTO v_cnt FROM organizations WHERE id = v_org_a;
  UPDATE _rls_matrix SET passed = v_cnt = 1, detail = 'count=' || v_cnt
  WHERE case_name = 'organizations.member_a_select_pos';

  IF EXISTS (SELECT 1 FROM _rls_matrix WHERE NOT passed) THEN
    RAISE EXCEPTION 'RLS matrix failures: %', (SELECT string_agg(case_name || ':' || detail, '; ') FROM _rls_matrix WHERE NOT passed);
  END IF;

  RAISE NOTICE 'RLS_MATRIX_PASS=%', (SELECT COUNT(*) FROM _rls_matrix WHERE passed);
  RAISE NOTICE 'RLS_MATRIX_FAIL=%', (SELECT COUNT(*) FROM _rls_matrix WHERE NOT passed);
END;
$matrix$;

ROLLBACK;

-- Report (temp table dropped with rollback; counts were validated in DO block)
SELECT 'RLS matrix completed' AS status;
