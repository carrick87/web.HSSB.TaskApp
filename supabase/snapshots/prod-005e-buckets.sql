-- Bucket rows (schema snapshot is data-free; production has these two buckets).
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  ('task-attachments', 'task-attachments', false, 10485760),
  ('task-files', 'task-files', false, 10485760)
ON CONFLICT (id) DO NOTHING;
