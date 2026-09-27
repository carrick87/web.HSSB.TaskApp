-- Extra fixtures for independent RLS matrix (superuser; runs after replay migrations)
\set ON_ERROR_STOP on

INSERT INTO organizations (id, name, short_name, slug, status)
VALUES ('b2000000-0000-0000-0000-000000000002'::uuid, 'Isolation B', 'ISOB', 'isolation-test-b', 'active')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO branches (id, name, org_id)
VALUES ('b2000000-0000-0000-0000-000000000010'::uuid, 'B Branch', 'b2000000-0000-0000-0000-000000000002'::uuid)
ON CONFLICT (id) DO NOTHING;

INSERT INTO departments (id, branch_id, name, org_id)
VALUES (
  'b2000000-0000-0000-0000-000000000011'::uuid,
  'b2000000-0000-0000-0000-000000000010'::uuid,
  'B Dept',
  'b2000000-0000-0000-0000-000000000002'::uuid
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.users (id, email)
VALUES ('b3000000-0000-4000-8000-000000000005'::uuid, 'iso_b@example.com')
ON CONFLICT DO NOTHING;

INSERT INTO profiles (id, username, auth_email, role, status, current_org_id)
VALUES (
  'b3000000-0000-4000-8000-000000000005'::uuid,
  'iso_b_member',
  'iso_b@example.com',
  'user',
  'active',
  'b2000000-0000-0000-0000-000000000002'::uuid
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO organization_members (org_id, user_id, role, status)
VALUES ('b2000000-0000-0000-0000-000000000002'::uuid, 'b3000000-0000-4000-8000-000000000005'::uuid, 'member', 'active')
ON CONFLICT (org_id, user_id) DO NOTHING;

INSERT INTO auth.users (id, email)
VALUES ('b4000000-0000-4000-8000-000000000099'::uuid, 'noorg@example.com')
ON CONFLICT DO NOTHING;

INSERT INTO profiles (id, username, auth_email, role, status, current_org_id)
VALUES (
  'b4000000-0000-4000-8000-000000000099'::uuid,
  'no_org_user',
  'noorg@example.com',
  'user',
  'active',
  NULL
)
ON CONFLICT (id) DO NOTHING;
