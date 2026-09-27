\set ON_ERROR_STOP on
DO $$
DECLARE
  v_cnt INT;
BEGIN
  SELECT COUNT(*) INTO v_cnt FROM migration_state WHERE key = '011_hssb_profile_backfill';
  IF v_cnt <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one 011_hssb_profile_backfill marker, got %', v_cnt;
  END IF;

  SELECT COUNT(*) INTO v_cnt
  FROM organization_members om
  JOIN organizations o ON o.id = om.org_id AND o.slug = 'hssb'
  JOIN profiles p ON p.id = om.user_id
  WHERE p.username LIKE 'demo\_%' ESCAPE '\' AND om.role = 'owner';
  IF v_cnt <> 0 THEN
    RAISE EXCEPTION 'demo_* users must not be HSSB owners (found %)', v_cnt;
  END IF;

  SELECT COUNT(*) INTO v_cnt
  FROM organization_members om
  JOIN organizations o ON o.id = om.org_id AND o.slug = 'hssb'
  JOIN profiles p ON p.id = om.user_id
  WHERE p.username = 'demo_manager' AND om.role = 'manager';
  IF v_cnt <> 1 THEN
    RAISE EXCEPTION 'demo_manager must be HSSB manager';
  END IF;

  SELECT COUNT(*) INTO v_cnt
  FROM profiles WHERE username = 'demo_admin' AND role = 'user';
  IF v_cnt <> 1 THEN
    RAISE EXCEPTION 'demo_admin global role must be user';
  END IF;

  SELECT COUNT(*) INTO v_cnt
  FROM organization_members om
  JOIN organizations o ON o.id = om.org_id AND o.slug = 'hssb'
  JOIN profiles p ON p.id = om.user_id
  WHERE p.username = 'admin' AND om.role = 'owner';
  IF v_cnt <> 1 THEN
    RAISE EXCEPTION 'admin user must be HSSB owner';
  END IF;
END $$;
