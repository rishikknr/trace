# Local Overview runtime mismatch

On November 11, the UI at `127.0.0.1:5173/#overview` was serving the current
frontend while its proxy reached the older Java process on port 8081. That
process had no `BrowseController`; the frontend's `/api/browse/*` requests
therefore produced the generic “Request could not be accepted” response.
Read-only inspection confirmed that `5433/trace` still had migrations V1–V5.
The current release requires integration version 3 and schema contract V15.

Overview now checks compatibility before requesting browse data and reports
the required backend/database upgrade. Integration selectors share that check.
This diagnostic change does not upgrade the database.

The operator approved the local upgrade in this chat. A private, fully readable
custom-format backup and a verified immutable V15 JAR have been prepared under
the ignored `.trace-local/` directory. Complete the repair in your terminal:

```sh
python3 backend/ops/upgrade-local.py
```

Use the existing `trace_migrator` and `trace_runtime` passwords at the hidden
prompts, or export them privately in the invoking shell. The launcher checks
both passwords before stopping the old backend. It does not change passwords
or provision accounts. Database passwords are not saved to disk.

The launcher pins the target to `127.0.0.1:5433/trace` and refuses an unexpected
baseline, artifact checksum, occupied processor port, or unrelated backend.
After stopping the inspected backend, it takes a fresh verified backup with
writers stopped, applies Flyway migrations using the restricted migrator, and
checks every original table's baseline columns for preservation. It then starts
the actual Python processor on 8000 and the matching backend on 8081, retaining
the frontend on 5173. An existing unassigned legacy organization stays unassigned.

Private backups, service logs, and process IDs live in `.trace-local/`. The
new processor token and connector encryption key are saved in its private
`security.json`; keep that key when storing connector credentials. The launcher
does not restore backups automatically if a check fails. Inspect its logs before
any recovery action.

After successful completion, sign in again using your existing account and open
Overview. Backend restart expires the previous in-memory session.

Frontend verification: four Node utility tests and 36 Vitest tests pass, including
missing/older backend versions and successful Overview totals. Production build
and lint pass. The operator ran the launcher with private password entry at
11:06 IST on November 11, 2026. All 15 Flyway migrations are successful, the
schema reports V15, and every baseline table projection matches. Both database
roles remain non-superuser without BYPASSRLS. Backend health/readiness, processor
health, and registration through the frontend proxy all pass. The preserved
backup is `.trace-local/backups/20261111T053620Z/`. Authenticated Overview still
requires the user to sign in again after the backend restart.
