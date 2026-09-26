-- =============================================================================
-- TaskApp — Demo Seed Data
-- =============================================================================
-- Run this AFTER setup.sql to create demo accounts and sample data.
-- This script creates users directly in auth.users (works in SQL Editor).
--
-- DEMO CREDENTIALS (login with username):
--   Admin:    demo_admin     / Demo1234!
--   Manager:  demo_manager   / Demo1234!
--   Member 1: demo_member1   / Demo1234!
--   Member 2: demo_member2   / Demo1234!
-- =============================================================================

DO $$
DECLARE
  v_branch_id UUID := 'a0000000-0000-0000-0000-000000000001'::UUID;
  v_dept_id UUID := 'd0000000-0000-0000-0000-000000000001'::UUID;
  v_admin_id UUID := '10000000-0000-0000-0000-000000000001'::UUID;
  v_manager_id UUID := '20000000-0000-0000-0000-000000000001'::UUID;
  v_member1_id UUID := '30000000-0000-0000-0000-000000000001'::UUID;
  v_member2_id UUID := '40000000-0000-0000-0000-000000000001'::UUID;
  v_project_id UUID := 'e0000000-0000-0000-0000-000000000001'::UUID;
  v_task_private1_id UUID := 'f0000000-0000-0000-0000-000000000001'::UUID;
  v_task_private2_id UUID := 'f0000000-0000-0000-0000-000000000002'::UUID;
  v_task_project1_id UUID := 'f0000000-0000-0000-0000-000000000003'::UUID;
  v_task_project2_id UUID := 'f0000000-0000-0000-0000-000000000004'::UUID;
  v_comment1_id UUID := 'c0000000-0000-0000-0000-000000000001'::UUID;
  v_comment2_id UUID := 'c0000000-0000-0000-0000-000000000002'::UUID;
  v_password_hash TEXT;
