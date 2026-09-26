-- 010: Multi-tenant core — organizations, members, platform admins, invites, audit log.
-- Safe to run after 001–005 or after 006–009 (drops single-tenant company_profile if present).
-- Does NOT backfill org_id on tenant tables (see 011).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) <= 80),
  short_name TEXT CHECK (short_name IS NULL OR char_length(short_name) <= 30),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'),
  logo_wide_path TEXT,
  logo_square_path TEXT,
  registration_no TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON public.organizations(status);

CREATE TABLE IF NOT EXISTS public.organization_members (
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'member')),
  branch_id UUID,
  department_id UUID,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deactivated')),
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_role ON public.organization_members(org_id, role);

CREATE TABLE IF NOT EXISTS public.organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'member')),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_invites_email ON public.organization_invites(email);
CREATE INDEX IF NOT EXISTS idx_org_invites_org ON public.organization_invites(org_id);

CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organization_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_id UUID,
  action TEXT NOT NULL,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_audit_org_created ON public.organization_audit_log(org_id, created_at DESC);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_audit_log') THEN
    DROP TABLE public.admin_audit_log;
  END IF;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT false;

DROP TABLE IF EXISTS public.company_profile CASCADE;

CREATE OR REPLACE FUNCTION task_app.enforce_last_org_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  remaining INT;
  target_org UUID;
BEGIN
  target_org := COALESCE(NEW.org_id, OLD.org_id);

  IF TG_OP = 'DELETE' THEN
    IF OLD.role = 'owner' AND OLD.status = 'active' THEN
      SELECT COUNT(*) INTO remaining
      FROM public.organization_members
      WHERE org_id = target_org AND role = 'owner' AND status = 'active' AND user_id <> OLD.user_id;
      IF remaining = 0 THEN
        RAISE EXCEPTION 'Organization must have at least one active owner.';
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.role = 'owner' AND OLD.status = 'active'
       AND (NEW.role <> 'owner' OR NEW.status <> 'active') THEN
      SELECT COUNT(*) INTO remaining
      FROM public.organization_members
      WHERE org_id = target_org AND role = 'owner' AND status = 'active' AND user_id <> OLD.user_id;
      IF remaining = 0 THEN
        RAISE EXCEPTION 'Organization must have at least one active owner.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS organization_members_last_owner ON public.organization_members;
CREATE TRIGGER organization_members_last_owner
  BEFORE UPDATE OR DELETE ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION task_app.enforce_last_org_owner();

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_platform_admin FROM public.profiles WHERE id = auth.uid()),
    false
  )
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.org_id = p_org_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.org_role(p_org_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT m.role FROM public.organization_members m
  WHERE m.org_id = p_org_id AND m.user_id = auth.uid() AND m.status = 'active'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.org_role(p_org_id) IN ('owner', 'admin')
$$;

CREATE OR REPLACE FUNCTION public.is_org_manager_or_above(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.org_role(p_org_id) IN ('owner', 'admin', 'manager')
$$;

CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT current_org_id FROM public.profiles WHERE id = auth.uid()
$$;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organizations_select_member"
  ON public.organizations FOR SELECT TO authenticated
  USING (public.is_org_member(id) OR public.is_platform_admin());

CREATE POLICY "organizations_select_public_branding"
  ON public.organizations FOR SELECT TO anon, authenticated
  USING (status = 'active');

CREATE POLICY "organizations_insert_authenticated"
  ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "organizations_update_admin"
  ON public.organizations FOR UPDATE TO authenticated
  USING (public.is_org_admin(id))
  WITH CHECK (public.is_org_admin(id));

CREATE POLICY "organizations_platform_suspend"
  ON public.organizations FOR UPDATE TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "org_members_select_same_org"
  ON public.organization_members FOR SELECT TO authenticated
  USING (public.is_org_member(org_id) OR public.is_platform_admin());

CREATE POLICY "org_members_admin_write"
  ON public.organization_members FOR ALL TO authenticated
  USING (public.is_org_admin(org_id))
  WITH CHECK (public.is_org_admin(org_id));

CREATE POLICY "org_members_self_read"
  ON public.organization_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "org_invites_admin"
  ON public.organization_invites FOR ALL TO authenticated
  USING (public.is_org_admin(org_id))
  WITH CHECK (public.is_org_admin(org_id));

CREATE POLICY "org_audit_select_admin"
  ON public.organization_audit_log FOR SELECT TO authenticated
  USING (public.is_org_admin(org_id));

CREATE POLICY "org_audit_insert_admin"
  ON public.organization_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(org_id));

CREATE POLICY "platform_admins_select"
  ON public.platform_admins FOR SELECT TO authenticated
  USING (public.is_platform_admin());
