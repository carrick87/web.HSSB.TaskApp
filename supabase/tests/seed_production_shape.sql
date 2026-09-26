-- Production-shaped seed (run after prod 005e baseline, before 006). Idempotent via fixed UUIDs.
\set ON_ERROR_STOP on

-- Fixed IDs
\set admin_id '78925121-0000-4000-8000-000000000001'
\set admin2_id '78925121-0000-4000-8000-000000000002'
\set pic1_id '78925121-0000-4000-8000-000000000003'
\set pic2_id '78925121-0000-4000-8000-000000000004'
\set staff1_id '78925121-0000-4000-8000-000000000005'
\set staff2_id '78925121-0000-4000-8000-000000000006'
\set staff3_id '78925121-0000-4000-8000-000000000007'
\set orphan_auth_id '78925121-0000-4000-8000-000000000099'
\set branch1_id 'b1000000-0000-0000-0000-000000000001'
\set branch2_id 'b1000000-0000-0000-0000-000000000002'
\set dept1_id 'd1000000-0000-0000-0000-000000000001'
\set dept2_id 'd1000000-0000-0000-0000-000000000002'
\set template_id 'c1000000-0000-0000-0000-000000000001'
\set q1_id 'c1000000-0000-0000-0000-000000000002'
\set q_file_id 'c1000000-0000-0000-0000-000000000004'
\set file_instance_id 'c1000000-0000-0000-0000-000000000020'
\set project_id 'c1000000-0000-0000-0000-000000000010'
\set task1_id 'c1000000-0000-0000-0000-000000000011'
\set task2_id 'c1000000-0000-0000-0000-000000000012'
\set task3_id 'c1000000-0000-0000-0000-000000000013'
\set task4_id 'c1000000-0000-0000-0000-000000000014'

-- 8 auth.users (one orphan without profile)
INSERT INTO auth.users (id, email) VALUES
  ('78925121-0000-4000-8000-000000000001'::uuid, 'carrick@harrisons.com.my'),
  ('78925121-0000-4000-8000-000000000002'::uuid, 'admin2@harrisons.com.my'),
  ('78925121-0000-4000-8000-000000000003'::uuid, 'pic1@harrisons.com.my'),
  ('78925121-0000-4000-8000-000000000004'::uuid, 'pic2@harrisons.com.my'),
  ('78925121-0000-4000-8000-000000000005'::uuid, 'staff1@harrisons.com.my'),
  ('78925121-0000-4000-8000-000000000006'::uuid, 'staff2@harrisons.com.my'),
  ('78925121-0000-4000-8000-000000000007'::uuid, 'staff3@harrisons.com.my'),
  ('78925121-0000-4000-8000-000000000099'::uuid, 'orphan@harrisons.com.my')
ON CONFLICT (id) DO NOTHING;

DELETE FROM public.profiles;
DELETE FROM public.task_instance_answers;
DELETE FROM public.task_instances;
DELETE FROM public.task_template_questions;
DELETE FROM public.task_templates;
DELETE FROM public.task_comments;
DELETE FROM public.task_attachments;
DELETE FROM public.tasks;
DELETE FROM public.project_members;
DELETE FROM public.projects;
DELETE FROM public.user_points;
DELETE FROM public.task_user_stats;
DELETE FROM public.departments;
DELETE FROM public.branches;
DELETE FROM storage.objects WHERE bucket_id = 'task-attachments';

INSERT INTO public.branches (id, name) VALUES
  ('b1000000-0000-0000-0000-000000000001'::uuid, 'Branch A'),
  ('b1000000-0000-0000-0000-000000000002'::uuid, 'Branch B');

INSERT INTO public.departments (id, branch_id, name) VALUES
  ('d1000000-0000-0000-0000-000000000001'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'Dept 1'),
  ('d1000000-0000-0000-0000-000000000002'::uuid, 'b1000000-0000-0000-0000-000000000002'::uuid, 'Dept 2');

