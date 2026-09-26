#!/usr/bin/env bash
# Copy Carrick's uploaded prod-schema-snapshot.sql into the repo baseline path.
set -euo pipefail
SRC="${1:-uploads/prod-schema-snapshot.sql}"
DEST="$(cd "$(dirname "$0")/.." && pwd)/supabase/snapshots/prod-005e-schema.sql"
if [[ ! -f "$SRC" ]]; then
  echo "Missing $SRC" >&2
  exit 1
fi
cp "$SRC" "$DEST"
echo "Installed $DEST"
echo "Run: bash scripts/replay-migrations.sh"
