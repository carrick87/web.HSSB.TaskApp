# RLS Visibility Test Plan

This document describes how to verify that the Row Level Security (RLS) policies are working correctly for the new project management system.

## Demo Accounts

After running `seed_demo.sql`, you'll have these test accounts.

**Login with USERNAME (not email):**

| Role    | Username      | Password   |
|---------|---------------|------------|
| Admin   | demo_admin    | Demo1234!  |
| Manager | demo_manager  | Demo1234!  |
| Member  | demo_member1  | Demo1234!  |
| Member  | demo_member2  | Demo1234!  |

## Test Data Setup

The seed script creates:
- 1 Department: "Demo Department"
- 1 Project: "Demo Project" (members: Manager + Member1, NOT Member2)
- 4 Tasks:
  - Private Task for Member 1 (private, assigned to Member1)
  - Private Task for Member 2 (private, assigned to Member2)
  - Project Task: Design Review (in project, assigned to Member1)
  - Project Task: Implementation (in project, assigned to Member1)

## Expected Visibility Matrix

| Task                          | Admin | Manager | Member1 | Member2 |
|-------------------------------|:-----:|:-------:|:-------:|:-------:|
| Private Task for Member 1     |   ✓   |    ✓    |    ✓    |    ✗    |
| Private Task for Member 2     |   ✓   |    ✓    |    ✗    |    ✓    |
| Project Task: Design Review   |   ✓   |    ✓    |    ✓    |    ✗    |
| Project Task: Implementation  |   ✓   |    ✓    |    ✓    |    ✗    |

## Manual Test Steps

### Test 1: Admin Visibility (All tasks visible)

1. Log in as `admin@demo.taskapp.local`
2. Navigate to `/pm/team`
3. **Expected:** All 4 tasks are visible
4. Navigate to `/pm/projects`
5. **Expected:** Demo Project is visible

### Test 2: Manager Visibility (Department tasks visible)

1. Log in as `manager@demo.taskapp.local`
2. Navigate to `/pm/team`
3. **Expected:** All 4 tasks are visible (manager can see all tasks in their department)
4. Navigate to `/pm/projects`
5. **Expected:** Demo Project is visible
6. Click on Demo Project
7. **Expected:** Both project tasks visible

### Test 3: Member1 Visibility (Own tasks + project tasks)

1. Log in as `member1@demo.taskapp.local`
2. Navigate to `/pm`
3. **Expected:** Should see:
   - "Private Task for Member 1"
   - "Project Task: Design Review"
   - "Project Task: Implementation"
4. **Should NOT see:** "Private Task for Member 2"

### Test 4: Member2 Visibility (Only own private task)

1. Log in as `member2@demo.taskapp.local`
2. Navigate to `/pm`
3. **Expected:** Should see ONLY "Private Task for Member 2"
4. **Should NOT see:**
   - "Private Task for Member 1"
   - "Project Task: Design Review"
   - "Project Task: Implementation"
5. Navigate to `/pm/projects`
6. **Expected:** Demo Project should NOT be visible (Member2 is not a member)

### Test 5: Direct URL Access (RLS enforcement)

1. Log in as `member2@demo.taskapp.local`
2. Try to access a task assigned to Member1 directly via URL:
   - Get the task ID of "Private Task for Member 1" from the database
   - Navigate to `/pm/tasks/{task_id}`
3. **Expected:** 404 error or empty page (RLS blocks the query)

### Test 6: Storage Attachments (File access)

1. Log in as `member1@demo.taskapp.local`
2. Navigate to a task assigned to Member1
3. Upload a file attachment
4. **Expected:** File uploads successfully
5. Log out and log in as `member2@demo.taskapp.local`
6. Try to access the file URL directly
7. **Expected:** Access denied (storage RLS blocks the request)

## SQL Verification Queries

Run these queries in the Supabase SQL Editor to verify RLS is working:

```sql
-- Test as Member1 (replace with actual user ID)
SET LOCAL role = 'authenticated';
SET LOCAL "request.jwt.claims" = '{"sub": "30000000-0000-0000-0000-000000000001"}';

SELECT id, title, project_id FROM tasks;
-- Should return 3 tasks (own private + 2 project tasks)

-- Test as Member2 (replace with actual user ID)
SET LOCAL "request.jwt.claims" = '{"sub": "40000000-0000-0000-0000-000000000001"}';

SELECT id, title, project_id FROM tasks;
-- Should return 1 task (only own private task)
```

## Automated Test Considerations

For CI/CD, consider:
1. Using Supabase CLI with `supabase test db` command
2. Writing pgTAP tests for RLS policies
3. Integration tests that authenticate as different users and verify query results

Example pgTAP test structure:
```sql
BEGIN;
SELECT plan(4);

-- Authenticate as Member2
SET LOCAL role = 'authenticated';
SET LOCAL "request.jwt.claims" = '{"sub": "40000000-0000-0000-0000-000000000001"}';

-- Test that Member2 cannot see Member1's private task
SELECT is(
  (SELECT COUNT(*) FROM tasks WHERE title = 'Private Task for Member 1'),
  0::bigint,
  'Member2 should not see Member1 private task'
);

-- Test that Member2 can see their own task
SELECT is(
  (SELECT COUNT(*) FROM tasks WHERE title = 'Private Task for Member 2'),
  1::bigint,
  'Member2 should see their own private task'
);

-- Test that Member2 cannot see project tasks (not a member)
SELECT is(
  (SELECT COUNT(*) FROM tasks WHERE project_id IS NOT NULL),
  0::bigint,
  'Member2 should not see any project tasks'
);

-- Authenticate as Member1
SET LOCAL "request.jwt.claims" = '{"sub": "30000000-0000-0000-0000-000000000001"}';

-- Test that Member1 can see project tasks
SELECT is(
  (SELECT COUNT(*) FROM tasks WHERE project_id IS NOT NULL),
  2::bigint,
  'Member1 should see 2 project tasks'
);

SELECT * FROM finish();
ROLLBACK;
```

## Troubleshooting

If tests fail:

1. **Check RLS is enabled:**
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
   ```

2. **Check policies exist:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'tasks';
   ```

3. **Test helper functions:**
   ```sql
   -- As an authenticated user
   SELECT private.can_view_task('task-id-here');
   SELECT private.get_user_project_ids();
   ```

4. **Check profile/role:**
   ```sql
   SELECT id, username, role, department_id FROM profiles WHERE id = auth.uid();
   ```
