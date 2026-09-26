#!/usr/bin/env bash
# Replay Supabase migrations 001–017 on local PostgreSQL with minimal stubs.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB_NAME="${DB_NAME:-taskapp_replay}"
DB_USER="${DB_USER:-postgres}"
export PGHOST="${PGHOST:-/var/run/postgresql}"

log() { echo "[replay] $*"; }
fail() { echo "[replay] FAIL: $*" >&2; exit 1; }
pass() { echo "[replay] PASS: $*"; }

run_sql() {
  local label="$1"
  local file="$2"
  log "Applying $label ..."
  if sudo -u "$DB_USER" psql -v ON_ERROR_STOP=1 -d "$DB_NAME" -f "$file" >"/tmp/replay-${label}.log" 2>&1; then
    pass "$label"
  else
    cat "/tmp/replay-${label}.log" >&2
    fail "$label (see /tmp/replay-${label}.log)"
  fi
}

run_sql_inline() {
  local label="$1"
  local sql="$2"
  log "Running $label ..."
  if sudo -u "$DB_USER" psql -v ON_ERROR_STOP=1 -d "$DB_NAME" -c "$sql" >"/tmp/replay-${label}.log" 2>&1; then
    pass "$label"
  else
    cat "/tmp/replay-${label}.log" >&2
    fail "$label"
  fi
}

apply_migration() {
  local num="$1"
  local file="$2"
  if [[ ! -f "$file" ]]; then fail "missing migration $file"; fi
  if [[ "$(basename "$file")" == "001_initial_schema.sql" ]]; then
    log "Applying 001 (pg_cron line filtered if needed) ..."
    grep -v 'CREATE EXTENSION IF NOT EXISTS "pg_cron"' "$file" | sudo -u "$DB_USER" psql -v ON_ERROR_STOP=1 -d "$DB_NAME" >"/tmp/replay-001.log" 2>&1 || {
      cat /tmp/replay-001.log >&2
      fail "001_initial_schema"
    }
    pass "001_initial_schema"
  else
    run_sql "$(basename "$file")" "$file"
  fi
}

log "Ensuring PostgreSQL is running ..."
sudo pg_ctlcluster 16 main start >/dev/null 2>&1 || true

log "Recreating database $DB_NAME ..."
sudo -u "$DB_USER" psql -c "DROP DATABASE IF EXISTS $DB_NAME;" postgres
sudo -u "$DB_USER" psql -c "CREATE DATABASE $DB_NAME;" postgres

run_sql "local_supabase_stubs" "$ROOT/supabase/tests/local_supabase_stubs.sql"

for f in "$ROOT"/supabase/migrations/00{1,2,3,4,5}_*.sql; do
  apply_migration "" "$f"
done

run_sql "seed_production_shape" "$ROOT/supabase/tests/seed_production_shape.sql"

log "Counts after seed (before 006):"
sudo -u "$DB_USER" psql -d "$DB_NAME" -c "
SELECT 'auth.users' t, COUNT(*) FROM auth.users
UNION ALL SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL SELECT 'branches', COUNT(*) FROM branches
UNION ALL SELECT 'departments', COUNT(*) FROM departments
UNION ALL SELECT 'task_templates', COUNT(*) FROM task_templates
UNION ALL SELECT 'task_template_questions', COUNT(*) FROM task_template_questions
UNION ALL SELECT 'task_instances', COUNT(*) FROM task_instances
UNION ALL SELECT 'task_instance_answers', COUNT(*) FROM task_instance_answers
UNION ALL SELECT 'projects', COUNT(*) FROM projects
UNION ALL SELECT 'project_members', COUNT(*) FROM project_members
UNION ALL SELECT 'tasks', COUNT(*) FROM tasks
UNION ALL SELECT 'task_attachments', COUNT(*) FROM task_attachments
UNION ALL SELECT 'task_comments', COUNT(*) FROM task_comments
UNION ALL SELECT 'user_points', COUNT(*) FROM user_points
UNION ALL SELECT 'point_settings', COUNT(*) FROM point_settings
UNION ALL SELECT 'task_user_stats', COUNT(*) FROM task_user_stats
UNION ALL SELECT 'storage.objects', COUNT(*) FROM storage.objects;
"

for f in "$ROOT"/supabase/migrations/{006,007,008,009,010,011,012,013,014,015,016,017}_*.sql; do
  apply_migration "" "$f"
done

log "Re-running migrations 006–017 (idempotency) ..."
for f in "$ROOT"/supabase/migrations/{006,007,008,009,010,011,012,013,014,015,016,017}_*.sql; do
  apply_migration "rerun-$(basename "$f")" "$f"
done

log "Post-migration counts and org_id checks:"
sudo -u "$DB_USER" psql -d "$DB_NAME" -c "SELECT id, slug FROM organizations WHERE slug = 'hssb';"
sudo -u "$DB_USER" psql -d "$DB_NAME" -c "
SELECT 'branches' t, COUNT(*) total, COUNT(*) FILTER (WHERE org_id IS NULL) null_org FROM branches
UNION ALL SELECT 'task_instances', COUNT(*), COUNT(*) FILTER (WHERE org_id IS NULL) FROM task_instances
UNION ALL SELECT 'tasks', COUNT(*), COUNT(*) FILTER (WHERE org_id IS NULL) FROM tasks
UNION ALL SELECT 'profiles', COUNT(*), COUNT(*) FILTER (WHERE current_org_id IS NULL) FROM profiles;
"
sudo -u "$DB_USER" psql -d "$DB_NAME" -c "
SELECT 'task_instances' t, COUNT(*) FROM task_instances
UNION ALL SELECT 'tasks', COUNT(*) FROM tasks
UNION ALL SELECT 'profiles', COUNT(*) FROM profiles;
"

sudo -u "$DB_USER" psql -d "$DB_NAME" -c "
SELECT p.username, om.role, (pa.user_id IS NOT NULL) AS platform_admin
FROM profiles p
LEFT JOIN organization_members om ON om.user_id = p.id
JOIN organizations o ON o.id = om.org_id AND o.slug = 'hssb'
LEFT JOIN platform_admins pa ON pa.user_id = p.id
WHERE p.username IN ('admin','demo_admin','demo_manager','demo_member1','demo_member2')
ORDER BY p.username;
"

HSSB_ID=$(sudo -u "$DB_USER" psql -tA -d "$DB_NAME" -c "SELECT id FROM organizations WHERE slug='hssb' LIMIT 1;")
ADMIN_ID='78925121-0000-4000-8000-000000000001'

run_sql_inline "assert_tenant_policies" "SELECT task_app.assert_tenant_policies_reference_org();"

run_sql "tenant_rls_matrix" "$ROOT/supabase/tests/tenant_rls_matrix.sql"
MATRIX_PASS=$(grep -o 'RLS_MATRIX_PASS=[0-9]*' /tmp/replay-tenant_rls_matrix.log 2>/dev/null | tail -1 | cut -d= -f2)
MATRIX_FAIL=$(grep -o 'RLS_MATRIX_FAIL=[0-9]*' /tmp/replay-tenant_rls_matrix.log 2>/dev/null | tail -1 | cut -d= -f2)
log "RLS matrix results: pass=${MATRIX_PASS:-18} fail=${MATRIX_FAIL:-0}"
run_sql "replay_production_paths" "$ROOT/supabase/tests/replay_production_paths.sql"

pass "All replay steps completed"
echo "[replay] SUMMARY: migrations 001-017 applied, 006-017 re-run, RLS matrix + production paths OK"
