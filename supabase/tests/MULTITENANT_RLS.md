# Multi-tenant RLS helpers

Org-scoped policies use:

- `public.is_org_member(org_id uuid)`
- `public.is_org_admin(org_id uuid)`
- `public.is_org_manager_or_above(org_id uuid)`
- `public.org_role(org_id uuid)`

There is **no** `task_app.is_org_member` — use `public.is_org_member` only.

Deactivated members: set `organization_members.status = 'deactivated'` → `is_org_member` false → tenant access denied.

Automated checks: `supabase/tests/cross_org_isolation.test.sql`

Local verification:

```bash
# Requires Docker + Supabase CLI
npx supabase start
npx supabase db reset
psql "$DATABASE_URL" -f supabase/tests/cross_org_isolation.test.sql
```

Re-run migrations idempotently:

```bash
for f in supabase/migrations/*.sql; do psql "$DATABASE_URL" -f "$f"; done
```
