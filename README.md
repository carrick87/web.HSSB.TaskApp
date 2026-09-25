# TaskApp — Internal Project Management

Internal task and project management web application built with Next.js 14 and Supabase.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS
- **Backend / DB:** Supabase (PostgreSQL with Row Level Security)
- **Auth:** Supabase Auth (email/password)
- **Storage:** Supabase Storage (task file attachments with RLS)
- **Deployment:** Vercel

## Features

### Project Management (New)
- **Projects:** Create project groups, add team members
- **Tasks:** Assign tasks with title, description, status, priority, due date
- **Private Tasks:** Tasks visible only to assignee + assigning manager + admins
- **Project Tasks:** Tasks visible to all project members
- **File Attachments:** Upload files with RLS-enforced access control
- **Comments:** Add comments to tasks

### Legacy Task System
- Template-based recurring tasks (daily/monthly/custom)
- Task verification workflow (submit → verify → complete)
- Leaderboard with points system
- Excel export for reports

## Roles

| Role | Code | Permissions |
|------|------|-------------|
| **Admin** | `admin` | Full access: manage users, departments, branches, see all tasks |
| **Manager** | `pic` | Manage team tasks, create projects, assign tasks to department members |
| **Member** | `staff` | View assigned tasks, update status, upload files |

## Task Visibility Rules

1. **Admin** can see all tasks
2. **Project tasks** are visible to all project members
3. **Private tasks** (no project) are visible only to:
   - The assigned member
   - The manager who created the task
   - Managers in the same department as the assignee

## Setup

### 1. Supabase Database Setup

1. Create a project at [Supabase Dashboard](https://supabase.com/dashboard)
2. Go to **SQL Editor** and run `supabase/setup.sql` (consolidated, idempotent script)
3. Create two storage buckets in **Storage**:
   - `task-files` (private, 10MB limit) - for legacy task answers
   - `task-attachments` (private, 10MB limit) - for new task attachments
4. (Optional) Enable **pg_cron** for automatic daily task generation

### 2. Demo Data (Optional)

To test with sample accounts, run `supabase/seed_demo.sql` in the SQL Editor.

**Demo Credentials:**

| Role    | Email                        | Password   |
|---------|------------------------------|------------|
| Admin   | admin@demo.taskapp.local     | Demo1234!  |
| Manager | manager@demo.taskapp.local   | Demo1234!  |
| Member  | member1@demo.taskapp.local   | Demo1234!  |
| Member  | member2@demo.taskapp.local   | Demo1234!  |

The seed creates a department, a project (with Manager + Member1), and 4 tasks demonstrating visibility rules. See `docs/TEST_PLAN.md` for expected behavior.

### 3. Environment Variables

Copy `env.example` to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_TIMEZONE=Asia/Kuala_Lumpur
```

### 4. Install and Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database Schema

### New Tables (Project Management)

- `projects` - Project groups with name, description, department
- `project_members` - Junction table for project membership
- `tasks` - Manual tasks with title, description, status, priority, due date
- `task_attachments` - File attachments for tasks
- `task_comments` - Comments on tasks

### Legacy Tables

- `profiles` - User profiles extending auth.users
- `branches` / `departments` - Organization structure
- `task_templates` / `task_template_questions` - Recurring task templates
- `task_instances` / `task_instance_answers` - Generated task instances

See `supabase/migrations/` for full schema details.

## Security

All data access is protected by PostgreSQL Row Level Security (RLS):

- **SECURITY DEFINER helper functions** prevent recursive policy issues
- **Storage policies** mirror task visibility rules
- **Service role** is used only server-side for admin operations
- **Anon key** respects RLS for all normal user requests

## Deploy (Vercel)

1. Push to GitHub and import in Vercel
2. Add environment variables in Vercel project settings
3. Deploy — preview URLs are generated automatically for PRs

The Vercel project `web-hssb-task-app` is pre-configured with the required env vars.

## Testing

See `docs/TEST_PLAN.md` for a comprehensive RLS verification test plan with manual test steps and SQL queries.

## Files

- `supabase/setup.sql` - Consolidated database setup (run in SQL Editor)
- `supabase/seed_demo.sql` - Demo accounts and sample data
- `supabase/migrations/` - Incremental migration files
- `docs/TEST_PLAN.md` - RLS verification test plan
- `SPEC.md` - Original product specification
