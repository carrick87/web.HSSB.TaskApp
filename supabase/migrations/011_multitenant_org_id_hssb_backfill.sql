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
  ON CONFLICT (slug) DO NOTHING;
END $$;

-- Map legacy role values on write so pre-deploy app code (staff/admin/pic) keeps working.
CREATE OR REPLACE FUNCTION task_app.normalize_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, task_app, pg_temp
AS $$
BEGIN
  IF NEW.role = 'staff' THEN
    NEW.role := 'user';
  ELSIF NEW.role = 'admin' THEN
    NEW.role := 'super_admin';
  ELSIF NEW.role = 'pic' THEN
    NEW.role := 'manager';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_normalize_role ON public.profiles;
CREATE TRIGGER profiles_normalize_role
  BEFORE INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION task_app.normalize_profile_role();

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
  v_admin_id UUID;
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

  -- Membership + current_org backfill runs once (re-runs after go-live must not absorb other orgs / new signups)
  IF NOT EXISTS (SELECT 1 FROM public.migration_state WHERE key = '011_hssb_profile_backfill') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'status') THEN
      INSERT INTO public.organization_members (org_id, user_id, role, branch_id, department_id, status)
      SELECT v_hssb_id, p.id,
        CASE
          WHEN p.username = 'demo_admin' THEN 'member'
          WHEN p.username = 'demo_manager' THEN 'manager'
          WHEN p.username LIKE 'demo\_member%' ESCAPE '\' THEN 'member'
          WHEN p.username LIKE 'demo\_%' ESCAPE '\' THEN 'member'
          WHEN p.username = 'admin' THEN 'owner'
          WHEN p.role IN ('admin', 'super_admin') THEN 'owner'
          WHEN p.role IN ('pic', 'manager') THEN 'manager'
          ELSE 'member'
        END,
        p.branch_id, p.department_id, 'active'
      FROM public.profiles p
      ON CONFLICT (org_id, user_id) DO NOTHING;
    ELSE
      INSERT INTO public.organization_members (org_id, user_id, role, branch_id, department_id, status)
      SELECT v_hssb_id, p.id,
        CASE
          WHEN p.username = 'demo_admin' THEN 'member'
          WHEN p.username = 'demo_manager' THEN 'manager'
          WHEN p.username LIKE 'demo\_member%' ESCAPE '\' THEN 'member'
          WHEN p.username LIKE 'demo\_%' ESCAPE '\' THEN 'member'
          WHEN p.username = 'admin' THEN 'owner'
          WHEN p.role IN ('admin', 'super_admin') THEN 'owner'
          WHEN p.role IN ('pic', 'manager') THEN 'manager'
          ELSE 'member'
        END,
        p.branch_id, p.department_id, CASE WHEN p.status = 'deactivated' THEN 'deactivated' ELSE 'active' END
      FROM public.profiles p
      ON CONFLICT (org_id, user_id) DO NOTHING;
    END IF;

    UPDATE public.profiles
    SET current_org_id = v_hssb_id
    WHERE current_org_id IS NULL;

    SELECT id INTO v_admin_id FROM public.profiles
    WHERE username = 'admin'
       OR auth_email ILIKE 'carrick@harrisons.com.my'
       OR id::text LIKE '78925121%'
    ORDER BY CASE WHEN username = 'admin' THEN 0 ELSE 1 END
    LIMIT 1;

    IF v_admin_id IS NOT NULL THEN
      INSERT INTO public.organization_members (org_id, user_id, role, status)
      VALUES (v_hssb_id, v_admin_id, 'owner', 'active')
      ON CONFLICT (org_id, user_id) DO NOTHING;

      UPDATE public.profiles SET current_org_id = v_hssb_id
      WHERE id = v_admin_id AND current_org_id IS NULL;

      INSERT INTO public.platform_admins (user_id) VALUES (v_admin_id)
      ON CONFLICT (user_id) DO NOTHING;
    END IF;

    -- Demo accounts: global profile.role is not used for authorization; keep demo_* at lowest tier.
    UPDATE public.profiles SET role = 'user'
    WHERE username = 'demo_admin' OR username LIKE 'demo\_member%' ESCAPE '\';
    UPDATE public.profiles SET role = 'manager' WHERE username = 'demo_manager';

    UPDATE public.organization_members om
    SET
      branch_id = COALESCE(om.branch_id, p.branch_id),
      department_id = COALESCE(om.department_id, p.department_id)
    FROM public.profiles p
    WHERE om.org_id = v_hssb_id AND om.user_id = p.id;

    INSERT INTO public.migration_state (key) VALUES ('011_hssb_profile_backfill');
  END IF;
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

-- Mirror platform_admins onto profiles.is_platform_admin for UI only (auth uses is_platform_admin()).
UPDATE public.profiles p
SET is_platform_admin = EXISTS (
  SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = p.id
);
