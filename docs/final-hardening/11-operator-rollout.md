# Operator-controlled rollout

**This hardening task did not migrate/reset development, change its accounts, or stop its JVM. Initial read-only history was V5; a final read-only check observed V15 and a replacement JVM after concurrent operator activity. Gate G remains PENDING VERIFICATION because this task has not verified that operator’s backup/restore, login and preserved-data smoke evidence.** See the [final read-only observation](evidence/development-final-read-only-observation.txt) and [runtime observation](evidence/environment.json). Existing acceptance on 55433 was observed at V10 and was not reset by this task. The commands below are the V5-baseline procedure; do not reapply completed migrations or assume a later PID is the original service. Inspect current state first. The older [Step 10 rollout](../step10/operator-rollout.md) is historical background; this runbook supersedes its artifact/start commands for V15.

## Development preflight and preservation

1. Arrange a maintenance window. Inspect listeners and exact commands with `lsof -nP -iTCP -sTCP:LISTEN` and `ps -p <exact-pid> -o command=`. The observed development process uses `backend/target/backend-0.0.1-SNAPSHOT.jar` and `5433/trace`; do not infer that a later PID/port is the same service.
2. Preserve the real connector encryption key and processor token in operator secret storage. Never substitute this task's synthetic acceptance key or generate a replacement for existing ciphertext. Key re-encryption tooling is not implemented.
3. Back up as the real database administrator, not the runtime role. Keep the backup outside the repository with private permissions. Example in Bash (enter actual private role passwords at prompts):

```bash
umask 077
trace_backup_dir="$HOME/.local/state/trace-backups"
mkdir -p "$trace_backup_dir"
read -r -s -p 'Database administrator password: ' TRACE_BACKUP_PASSWORD; printf '\n'
trace_backup="$trace_backup_dir/trace-before-v15-$(date +%Y%m%dT%H%M%S).dump"
PGPASSWORD="$TRACE_BACKUP_PASSWORD" pg_dump -h 127.0.0.1 -p 5433 -U trace -d trace \
  --format=custom --file="$trace_backup"
unset TRACE_BACKUP_PASSWORD
pg_restore --list "$trace_backup" > "$trace_backup.toc"
shasum -a 256 "$trace_backup"
```

Restore and smoke that backup on a newly created disposable PostgreSQL server before production/development migration. A table-of-contents check alone is not a restore rehearsal. Never restore over 5433/trace or 55433 acceptance. Capture before/after read-only UUID/count/fingerprint projections, including the existing [fingerprint query](../step10/rollout-fingerprints.sql); compare old columns, since new columns/tables are additive.

4. Resolve the explicit legacy quarantine decision. Read-only preflight found `00000000-0000-0000-0000-000000000001` / `legacy-unassigned` active with zero members/owners. The safe default is to keep this legacy data unassigned and explicitly suspend the quarantine organization through Platform after rollout, preserving its data. If adoption is desired instead, obtain an intentional owner/data-access decision and a separately reviewed operator procedure; do not grant the platform administrator implicit private membership or invent an owner in a migration. Do not silently treat this check as satisfied.
5. Check pending migrations, V1–V10 checksums, duplicate active mappings, valid role grants, original administrator identity and the intended database URL. Existing mapped lineage must not be deleted to make a unique index pass.

## Build immutable artifacts before stopping the service

Run from repository root. This script builds in a temporary backend copy and stages a read-only SHA-256-named JAR outside `target/`; it cannot replace the JAR currently mapped by the old JVM.

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
env -u TRACE_TEST_ADMIN_URL -u TRACE_TEST_ALLOW_RESET backend/ops/build-release.sh
npm --prefix frontend ci
npm --prefix frontend test
npm --prefix frontend run build
npm --prefix frontend run lint
```

Record the exact returned release path/hash. Do not choose a release using an ambiguous wildcard. Unset test URLs for a normal build; that build intentionally skips database integration tests, so it does not replace the isolated 96-test release evidence.

Stop only the inspected development PID using its existing terminal/supervisor or an exact `kill -TERM <verified-pid>`. Wait until its listener stops. No broad process-kill command is appropriate. Leave unrelated PostgreSQL, Python, Vite and existing acceptance processes alone.

## Migrate the intended database explicitly

```bash
export TRACE_RELEASE_JAR=/absolute/path/from/build-output/trace-v15-SHA256.jar
export TRACE_DATABASE_URL=jdbc:postgresql://localhost:5433/trace
read -r -s -p 'Migration-role password: ' TRACE_MIGRATION_PASSWORD; printf '\n'
read -r -s -p 'Runtime-role password: ' TRACE_RUNTIME_PASSWORD; printf '\n'
export TRACE_MIGRATION_PASSWORD TRACE_RUNTIME_PASSWORD
"$JAVA_HOME/bin/java" -jar "$TRACE_RELEASE_JAR" --migrate-only
```

This is an operator action, not a command run by the hardening agent against development. Flyway validates and applies V6–V15 in order; the final runtime-role/schema guard must succeed. Do not edit historical SQL/checksums or issue Flyway repair to hide a mismatch. V11 resumes legacy unleased discovery without changing run IDs. Uncommitted old previews must be recreated; committed imports/results/UUIDs remain. V15 prevents new owner-transition races; it does not retroactively assign ownership.

If any step fails, keep the application stopped, retain the logs, diagnose that exact database and use the tested backup/recovery procedure. Do not run the old JAR against a newly upgraded schema without an explicitly verified compatibility path. Restoring the pre-migration backup is the rollback mechanism, with the associated maintenance-window data-loss boundary; there is no fabricated reverse Flyway migration.

## Start the matched services

Start the real processor as `app:app`, with the real private token, on loopback 8000 (or an explicitly configured port). `tests.acceptance_processor:app` is only for synthetic acceptance and must never be the normal operator entry point.

```bash
# Separate processor terminal, private TRACE_PROCESSOR_TOKEN already exported:
(cd processor && .venv/bin/uvicorn app:app --host 127.0.0.1 --port 8000)

