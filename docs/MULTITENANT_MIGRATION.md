# Multi-tenant migration (HSSB live data)

Run **all** SQL migrations in filename order on production (`001` through the latest). Migrations `006`–`009` are required (roles, audit, branding storage); do not skip them.

## Rollout sequence (production)

1. **Migrate database** — apply `001`…`017` in order (≈5–15 minutes depending on `task_instances` volume).
2. **Deploy application** immediately after migration completes.

During the short window between steps 1 and 2, the database keeps legacy role values (`admin` / `pic` / `staff`) until `011` renames them; `006` only widens the role check constraint and does **not** rename early. After `011`, profile roles are `super_admin` / `manager` / `user`.

Signup continues to insert `staff` until deploy; `011` maps staff → `user`.

## Order

1. `001`–`005` — core schema, storage, username auth, admin RLS, projects/tasks
2. `006`–`009` — roles/status, super-admin RLS, company branding bucket, password flag
3. `010_multitenant_organizations.sql` — orgs, members, invites, platform admins, audit log, helpers
4. `011_multitenant_org_id_hssb_backfill.sql` — `org_id` columns, HSSB org, memberships, role rename, production bootstrap
5. `012_multitenant_rls.sql` — org-scoped RLS, legacy policy drops
6. `013_multitenant_storage.sql` — storage policies (`org_id/` and legacy `task_id/` paths)
7. `014_product_notifications_grouping.sql`
8. `015_email_notifications.sql` — see `docs/EMAIL_NOTIFICATIONS.md`
9. `016_email_design_preferences.sql`
10. `017_production_hardening.sql` — privilege guards, org_id triggers, policy audit

## Email cron split

- **Vercel** (Hobby-safe): daily `0 1 * * *` → `/api/cron/email?scope=scheduled` (reminders + digests).
- **Supabase pg_cron + pg_net**: every 5 minutes → `/api/cron/email?scope=outbox` with `CRON_SECRET` from Vault. See `docs/EMAIL_OUTBOX_CRON.md`.

## Platform admin bootstrap

Migration `011` idempotently sets the production `admin` user (username `admin`, id prefix `78925121…`, or `carrick@harrisons.com.my`) as **HSSB owner** and inserts `platform_admins`. Demo accounts remain **members**, never owner.

## Cross-org RLS tests

See `supabase/tests/MULTITENANT_RLS.md` and `supabase/tests/cross_org_isolation.test.sql`.

## Pre-check / post-check

See sections below (unchanged queries).

## Product branding

Global PWA/name/icon: `src/config/product.ts` (placeholder **TaskApp**). Workspace logos only in-app header and invite/login — not in the manifest.

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

## Pre-check (run on production snapshot)

```sql
-- Row counts before migration
SELECT 'profiles' AS t, COUNT(*) FROM profiles
UNION ALL SELECT 'branches', COUNT(*) FROM branches
UNION ALL SELECT 'departments', COUNT(*) FROM departments
UNION ALL SELECT 'task_templates', COUNT(*) FROM task_templates
UNION ALL SELECT 'task_instances', COUNT(*) FROM task_instances
UNION ALL SELECT 'projects', COUNT(*) FROM projects
UNION ALL SELECT 'tasks', COUNT(*) FROM tasks
UNION ALL SELECT 'user_points', COUNT(*) FROM user_points;

-- Confirm no org_id yet (should error or zero columns before 011)
SELECT column_name FROM information_schema.columns
WHERE table_name = 'branches' AND column_name = 'org_id';
```

## Post-check

```sql
-- No NULL org_id on tenant tables
SELECT 'branches' AS t, COUNT(*) FILTER (WHERE org_id IS NULL) AS null_org FROM branches
UNION ALL SELECT 'departments', COUNT(*) FILTER (WHERE org_id IS NULL) FROM departments
UNION ALL SELECT 'tasks', COUNT(*) FILTER (WHERE org_id IS NULL) FROM tasks;

-- Every profile has HSSB membership
SELECT COUNT(*) AS profiles_without_membership
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM organization_members m
  JOIN organizations o ON o.id = m.org_id AND o.slug = 'hssb'
  WHERE m.user_id = p.id
);

-- Role mapping sanity
SELECT role, COUNT(*) FROM organization_members m
JOIN organizations o ON o.id = m.org_id AND o.slug = 'hssb'
GROUP BY role;
```

## HSSB plan

1. Migration creates org slug `hssb` named **Harrison Sabah Sdn Bhd** (short **HSSB**).
2. All existing rows get `org_id = hssb`.
3. `profiles.role` mapped: admin/super_admin → **owner**, pic/manager → **manager**, staff/user → **member**.
4. `profiles.current_org_id` set to HSSB for all users.
5. Legacy `company_profile` dropped if present; branding moves to `organizations` row.
