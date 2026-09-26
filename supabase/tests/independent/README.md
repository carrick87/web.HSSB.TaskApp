# Independent multitenant RLS harness

This directory holds a **reconstructed** replay harness aligned with the review checklist (229-case matrix, 011 re-run checks). The attached `replay-tests.tar.gz` was **not present** on the cloud VM (`uploads/` empty); if you have the original tarball, replace these files with yours and re-run.

## Files

| File | Purpose |
|------|---------|
| `run_replay.sh` | Full `scripts/replay-migrations.sh` + 011 checks + generate + test |
| `run_tests.sh` | Apply `rls_setup.sql` + `rls_tests.sql` on existing `taskapp_replay` DB |
| `rls_setup.sql` | Org B isolation fixtures + no-org user |
| `gen_rls_tests.py` | Generates `rls_tests.sql` (229 cases) |
| `rls_tests.sql` | Generated matrix (committed so CI/agents need not run Python) |
| `rerun_011_checks.sql` | Post–second-pass 011 idempotency assertions |
| `seed.sql` | Pointer to repo seed used by replay |
| `stubs_extra.sql` | No-op placeholder for extra auth stubs |

## Usage

```bash
bash supabase/tests/independent/run_replay.sh
# or after a replay DB already exists:
bash supabase/tests/independent/run_tests.sh
```

Target: `RLS_MATRIX_FAIL=0` (229 passes).
