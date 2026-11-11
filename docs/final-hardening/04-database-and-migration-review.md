# Database and migration review

## Observed environments

| Database | Observed history | Action in this pass |
|---|---|---|
| Persistent `5433/trace` | Initially V1–V5; final read-only observation V1–V15 after concurrent operator activity | Read-only observations only in this task; no migration, reset or account change |
| Existing `55433/trace_tenancy_test` | V1–V10 | Read-only history only; all original acceptance fixtures preserved |
| Task-created `55437/trace_tenancy_test` | Fresh through V15 | Explicitly disposable reset-based Java regression |
| Task-created `55437/trace_hardening_browser` | Fresh; additive release upgrades | Synthetic browser/API/process-recovery fixtures only |
| Cold-regression `55438/trace_tenancy_test` and per-case databases | V5, V7, V8, V10 and historical V14 | Created separately, verified, dropped only by their owning test |

The [initial SHA-256 manifest](evidence/initial-migrations.sha256) preserves V1–V10 bytes. No already-applied V1–V10 migration was edited. Final manifests/test summaries are in [evidence](10-end-to-end-test-results.md). Restricted migrator and runtime roles remain separate, neither has BYPASSRLS/superuser privileges. Runtime startup checks schema contract and role/table RLS safety.

## Forward-only migrations

| Migration | Purpose and preservation |
|---|---|
| V11 legacy discovery recovery | V9's backfill/requeue ran before its migrator dispatch policy, so FORCE RLS skipped tenant jobs. With the policy now present, select each job's tenant, backfill missing settings snapshots and requeue only legacy RUNNING / attempt 0 / unleased jobs. Preserve run IDs and append recovery audit. Current leased runs/attempts/outcomes stay intact. Replaced dispatcher lease comparisons use clock_timestamp. |
| V12 registered dependency integrity | Enforce DRAFT-only dependency insert/update/delete and stable dependency parent; require registered metric formula; add schema capability function. Java assembles dependencies before finalization. Existing registered versions are not rewritten. |
| V13 reconciliation history | Column curation flags/inventory observation, import settings snapshot, tenant-scoped append-only metadata history, revocable usage and metric revisions. Existing preview configuration is intentionally unknown: an uncommitted pre-release preview needs recreation. Committed results remain idempotently readable. |
| V14 manual column curation | Conservatively mark older manual, never-imported columns as curated using temporary migrator-only policies, removed in the same transaction. New manual column fields receive their curation flags at creation. Runtime RLS grants never widen. |
| V15 owner transition serialization | Share deactivation's identity-administration advisory lock before owner-establishing operations take row locks. Prevent new ownerless states; do not invent or repair historical ownership automatically. Final schema contract is 15. |

## Upgrade evidence

`MigrationUpgradeIntegrationTests` starts at V5, V7, V8 and V10 using the restricted migrator. It fingerprints the exact baseline column projections of identities, credentials, memberships, teams, sources, assets, columns, imports, lineage and audit; additive columns do not create false differences. Existing projected rows/IDs remain identical, encrypted credential bytes remain identical, checksum validation succeeds, and recovery intentionally appends its audit event. V10 includes both a valid current lease and an unleased legacy envelope; only the latter is claimed after correction.

A separate disposable historical V14 test reproduces the promotion/deactivation defect before upgrading to V15. It intentionally creates no application data outside that disposable database. The correction is preventive; operators must review existing owner preflight rather than inferring repaired history.

Older acquired columns without historical curation markers cannot always distinguish a source value from a past manual nullable/ordinal override. Review/export those fields before reimport; V14 preserves the subset that is demonstrably manual and never imported, rather than fabricating historical curation.

New history tables have tenant composite foreign keys, enabled/forced RLS, bounded browse indexes and no runtime UPDATE/DELETE grants. Registered expression/metric rows have immutable triggers. Primary active mapping uniqueness and tenant FKs remain in place. Import/source row locks serialize competing commits, and transaction/audit failures roll back canonical writes. Pool context cleanup is tested after commit and rollback on the same physical connection.

The destructive Java suite now requires `TRACE_TEST_ALLOW_RESET=true` and rejects ports 5433 and 55433. It must still only be pointed at a deliberately created disposable server. A matching database name alone is insufficient authorization to erase data.
