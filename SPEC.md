# TaskApp — Harrison Sabah Sdn Bhd Internal Task Management

## TECH STACK
- Frontend: Next.js 14 (App Router) + React + Tailwind CSS
- Backend/DB: Supabase (PostgreSQL)
- Auth: Supabase Auth (email/password)
- File Storage: Supabase Storage
- Automation: pg_cron (Supabase cron jobs)
- Deployment: Vercel
- Excel Export: xlsx npm package

## DATABASE SCHEMA
See `supabase/migrations/` for full SQL. Tables: profiles, branches, departments, task_templates, task_template_questions, task_instances, task_instance_answers, task_user_stats, point_settings, user_points.

## USER ROLES
- **Admin**: Full access, user/branch/department CRUD, point config, password reset
- **PIC**: Create templates, assign tasks, verify/reject, reports, Excel export
- **Staff**: View tasks, accept, answer questions, upload files, submit, view stats

## PAGES
- Auth: /login, /logout
- Staff: /dashboard, /tasks/[id], /tasks/upcoming, /tasks/history, /profile
- PIC: /pic/dashboard, /pic/verify, /pic/verify/[id], /pic/templates, /pic/templates/new, /pic/templates/[id]/edit, /pic/reports
- Admin: /admin/users, /admin/users/new, /admin/users/[id], /admin/branches, /admin/departments, /admin/points
- Leaderboard: /leaderboard

## ENV VARS
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
