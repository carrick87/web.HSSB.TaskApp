# Multi-tenant migration (HSSB live data)

Apply **after** `001`–`005` (skip single-tenant `006`–`009` on new multi-tenant deployments).

## Order

1. `010_multitenant_organizations.sql` — orgs, members, invites, platform admins, audit log, helpers
2. `011_multitenant_org_id_hssb_backfill.sql` — `org_id` columns + HSSB org + memberships
3. `012_multitenant_rls.sql` — org-scoped RLS
4. `013_multitenant_storage.sql` — storage policies with `org_id/` prefix
5. `014_product_notifications_grouping.sql` — grouping labels, notifications, push token table
6. `015_email_notifications.sql` — email outbox, preferences, task watchers, unified notification events (see `docs/EMAIL_NOTIFICATIONS.md`)
7. `016_email_design_preferences.sql` — date format, pause-all, in-app matrix columns, task email thread registry

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

## Platform admin (Carrick)

```sql
UPDATE profiles SET is_platform_admin = true WHERE username = 'demo_admin';
INSERT INTO platform_admins (user_id) SELECT id FROM profiles WHERE username = 'demo_admin'
ON CONFLICT DO NOTHING;
```

## Cross-org RLS tests

See `supabase/tests/MULTITENANT_RLS.md`.
