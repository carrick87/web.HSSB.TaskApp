\set ON_ERROR_STOP on

-- 013 must not attempt to ENABLE RLS on storage.objects (only owner/superuser can; Supabase migrator is neither).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'task_files_org_id'
  ) THEN
    NULL;
  END IF;
END $$;

-- Re-apply task_files_select as storage owner (Supabase: policies run as migrator with policy privs, not table owner).
SET ROLE supabase_storage_admin;

DROP POLICY IF EXISTS "task_files_select" ON storage.objects;
CREATE POLICY "task_files_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'task-files'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_org_manager_or_above(public.task_files_org_id(name))
    )
  );

RESET ROLE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'task_files_select'
  ) THEN
    RAISE NOTICE 'REPLAY_013_NON_OWNER=PASS';
  ELSE
    RAISE EXCEPTION 'task_files_select policy missing after non-owner apply';
  END IF;
END $$;
