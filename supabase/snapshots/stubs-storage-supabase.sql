-- Supabase-like storage ownership (storage.objects owned by supabase_storage_admin, not postgres).
\set ON_ERROR_STOP on

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_storage_admin') THEN
    CREATE ROLE supabase_storage_admin NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_migrator') THEN
    CREATE ROLE supabase_migrator LOGIN PASSWORD 'localdev' NOSUPERUSER NOCREATEDB NOBYPASSRLS;
  END IF;
END $$;

GRANT USAGE ON SCHEMA storage TO supabase_storage_admin, supabase_migrator;
GRANT USAGE ON SCHEMA auth TO supabase_storage_admin;
GRANT USAGE ON SCHEMA public TO supabase_storage_admin, supabase_migrator;
ALTER TABLE IF EXISTS storage.objects OWNER TO supabase_storage_admin;
ALTER TABLE IF EXISTS storage.buckets OWNER TO supabase_storage_admin;

-- Production already has RLS enabled on storage.objects; owner runs this, not the migration role.
SET ROLE supabase_storage_admin;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
RESET ROLE;

GRANT USAGE ON SCHEMA public TO supabase_migrator;
GRANT CREATE ON SCHEMA public TO supabase_migrator;
GRANT supabase_storage_admin TO supabase_migrator;
GRANT supabase_storage_admin TO postgres;
