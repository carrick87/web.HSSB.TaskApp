# Super admin: company profile & user management

See the pull request description for STEP 0 findings, migration order, env vars, and security model.

## Migrations (apply in order on staging, then production)

1. `supabase/migrations/006_super_admin_foundation.sql`
2. `supabase/migrations/007_rls_super_admin_policies.sql`
3. `supabase/migrations/008_company_branding_storage.sql`

## Initial super admin

After **006**, existing `admin` rows become `super_admin`. To promote a specific account manually:

```sql
UPDATE public.profiles
SET role = 'super_admin', status = 'active'
WHERE username = 'your_admin_username';
```

Demo seed (`supabase/seed_demo.sql`) uses `demo_admin` → `super_admin`.

## Environment

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — already required.
- `SUPABASE_SERVICE_ROLE_KEY` — **required on Vercel** for username login lookup, user create/deactivate (auth ban), logo upload, and password reset. Server-only; never expose to the client.

## RLS verification

See `supabase/tests/RLS_SUPER_ADMIN.md`.

## Tests

```bash
npm run build
npx playwright test tests/super-admin-foundation.spec.ts
```

E2E login tests need `SUPABASE_SERVICE_ROLE_KEY` in the environment (or run against a Vercel preview with `VERCEL_SHARE_TOKEN` and `PREVIEW_BASE_URL`).
