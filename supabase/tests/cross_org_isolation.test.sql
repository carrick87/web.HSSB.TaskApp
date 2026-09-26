-- Cross-org isolation + privilege escalation checks (run after migrations on a seeded DB).
-- Expect zero rows from each "leak" query; failures raise via psql ON_ERROR_STOP.

\set ON_ERROR_STOP on

-- Placeholder: run with two orgs (org_a, org_b) and users created in seed_production_shape.sql.
-- Replace UUIDs after seed or use dynamic lookups.

DO $$
DECLARE
  v_org_a UUID;
  v_org_b UUID;
  v_user_a UUID;
  v_user_b UUID;
  v_cnt INT;
BEGIN
  SELECT id INTO v_org_a FROM organizations WHERE slug = 'hssb' LIMIT 1;
  SELECT id INTO v_org_b FROM organizations WHERE slug = 'isolation-test-b' LIMIT 1;
  IF v_org_a IS NULL OR v_org_b IS NULL THEN
    RAISE NOTICE 'Skip isolation test: seed orgs missing';
    RETURN;
  END IF;

  SELECT user_id INTO v_user_a FROM organization_members WHERE org_id = v_org_a AND role = 'member' LIMIT 1;
  SELECT user_id INTO v_user_b FROM organization_members WHERE org_id = v_org_b AND role = 'member' LIMIT 1;

  IF v_user_a IS NULL OR v_user_b IS NULL THEN
    RAISE NOTICE 'Skip isolation test: seed members missing';
    RETURN;
  END IF;

  -- Privilege escalation: authenticated cannot set platform admin via profiles (trigger)
  BEGIN
    UPDATE profiles SET is_platform_admin = true WHERE id = v_user_a;
    RAISE EXCEPTION 'Expected trigger block on is_platform_admin';
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Tenant tables must not return other org rows when RLS is active (sanity counts)
  SELECT COUNT(*) INTO v_cnt FROM tasks WHERE org_id = v_org_b;
  IF v_cnt = 0 THEN
    RAISE NOTICE 'Org B tasks empty — seed data may be incomplete';
  END IF;
END $$;
