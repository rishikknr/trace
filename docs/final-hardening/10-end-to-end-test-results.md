# Final execution evidence

Date: 11 November 2026, Asia/Kolkata. Counts below describe independently executed checks of this hardening source. Previous Step 09/Step 10/UI reports are historical references, not reused passing evidence.

| Check | Final result | Evidence |
|---|---|---|
| Java / Maven package | 96 tests; 0 failures/errors/skips | [backend-tests.json](evidence/backend-tests.json), [backend-summary.txt](evidence/backend-summary.txt) |
| PostgreSQL integration | 72 HTTP/SQL/security/workflow tests | Same report, `TenantIsolationIntegrationTests` |
| Migration / historical race | 5 tests: V5/V7/V8/V10 upgrades plus actual V14 owner-race reproduction | [migration-and-performance.txt](evidence/migration-and-performance.txt) |
| Java boundary/unit checks | 19: configuration 9, cipher 4, legacy processor 4, private response/schema 2 | Same backend report |
| Python unittest | 111 passed | [python-summary.txt](evidence/python-summary.txt) |
| Frontend | 4 Node helpers + 33 Vitest tests = 37 passed | [frontend-summary.txt](evidence/frontend-summary.txt) |
| TypeScript / Vite / oxlint | Passed | [frontend-build.txt](evidence/frontend-build.txt), [frontend-lint.txt](evidence/frontend-lint.txt) |
| Playwright real Chrome | Final complete suite result recorded in machine report; 13 journeys/check groups | [browser-tests.json](evidence/browser-tests.json) |
| Responsive | 126 workspace + 12 auth checks at six widths | [browser-observations.json](evidence/browser-observations.json) |
| Automated accessibility | Zero axe violations on Overview plus 17 selected loaded surfaces | Same browser observations |
| Real Java / processor restart | Passed with explicit process IDs, same run ID, interrupted attempt, retry and no automatic commit | [process-recovery.json](evidence/process-recovery.json) |
| V1–V10 migration bytes | Preserved against initial manifest | [migration-preservation.txt](evidence/migration-preservation.txt) |
| Existing databases | Read-only history/role/legacy-owner inspections; final development schema observation V15 after concurrent operator activity | [development audit](evidence/development-read-only-audit.txt), [existing acceptance](evidence/existing-acceptance-read-only-audit.txt) |

## Reproduction

Java resets only the explicitly disposable 55437 database. It refuses 5433 and 55433 and requires a reset opt-in. A brand-new disposable server is a prerequisite; do not reuse a volume/database containing acceptance or customer fixtures.

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
# Start a fresh server only if its chosen name/port are unused.
docker run -d --name trace-final-hardening-db \
  -e POSTGRES_DB=trace_tenancy_test -e POSTGRES_USER=trace_test_admin \
  -e POSTGRES_PASSWORD=trace-test-admin-only \
  -p 127.0.0.1:55437:5432 --tmpfs /var/lib/postgresql/data postgres:16-alpine
# Build from a temporary backend copy if the ordinary target JAR is running.
TRACE_TEST_ALLOW_RESET=true \
TRACE_TEST_ADMIN_URL=jdbc:postgresql://localhost:55437/trace_tenancy_test \
  backend/ops/build-release.sh
(cd processor && .venv/bin/python -m unittest discover -s tests -v)
npm --prefix frontend test
npm --prefix frontend run build
npm --prefix frontend run lint
```

The roles in this disposable example are deliberately test-only, never production defaults. The browser/recovery immutable artifact is byte-for-byte identical to the final backend build: [artifact comparison](evidence/artifact-equivalence.json). The final complete Java run also passed on a second fresh server at 55438 with richer historical upgrade fixtures; its exact command is in the machine report. The complete browser fixture/service procedure and production rollout are in [the operator runbook](11-operator-rollout.md). Private state is under `/tmp/trace-final-hardening` with mode-600 credential files. Browser contexts isolate identities; no authentication localStorage is used. Failure traces remain in that private temporary state, rather than checked into evidence.

## Failed exploratory attempts

Baseline Java initially failed because the temporary build copy omitted its relative demo-file dependency; after adding the unchanged demo symlink, all original 76 tests passed. Early new checks exposed a health group/contributor naming collision, a migration-version assertion that still expected the old schema, and a legacy HTTP client's h2c compatibility issue; these were corrected and the full suite rerun. Initial browser scripts had overly exact wrapping-label selectors, refreshed before a save response, matched a hidden SVG title and expected an import link to skip its scoped catalog result. Final scripts use accessible roles and completed responses. These failed attempts are not counted as passing evidence.

The historical owner-race test deliberately expects and reproduces the old V14 unsafe outcome, on a disposable database only. The V15 regression separately verifies the corrective serialization. A successful historical reproduction is not a claim that old code is safe.

## Still unverified

Authorized live Snowflake/S3/GitHub/Power BI calls, real development rollout/login/old-data smoke, manual screen-reader/forced-color conformance, and full throughput at every maximum import/graph/editor size remain outside the executed evidence. No NovaMart source resources were created.
