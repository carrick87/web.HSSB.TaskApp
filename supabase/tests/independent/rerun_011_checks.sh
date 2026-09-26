#!/usr/bin/env bash
set -euo pipefail
DB_NAME="${DB_NAME:-taskapp_replay}"
DB_USER="${DB_USER:-postgres}"
export PGHOST="${PGHOST:-/var/run/postgresql}"
DIR="$(cd "$(dirname "$0")" && pwd)"
sudo -u "$DB_USER" psql -v ON_ERROR_STOP=1 -d "$DB_NAME" -f "$DIR/rerun_011_checks.sql"
echo "[independent] rerun_011 checks OK"
