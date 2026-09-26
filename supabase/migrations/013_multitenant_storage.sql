-- 013: Storage paths prefixed with org_id; membership-checked writes for branding.

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
    AND public.is_org_admin(task_app.storage_first_segment_uuid(name))
  );

CREATE POLICY "org_branding_admin_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'company-branding'
    AND public.is_org_admin(task_app.storage_first_segment_uuid(name))
  );

CREATE POLICY "org_branding_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'company-branding'
    AND public.is_org_admin(task_app.storage_first_segment_uuid(name))
  );

-- task-attachments: path org_id/...
DROP POLICY IF EXISTS "task_attachments_authenticated" ON storage.objects;

CREATE POLICY "task_attachments_org_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'task-attachments'
    AND (
      public.is_org_member(task_app.storage_first_segment_uuid(name))
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
      public.is_org_member(task_app.storage_first_segment_uuid(name))
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
      public.is_org_member(task_app.storage_first_segment_uuid(name))
      OR EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id::text = (storage.foldername(name))[1]
          AND public.is_org_member(t.org_id)
      )
    )
  );
