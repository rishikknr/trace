# Performance, reliability and observability

## Measured workload

Measurements are local observations, not service-level guarantees. The [machine/runtime versions](evidence/environment.json) and [exact outputs](10-end-to-end-test-results.md) are recorded. Java tests use newly created PostgreSQL 16 servers on loopback 55437/55438, actual restricted JDBC roles and HTTP clients.

| Workload | Acceptance rule | Representative recorded observation |
|---|---|---|
| 5,000 synthetic catalog assets, substring search, 25-row page | Correct total, bounded page; existing five-second browse query budget | 19 ms HTTP search, total 5,000, 25 returned |
| 500 direct downstream edges, depth 5 | At most 100 nodes/200 edges, explicit truncation, no dangling rendered endpoint | 166 ms HTTP graph, 100 nodes/99 edges, truncated |
| 125 real browser connection fixtures | Five pages, disabled final Next, final record opens | Passed |
| Browser auth/editor | Editor library absent from sign-in resource list, editor usable after opening formula | Passed; one warm heap sample is recorded, not a leak/peak-memory certification |
| Production assets | Preserve lazy editor/routes; record actual build sizes | Startup JS about 79.12 kB gzip + CSS 5.79 kB gzip, about 84.91 kB combined; CodeMirror about 138.49 kB gzip lazy |

The startup footprint remains essentially the reported 84.91 kB baseline while adding functionality and tests. Development-only test dependencies are not imported by production routes. No arbitrary speedup is inferred from different run-to-run timings. Source-free graph projections and on-demand attempt history eliminate demonstrably unnecessary payloads/reads.

## Enforced resource limits

Uploads 5 MiB; 20,000 rows/columns; 1,000 assets; 2,000 columns per asset; JSON nesting 20; SQL source 100 KB / 20 statements / 10,000 AST nodes; ZIP 100 entries / 2 MB expanded / per-entry ratio/size bounds; GitHub 100 files / 2 MB / 110 HTTP calls; S3 1,000 objects/pages with deadline; bounded Power BI pages/workspaces. Java legacy/private parser responses are cancelled above 8 MiB before accumulation. Graph/mapping and browse queries have a five-second statement budget. SQL parser size/node limits do not constitute an adversarial CPU benchmark for every possible SQL grammar shape.

Discovery uses two workers per process by default, configurable 1–4, with a fixed executor and active map. Lease 5–300 seconds, one active run per source, three total attempts, bounded exponential delay/jitter. Cancel can leave the remote call running until its provider deadline but cannot publish after cancellation/lease loss. Worker shutdown interrupts its tasks; persisted leases drive recovery. This is a single-instance deployment model; adding multiple instances multiplies the configured workers and requires deliberate shared-session/abuse-control design.

## Failure and recovery evidence

The Java/Python suites cover processor unavailable, provider auth/permission/throttle/timeout/malformed data, stale settings, missing encryption, expired previews, optimistic conflicts, duplicate/concurrent registration/import, tenant FK denial, audit rollback, cancelled/stale workers and interrupted claims. A real child-process rehearsal stops/restarts Java during a slow reserved acquisition: the same run resumes with INTERRUPTED then COMPLETED attempts. Stopping the separately owned processor produces RETRY_WAIT / PROCESSOR_UNAVAILABLE; restoring it completes attempt 2. No canonical asset appears before explicit commit. See [process-recovery.json](evidence/process-recovery.json).

The first rehearsal allowed another acceptance worker to claim the same dispatch queue; it could not demonstrate restart of the worker actually holding that job. The final procedure requires exclusive workers for this disposable database. This was test isolation, not a lost job. No original development/acceptance service was stopped for fault injection.

## Diagnostics and health

`X-Request-ID` is generated server-side for every request. Safe completion logs carry ID, method, route template, response status and duration. No bodies, URLs with query parameters, session cookies, private keys or acquired payloads are logged. Internal run/connection/import IDs and retry/outcome evidence remain available in persisted run/attempt/audit history; logs do not dump provider responses.

Public health groups expose status only: `/actuator/health/liveness` (process), `/readiness` (application + database + parser), `/database`, `/processor`. An unavailable parser leaves process liveness UP and readiness DOWN. Connector last-observed test/sync is shown separately on its connection; neither process readiness nor a saved configuration certifies external connectivity.

The persistent 8081 JVM was observed using `backend/target/...jar`. Building that path while it runs can invalidate lazy JAR reads. All builds in this pass ran in a separate temporary backend copy; acceptance runs use immutable hash-named copies. The new build/start scripts encode that practice and reject a target-path release or an occupied server port.
