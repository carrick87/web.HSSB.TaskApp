# Production 005e schema snapshot (schema-only)

This directory holds the **production baseline at migration `005e`** for local replay.

| File | Purpose |
|------|---------|
| `stubs-roles.sql` | Extensions + Supabase roles (`anon`, `authenticated`, `service_role`, `authenticator`, …) |
| `stubs-auth-helpers.sql` | Idempotent `auth.jwt()` / `auth.role()` (also present in snapshot) |
| `stubs.sql` | Full minimal stubs (roles + auth/storage shell); use for custom setups |
| `prod-005e-schema.sql` | Schema-only dump: 15 public tables, 61 RLS policies, `private` helpers, storage buckets |
| `fingerprint.sql` | Catalog fingerprint + table/policy counts |

## Regenerate `prod-005e-schema.sql`

If Carrick provides an updated `uploads/prod-schema-snapshot.sql`, replace `prod-005e-schema.sql` with that file (schema-only, no secrets).

To rebuild from this repo’s 001–005 equivalent (when no upload is available):

```bash
# build DB, then pg_dump --schema-only (see scripts/replay-migrations.sh comments)
```

## Replay

```bash
bash scripts/replay-migrations.sh
```

Loads `stubs-roles.sql` → `prod-005e-schema.sql` → seed → `006`–`017` twice → RLS matrix → production paths.
