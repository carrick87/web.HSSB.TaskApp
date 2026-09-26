-- 011: Add org_id to tenant tables + HSSB backfill (idempotent where noted).
-- Pre-check / post-check queries: docs/MULTITENANT_MIGRATION.md

-- Fixed UUID for legacy HSSB org (stable across re-runs)
-- pre-check: SELECT COUNT(*) FROM profiles;

DO $$
DECLARE
  v_hssb_id UUID := 'a1000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  INSERT INTO public.organizations (id, name, short_name, slug, status)
  VALUES (v_hssb_id, 'Harrison Sabah Sdn Bhd', 'HSSB', 'hssb', 'active')
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;
END $$;

-- Helper to add org_id column
CREATE OR REPLACE FUNCTION task_app._add_org_id(p_table regclass)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  t text := p_table::text;
BEGIN
  EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE', t);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_org ON %s(org_id)', replace(t, 'public.', ''), t);
END;
$$;

SELECT task_app._add_org_id('public.branches'::regclass);
SELECT task_app._add_org_id('public.departments'::regclass);
SELECT task_app._add_org_id('public.task_templates'::regclass);
SELECT task_app._add_org_id('public.task_instances'::regclass);
SELECT task_app._add_org_id('public.projects'::regclass);
SELECT task_app._add_org_id('public.tasks'::regclass);
SELECT task_app._add_org_id('public.point_settings'::regclass);
SELECT task_app._add_org_id('public.user_points'::regclass);

ALTER TABLE public.task_user_stats
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Backfill all rows to HSSB org
DO $$
DECLARE
  v_hssb_id UUID;
BEGIN
  SELECT id INTO v_hssb_id FROM public.organizations WHERE slug = 'hssb' LIMIT 1;
  IF v_hssb_id IS NULL THEN
    RAISE EXCEPTION 'HSSB organization row missing';
  END IF;

  UPDATE public.branches SET org_id = v_hssb_id WHERE org_id IS NULL;
  UPDATE public.departments d SET org_id = v_hssb_id WHERE org_id IS NULL;
  UPDATE public.task_templates SET org_id = v_hssb_id WHERE org_id IS NULL;
  UPDATE public.task_instances SET org_id = v_hssb_id WHERE org_id IS NULL;
  UPDATE public.projects SET org_id = v_hssb_id WHERE org_id IS NULL;
  UPDATE public.tasks SET org_id = v_hssb_id WHERE org_id IS NULL;
  UPDATE public.point_settings SET org_id = v_hssb_id WHERE org_id IS NULL;
  UPDATE public.user_points SET org_id = v_hssb_id WHERE org_id IS NULL;
  UPDATE public.task_user_stats SET org_id = v_hssb_id WHERE org_id IS NULL;

  -- Memberships from legacy profiles.role (admin/super_admin→owner, pic/manager→manager, staff/user→member)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'status') THEN
    INSERT INTO public.organization_members (org_id, user_id, role, branch_id, department_id, status)
    SELECT v_hssb_id, p.id,
      CASE WHEN p.role IN ('admin', 'super_admin') THEN 'owner' WHEN p.role IN ('pic', 'manager') THEN 'manager' ELSE 'member' END,
      p.branch_id, p.department_id, 'active'
    FROM public.profiles p
    ON CONFLICT (org_id, user_id) DO UPDATE SET role = EXCLUDED.role, branch_id = EXCLUDED.branch_id, department_id = EXCLUDED.department_id, status = EXCLUDED.status;
  ELSE
    INSERT INTO public.organization_members (org_id, user_id, role, branch_id, department_id, status)
    SELECT v_hssb_id, p.id,
      CASE WHEN p.role IN ('admin', 'super_admin') THEN 'owner' WHEN p.role IN ('pic', 'manager') THEN 'manager' ELSE 'member' END,
      p.branch_id, p.department_id, CASE WHEN p.status = 'deactivated' THEN 'deactivated' ELSE 'active' END
    FROM public.profiles p
    ON CONFLICT (org_id, user_id) DO UPDATE SET role = EXCLUDED.role, branch_id = EXCLUDED.branch_id, department_id = EXCLUDED.department_id, status = EXCLUDED.status;
  END IF;

  UPDATE public.profiles
  SET current_org_id = v_hssb_id
  WHERE current_org_id IS NULL;
END $$;

-- FK org members → branches/departments (scoped)
ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_branch_id_fkey;
ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_branch_id_fkey
  FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_department_id_fkey;
ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_department_id_fkey
  FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;

-- Enforce NOT NULL org_id on tenant tables
ALTER TABLE public.branches ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.departments ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.task_templates ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.task_instances ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.projects ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.point_settings ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.user_points ALTER COLUMN org_id SET NOT NULL;

-- task_user_stats: composite key (org_id, profile_id)
ALTER TABLE public.task_user_stats DROP CONSTRAINT IF EXISTS task_user_stats_pkey;
ALTER TABLE public.task_user_stats ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.task_user_stats ADD PRIMARY KEY (org_id, profile_id);

-- point_settings: per-org event types
ALTER TABLE public.point_settings DROP CONSTRAINT IF EXISTS point_settings_event_type_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_point_settings_org_event ON public.point_settings(org_id, event_type);

DROP FUNCTION IF EXISTS task_app._add_org_id(regclass);

-- Finalize legacy profile roles for new app (safe after org memberships exist).
UPDATE public.profiles SET role = 'super_admin' WHERE role = 'admin';
UPDATE public.profiles SET role = 'manager' WHERE role = 'pic';
UPDATE public.profiles SET role = 'user' WHERE role = 'staff';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'manager', 'user'));

-- Production bootstrap: Carrick admin is HSSB owner + platform admin; demo users are members only.
DO $$
DECLARE
  v_hssb_id UUID;
  v_admin_id UUID;
BEGIN
  SELECT id INTO v_hssb_id FROM public.organizations WHERE slug = 'hssb' LIMIT 1;
  SELECT id INTO v_admin_id FROM public.profiles
  WHERE username = 'admin'
     OR auth_email ILIKE 'carrick@harrisons.com.my'
     OR id::text LIKE '78925121%'
  ORDER BY CASE WHEN username = 'admin' THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_hssb_id IS NOT NULL AND v_admin_id IS NOT NULL THEN
    INSERT INTO public.organization_members (org_id, user_id, role, status)
    VALUES (v_hssb_id, v_admin_id, 'owner', 'active')
    ON CONFLICT (org_id, user_id) DO UPDATE SET role = 'owner', status = 'active';

    UPDATE public.profiles SET current_org_id = v_hssb_id WHERE id = v_admin_id;

    INSERT INTO public.platform_admins (user_id) VALUES (v_admin_id)
    ON CONFLICT (user_id) DO NOTHING;

    UPDATE public.organization_members om
    SET role = 'member'
    FROM public.profiles p
    WHERE om.org_id = v_hssb_id
      AND om.user_id = p.id
      AND p.username IN ('demo_admin', 'demo_manager', 'demo_member1', 'demo_member2')
      AND om.user_id <> v_admin_id;
  END IF;
END $$;