INSERT INTO public.profiles (id, username, auth_email, harrison_email, branch_id, department_id, role) VALUES
  ('78925121-0000-4000-8000-000000000001'::uuid, 'admin', 'carrick@harrisons.com.my', 'carrick@harrisons.com.my', 'b1000000-0000-0000-0000-000000000001'::uuid, 'd1000000-0000-0000-0000-000000000001'::uuid, 'admin'),
  ('78925121-0000-4000-8000-000000000002'::uuid, 'demo_admin', 'admin2@harrisons.com.my', 'admin2@harrisons.com.my', 'b1000000-0000-0000-0000-000000000001'::uuid, 'd1000000-0000-0000-0000-000000000001'::uuid, 'admin'),
  ('78925121-0000-4000-8000-000000000003'::uuid, 'demo_manager', 'pic1@harrisons.com.my', 'pic1@harrisons.com.my', 'b1000000-0000-0000-0000-000000000001'::uuid, 'd1000000-0000-0000-0000-000000000001'::uuid, 'pic'),
  ('78925121-0000-4000-8000-000000000004'::uuid, 'pic2', 'pic2@harrisons.com.my', 'pic2@harrisons.com.my', 'b1000000-0000-0000-0000-000000000002'::uuid, 'd1000000-0000-0000-0000-000000000002'::uuid, 'pic'),
  ('78925121-0000-4000-8000-000000000005'::uuid, 'demo_member1', 'staff1@harrisons.com.my', 'staff1@harrisons.com.my', 'b1000000-0000-0000-0000-000000000001'::uuid, 'd1000000-0000-0000-0000-000000000001'::uuid, 'staff'),
  ('78925121-0000-4000-8000-000000000006'::uuid, 'demo_member2', 'staff2@harrisons.com.my', 'staff2@harrisons.com.my', 'b1000000-0000-0000-0000-000000000001'::uuid, 'd1000000-0000-0000-0000-000000000001'::uuid, 'staff'),
  ('78925121-0000-4000-8000-000000000007'::uuid, 'staff3', 'staff3@harrisons.com.my', 'staff3@harrisons.com.my', 'b1000000-0000-0000-0000-000000000002'::uuid, 'd1000000-0000-0000-0000-000000000002'::uuid, 'staff');

INSERT INTO public.task_templates (id, title, description, created_by_profile_id, recurrence_type, assign_to_type, assign_to_id, is_active) VALUES
  ('c1000000-0000-0000-0000-000000000001'::uuid, 'Daily checklist', 'Seed template', '78925121-0000-4000-8000-000000000001'::uuid, 'daily', 'department', 'd1000000-0000-0000-0000-000000000001'::uuid, true);

INSERT INTO public.task_template_questions (id, template_id, question_text, answer_type, sort_order) VALUES
  ('c1000000-0000-0000-0000-000000000002'::uuid, 'c1000000-0000-0000-0000-000000000001'::uuid, 'Question one', 'text', 0),
  ('c1000000-0000-0000-0000-000000000003'::uuid, 'c1000000-0000-0000-0000-000000000001'::uuid, 'Question two', 'boolean', 1),
  ('c1000000-0000-0000-0000-000000000004'::uuid, 'c1000000-0000-0000-0000-000000000001'::uuid, 'Upload proof', 'file', 2);

INSERT INTO public.task_instances (id, template_id, assignee_profile_id, assignment_date, due_date, status)
VALUES (
  'c1000000-0000-0000-0000-000000000020'::uuid,
  'c1000000-0000-0000-0000-000000000001'::uuid,
  '78925121-0000-4000-8000-000000000005'::uuid,
  CURRENT_DATE,
  (CURRENT_DATE + 1)::timestamp - interval '1 second',
  'accepted'
);

INSERT INTO public.task_instances (id, template_id, assignee_profile_id, assignment_date, due_date, status)
SELECT
  gen_random_uuid(),
  'c1000000-0000-0000-0000-000000000001'::uuid,
  CASE (g.i % 3)
    WHEN 0 THEN '78925121-0000-4000-8000-000000000005'::uuid
    WHEN 1 THEN '78925121-0000-4000-8000-000000000006'::uuid
    ELSE '78925121-0000-4000-8000-000000000007'::uuid
  END,
  CURRENT_DATE - g.i,
  (CURRENT_DATE - g.i + 1)::timestamp - interval '1 second',
  'pending'
FROM generate_series(1, 211) AS g(i);

INSERT INTO public.task_instance_answers (task_instance_id, question_id, answer_text, answer_file_url)
SELECT ti.id, 'c1000000-0000-0000-0000-000000000002'::uuid, 'seed answer', NULL
FROM public.task_instances ti
ORDER BY ti.created_at
LIMIT 4;

INSERT INTO public.task_instance_answers (task_instance_id, question_id, answer_file_url)
VALUES (
  'c1000000-0000-0000-0000-000000000020'::uuid,
  'c1000000-0000-0000-0000-000000000004'::uuid,
  '78925121-0000-4000-8000-000000000005/c1000000-0000-0000-0000-000000000020/proof.pdf'
);

