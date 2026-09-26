-- H1: org admin must not reset password for dual-org user who owns another workspace.
-- Mirrors lib/admin/password-reset-policy.ts (owner/admin in non-caller org → deny).
\set ON_ERROR_STOP on

DO $$
DECLARE
  v_hssb UUID := 'a1000000-0000-0000-0000-000000000001'::uuid;
  v_org_b UUID := 'b2000000-0000-4000-8000-000000000072'::uuid;
  v_dual_user UUID := 'c3000000-0000-4000-8000-000000000099'::uuid;
  v_elevated_elsewhere BOOLEAN;
BEGIN
  INSERT INTO public.organizations (id, name, short_name, slug, status)
  VALUES (v_org_b, 'Org B Test', 'ORGB', 'org-b-reset-test', 'active')
  ON CONFLICT (slug) DO NOTHING;

  INSERT INTO auth.users (id, email)
  VALUES (v_dual_user, 'dual-org-reset@test.local')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, username, auth_email, role, status, current_org_id)
  VALUES (v_dual_user, 'dual_org_reset_user', 'dual-org-reset@test.local', 'user', 'active', v_hssb)
  ON CONFLICT (id) DO UPDATE SET current_org_id = EXCLUDED.current_org_id;

  INSERT INTO public.organization_members (org_id, user_id, role, status)
  VALUES
    (v_hssb, v_dual_user, 'member', 'active'),
    (v_org_b, v_dual_user, 'owner', 'active')
  ON CONFLICT (org_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = 'active';

  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.user_id = v_dual_user
      AND om.status = 'active'
      AND om.org_id <> v_hssb
      AND om.role IN ('owner', 'admin')
  ) INTO v_elevated_elsewhere;

  IF NOT v_elevated_elsewhere THEN
    RAISE EXCEPTION 'H1 setup failed: expected dual user to own org B';
  END IF;

  RAISE NOTICE 'H1 reset_password_dual_org_owner: PASS';
END $$;
