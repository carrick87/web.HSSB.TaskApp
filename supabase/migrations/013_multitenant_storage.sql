-- 013: Storage paths prefixed with org_id; membership-checked writes for branding.
-- Do NOT ENABLE ROW LEVEL SECURITY on storage.objects here — on Supabase it is owned by
-- supabase_storage_admin and the migration role cannot ALTER the table (rolls back the txn).

CREATE OR REPLACE FUNCTION task_app.storage_first_segment_uuid(p_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, storage, pg_temp
AS $$
DECLARE
  seg TEXT;
BEGIN
  seg := (storage.foldername(p_name))[1];
  IF seg IS NULL OR seg !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    RETURN NULL;
  END IF;
  RETURN seg::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.storage_first_segment_uuid(p_name TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, storage, pg_temp
AS $$
  SELECT task_app.storage_first_segment_uuid(p_name)
$$;

REVOKE ALL ON FUNCTION public.storage_first_segment_uuid(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.storage_first_segment_uuid(TEXT) TO authenticated, anon;

-- Migrate legacy task-attachments paths task_id/file → org_id/task_id/file
UPDATE storage.objects o
SET name = t.org_id::text || '/' || o.name
FROM public.tasks t
WHERE o.bucket_id = 'task-attachments'
  AND task_app.storage_first_segment_uuid(o.name) IS NULL
  AND (storage.foldername(o.name))[1] = t.id::text;

UPDATE storage.buckets SET public = true WHERE id = 'company-branding';

DROP POLICY IF EXISTS "company_branding_public_read" ON storage.objects;
DROP POLICY IF EXISTS "company_branding_super_admin_write" ON storage.objects;
DROP POLICY IF EXISTS "company_branding_super_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "company_branding_super_admin_delete" ON storage.objects;
DROP POLICY IF EXISTS "org_branding_public_read" ON storage.objects;
DROP POLICY IF EXISTS "org_branding_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "org_branding_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "org_branding_admin_delete" ON storage.objects;
DROP POLICY IF EXISTS "task_attachments_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "task_attachments_org_read" ON storage.objects;
DROP POLICY IF EXISTS "task_attachments_org_write" ON storage.objects;
DROP POLICY IF EXISTS "task_attachments_org_delete" ON storage.objects;
DROP POLICY IF EXISTS "task_files_upload" ON storage.objects;
DROP POLICY IF EXISTS "task_files_select" ON storage.objects;
DROP POLICY IF EXISTS "task_files_select_own" ON storage.objects;
DROP POLICY IF EXISTS "task_files_update_own" ON storage.objects;
DROP POLICY IF EXISTS "task_files_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "task_attachments_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "task_attachments_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "task_attachments_storage_delete" ON storage.objects;

CREATE POLICY "org_branding_public_read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'company-branding');

CREATE POLICY "org_branding_admin_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'company-branding'
    AND (storage.foldername(name))[1] IS NOT NULL
    AND public.is_org_admin(public.storage_first_segment_uuid(name))
  );

CREATE POLICY "org_branding_admin_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'company-branding'
    AND public.is_org_admin(public.storage_first_segment_uuid(name))
  );

CREATE POLICY "org_branding_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'company-branding'
    AND public.is_org_admin(public.storage_first_segment_uuid(name))
  );

-- task-attachments: path org_id/...
DROP POLICY IF EXISTS "task_attachments_authenticated" ON storage.objects;

CREATE POLICY "task_attachments_org_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'task-attachments'
    AND (
      public.is_org_member(public.storage_first_segment_uuid(name))
      OR EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id::text = (storage.foldername(name))[1]
          AND public.is_org_member(t.org_id)
      )
    )
  );

CREATE POLICY "task_attachments_org_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'task-attachments'
    AND (
      public.is_org_member(public.storage_first_segment_uuid(name))
      OR EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id::text = (storage.foldername(name))[1]
          AND public.is_org_member(t.org_id)
      )
    )
  );

CREATE POLICY "task_attachments_org_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'task-attachments'
    AND (
      COALESCE(owner, owner_id::uuid) = auth.uid()
      OR public.is_org_manager_or_above(public.storage_first_segment_uuid(name))
      OR EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id::text = (storage.foldername(name))[1]
          AND public.is_org_manager_or_above(t.org_id)
      )
    )
  );

-- task-files: path {assignee_profile_id}/{task_instance_id}/... (legacy production layout)
CREATE OR REPLACE FUNCTION task_app.task_files_instance_id(p_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, storage, pg_temp
AS $$
DECLARE
  seg TEXT;
BEGIN
  seg := (storage.foldername(p_name))[2];
  IF seg IS NULL OR seg !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    RETURN NULL;
  END IF;
  RETURN seg::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION task_app.task_files_org_id(p_name TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SET search_path = public, storage, pg_temp
AS $$
  SELECT ti.org_id
  FROM public.task_instances ti
  WHERE ti.id = task_app.task_files_instance_id(p_name)
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.task_files_instance_id(p_name TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, storage, pg_temp
AS $$
  SELECT task_app.task_files_instance_id(p_name)
$$;

CREATE OR REPLACE FUNCTION public.task_files_org_id(p_name TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, storage, pg_temp
AS $$
  SELECT CASE
    WHEN task_app.task_files_org_id(p_name) IS NULL THEN NULL
    WHEN (SELECT auth.role()) = 'service_role' THEN task_app.task_files_org_id(p_name)
    WHEN public.is_org_member(task_app.task_files_org_id(p_name)) THEN task_app.task_files_org_id(p_name)
    ELSE NULL
  END
$$;

REVOKE ALL ON FUNCTION public.task_files_instance_id(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.task_files_org_id(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.task_files_instance_id(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.task_files_org_id(TEXT) TO authenticated;

CREATE POLICY "task_files_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'task-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.task_instances ti
      WHERE ti.id = public.task_files_instance_id(name)
        AND ti.assignee_profile_id = auth.uid()
        AND public.is_org_member(ti.org_id)
    )
  );

CREATE POLICY "task_files_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'task-files'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_org_manager_or_above(public.task_files_org_id(name))
    )
  );

CREATE POLICY "task_files_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'task-files' AND COALESCE(owner, owner_id::uuid) = auth.uid())
  WITH CHECK (bucket_id = 'task-files' AND COALESCE(owner, owner_id::uuid) = auth.uid());

CREATE POLICY "task_files_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'task-files' AND COALESCE(owner, owner_id::uuid) = auth.uid());
