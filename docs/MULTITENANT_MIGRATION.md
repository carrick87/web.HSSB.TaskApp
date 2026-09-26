# Multi-tenant migration (HSSB live data)

Production today is at migration **`005`** with its own `001`–`005` history. Apply **`006` through `017` only** — do **not** re-run `001`–`005` on production.

## Rollout sequence (production)

1. **Backup** — take a Supabase dashboard backup or `pg_dump` of the project before any DDL.
2. **Migrate database** — apply migrations **`006_super_admin_foundation.sql` through `017_production_hardening.sql`** in order inside a **single transaction** (`BEGIN;` … `\i` each file … `COMMIT;`). If a statement cannot run in a transaction (rare), stop the transaction before it, run that statement separately, document it, and do not leave the rest uncommitted.
3. **Deploy application in the same maintenance window** — immediately after migration completes. The pre-multitenant app **breaks once `011`/`012` are applied** (org-scoped RLS, role renames, column grants). There is no safe “migrate today, deploy later” window.

### Rollback plan

- **After `011` / `012`:** you cannot safely revert the app to commit `1eb8bf8` without compatibility shims. Roll forward with the new app or **restore the pre-migration backup**. There is no supported down-migration to `005`-era schema once tenant RLS is enabled.
- **Before deploy:** if migration fails mid-transaction, the DB should remain at `005`; fix SQL and retry.

During the short window between migration and deploy, signup may still insert legacy `staff` until the new app is live; migration `011` maps `staff` → `user` via trigger + CHECK.

## Order (production: start at 006)

1. `006`–`009` — roles/status, super-admin RLS, company branding bucket, password flag  
2. `010_multitenant_organizations.sql` — orgs, members, invites, platform admins, audit log, helpers, `migration_state`  
3. `011_multitenant_org_id_hssb_backfill.sql` — `org_id` columns, HSSB org, **one-time** profile/membership backfill (marker `011_hssb_profile_backfill`), role rename, bootstrap  
4. `012_multitenant_rls.sql` — org-scoped RLS  
5. `013_multitenant_storage.sql` — storage policies + legacy path migration + `task-files` policies  
6. `014`–`016` — notifications, email  
7. `017_production_hardening.sql` — privilege guards, org_id triggers, policy audit  

Local replay from production **005e** baseline: `bash scripts/replay-migrations.sh` (uses `supabase/snapshots/prod-005e-schema.sql` + seed, then `006`–`017` twice).

Independent RLS harness (229-case matrix): `bash supabase/tests/independent/run_replay.sh` then `bash supabase/tests/independent/run_tests.sh`.

## Signup / roles

- Profile roles after `011`: `super_admin`, `manager`, `user` (legacy `staff` mapped on write).  
- Invited signup: profile row is created **before** `organization_members` (FK to `profiles.id`).  
- Invites are marked accepted only after profile + membership succeed (pending row count / race guard).

## Email cron split

- **Vercel:** daily `0 1 * * *` → `/api/cron/email?scope=scheduled`  
- **Supabase pg_cron + pg_net:** every 5 minutes → `/api/cron/email?scope=outbox` — see `docs/EMAIL_OUTBOX_CRON.md`

## Platform admin bootstrap

Migration `011` ensures the production `admin` user (`78925121…`) is HSSB **owner** and `platform_admins`. Demo accounts map to org roles as: **`demo_manager` → HSSB manager**; **`demo_admin`** and **`demo_member*`** → **member** (global `profiles.role` is not used for authorization after deploy). Re-runs do **not** re-backfill memberships or `current_org_id` once `migration_state` marker `011_hssb_profile_backfill` is set.

## Pre-check (run on production **before** `BEGIN`)

Row counts per core table:

```sql
SELECT 'profiles' t, COUNT(*) FROM profiles
UNION ALL SELECT 'branches', COUNT(*) FROM branches
UNION ALL SELECT 'departments', COUNT(*) FROM departments
UNION ALL SELECT 'task_templates', COUNT(*) FROM task_templates
UNION ALL SELECT 'task_instances', COUNT(*) FROM task_instances
UNION ALL SELECT 'tasks', COUNT(*) FROM tasks
UNION ALL SELECT 'projects', COUNT(*) FROM projects
UNION ALL SELECT 'project_members', COUNT(*) FROM project_members
UNION ALL SELECT 'storage.objects', COUNT(*) FROM storage.objects;
```

Confirm no `org_id` columns yet (pre-011):

```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND column_name = 'org_id';
-- expect 0 rows before 011
```

## Post-check (run **after** `COMMIT`, before deploy)

Null org / workspace checks:

```sql
SELECT 'branches' t, COUNT(*) FILTER (WHERE org_id IS NULL) null_org FROM branches
UNION ALL SELECT 'task_instances', COUNT(*) FILTER (WHERE org_id IS NULL) FROM task_instances
UNION ALL SELECT 'tasks', COUNT(*) FILTER (WHERE org_id IS NULL) FROM tasks
UNION ALL SELECT 'profiles', COUNT(*) FILTER (WHERE current_org_id IS NULL) FROM profiles;
-- all null_org should be 0 for tenant tables; profiles.current_org_id may be null only for users without any membership
```

Owner + platform admin:

```sql
SELECT p.username, om.role, (pa.user_id IS NOT NULL) AS platform_admin
FROM profiles p
LEFT JOIN organization_members om ON om.user_id = p.id
JOIN organizations o ON o.id = om.org_id AND o.slug = 'hssb'
LEFT JOIN platform_admins pa ON pa.user_id = p.id
WHERE p.username IN ('admin','demo_admin','demo_manager','demo_member1')
ORDER BY p.username;
-- admin → owner + platform_admin; demo_manager → manager; demo_admin / demo_member* → member
```

Re-run safety:

```sql
SELECT * FROM migration_state WHERE key = '011_hssb_profile_backfill';
-- must exist after first 011 apply; second apply must not add spurious HSSB memberships
```

## Cross-org RLS tests

`bash scripts/replay-migrations.sh` runs `supabase/tests/tenant_rls_matrix.sql` and `replay_production_paths.sql`.

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
| `task_instance_answers` | Scoped via instance assignee / managers |
| `project_members` | Scoped via project |

Global (no `org_id`): `profiles`, `organizations`, `organization_members`, `organization_invites`, `platform_admins`, `organization_audit_log`.
