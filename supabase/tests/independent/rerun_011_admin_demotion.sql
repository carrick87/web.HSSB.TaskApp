\set ON_ERROR_STOP on
-- Re-applying 011 must not re-promote a user who was demoted from owner.
BEGIN;

INSERT INTO public.organization_members (org_id, user_id, role, status)
SELECT o.id, p.id, 'owner', 'active'
FROM public.organizations o, public.profiles p
WHERE o.slug = 'hssb' AND p.username = 'demo_manager'
ON CONFLICT (org_id, user_id) DO UPDATE SET role = 'owner', status = 'active';

UPDATE public.organization_members om
SET role = 'admin'
FROM public.profiles p, public.organizations o
WHERE p.username = 'admin'
  AND om.user_id = p.id
  AND om.org_id = o.id
  AND o.slug = 'hssb';

\i /workspace/supabase/migrations/011_multitenant_org_id_hssb_backfill.sql

DO $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT om.role INTO v_role
  FROM organization_members om
  JOIN organizations o ON o.id = om.org_id AND o.slug = 'hssb'
  JOIN profiles p ON p.id = om.user_id
  WHERE p.username = 'admin';

  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION '011 re-run must not re-promote demoted admin (role=%)', v_role;
  END IF;
END $$;

ROLLBACK;
