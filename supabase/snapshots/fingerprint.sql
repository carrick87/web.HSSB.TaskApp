-- Catalog fingerprint for prod 005e baseline (run against replay DB before 006).
-- Compare md5 to expected after loading supabase/snapshots/prod-005e-schema.sql.
\set ON_ERROR_STOP on

SELECT md5(
  string_agg(
    line,
    E'\n'
    ORDER BY line
  )
) AS schema_fingerprint
FROM (
  SELECT format(
    '%s|%s|%s',
    c.relkind,
    n.nspname,
    c.relname
  ) AS line
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname IN ('public', 'private', 'storage', 'auth', 'task_app')
    AND c.relkind IN ('r', 'p', 'v', 'S', 'f')

  UNION ALL

  SELECT format('policy|%s|%s|%s', schemaname, tablename, policyname)
  FROM pg_policies
  WHERE schemaname IN ('public', 'storage')

  UNION ALL

  SELECT format('grant|%s|%s|%s|%s', grantee, table_schema, table_name, privilege_type)
  FROM information_schema.table_privileges
  WHERE table_schema = 'public'
    AND grantee IN ('anon', 'authenticated', 'service_role')
) s;

SELECT 'public_tables' AS metric, count(*)::text AS value
FROM pg_tables WHERE schemaname = 'public'
UNION ALL
SELECT 'policies_public_storage', count(*)::text
FROM pg_policies WHERE schemaname IN ('public', 'storage')
UNION ALL
SELECT 'storage_buckets', count(*)::text FROM storage.buckets;
