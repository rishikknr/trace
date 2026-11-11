# Architecture and data flow

The Java 21 / Spring Boot 4.1.2 / JDBC / PostgreSQL 16, Python 3.12 / FastAPI / SQLGlot, React / TypeScript / Vite stack is preserved. No new infrastructure service was introduced. New dependencies are development-only component, browser and accessibility testing tools.

```mermaid
sequenceDiagram
 participant UI as React
 participant API as Spring / Security
 participant TX as TenantTransactions
 participant DB as PostgreSQL / FORCE RLS
 participant PY as Private Python processor
 UI->>API: Session cookie + masked CSRF for mutation
 API->>TX: Server-selected organization and principal
 TX->>DB: SET LOCAL organization/user; reload active membership/team roles
 API->>PY: Bounded parse/acquire request, private shared token
 PY-->>API: Versioned snapshot, evidence, explicit scope/completeness
 API->>TX: Revalidate identity, source/team, settings and lease
 TX->>DB: Persist preview only
 API-->>UI: Real preview/run ID and actual state
 UI->>API: Explicit commit
 API->>TX: Lock batch/source; check expiry, settings, ordering and permissions
 TX->>DB: Upsert stable IDs, reconcile observed scope, audit/history, COMMITTED atomically
 DB-->>UI: Persisted results
```

Authentication uses Spring's session fixation/CSRF/logout machinery. Sessions and rate-limit counters remain process-local. Backend restart requires sign-in. A selected organization is a server session attribute; request headers cannot choose a principal or tenant. Each protected transaction reloads current active organization/user/membership/team state. `SET LOCAL` clears at commit/rollback before pooled connection reuse.

Provider acquisition happens outside registry transactions. Queue claiming crosses only the dispatch envelope through narrowly granted functions. Credentials and registry reads/writes remain ordinary tenant transactions. Queue completion, preview creation and audit commit together under a current lease and fencing token. Wall-clock lease checks prevent a long transaction's old `now()` from authorizing an expired worker.

Registered formulas are built as DRAFT, receive their explicit dependencies, then transition to REGISTERED in the same transaction. Parent-row locks serialize dependency writes and registration. Metric versions reference a registered formula version; mutable metric identity metadata uses an independent revision. Report usage can be revoked without deleting history.

Identity operations capable of establishing an owner acquire advisory lock 908002 before organization/identity row locks, matching account deactivation. This intentionally serializes rare owner/identity administration across tenants; ordinary metadata, reads and discovery do not take this lock. It prevents a promotion/deactivation interleaving from invalidating the last responsible owner.

Frontend mutations obtain a fresh CSRF token and retain accurate busy/error feedback. Tenant epochs reject late reads and mutations prepared for a previous organization. Dirty formula navigation uses the existing discard guard. Registry controls retain server pagination; CodeMirror and major workspace routes remain lazy. Comparison requests use independent selection sequences so a late earlier selection cannot replace the current one.

Runtime compatibility is explicit: hardening API `integrationVersion=3`, database schema contract 15. The backend refuses a missing or incompatible schema even when Flyway is disabled. The updated workspace rejects the previous integrationVersion 2 before exposing its write workflows. Use the [rollout runbook](11-operator-rollout.md) for matched immutable artifacts; do not rebuild a JAR mapped by a running JVM.
