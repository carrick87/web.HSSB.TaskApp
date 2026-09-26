#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
export DB_NAME="${DB_NAME:-taskapp_replay}"
bash "$ROOT/scripts/replay-migrations.sh"
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$DB_NAME" -f "$(dirname "$0")/rerun_011_checks.sql"
python3 "$(dirname "$0")/gen_rls_tests.py"
bash "$(dirname "$0")/run_tests.sh"
