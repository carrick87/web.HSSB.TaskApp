-- TaskApp — Storage policies for task file uploads
-- Create the bucket "task-files" in Dashboard (Storage → New bucket): private, 10MB limit, allowed types: images, PDF, Word.

-- Authenticated users can upload to task-files (path: {profile_id}/{task_instance_id}/...)
CREATE POLICY "task_files_upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'task-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can read their own files (path starts with their profile id)
CREATE POLICY "task_files_select_own"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'task-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update/delete their own files (e.g. replace before submit)
CREATE POLICY "task_files_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'task-files' AND owner = auth.uid())
WITH CHECK (bucket_id = 'task-files' AND owner = auth.uid());

CREATE POLICY "task_files_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'task-files' AND owner = auth.uid());
