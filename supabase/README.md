# TaskApp — Supabase Setup

## Important: Run only SQL in the SQL Editor

**Do not paste the README or any Markdown into the SQL Editor.** The `#` character causes a syntax error. In the SQL Editor, run only the contents of the `.sql` files in `supabase/migrations/`.

---

## Option A: Supabase CLI (recommended)

Use the CLI to link your project and push all migrations in one go.

### 1. Install and log in

```bash
npm install -g supabase
supabase login
```

(Or use `npx supabase login` if you prefer not to install globally.)

### 2. Link your project

Get your **Project ref** from the dashboard URL:

`https://supabase.com/dashboard/project/<project-ref>`

Then run:

```bash
cd path/to/web.HSSB.TaskApp
supabase link --project-ref <project-ref>
```

When prompted, enter your database password (from **Project Settings → Database**).

### 3. Push migrations

This runs all `.sql` files in `supabase/migrations/` in order (001, 002, …):

```bash
supabase db push
```

That’s it. Tables, RLS, triggers, and seed data will be applied.

### If you see: "Your account does not have the necessary privileges to access this endpoint"

This means your Supabase account does not have **Owner or Administrator** access to the project (e.g. you are "Developer" or the project is in an organization where you lack rights).

**Fix options:**

1. **Get Owner/Admin access**  
   Ask the project owner to give you [Owner or Administrator](https://supabase.com/docs/guides/platform/access-control) role, or use an account that already has it.

2. **New access token**  
   Generate a new token at [Account → Access Tokens](https://supabase.com/dashboard/account/tokens), then run `supabase login` again and retry `supabase link` and `supabase db push`.

3. **Skip the CLI and run migrations manually**  
   Use **Option B** below: open each file in `supabase/migrations/` and run its contents in the **SQL Editor** (run `001_initial_schema.sql` first, then `002_storage.sql`). You do not need the CLI for that.

### 4. After push

- **Storage:** In Dashboard → **Storage**, create bucket `task-files` (private, 10MB limit, allowed MIME types: images, PDF, Word).
- **pg_cron:** In **Database → Extensions**, enable **pg_cron**. Then in the SQL Editor run the cron schedule (see section 3 below).

---

## Option B: SQL Editor (use this if CLI gives "necessary privileges" error)

You can apply migrations without the CLI by running the SQL files in the dashboard.

1. Open your project at [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor**.
3. Run the migrations in order:
   - Open **`supabase/migrations/001_initial_schema.sql`** in your editor, copy **all** its contents, paste into a new SQL Editor query, and run it.
   - Then open **`supabase/migrations/002_storage.sql`**, copy all contents, paste into a new query, and run it.
4. **Important:** Paste only the `.sql` file contents. Do not paste this README or any Markdown (the `#` character causes a syntax error).
5. In **Storage**, create the **task-files** bucket (private, 10MB limit, allowed types: images, PDF, Word).

---

## 3. Enable pg_cron (daily tasks)

In **Database → Extensions**, enable **pg_cron** if needed.

Then in the **SQL Editor** run (only this SQL block):

```sql
SELECT cron.schedule(
  'generate-daily-tasks',
  '1 0 * * *',
  'SELECT task_app.generate_daily_tasks()'
);
```

This runs at 00:01 UTC daily. **Keep this cron job running** so that recurring tasks (daily, monthly, custom) are generated for future days.

**Instant tasks for today:** When an admin or PIC creates or updates a task template in the app, today’s task instances are generated immediately for the assignees—no need to wait for cron. The cron is only for generating tasks on subsequent days.

---

## 4. Create first admin user

1. In **Authentication → Users**, create a user (email ending with `@harrisons.com.my`, password).
2. Copy the user’s UUID.
3. Create at least one branch and one department (or use the one-shot script below).
4. **Important:** `branch_id` and `department_id` must be **UUIDs** from the `branches` and `departments` tables, not numbers or names.

**Option A — One-shot: create branch, department, and admin profile**

Run this in the SQL Editor (replace the user UUID and email with yours):

```sql
WITH
  new_branch AS (
    INSERT INTO branches (name) VALUES ('Main') RETURNING id
  ),
  new_dept AS (
    INSERT INTO departments (branch_id, name)
    SELECT id, 'MIS' FROM new_branch RETURNING id
  )
INSERT INTO profiles (id, username, harrison_email, branch_id, department_id, role)
SELECT
  '78925121-0ed4-4ad0-bd37-98ce5443babe',
  'admin',
  'carrick@harrisons.com.my',
  (SELECT id FROM new_branch),
  (SELECT id FROM new_dept),
  'admin';
```

**Option B — Use existing branch and department**

If you already have rows in **Table Editor** for branches and departments, copy their **id** (UUID) values. Then run:

```sql
INSERT INTO profiles (id, username, harrison_email, branch_id, department_id, role)
VALUES (
  '78925121-0ed4-4ad0-bd37-98ce5443babe',
  'admin',
  'admin@harrisons.com.my',
  '<branch-uuid>',
  '<department-uuid>',
  'admin'
);
```

---

## 5. End-of-day failed tasks (optional)

To mark pending/accepted tasks as failed after due time, run this in the SQL Editor and optionally schedule it with pg_cron (e.g. 23:59 or 00:05):

```sql
UPDATE task_instances
SET status = 'failed'
WHERE status IN ('pending', 'accepted')
  AND due_date < now();
```
