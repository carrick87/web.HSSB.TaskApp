# Multi-tenant migration (HSSB live data)

Production today is at migration **`005`** with its own `001`–`005` history. Apply **`006` through `017` only** — do **not** re-run `001`–`005` on production.

## Rollout sequence (production)

1. **Backup** — take a Supabase dashboard backup or `pg_dump` of the project before any DDL.
2. **Migrate database** — apply `006_multitenant…` through `017_production_hardening.sql` in order. Prefer a **single transaction** (`BEGIN;` … `\i` each file … `COMMIT;`) so a failure rolls back the whole step; if a file uses non-transactional DDL (e.g. some `CREATE INDEX CONCURRENTLY`), document the exception and run those statements outside the transaction.
3. **Deploy application** immediately after migration completes (same maintenance window).

### Rollback plan

- **After `011` / `012`:** you cannot safely revert the app to commit `1eb8bf8` without compatibility shims — org-scoped RLS and role renames break the old code. Roll forward with the new app or **restore the pre-migration backup** (Supabase restore / `pg_dump` replay). There is no supported down-migration to `005`-era schema once tenant RLS is enabled.
- **Before deploy:** if migration fails mid-transaction, the DB should remain at `005`; fix SQL and retry.

During the short window between migration and deploy, signup may still insert legacy `staff` until the new app is live; migration `011` maps `staff` → `user` via trigger + CHECK.

## Order (production: start at 006)

1. `006`–`009` — roles/status, super-admin RLS, company branding bucket, password flag  
2. `010_multitenant_organizations.sql` — orgs, members, invites, platform admins, audit log, helpers  
3. `011_multitenant_org_id_hssb_backfill.sql` — `org_id` columns, HSSB org, memberships (insert-only on re-run), role rename, bootstrap  
4. `012_multitenant_rls.sql` — org-scoped RLS  
5. `013_multitenant_storage.sql` — storage policies + legacy path migration  
6. `014`–`016` — notifications, email  
7. `017_production_hardening.sql` — privilege guards, org_id triggers, policy audit  

Local replay from production **005e** baseline: `bash scripts/replay-migrations.sh` (uses `supabase/snapshots/prod-005e-schema.sql` + seed, then `006`–`017` twice).

## Signup / roles

- Profile roles after `011`: `super_admin`, `manager`, `user` (legacy `staff` mapped on write).  
- Invited signup: profile row is created **before** `organization_members` (FK to `profiles.id`).  
- Invites are marked accepted only after profile + membership succeed.

## Email cron split

- **Vercel:** daily `0 1 * * *` → `/api/cron/email?scope=scheduled`  
- **Supabase pg_cron + pg_net:** every 5 minutes → `/api/cron/email?scope=outbox` — see `docs/EMAIL_OUTBOX_CRON.md`

## Platform admin bootstrap

Migration `011` inserts missing HSSB owner membership and `platform_admins` for the production `admin` user (does not overwrite existing membership roles on re-run).

## Cross-org RLS tests

`bash scripts/replay-migrations.sh` runs `supabase/tests/tenant_rls_matrix.sql` and `replay_production_paths.sql`.

## Pre-check / post-check

See sections below (unchanged queries).

## Product branding

Global PWA/name/icon: product config. Workspace logos: top bar, email headers, invite/login only — not the installed app icon.

## Tables receiving `org_id`

| Table | Notes |
|-------|--------|
| `branches` | NOT NULL after backfill |
| `departments` | NOT NULL |
| `task_templates` | NOT NULL |
| `task_instances` | NOT NULL |
| `projects` | NOT NULL |
| `tasks` | NOT NULL |
| `point_settings` | UNIQUE (`org_id`, `event_type`) |
| `user_points` | NOT NULL |
| `task_user_stats` | PK (`org_id`, `profile_id`) |
| `task_attachments` / `task_comments` | Scoped via `tasks.org_id` in RLS |
| `task_template_questions` | Scoped via template |
| `task_instance_answers` | Scoped via instance |
| `project_members` | Scoped via project |

Global (no `org_id`): `profiles`, `organizations`, `organization_members`, `organization_invites`, `platform_admins`, `organization_audit_log`.