INSERT INTO public.projects (id, name, description, department_id, created_by) VALUES
  ('c1000000-0000-0000-0000-000000000010'::uuid, 'Seed project', 'Replay seed', 'd1000000-0000-0000-0000-000000000001'::uuid, '78925121-0000-4000-8000-000000000001'::uuid);

INSERT INTO public.project_members (project_id, profile_id) VALUES
  ('c1000000-0000-0000-0000-000000000010'::uuid, '78925121-0000-4000-8000-000000000001'::uuid),
  ('c1000000-0000-0000-0000-000000000010'::uuid, '78925121-0000-4000-8000-000000000005'::uuid);

INSERT INTO public.tasks (id, title, department_id, project_id, created_by, assignee_id, status, priority) VALUES
  ('c1000000-0000-0000-0000-000000000011'::uuid, 'Task 1', 'd1000000-0000-0000-0000-000000000001'::uuid, 'c1000000-0000-0000-0000-000000000010'::uuid, '78925121-0000-4000-8000-000000000001'::uuid, '78925121-0000-4000-8000-000000000005'::uuid, 'todo', 'medium'),
  ('c1000000-0000-0000-0000-000000000012'::uuid, 'Task 2', 'd1000000-0000-0000-0000-000000000001'::uuid, NULL, '78925121-0000-4000-8000-000000000003'::uuid, '78925121-0000-4000-8000-000000000006'::uuid, 'in_progress', 'high'),
  ('c1000000-0000-0000-0000-000000000013'::uuid, 'Task 3', 'd1000000-0000-0000-0000-000000000002'::uuid, NULL, '78925121-0000-4000-8000-000000000001'::uuid, '78925121-0000-4000-8000-000000000007'::uuid, 'done', 'low'),
  ('c1000000-0000-0000-0000-000000000014'::uuid, 'Task 4', 'd1000000-0000-0000-0000-000000000001'::uuid, 'c1000000-0000-0000-0000-000000000010'::uuid, '78925121-0000-4000-8000-000000000001'::uuid, '78925121-0000-4000-8000-000000000001'::uuid, 'todo', 'medium');

INSERT INTO public.task_attachments (task_id, file_path, file_name, uploaded_by) VALUES
  ('c1000000-0000-0000-0000-000000000011'::uuid, 'seed/file1.pdf', 'file1.pdf', '78925121-0000-4000-8000-000000000001'::uuid),
  ('c1000000-0000-0000-0000-000000000012'::uuid, 'seed/file2.pdf', 'file2.pdf', '78925121-0000-4000-8000-000000000003'::uuid);

INSERT INTO public.task_comments (task_id, author_id, content) VALUES
  ('c1000000-0000-0000-0000-000000000011'::uuid, '78925121-0000-4000-8000-000000000001'::uuid, 'Comment one'),
  ('c1000000-0000-0000-0000-000000000012'::uuid, '78925121-0000-4000-8000-000000000005'::uuid, 'Comment two');

INSERT INTO public.user_points (profile_id, task_instance_id, event_type, points_earned)
SELECT '78925121-0000-4000-8000-000000000005'::uuid, id, 'completed_on_time', 10
FROM public.task_instances
LIMIT 1;

INSERT INTO public.task_user_stats (profile_id, total_completed, total_failed, total_late_submissions)
VALUES ('78925121-0000-4000-8000-000000000005'::uuid, 3, 0, 1);

INSERT INTO public.point_settings (event_type, points) VALUES
  ('completed_on_time', 10),
  ('completed_late', 5),
  ('failed', 0),
  ('not_completed', -5)
ON CONFLICT (event_type) DO UPDATE SET points = EXCLUDED.points;

INSERT INTO storage.objects (bucket_id, name, owner_id, owner) VALUES
  ('task-attachments', 'c1000000-0000-0000-0000-000000000011/file-a.pdf', '78925121-0000-4000-8000-000000000001', '78925121-0000-4000-8000-000000000001'::uuid),
  ('task-attachments', 'c1000000-0000-0000-0000-000000000012/file-b.pdf', '78925121-0000-4000-8000-000000000003', '78925121-0000-4000-8000-000000000003'::uuid),
  ('task-attachments', 'c1000000-0000-0000-0000-000000000013/file-c.pdf', '78925121-0000-4000-8000-000000000001', '78925121-0000-4000-8000-000000000001'::uuid),
  (
    'task-files',
    '78925121-0000-4000-8000-000000000005/c1000000-0000-0000-0000-000000000020/proof.pdf',
    '78925121-0000-4000-8000-000000000005',
    '78925121-0000-4000-8000-000000000005'::uuid
  );
