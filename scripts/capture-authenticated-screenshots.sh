#!/usr/bin/env bash
# Capture authenticated screenshots (requires dev server with TEST_AUTH_BYPASS=1).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p /opt/cursor/artifacts/screenshots
fuser -k 3010/tcp 2>/dev/null || true
pkill -f "next dev.*3010" 2>/dev/null || true
sleep 2
cd "$ROOT"
rm -rf .next
TEST_AUTH_BYPASS=1 TEST_AUTH_MOCK=1 TEST_AUTH_MEMBER_ID="${TEST_AUTH_MEMBER_ID:-78925121-0000-4000-8000-000000000006}" PORT=3010 npm run dev >/tmp/next-screenshots.log 2>&1 &
for i in $(seq 1 60); do
  if curl -sf "http://localhost:3010/login" | grep -q "Sign in"; then break; fi
  if curl -sf "http://localhost:3010/login" | grep -q "app-shell"; then break; fi
  sleep 2
done
BASE_URL=http://localhost:3010 TEST_AUTH_USER_ID="${TEST_AUTH_USER_ID:-78925121-0000-4000-8000-000000000001}" TEST_AUTH_MEMBER_ID="${TEST_AUTH_MEMBER_ID:-78925121-0000-4000-8000-000000000006}" npx playwright test tests/authenticated-screenshots.spec.ts --reporter=line
kill $(lsof -t -i:3010) 2>/dev/null || true
