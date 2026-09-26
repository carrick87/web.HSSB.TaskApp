# Multi-tenant RLS verification (manual / pgTAP)

Run against a database with migrations `010`–`013` applied. Use two test users in **org A** and **org B**.

## Helpers (must exist)

- `task_app.is_org_member(org_id uuid)`
- `task_app.org_role(org_id uuid)`
- `task_app.is_org_admin(org_id uuid)`
- `task_app.is_platform_admin()`

All helpers: `SECURITY DEFINER`, fixed `search_path`.

## Cross-org isolation (expect deny)

As user **A** (member of org A only), using the anon/authenticated client:

```sql
-- Tasks
SELECT * FROM tasks WHERE org_id = '<org_b_id>'; -- 0 rows

INSERT INTO tasks (org_id, title, ...) VALUES ('<org_b_id>', 'x', ...); -- RLS violation

-- Members
SELECT * FROM organization_members WHERE org_id = '<org_b_id>'; -- 0 rows

-- Organizations (non-member)
UPDATE organizations SET name = 'hack' WHERE id = '<org_b_id>'; -- 0 rows updated / violation

-- Storage (task-attachments)
-- Object path must be `<org_id>/...`; user A cannot upload to org B prefix
```

## Role gating

- **member**: cannot `UPDATE organizations`, cannot insert `organization_members` with admin role.
- **manager**: can manage tasks/templates within org; cannot change org profile.
- **admin/owner**: can update org, invite members; **owner** demotion blocked by last-owner trigger.

## Last owner guard

```sql
-- As owner, attempt to demote self when sole owner → ERROR from trigger
UPDATE organization_members SET role = 'admin'
WHERE org_id = '<org_id>' AND user_id = '<sole_owner_id>';
```

## Deactivated member

Set `organization_members.status = 'deactivated'` → `is_org_member` false → all tenant reads/writes denied for that org.

## Platform admin

User with `profiles.is_platform_admin = true` can list/update org **status** via service routes; org admins cannot set `is_platform_admin`.

## Automated app tests

See `tests/multitenant-foundation.spec.ts` for role-helper and API contract tests (no live Supabase required for unit portions).
