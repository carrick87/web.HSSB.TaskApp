-- Production code paths as authenticated users (RLS enforced). Runs inside one transaction.
\set ON_ERROR_STOP on

INSERT INTO organization_members (org_id, user_id, role, status)
SELECT 'b2000000-0000-0000-0000-000000000002'::uuid, '78925121-0000-4000-8000-000000000006'::uuid, 'member', 'active'
WHERE EXISTS (SELECT 1 FROM organizations WHERE slug = 'isolation-test-b')
ON CONFLICT DO NOTHING;

BEGIN;

SELECT set_config('request.jwt.claim.sub', '78925121-0000-4000-8000-000000000001', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims', '{"sub":"78925121-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

DO $paths$
DECLARE
  v_org UUID;
  v_dept UUID;
  v_task UUID;
  v_project UUID;
  v_template UUID;
  v_question UUID;
  v_owner UUID := auth.uid();
  v_member UUID := '78925121-0000-4000-8000-000000000006'::uuid;
  v_org_b UUID := 'b2000000-0000-0000-0000-000000000002'::uuid;
BEGIN
  SELECT id INTO v_org FROM organizations WHERE slug = 'hssb' LIMIT 1;
  SELECT id INTO v_dept FROM departments WHERE org_id = v_org LIMIT 1;
  SELECT id INTO v_template FROM task_templates WHERE org_id = v_org LIMIT 1;
  SELECT id INTO v_project FROM projects WHERE org_id = v_org LIMIT 1;

  INSERT INTO tasks (title, department_id, created_by, assignee_id, status, priority)
  VALUES ('Replay path task (fill org)', v_dept, auth.uid(), auth.uid(), 'todo', 'low')
  RETURNING id INTO v_task;

  IF (SELECT org_id FROM tasks WHERE id = v_task) IS NULL THEN
    RAISE EXCEPTION 'org_id fill trigger did not run on tasks insert';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_member::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_member::text, 'role', 'authenticated')::text, true);
  UPDATE profiles SET current_org_id = v_org_b WHERE id = v_member;
  UPDATE profiles SET current_org_id = v_org WHERE id = v_member;

  PERFORM set_config('request.jwt.claim.sub', v_owner::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner::text, 'role', 'authenticated')::text, true);

  IF v_project IS NOT NULL THEN
    INSERT INTO project_members (project_id, profile_id)
    VALUES (v_project, v_member)
    ON CONFLICT DO NOTHING;

    DELETE FROM project_members WHERE project_id = v_project AND profile_id = v_member;
  END IF;

  IF v_template IS NOT NULL THEN
    INSERT INTO task_template_questions (template_id, question_text, answer_type, sort_order)
    VALUES (v_template, 'Replay question', 'text', 99)
    RETURNING id INTO v_question;

    UPDATE task_template_questions SET question_text = 'Replay question updated' WHERE id = v_question;
    DELETE FROM task_template_questions WHERE id = v_question;
  END IF;

  INSERT INTO task_comments (task_id, author_id, content)
  VALUES (v_task, v_owner, 'Replay comment');

  INSERT INTO task_attachments (task_id, uploaded_by, file_name, file_path, file_size, content_type)
  VALUES (v_task, v_owner, 'replay.txt', v_org::text || '/' || v_task::text || '/replay.txt', 1, 'text/plain');
END;
$paths$;

RESET ROLE;
SELECT task_app.generate_daily_tasks();

SELECT set_config('request.jwt.claim.sub', '78925121-0000-4000-8000-000000000001', true);
SELECT set_config('request.jwt.claims', '{"sub":"78925121-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

UPDATE task_instances
SET status = 'verified', is_late = false
WHERE id = (
  SELECT id FROM task_instances
  WHERE org_id = (SELECT id FROM organizations WHERE slug = 'hssb')
    AND status = 'pending'
  LIMIT 1
);

ROLLBACK;
