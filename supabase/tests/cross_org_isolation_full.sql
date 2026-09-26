-- Full cross-org isolation + privilege escalation (requires post-017 schema).
\set ON_ERROR_STOP on

DO $$
DECLARE
  v_org_a UUID;
  v_org_b UUID;
  v_user_a UUID := '78925121-0000-4000-8000-000000000005'::uuid;
  v_visible INT;
BEGIN
  SELECT id INTO v_org_a FROM organizations WHERE slug = 'hssb' LIMIT 1;
  IF v_org_a IS NULL THEN RAISE EXCEPTION 'HSSB org missing'; END IF;

  INSERT INTO organizations (id, name, short_name, slug, status)
  VALUES ('b2000000-0000-0000-0000-000000000002'::uuid, 'Isolation B', 'ISOB', 'isolation-test-b', 'active')
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

  SELECT id INTO v_org_b FROM organizations WHERE slug = 'isolation-test-b';

  INSERT INTO branches (id, name, org_id)
  VALUES ('b2000000-0000-0000-0000-000000000010'::uuid, 'B Branch', v_org_b)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO departments (id, branch_id, name, org_id)
  VALUES (
    'b2000000-0000-0000-0000-000000000011'::uuid,
    'b2000000-0000-0000-0000-000000000010'::uuid,
    'B Dept',
    v_org_b
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO tasks (id, title, department_id, created_by, assignee_id, org_id, status, priority)
  VALUES (
    'b2000000-0000-0000-0000-000000000099'::uuid,
    'Org B secret task',
    'b2000000-0000-0000-0000-000000000011'::uuid,
    '78925121-0000-4000-8000-000000000001'::uuid,
    '78925121-0000-4000-8000-000000000001'::uuid,
    v_org_b,
    'todo',
    'low'
  )
  ON CONFLICT (id) DO NOTHING;

  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_a, 'role', 'authenticated')::text, true);

  BEGIN
    UPDATE profiles SET role = 'super_admin' WHERE id = v_user_a;
    RAISE EXCEPTION 'Expected block updating role';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%protected profile fields%' THEN RAISE; END IF;
  END;

  BEGIN
    UPDATE profiles SET is_platform_admin = true WHERE id = v_user_a;
    RAISE EXCEPTION 'Expected block updating is_platform_admin';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%protected profile fields%' THEN RAISE; END IF;
  END;

  BEGIN
    UPDATE profiles SET current_org_id = 'b3000000-0000-0000-0000-000000000003'::uuid WHERE id = v_user_a;
    RAISE EXCEPTION 'Expected block foreign current_org_id without membership';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%must be an organization you belong to%' AND SQLERRM NOT LIKE '%protected profile fields%' THEN
      RAISE;
    END IF;
  END;
END $$;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '78925121-0000-4000-8000-000000000005', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims', '{"sub":"78925121-0000-4000-8000-000000000005","role":"authenticated"}', true);

DO $$
DECLARE v_visible INT;
BEGIN
  SELECT COUNT(*) INTO v_visible FROM tasks WHERE org_id = 'b2000000-0000-0000-0000-000000000002'::uuid;
  IF v_visible <> 0 THEN
    RAISE EXCEPTION 'Cross-org read leak: member of HSSB saw % tasks in org B', v_visible;
  END IF;
END $$;
ROLLBACK;
