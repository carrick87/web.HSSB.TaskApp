#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
DB_NAME="${DB_NAME:-taskapp_replay}"
DB_USER="${DB_USER:-postgres}"
export PGHOST="${PGHOST:-/var/run/postgresql}"

sudo -u "$DB_USER" psql -v ON_ERROR_STOP=1 -d "$DB_NAME" -f "$DIR/rls_setup.sql"
sudo -u "$DB_USER" psql -v ON_ERROR_STOP=1 -d "$DB_NAME" -f "$DIR/rls_tests.sql" | tee /tmp/independent-rls.log
grep -E 'RLS_MATRIX_(PASS|FAIL)=' /tmp/independent-rls.log || true
