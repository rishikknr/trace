# Release readiness and final report

**Implementation hardening is verified on isolated infrastructure. Development rollout and live provider acceptance are not complete.** The final source uses schema V15 / integration API 3. No known unresolved P0/P1 application-code defect remains in the audited scope. This is evidence-based scope acceptance, not a guarantee of all possible software behavior.

## Findings register

| ID / priority | Reproduced problem / root cause | Correction, coverage and result |
|---|---|---|
| H01 P1 | INSERT could extend a registered dependency set despite UPDATE/DELETE triggers | V12 + draft-first registration; restricted SQL immutability/metric-to-draft checks PASS |
| H02 P1 | Promotion and deactivation used different locks, potentially leaving zero active owners | V14 unsafe interleaving actually reproduced; V15 shared lock and blocking/owner-preservation regression PASS |
| H03 P1 | Java buffered upstream bodies before checking size | Cancel-on-limit body subscriber on both transports; oversized streaming test PASS |
| H04 P2 | Old provider test could mark changed settings Connected | Captured settings timestamp check, reason-code sanitation; blocked acquisition/changed-source regression PASS |
| H05 P1 | Warning text implicitly controlled inventory completeness and partial/complete semantics | Explicit complete/scope contract; empty/partial/different-scope and informational-warning tests PASS |
| H06 P1 | Older live preview could overwrite newer committed source state; old settings not rechecked | Settings snapshot + committed-acquisition ordering; stale/config-changed/idempotent tests PASS |
| H07 P1 | Removed provider fields survived JSON merge | Replace live source snapshot, retain source history; reconciliation regressions PASS |
| H08 P2 | Nullable/ordinal changes not counted; human column values overwritten | Effective comparisons, field curation markers, V14 legacy manual preservation and missing-column state; tests PASS |
| H09 P2 | Header normalization/mapping collided in a dict; profiles accepted invalid targets | Collision checks/report fields/profile validation/audit; parser/profile tests PASS |
| H10 P2 | Preview not linked into browser URL | Durable preview route; real refresh/profile/reimport/UUID browser journey PASS |
| H11 P2 | Unchanged tag set generated fake remove/add history | Differential assignments; no-churn history regression PASS |
| H12 P1 | Rebound report/model kept obsolete live association active | Retain inactive history, retire only supported observed complete association; graph/history tests PASS |
| H13 P2 | Graph stopped valid existing-node edges at node bound; unnecessary source payload | Count only new endpoints/edges, source-free projection/query budget; 5,000-asset/500-edge measurement and endpoint integrity PASS |
| H14 P2 | Earlier async comparison could replace latest choice; stale parent column options | Per-side selection sequence and parent-keyed columns; component race test + browser comparison PASS |
| H15 P2 | Metric metadata editing/usage revocation incomplete | Revision-aware edits and audited revoke/history, graph excludes revoked usage; HTTP/browser PASS |
| H16 P1 | V9 forced-RLS migration updates skipped tenant legacy jobs before dispatch policy existed | Forward-only V11 per-tenant recovery and wall-clock fencing; V5/V7/V8/V10 rehearsals PASS |
| H17 P1 | Rebuilding a path used by a running JVM can break JAR reads; old schema could start with migrations disabled | Separate immutable build/start scripts and schema contract guard; isolated immutable-artifact startup/process recovery PASS; real rollout PENDING |
| H18 P2 | Editor state reused across asset IDs; new columns absent until navigation | Exact editor key and column-list refresh; browser curation/direct-navigation PASS |
| H19 P2 | Other readers saw a link to creator-only import preview; attempt history eager/stale | Initiator/write-aware link and explanatory state; on-open/state-aware attempt reads; source/browser role checks PASS |
| H20 P2 | Invalid private body shape / provider field types produced unclear failures; pagination token anomalies | Object-body validation, CONFIGURATION_ERROR classification, bounded/repeated token handling and GitHub directory scope; Python PASS |
| H21 P2, operator | Original legacy quarantine organization active with zero members/owners | Read-only finding disclosed; no owner invented. Operator quarantine/adoption decision remains PENDING in Gate G |

No prior V1–V10 SQL was changed. Failed exploratory test-selector/environment attempts are separately disclosed in [test results](10-end-to-end-test-results.md), rather than hidden or counted as application acceptance.

## Requested final report

