> Historical Step 08 report. Step 09 supersedes its development-identity startup
> instructions and earlier database-readiness findings. Read-only inspection on
> November 10, 2026 confirmed V1–V4 and both restricted roles on port 5433.
> See [the current architecture and verification](authentication-and-authorization.md).

# Step 08 verification and readiness

Verified November 10, 2026 using Java 21, Spring Boot 4.1.2, Python 3.12.16,
and real PostgreSQL 16.15. This is an implementation/verification reference,
not the formal Steps 06–08 execution log.

## Outcome

The application implementation and isolated acceptance workflow pass. **Full
Step 08 sign-off remains pending development database provisioning on port 5433.**
That installation has V1 only, no `trace_migrator` or `trace_runtime`, and no
operator-supplied role secrets in the execution environment. It was inspected
read-only and left unchanged. `.env` and the development Docker volume were not
modified. No administrator credentials were guessed.

The directory has no `.git`, so Git status/diff could not be inspected. Files
were audited directly. SHA-256 checks before and after implementation confirmed
V1, V2, and V3 are byte-for-byte unchanged.

## Implemented and preserved

- Layered controllers/services/repositories, typed request/response DTOs, separate
  persistence records and mappers, import lifecycle enum, centralized safe errors.
- Real stateless FastAPI CSV parser; ordinary and legacy input compatibility,
  Pydantic response models, bounded input, normalization and row diagnostics.
- Transactional preview/commit/status, per-dataset comparisons, persisted actual
  statistics, expiry, provenance, duplicate prevention, incremental columns,
  deterministic catalog details/column APIs, search and pagination.
- Functional React import, preview, warnings/errors, commit, catalog, and detail
  screens with loading/empty/failure states. Backend-only API access and read-only
  server-selected organization label. No runtime demonstration data.
- Preserved organizations/users/teams/memberships, forced RLS, composite tenant
  FKs, restricted runtime guard, narrow membership lookup, transaction-local
  context, explicit verified identity, local-only access, and all earlier isolation
  assertions. Configuration/filter classes moved to `config/` and `security/`.
- Provisioning preflight now refuses missing/equal/empty role secrets before
  changes and is transactional. The local fixture opt-in fails with a nonzero
  PostgreSQL 16 exit status. Existing fixtures and UUIDs remain unchanged.

## New migration

`V4__metadata_import_results.sql` adds comparison/results JSON, per-dataset preview
changes, display filename/file size, 24-hour expiry, composite organization/import
FKs on asset/column last-import provenance, and scoped catalog/provenance indexes.
Existing tables, RLS policies, grants, and UUIDs are retained. No new tenant-owned
table is introduced.

Other significant new files: catalog controller/service/repositories; source
connection repository; typed entity/DTO/mapper classes; centralized exceptions;
processor importer/schema modules; processor-client tests; feature-based React
screens and API contracts; three CSV fixtures; root development README.

## Actual test/build results

| Check | Result |
| --- | --- |
| Maven `test`, with `TRACE_TEST_ADMIN_URL` | 25 passed; 0 failures/errors/skipped |
| Configuration/local-access tests | 4 passed (included in 25) |
| Processor HTTP client/failure tests | 4 passed (included in 25) |
| Real PostgreSQL integration tests | 17 passed (included in 25) |
| Real Python→Spring→PostgreSQL HTTP workflow | Passed (included in 17 integration tests) |
| Maven `package` and final `clean package`, same isolated URL | Passed, including all 25 tests; fresh database and no stale generated artifacts |
| Python `unittest` | 20 passed |
| TypeScript + Vite production build | Passed |
| Frontend `oxlint` | Passed without warnings |
| Browser checks against real services | Passed: upload, preview, commit, catalog, details, invalid CSV, empty search, backend failure |
| Migration-only packaged startup | Passed with separate migrator/runtime test credentials; Flyway validated V1–V4 |
| Role bootstrap script, test DB | Passed with known test secrets; missing secrets rejected with exit 3 before changes |
| Local fixture script as test migrator | Passed, repeat is idempotent; missing opt-in rejected with exit 3 |

No frontend unit-test framework was installed. Browser checks are manual agent-driven
checks, distinct from the automated Maven/Python suites. Transport stubs are used
only in processor-client error tests and one preserved backend transport test;
the end-to-end integration test and browser import use the **real Python service**.

An intermediate package run overlapped with a fixture-script validation and hit a
fixture uniqueness collision in the disposable database. The checks were separated;
the clean rerun passed. This did not involve the development database.

## Acceptance cases

| Case | Observed result |
| --- | --- |
| Initial NovaMart import | 2 datasets, 5 columns, COMMITTED; database ownership checked |
| Preview isolation | No canonical assets/columns created by preview |
| Duplicate import | 0 new datasets, 0 new columns; 2 unchanged datasets/5 unchanged columns; stable UUIDs |
| Incremental import | 1 new column; existing asset UUIDs retained; 6 columns total |
| Invalid missing `data_type` header | HTTP 422 with required headers; no canonical changes; application stays operational |
| NovaMart/RetailHub same names | Independent UUIDs and successful imports in both organizations |
| Foreign UUIDs/imports | Asset/batch GET and batch commit rejected with indistinguishable 404s; foreign columns rejected |
| Tenant-aware references | Cross-organization asset/column/lineage/team/import/provenance FKs rejected with SQLSTATE 23503 |
| Connection reuse | Same physical PostgreSQL connection; no residual context after commit/rollback or tenant change; missing-context reads empty and writes rejected |
| Atomic failure | Injected late column failure rolls back earlier updates/new asset creation and leaves batch uncommitted |
| Concurrent batches | Four runtime connections; competing batches create one asset/column and report actual new/unchanged counts |
| Retry | Repeated commit returns the original saved results and timestamp |
| Human metadata | Ownership/descriptions retained; data type updated; omitted columns kept |
| Existing Step 07 APIs | Registry status and scoped asset listing work; legacy migration UUID retained |

The browser run used the real demo fixture and created two new datasets/five
columns alongside a pre-existing isolated-test dataset. Its catalog therefore
showed three assets; the fresh automated acceptance case asserted exactly two.

## Remaining operational action

Follow [the root README](../README.md#configure-the-actual-development-database):

1. Supply administrator credentials and distinct migration/runtime secrets.
2. Run `backend/ops/bootstrap-roles.sql` on 127.0.0.1:5433/trace.
3. Apply Flyway using the packaged migration-only startup command.
4. Run `backend/ops/local-dev-fixture.sql` with explicit local-only opt-in.
5. Start the backend with `trace_runtime`, confirm V1–V4 migration history and a
   successful runtime guard, then start the parser/frontend and repeat the CSV flow.

An existing Java Trace process occupied port 8080; it was left untouched. Browser
verification used a separate backend on 8081, parser on 8000, frontend on 5173,
and disposable database on 55433. Agent-started application/test services are
stopped after verification; the original development services remain untouched.

There is no Step 09 authentication/RBAC, organization switching, metric versioning,
SQL lineage extraction, impact analysis, approval workflow, or live connector.
The absence of authentication intentionally prevents public deployment.
