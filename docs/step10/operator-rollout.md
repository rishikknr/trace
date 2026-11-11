# Step 10 development rollout

> Historical report. For the current V15 release, immutable artifact commands and
> protected test databases, follow [final hardening rollout](../final-hardening/11-operator-rollout.md).


The target is the existing Docker Compose service `postgres`, database `trace`,
published on loopback port **5433**. Read-only inspection showed PostgreSQL
16.15 with V1–V5 applied and V6–V10 pending. The upgrade was rehearsed against a
schema-only restore with synthetic records. Run the commands below in order from
the repository root in a Zsh terminal. Stop if any command or expected check
fails. Execution on development is reserved for the operator.

## 1. Verify the target

Confirm the Compose service is the current development instance. Keep the
existing `.env`, volume, database roles and platform administrator. Existing role
passwords come from your private secret store. The reset-based integration suite
belongs on an isolated database.

```zsh
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
"$JAVA_HOME/bin/java" -version
docker compose ps postgres
test "$(docker compose port postgres 5432)" = '127.0.0.1:5433'
docker compose exec -T postgres sh -ec '
  pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"
  psql -X -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -Atc "
    SELECT current_database(), current_setting('\''server_version'\'');"
'
shasum -a 256 -c docs/step10/v1-v8-preserved.sha256
```

Expect Java 21, `trace|16.x`, and all eight SHA-256 checks to pass. Reserve a
private directory for the immutable JAR, backup and verification records.
Retain the directory after rollout.

```zsh
umask 077
mkdir -p "$HOME/trace-backups"
export TRACE_ROLLOUT_DIR=$(mktemp -d "$HOME/trace-backups/step10.XXXXXX")
printf 'Rollout directory %s\n' "$TRACE_ROLLOUT_DIR"
```

## 2. Check pending migrations and stop writers

```zsh
docker compose exec -T postgres sh -ec '
  psql -X -qAt -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
    SELECT version,script,checksum,success FROM public.flyway_schema_history ORDER BY installed_rank;"
' > "$TRACE_ROLLOUT_DIR/flyway-before.tsv"
head -n 5 docs/step10/migration-history.tsv > "$TRACE_ROLLOUT_DIR/expected-v5.tsv"
diff -u "$TRACE_ROLLOUT_DIR/expected-v5.tsv" "$TRACE_ROLLOUT_DIR/flyway-before.tsv"
tail -n +6 docs/step10/migration-history.tsv | cut -d '|' -f 1,2
```