# Separate backend terminal; real stable encryption key/token already exported:
export TRACE_SERVER_PORT=8081
export TRACE_LOCAL_SIGNUP_ENABLED=true
export TRACE_LOCAL_TOKEN_DELIVERY=true
backend/ops/start-release.sh --spring.profiles.active=local-dev
```

`start-release.sh` requires explicit artifact/database/port, rejects `target/` artifacts and occupied ports, disables automatic startup migration and lets the compatibility/role guard fail visibly. Public signup/token delivery are only valid in the exclusive loopback local-dev profile. Use HTTPS/secure cookies and disable these local features outside that scope.

Point Vite at the intended backend (`TRACE_BACKEND_URL=http://127.0.0.1:8081 npm --prefix frontend run dev`). Check liveness, readiness, database and processor separately:

```bash
curl -fsS http://127.0.0.1:8081/actuator/health/liveness
curl -fsS http://127.0.0.1:8081/actuator/health/readiness
curl -fsS http://127.0.0.1:8081/actuator/health/database
curl -fsS http://127.0.0.1:8081/actuator/health/processor
```

Sign in with the existing administrator; do not bootstrap or reset it. Verify local signup creates no memberships, tenant switching, a real manual/file source, preview/commit/reimport, old catalog UUIDs, source/column history, manual lineage, draft/registered formula, metric usage/revoke and viewer denial. Recheck preserved fingerprints, review pre-V13 acquired-column nullable/ordinal overrides (old provenance may not distinguish manual values; explicitly re-save confirmed curation through the authorized UI), and complete the legacy quarantine decision. Provider connection status is a separate, authorized live smoke gate.

## Reproduce isolated browser acceptance

Use a fresh named disposable 55437 container from the [test commands](10-end-to-end-test-results.md). Do not reset existing 55433 fixtures. After the Java suite provisions the two restricted roles, create the separate browser database once:

```bash
docker exec trace-final-hardening-db psql -U trace_test_admin -d postgres -v ON_ERROR_STOP=1 \
  -c 'CREATE DATABASE trace_hardening_browser'
docker exec trace-final-hardening-db psql -U trace_test_admin -d trace_hardening_browser -v ON_ERROR_STOP=1 \
  -c 'REVOKE CREATE ON SCHEMA public FROM PUBLIC; GRANT USAGE,CREATE ON SCHEMA public TO trace_migrator; GRANT USAGE ON SCHEMA public TO trace_runtime;'
python3 backend/ops/seed-hardening-browser.py --initialize-secrets
# Use the exact immutable release from build output:
printf '%s' "$TRACE_RELEASE_JAR" > /tmp/trace-final-hardening/release-path
python3 backend/ops/start-hardening-service.py migrate
python3 backend/ops/seed-hardening-browser.py
```

In separate terminals run `start-hardening-service.py processor`, `start-hardening-service.py backend`, and `TRACE_BACKEND_URL=http://127.0.0.1:18082 npm --prefix frontend run dev -- --port 15174`. Then:

```bash
TRACE_BROWSER_ACCEPTANCE=disposable npm --prefix frontend run test:browser
```

The seed helper rejects unknown identities/organizations or incompatible schemas. Reruns require an explicit `--reset` of those recognized disposable fixtures; run it only when no test is active. Private generated credentials stay under `/tmp/trace-final-hardening`, never in source control. Playwright uses a separate Chrome profile; screenshots of synthetic data are safe evidence, failure traces remain private temporary files.

For process recovery, first stop only the task-owned backend using that browser database so another worker cannot claim the rehearsal job. The script itself starts/stops only child PIDs it creates and does not reset the database:

```bash
TRACE_TEST_EXCLUSIVE_WORKERS=true python3 backend/ops/verify-process-recovery.py
```

It starts separate backend/processor children on 18083/18003, performs Java restart and Python stop/restore, writes safe JSON evidence and shuts its children down. Restart the normal isolated backend afterward. Clean up only this explicitly created disposable container when acceptance is finished; retain requested evidence/private test state as appropriate.
