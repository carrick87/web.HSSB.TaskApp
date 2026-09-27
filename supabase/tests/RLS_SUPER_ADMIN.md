# RLS and helpers — super admin feature (006–008)

Apply migrations `006_super_admin_foundation.sql`, `007_rls_super_admin_policies.sql`, and `008_company_branding_storage.sql` in order on a staging database before running these checks.

## Helper functions

| Function | Meaning |
|----------|---------|
| `public.user_role()` | Current user's `profiles.role` |
| `public.user_is_active()` | `profiles.status = 'active'` for current user |
| `public.is_super_admin()` | Active and role `super_admin` |
| `public.is_manager()` | Active and role `manager` |
| `public.is_elevated()` | Active and role in (`super_admin`, `manager`) |

Legacy roles in the database are migrated by 006 (`admin`→`super_admin`, `pic`→`manager`, `staff`→`user`).

## Manual SQL checks (run as authenticated roles via Supabase SQL or JWT simulation)

1. **Company profile read (anon/authenticated)**  
   As any user or anon: `SELECT name, logo_path FROM company_profile;` — should succeed (policy `company_profile_select_public`).

2. **Company profile write**  
   As `manager` or `user`: `UPDATE company_profile SET name = 'X' WHERE id = '00000000-0000-0000-0000-000000000001';` — should fail.  
   As `super_admin`: same update — should succeed.

3. **Profiles admin**  
   As `super_admin`: `SELECT * FROM profiles;` — succeed.  
   As `user`: selecting another user's row — denied except own row (existing policies + 007).

4. **Last super admin trigger**  
   With only one active `super_admin`, attempt:  
   `UPDATE profiles SET role = 'manager' WHERE role = 'super_admin' AND status = 'active';`  
   if that would leave zero active super admins — trigger `ensure_minimum_super_admin` raises an exception.

5. **Storage `company-branding`**  
   Public read on bucket objects. Insert/update/delete only when `public.is_super_admin()` is true (008).

## App-layer enforcement (defense in depth)

- `/admin/*` layout: `requireSuperAdmin()` (legacy `admin` treated as super admin until DB migration).
- Privileged mutations: `/api/admin/*` routes use `getAuthenticatedProfile()` + service role for auth bans and user creation.
- Deactivated users: login API rejects; `requireProfile` redirects; RLS helpers require `user_is_active()`.