BEGIN
  -- Hash for "Demo1234!" using crypt with bf algorithm
  v_password_hash := extensions.crypt('Demo1234!', extensions.gen_salt('bf'));

  -- ==========================================================================
  -- 1. CREATE BRANCH AND DEPARTMENT
  -- ==========================================================================
  INSERT INTO public.branches (id, name)
  VALUES (v_branch_id, 'Demo Branch')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

  INSERT INTO public.departments (id, branch_id, name)
  VALUES (v_dept_id, v_branch_id, 'Demo Department')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

  -- ==========================================================================
  -- 2. CREATE AUTH USERS
  -- ==========================================================================
  -- Admin user
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change,
    email_change_token_new,
    email_change_token_current,
    phone_change,
    phone_change_token,
    reauthentication_token
  ) VALUES (
    v_admin_id,
    '00000000-0000-0000-0000-000000000000',
    'admin@demo.taskapp.local',
    v_password_hash,
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"username": "demo_admin"}',
    'authenticated',
    'authenticated',
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = extensions.crypt('Demo1234!', extensions.gen_salt('bf')),
    updated_at = now();

  -- Manager user
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change,
    email_change_token_new,
    email_change_token_current,
    phone_change,
    phone_change_token,
    reauthentication_token
  ) VALUES (
    v_manager_id,
    '00000000-0000-0000-0000-000000000000',
    'manager@demo.taskapp.local',
    v_password_hash,
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"username": "demo_manager"}',
    'authenticated',
    'authenticated',
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = extensions.crypt('Demo1234!', extensions.gen_salt('bf')),
    updated_at = now();

  -- Member 1
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change,
    email_change_token_new,
    email_change_token_current,
    phone_change,
    phone_change_token,
    reauthentication_token
  ) VALUES (
    v_member1_id,
    '00000000-0000-0000-0000-000000000000',
    'member1@demo.taskapp.local',
    v_password_hash,
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"username": "demo_member1"}',
    'authenticated',
    'authenticated',
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = extensions.crypt('Demo1234!', extensions.gen_salt('bf')),
    updated_at = now();

  -- Member 2
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change,
    email_change_token_new,
    email_change_token_current,
    phone_change,
    phone_change_token,
    reauthentication_token
  ) VALUES (
    v_member2_id,
    '00000000-0000-0000-0000-000000000000',
    'member2@demo.taskapp.local',
    v_password_hash,
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"username": "demo_member2"}',
    'authenticated',
    'authenticated',
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = extensions.crypt('Demo1234!', extensions.gen_salt('bf')),
    updated_at = now();

  -- ==========================================================================
  -- 3. CREATE AUTH IDENTITIES (required for email login)
  -- ==========================================================================
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES
  (
    v_admin_id,
    v_admin_id,
    jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@demo.taskapp.local', 'email_verified', true),
    'email',
    v_admin_id::text,
    now(),
    now(),
    now()
  ),
  (
    v_manager_id,
    v_manager_id,
    jsonb_build_object('sub', v_manager_id::text, 'email', 'manager@demo.taskapp.local', 'email_verified', true),
    'email',
    v_manager_id::text,
    now(),
    now(),
    now()
  ),
  (
    v_member1_id,
    v_member1_id,
    jsonb_build_object('sub', v_member1_id::text, 'email', 'member1@demo.taskapp.local', 'email_verified', true),
    'email',
    v_member1_id::text,
    now(),
    now(),
    now()
  ),
  (
    v_member2_id,
    v_member2_id,
    jsonb_build_object('sub', v_member2_id::text, 'email', 'member2@demo.taskapp.local', 'email_verified', true),
    'email',
    v_member2_id::text,
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider_id, provider) DO UPDATE SET
    identity_data = EXCLUDED.identity_data,
    updated_at = now();

  -- ==========================================================================
  -- 4. CREATE PROFILES
  -- ==========================================================================
  INSERT INTO public.profiles (id, username, auth_email, branch_id, department_id, role)
  VALUES
    (v_admin_id, 'demo_admin', 'admin@demo.taskapp.local', v_branch_id, v_dept_id, 'super_admin'),
    (v_manager_id, 'demo_manager', 'manager@demo.taskapp.local', v_branch_id, v_dept_id, 'manager'),
    (v_member1_id, 'demo_member1', 'member1@demo.taskapp.local', v_branch_id, v_dept_id, 'user'),
    (v_member2_id, 'demo_member2', 'member2@demo.taskapp.local', v_branch_id, v_dept_id, 'user')
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    auth_email = EXCLUDED.auth_email,
    branch_id = EXCLUDED.branch_id,
    department_id = EXCLUDED.department_id,
    role = EXCLUDED.role;

  -- ==========================================================================
  -- 5. CREATE A PROJECT (visible to project members)
  -- ==========================================================================
  INSERT INTO public.projects (id, name, description, department_id, created_by)
  VALUES (
    v_project_id,
    'Demo Project',
    'A sample project demonstrating project-based task visibility. All project members can see tasks in this project.',
    v_dept_id,
    v_manager_id
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description;

  -- Add members to project (manager and member1, but NOT member2)
  INSERT INTO public.project_members (project_id, profile_id)
  VALUES
    (v_project_id, v_manager_id),
    (v_project_id, v_member1_id)
  ON CONFLICT (project_id, profile_id) DO NOTHING;

  -- ==========================================================================
  -- 6. CREATE PRIVATE TASKS (only visible to assignee + manager + admins)
  -- ==========================================================================
  -- Private task for member1 (member2 should NOT see this)
  INSERT INTO public.tasks (id, title, description, status, priority, due_date, department_id, project_id, created_by, assignee_id)
  VALUES (
    v_task_private1_id,
    'Private Task for Member 1',
    'This is a PRIVATE task assigned to Member 1. Only Member 1, the assigning Manager, and Admins can see this task. Member 2 cannot see it.',
    'todo',
    'high',
    CURRENT_DATE + INTERVAL '3 days',
    v_dept_id,
    NULL,
    v_manager_id,
    v_member1_id
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description;

  -- Private task for member2 (member1 should NOT see this)
  INSERT INTO public.tasks (id, title, description, status, priority, due_date, department_id, project_id, created_by, assignee_id)
  VALUES (
    v_task_private2_id,
    'Private Task for Member 2',
    'This is a PRIVATE task assigned to Member 2. Only Member 2, the assigning Manager, and Admins can see this task. Member 1 cannot see it.',
    'in_progress',
    'medium',
    CURRENT_DATE + INTERVAL '5 days',
    v_dept_id,
    NULL,
    v_manager_id,
    v_member2_id
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description;

  -- ==========================================================================
  -- 7. CREATE PROJECT TASKS (visible to all project members)
  -- ==========================================================================
  INSERT INTO public.tasks (id, title, description, status, priority, due_date, department_id, project_id, created_by, assignee_id)
  VALUES (
    v_task_project1_id,
    'Project Task: Design Review',
    'This task is part of the Demo Project. All project members (Manager and Member 1) can see it. Member 2 is NOT in this project, so cannot see it.',
    'todo',
    'high',
    CURRENT_DATE + INTERVAL '7 days',
    v_dept_id,
    v_project_id,
    v_manager_id,
    v_member1_id
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description;

  INSERT INTO public.tasks (id, title, description, status, priority, due_date, department_id, project_id, created_by, assignee_id)
  VALUES (
    v_task_project2_id,
    'Project Task: Implementation',
    'Another task in the Demo Project, visible to project members. The Manager can see all tasks they assign, and project membership grants visibility.',
    'todo',
    'medium',
    CURRENT_DATE + INTERVAL '14 days',
    v_dept_id,
    v_project_id,
    v_manager_id,
    v_member1_id
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description;

  -- ==========================================================================
  -- 8. ADD SOME COMMENTS (with fixed IDs so re-run doesn't duplicate)
  -- ==========================================================================
  INSERT INTO public.task_comments (id, task_id, author_id, content)
  VALUES
    (v_comment1_id, v_task_project1_id, v_manager_id, 'Please complete this by end of week.'),
    (v_comment2_id, v_task_project1_id, v_member1_id, 'Working on it, will update soon.')
  ON CONFLICT (id) DO UPDATE SET
    content = EXCLUDED.content;

END $$;

-- =============================================================================
-- VERIFICATION QUERIES (run these to verify the seed worked)
-- =============================================================================

-- Check users were created
SELECT 'auth.users' as table_name, email, id FROM auth.users WHERE email LIKE '%demo.taskapp.local' ORDER BY email;

-- Check profiles
SELECT 'profiles' as table_name, username, role, auth_email FROM public.profiles WHERE auth_email LIKE '%demo.taskapp.local' ORDER BY role;

-- Check project and members
SELECT 'projects' as table_name, p.name, COUNT(pm.profile_id) as member_count
FROM public.projects p
LEFT JOIN public.project_members pm ON pm.project_id = p.id
WHERE p.name = 'Demo Project'
GROUP BY p.id, p.name;

-- Check tasks
SELECT 'tasks' as table_name, title, 
  CASE WHEN project_id IS NULL THEN 'PRIVATE' ELSE 'PROJECT' END as visibility,
  (SELECT username FROM public.profiles WHERE id = tasks.assignee_id) as assignee
FROM public.tasks
ORDER BY project_id NULLS FIRST;

-- =============================================================================
-- EXPECTED VISIBILITY MATRIX:
-- =============================================================================
-- 
-- | Task                          | Admin | Manager | Member1 | Member2 |
-- |-------------------------------|-------|---------|---------|---------|
-- | Private Task for Member 1     |  ✓    |    ✓    |    ✓    |    ✗    |
-- | Private Task for Member 2     |  ✓    |    ✓    |    ✗    |    ✓    |
-- | Project Task: Design Review   |  ✓    |    ✓    |    ✓    |    ✗    |
-- | Project Task: Implementation  |  ✓    |    ✓    |    ✓    |    ✗    |
-- 
-- Member2 is NOT in the project, so cannot see project tasks.
-- Member1 cannot see Member2's private task.
-- Member2 cannot see Member1's private task.
-- Manager can see all tasks in their department.
-- Admin can see all tasks.
-- =============================================================================