1. **Initial issues discovered:** the findings register records migration recovery, immutability, owner race, buffered responses, stale results/previews, completeness/reconciliation, lineage, metric and UI problems with severity.
2. **Root causes:** policy ordering under FORCE RLS, incomplete operation coverage in triggers, inconsistent lock domains, post-buffer size checks, unversioned async results and source-merge assumptions. Detailed causes are in reviews 03–09.
3. **Files changed:** [changed-files.txt](evidence/changed-files.txt); the workspace has no `.git` metadata, so no commit/diff claim is made. Existing architecture and working modules are preserved.
4. **Migrations added:** V11–V15, all forward-only. The [database review](04-database-and-migration-review.md) describes preservation and compatibility evidence.
5. **Security fixes:** registered dependency/metric guards, owner-transition serialization, pre-buffer response limits, stale provider-test rejection and safe diagnostics. Existing auth/CSRF/RBAC/forced-RLS regression remains passing.
6. **Data integrity fixes:** explicit complete/scope reconciliation, preserved manual columns, source/column history, stale-preview protection, real tag diffs and no deletion of historical endpoints.
7. **Connector fixes:** safe provider type/config errors, S3 continuation bounds, correct GitHub directory scope/SQL extension handling, observed Power BI association reconciliation, and accurate completeness/status semantics. No live verification claimed.
8. **Import fixes:** collision validation, reporting header mapping, audited profiles, preview refresh persistence, settings/order guards and correct effective change counts.
9. **Lineage fixes:** obsolete acquired edges become inactive history, revoked metric usage leaves potential impact, bounded traversal retains valid endpoints and omits unnecessary source payloads.
10. **Formula/metric fixes:** immutable dependency sets, draft-first registration, latest-selection comparison, cleared parent choices, metric revision edits and revocable report usage.
11. **UI/UX fixes:** exact asset identity remounts, immediate added-column visibility, accurate review links, on-demand fresh attempts, persistent previews, editable metrics and usage history; visual design retained.
12. **Accessibility:** zero axe violations in the executed selected-surface scope, real keyboard modal dismissal, role-aware named controls, six-width layout checks. Manual screen-reader/forced-color conformance is pending, with a precise procedure.
13. **Performance:** representative measured 5,000-asset search 19 ms / 25 rows and 500-edge graph 166 ms / 100 nodes / 99 edges; primary lists and graph remain bounded. Startup remains approximately 84.91 kB JS+CSS gzip, editor lazy. These are local measurements, not universal targets.
14. **Tests added:** 20 Java tests beyond 76, 15 Python tests beyond 96, 33 component/transport tests beyond four helpers, and 13 Playwright groups including real workflows, responsiveness, accessibility, pagination and resource checks. Own-child-process fault script is additional evidence.
15. **Exact backend result:** 96 passed, 0 failed/errors/skipped; Maven package succeeded. [Machine report](evidence/backend-tests.json).
16. **Exact Python result:** 111 passed. [Summary](evidence/python-summary.txt).
17. **Exact frontend result:** 37 passed (4 Node + 33 Vitest); TypeScript, build and oxlint passed. [Summary](evidence/frontend-summary.txt).
18. **Browser acceptance:** 13 groups pass against actual isolated React/Spring/PostgreSQL/Python, with the connector explicitly simulated. Loaded forms/comparison/graph/dialog and auth widths, axe results and actual workflow screenshots are recorded. [Browser report](evidence/browser-tests.json).
19. **Failure injection:** real Java restart resumes the same run with an interrupted attempt; processor loss enters retry and restoration completes attempt 2; canonical count remains zero before explicit commit. Backend/Python also cover cancellation, stale leases, provider errors, rollback, conflicts, expiry and secret failures. [Process evidence](evidence/process-recovery.json).
20. **Migration compatibility:** V5/V7/V8/V10 → V15 rehearsals pass restricted-migrator/checksum/fingerprint/recovery checks; a historical V14 owner-race reproduction and V15 prevention are included. V1–V10 bytes preserved.
21. **Real development rollout:** NOT PERFORMED BY THIS TASK. Initial 5433 history was V5; final read-only observation is V15 with a replacement JVM after concurrent operator activity. [Observation](evidence/development-final-read-only-observation.txt), [runtime](evidence/environment.json). This task has not verified that operator’s backup/restore, existing-login/signup, preserved-data or workflow smoke; Gate G remains PENDING VERIFICATION. Legacy quarantine is still active and needs an explicit decision. Existing 55433 was observed V10 and was not reset here.
22. **Live providers:** Snowflake, Amazon S3, GitHub SQL and Power BI are IMPLEMENTED / LIVE UNVERIFIED. Authorized live credentials were neither adopted nor contacted.
23. **Remaining limits:** human assistive-technology conformance, external-provider smoke, operator rollout/backup/old-data smoke, process-local sessions/rate limiting, no email sender/MFA/SSO/bulk key rotation, bounded 10,000-option selectors, bounded audit compatibility listing, no automatic SQL/DAX execution/semantic proof or multi-hop column expression resolution, and no maximum-throughput certification for every limit.
24. **Acceptance matrix:** below. Automated scope passes do not turn pending rollout/provider/human checks into passes.
25. **Operator commands:** [11-operator-rollout.md](11-operator-rollout.md) supplies backup/restore rehearsal, immutable build, exact-PID stop, explicit migrate-only, guarded start, split health checks, existing-login/data smoke, fixture recreation and controlled fault verification. Do not copy synthetic test secrets to development.

## Acceptance matrix

| Gate | Status | Evidence / remaining condition |
|---|---|---|
| A Security | PASS in audited isolated scope | Auth/authorization/tenant/RLS/secret/audit/owner-race tests; no known unresolved critical code defect |
| B Data integrity | PASS in audited scope | Idempotency, stable UUIDs, scoped completeness, curation, immutability, history and rollback |
| C Connections/imports | PASS for implemented configuration/import/simulated acquisition scope | Every source family retains its workflows; real provider verification is Gate H |
| D Lineage/formulas | PASS for recorded/declared relationships | Dataset/column mapping, provenance, bounded graph, drafts/immutability, metric usage/revoke; unsupported semantic/execution inference excluded explicitly |
| E Frontend | PASS for recorded automated/browser scope | Real journeys, current responsive and axe checks. Human screen-reader/forced-color walkthrough PENDING; no formal conformance certification |
| F Reliability | PASS for executed recovery/bounds scope | Real Java/Python restart, cancellation/retry/fencing/rollback plus measured bounded workload; no universal performance guarantee |
| G Development rollout | PENDING VERIFICATION | Concurrent operator activity is observed at V15 with a replacement JVM. Verify backup/restore rehearsal, matched artifact, existing admin/signup/workflow smoke, preserved fingerprints and deliberate legacy quarantine/adoption decision; schema observation alone is insufficient |
| H External providers | LIVE UNVERIFIED for all four | Actual authorized vendor test/discovery and captured evidence required |

The hardening implementation and reviewable evidence are delivered. Full deployment/external acceptance remains open until G/H and the separately disclosed human accessibility procedure are completed. The [NovaMart blueprint](12-novamart-test-blueprint.md) is ready for the next authorized assignment; no source scenario was deployed now.
