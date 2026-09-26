-- 013: Storage paths prefixed with org_id; membership-checked writes for branding.

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
    AND public.is_org_admin(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "org_branding_admin_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'company-branding'
    AND public.is_org_admin(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "org_branding_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'company-branding'
    AND public.is_org_admin(((storage.foldername(name))[1])::uuid)
  );

-- task-attachments: path org_id/...
DROP POLICY IF EXISTS "task_attachments_authenticated" ON storage.objects;

CREATE POLICY "task_attachments_org_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'task-attachments'
    AND (
      public.is_org_member(((storage.foldername(name))[1])::uuid)
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
      public.is_org_member(((storage.foldername(name))[1])::uuid)
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
      public.is_org_member(((storage.foldername(name))[1])::uuid)
      OR EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id::text = (storage.foldername(name))[1]
          AND public.is_org_member(t.org_id)
      )
    )
  );
