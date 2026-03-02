# TaskApp — Harrison Sabah Sdn Bhd

Internal task management web application built with Next.js 14 and Supabase.

## Tech stack

- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS
- **Backend / DB:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth (email/password, `@harrisons.com.my` only)
- **Storage:** Supabase Storage (task file uploads)
- **Export:** xlsx

## Setup

### 1. Supabase

1. Create a project at [Supabase](https://supabase.com/dashboard).
2. Run the SQL migrations in order (see `supabase/README.md`):
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_storage.sql`
3. Create the **task-files** storage bucket in the Dashboard (private, 10MB limit).
4. Enable **pg_cron** and schedule the daily task job (see `supabase/README.md`).
5. Create at least one branch and department, then create an admin user and insert a row in `profiles`.

### 2. Environment

Copy `env.example` to `.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL` — project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon key
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (for admin user creation / password reset)

### 3. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Log in with a user that has a `profiles` row (Harrison email).

## Roles

- **Staff:** Dashboard, today’s tasks, accept/answer/submit, history, profile, leaderboard.
- **PIC:** Same as staff plus PIC dashboard, verify/reject tasks, templates, reports, Excel export.
- **Admin:** Same as PIC plus user/branch/department CRUD, point settings, password reset.

## Deploy (Vercel)

1. Push the repo and import the project in Vercel.
2. Add the same env vars in the Vercel project.
3. Deploy.

See `SPEC.md` for full product spec and `supabase/README.md` for database and cron setup.