Expect no diff and pending versions 6 through 10 in order. If the history
differs, resolve it before using this V5 runbook. In particular, the V8 audit
found that a pre-existing synchronous RUNNING job can migrate into V10 without
a lease and remain unclaimable. This case cannot arise on the verified V5 path
because the run table is introduced by V7. On an already integrated database,
inspect running jobs before upgrading and treat any such job as a separate
upgrade case. Details are in the [verification report](verification-report.md#20-database-migration-state-and-audit).

Use the existing service terminals or supervisor to stop the development backend
on 8081, frontend on 5173, and processor on 8000. Check listener identities before
stopping a process. Stop any other client that writes to `trace` during rollout.
Keep PostgreSQL running.

```zsh
lsof -nP -iTCP:8081 -iTCP:5173 -iTCP:8000 -sTCP:LISTEN
docker compose exec -T postgres sh -ec '
  psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<'SQL'
BEGIN READ ONLY;
SELECT count(*) AS runtime_sessions
FROM pg_stat_activity WHERE datname = current_database() AND usename = 'trace_runtime';
SELECT
 (SELECT count(*) FROM (
   SELECT 1 FROM public.lineage_edges GROUP BY organization_id,source_asset_id,target_asset_id,relationship_type
   HAVING count(*) > 1
 ) d) AS duplicate_dataset_groups,
 (SELECT count(*) FROM (
   SELECT 1 FROM public.column_lineage GROUP BY organization_id,source_column_id,target_column_id
   HAVING count(*) > 1
 ) d) AS duplicate_column_groups;
COMMIT;
SQL
```

Expect zero runtime sessions and both duplicate counts zero. Duplicates in a V5
database conflict with V7's active lineage indexes and require separate review.

## 3. Build and back up development

Build after the old services stop, since packaging replaces the target JAR and
a running JVM can still need to load classes from it. The build unsets the
reset-suite database variable.

```zsh
env -u TRACE_TEST_ADMIN_URL ./backend/mvnw -f backend/pom.xml package
install -m 400 backend/target/backend-0.0.1-SNAPSHOT.jar "$TRACE_ROLLOUT_DIR/trace-step10.jar"
(cd frontend && npm ci && npm run build && npm run lint)
(cd processor && .venv/bin/python -m pip install -r requirements.txt)
```

Keep writers stopped through the post-migration fingerprint comparison. The
fingerprints cover the V5 column projection of all 15 pre-existing application
tables, including original IDs, memberships, credentials and metadata. The
queries emit only per-table counts and digests.

```zsh
docker compose exec -T postgres sh -ec '
  psql -X -qAt -U "$POSTGRES_USER" -d "$POSTGRES_DB"
' < docs/step10/rollout-fingerprints.sql > "$TRACE_ROLLOUT_DIR/data-before.tsv"

docker compose exec -T postgres sh -ec '
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom
' > "$TRACE_ROLLOUT_DIR/trace-v5.dump"
test -s "$TRACE_ROLLOUT_DIR/trace-v5.dump"
docker compose exec -T postgres pg_restore --list \
  < "$TRACE_ROLLOUT_DIR/trace-v5.dump" > "$TRACE_ROLLOUT_DIR/trace-v5.toc"
rg 'TABLE DATA.*(flyway_schema_history|users|organizations|assets|import_batches)' \
  "$TRACE_ROLLOUT_DIR/trace-v5.toc"
docker compose exec -T postgres pg_restore --exit-on-error --file=/dev/null \
  < "$TRACE_ROLLOUT_DIR/trace-v5.dump"
shasum -a 256 "$TRACE_ROLLOUT_DIR/trace-v5.dump" > "$TRACE_ROLLOUT_DIR/trace-v5.dump.sha256"
```

Expect the listed table data and a successful full archive read. The dump
contains credential hashes and application data. Keep it private with its
checksum. This is a database dump. Keep your existing role and application
secrets separately in the operator's private store.

## 4. Apply pending migrations and verify preservation

This is the development write step. Run it only after the preflight and backup
checks pass. Read the two existing, distinct role passwords into the migration
terminal without terminal echo. `TRACE_DATABASE_URL` is read by `--migrate-only`.

```zsh
read -rs 'TRACE_MIGRATION_PASSWORD?Existing trace_migrator password: '; printf '\n'
read -rs 'TRACE_RUNTIME_PASSWORD?Existing trace_runtime password: '; printf '\n'
export TRACE_MIGRATION_PASSWORD TRACE_RUNTIME_PASSWORD
export TRACE_DATABASE_URL=jdbc:postgresql://localhost:5433/trace
"$JAVA_HOME/bin/java" -jar "$TRACE_ROLLOUT_DIR/trace-step10.jar" --migrate-only
```

Expect Flyway validation, migration from 5 to 10, and a successful exit after
the restricted runtime check. Flyway uses `trace_migrator` and the check uses
`trace_runtime`. Compare all applied checksums and original data before starting
any writer.

```zsh
docker compose exec -T postgres sh -ec '
  psql -X -qAt -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
    SELECT version,script,checksum,success FROM public.flyway_schema_history ORDER BY installed_rank;"
' > "$TRACE_ROLLOUT_DIR/flyway-after.tsv"
diff -u docs/step10/migration-history.tsv "$TRACE_ROLLOUT_DIR/flyway-after.tsv"

docker compose exec -T postgres sh -ec '
  psql -X -qAt -U "$POSTGRES_USER" -d "$POSTGRES_DB"
' < docs/step10/rollout-fingerprints.sql > "$TRACE_ROLLOUT_DIR/data-after.tsv"
diff -u "$TRACE_ROLLOUT_DIR/data-before.tsv" "$TRACE_ROLLOUT_DIR/data-after.tsv"

docker compose exec -T postgres sh -ec '
  psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<'SQL'
BEGIN READ ONLY;
SELECT rolname,rolsuper,rolbypassrls,rolcreatedb,rolcreaterole,rolreplication
FROM pg_roles WHERE rolname IN ('trace_runtime','trace_migrator') ORDER BY rolname;
SELECT count(*) AS tenant_tables,
       count(*) FILTER (WHERE relrowsecurity AND relforcerowsecurity) AS forced_rls,
       count(*) FILTER (WHERE has_table_privilege('trace_runtime',oid,'TRUNCATE')) AS runtime_truncate
FROM pg_class WHERE oid = ANY (ARRAY[
 'public.organizations','public.organization_memberships','public.teams','public.team_memberships',
 'public.source_connections','public.assets','public.asset_columns','public.lineage_edges','public.column_lineage',
 'public.import_batches','public.organization_invitations','public.audit_events',
 'public.connection_secret_storage','public.connection_sync_runs','public.import_mapping_profiles',
 'public.formulas','public.formula_versions','public.formula_dependencies','public.formula_column_dependencies',
 'public.metrics','public.metric_versions','public.report_mappings','public.tags','public.asset_tags',
 'public.asset_curation_history','public.connection_sync_attempts'
]::regclass[]);
SELECT has_schema_privilege('trace_runtime','public','CREATE') AS runtime_schema_create,
       has_table_privilege('trace_runtime','public.user_credentials','SELECT') AS runtime_read_credentials,
       has_table_privilege('trace_runtime','public.connection_sync_runs','UPDATE') AS runtime_update_runs;
COMMIT;
SQL
```

Expect both diffs empty. Expect both roles' listed flags false, **26/26** tenant
tables with forced RLS, zero runtime truncate grants and all three final
privilege checks false. Keep services stopped if there is a mismatch. Preserve
the archive and logs for diagnosis. Any restore is an operator recovery action
from the verified backup with writers stopped. Keep migration history intact.

## 5. Configure and restart services

Load the same high-entropy `TRACE_PROCESSOR_TOKEN` in both service terminals.
Load the base64-encoded 32-byte `TRACE_CONNECTOR_ENCRYPTION_KEY` into the backend.
Keep this key in persistent private secret storage. If a key already protects
stored credentials, use that same key. For a first setup, generate the token
and key in your secret manager before starting services. Keep secret values out
of the repository, shell history, screenshots and logs.

Start the processor in its own terminal from the repository root.

```zsh
read -rs 'TRACE_PROCESSOR_TOKEN?Private shared processor token: '; printf '\n'
export TRACE_PROCESSOR_TOKEN
test -n "$TRACE_PROCESSOR_TOKEN"
(cd processor && exec .venv/bin/uvicorn app:app --host 127.0.0.1 --port 8000)
```

In the migration terminal, which already has `JAVA_HOME`, `TRACE_ROLLOUT_DIR` and
the runtime password, start Spring Boot. With Flyway disabled here, startup
serves only the already verified schema.

```zsh
read -rs 'TRACE_PROCESSOR_TOKEN?Same private shared processor token: '; printf '\n'
read -rs 'TRACE_CONNECTOR_ENCRYPTION_KEY?Persistent connector encryption key: '; printf '\n'
export TRACE_PROCESSOR_TOKEN TRACE_CONNECTOR_ENCRYPTION_KEY
test -n "$TRACE_PROCESSOR_TOKEN"
python3 -c 'import base64, os, sys; sys.exit(0 if len(base64.b64decode(os.environ["TRACE_CONNECTOR_ENCRYPTION_KEY"], validate=True)) == 32 else 1)'
unset TRACE_MIGRATION_PASSWORD
export TRACE_LOCAL_SIGNUP_ENABLED=true
"$JAVA_HOME/bin/java" -jar "$TRACE_ROLLOUT_DIR/trace-step10.jar" \
  --spring.profiles.active=local-dev --server.address=127.0.0.1 --server.port=8081 \
  --spring.datasource.url=jdbc:postgresql://localhost:5433/trace \
  --spring.flyway.enabled=false --trace.processor.url=http://127.0.0.1:8000
```

Start the frontend in its own terminal from the repository root.

```zsh
TRACE_BACKEND_URL=http://127.0.0.1:8081 npm --prefix frontend run dev -- --port 5173
```

Check the actual listeners, Spring health and the Vite proxy.

```zsh
lsof -nP -iTCP:8000 -iTCP:8081 -iTCP:5173 -sTCP:LISTEN
curl -fsS http://127.0.0.1:8081/actuator/health
curl -fsS http://127.0.0.1:5173/api/auth/registration
```

Expect loopback listeners, health `UP` and registration `enabled: true`.
Keep local Sign Up confined to the loopback `local-dev` profile.

## 6. Record operator smoke results

1. Open [development TRACE](http://127.0.0.1:5173/). Sign in with the existing
   platform administrator. Confirm the same profile and Platform access. Select
   an existing organization where that account already has membership. Compare
   existing teams, members, source names and known catalog UUIDs against the
   pre-rollout baseline. Platform access alone does not confer registry access.
2. In a separate private window, use **Sign Up** with a new operator-approved
   smoke account. Expect successful account creation and a return to Sign In.
   Sign in and confirm the new user has no platform access, team or organization
   membership. The original administrator remains usable.
3. In an approved development test organization, follow the
   [manual workflow](browser-acceptance.md#manual-workflow) through team setup,
   manual source save and edit, CSV and JSON preview, explicit commit and catalog
   lookup. Confirm the pre-existing Snowflake CSV flow still previews and commits
   through an authorized source using a controlled test file.
4. Continue through dataset and column mapping, SQL draft and registration,
   metric version and report mapping, and the stored lineage graph. Use unique
   smoke record names. Confirm earlier metadata is still accessible.
5. Record the date, browser, organization, asset and batch IDs, screenshots
   without secrets, and each pass, failure or blocked item. The controlled
   discovery, cancellation and pagination fixtures in the manual script belong
   on the isolated stack. A real provider smoke test requires separately
   authorized vendor credentials and recorded provider evidence.

Discovery uses two workers per backend, one-second polling and 45-second leases
by default. Cancellation prevents an acknowledged run from publishing while the
upstream call may finish at its deadline. `trace.discovery.enabled=false` pauses
workers while the API can still enqueue. The [connector guide](connectors-and-imports.md)
covers provider scope and the [API reference](api.md) covers run history.

Final sign-off requires the browser checklist and these operator checks. The
isolated rehearsal and automated results are recorded in the
[verification report](verification-report.md).
