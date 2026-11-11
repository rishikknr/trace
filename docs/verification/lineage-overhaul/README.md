# TRACE lineage overhaul — implementation and verification

Date: November 11, 2026 (Asia/Kolkata).

**Implemented and running locally, with automated, authenticated API and real-browser acceptance checks completed for the recorded scenarios.** Browser access was restored and the final source, formula and metric captures and responsive checks were completed. No mockups or generated browser images are used as evidence.

## Diagnosis

Read-only inspection found schema V16, three source connections, 77 registered assets, zero lineage edges, zero stored view definitions, one existing formula (`Revenue`), and no metrics or report mappings. The actual inventory was 22 S3 files; 22 Snowflake RAW tables, 22 STAGING views, three CURATED views and six ANALYTICS views; and two earlier file-import datasets.

Discovery had established inventory, not dependencies. Snowflake view-definition acquisition was optional and none had been stored. SQLGlot returned candidate names without a registry-resolution and confirmation workflow. The graph API and UI both imposed five levels, returned bounded results without continuation, omitted standalone registered formula versions, and joined formula inputs directly to metrics. Metric versions exposed opaque formula IDs; report mapping lacked useful onboarding when reporting sources were absent. Reporting containment direction also needed a usage-oriented graph projection so changes to a measure can reach its model and report.

The workspace directory has no `.git` repository. Changes were made in place; this report and `changed-files.json` identify the implementation files.

## Actual NovaMart evidence and inventory

The user-specified folder `/Users/rishi/Documents/work/DTCC/projects/trace_infra_capstone/NovaMart` was published to [rishikknr/infta_training_novamart at cbbe4b742f3978fc4ecc41dd560a5c5fddc01234](https://github.com/rishikknr/infta_training_novamart/tree/cbbe4b742f3978fc4ecc41dd560a5c5fddc01234). The remote main branch was independently verified at that commit. The original local folder was left intact. The published copy excludes `.DS_Store` and replaces embedded AWS credential values, the RSA public-key value and account-specific IAM identifiers with placeholders. Credentials were never committed.

The registered evidence comes from actual files at this commit:

- `sql_quries/staging_views.sql`: 22 definitions.
- `sql_quries/curated_views.sql`: three definitions.
- `sql_quries/analytics_views.sql`: six definitions.
- `sql_quries/load_s3_data.sql`, together with the matching stage URLs in `connect_s3_bucket.sql`: 22 explicit file-to-RAW ingestion declarations.

| Registry inventory | Actual count |
| --- | ---: |
| S3 CSV files | 22 |
| Snowflake RAW tables | 22 |
| Snowflake STAGING views | 22 |
| Snowflake CURATED views | 3 |
| Snowflake ANALYTICS views | 6 |
| Earlier file-import datasets | 2 |
| Additional registered SQL transformation assets | 31 |
| Total asset records after registration | 108 |
| Active asset-level lineage records | 90 |
| Confirmed column derivation records | 251 |
| Registered NovaMart metric definitions | 1 |
| NovaMart report mappings | 0 |

The 31 transformations are registry assets, not additional objects discovered from Snowflake. Formula and metric versions appear as canonical graph nodes but do not inflate the catalog asset count. The 90 stored asset relationships exclude the formula/metric snapshot associations projected into the graph.

**Evidence semantics:** the S3-to-RAW relationships are explicit ingestion declarations supported by committed COPY statements and stage URL definitions. They are not claims of automatic load-history detection or independently verified execution. Snowflake transformation relationships are parsed SQL dependencies explicitly confirmed against existing registry identities, with the exact definition, revision hash and commit URL retained. No business SQL, COPY command, schema mutation or cloud object modification was executed during this task. Live provider acquisition was not rerun; acceptance uses the existing committed discovery inventory.

See [registration results](novamart-registration.json) and [final API acceptance](final-api-acceptance.json).

## Implemented behavior

### One canonical graph and safe complete traversal

`GraphExplorerRepository` projects active asset and column declarations, immutable registered formula versions, formula inputs/linked outputs, metric versions and active report usage from the existing tenant-scoped registry. Dataset graphs show transformations as first-class nodes; column graphs show exact recorded column derivations and continue through formulas, metrics and reporting consumers. Draft formulas do not contribute registered graph dependencies.

The fixed five-level restriction is removed from the product API and UI. Upstream, downstream and bidirectional requests traverse all reachable nodes with recursive `UNION` cycle protection. The legacy `depth` query parameter remains accepted for compatibility but no longer restricts HTTP graph exploration.

Traversal and rendering are separate:

- The response reports complete reachable node and relationship counts.
- The UI requests 80 relationships per page; the API accepts 1–200. A page includes its root and all returned edge endpoints, bounded to at most `2 × limit + 1` nodes.
- `hasMore`, `nextOffset` and an explicit partial-graph message expose continuation. Previous-page navigation works.
- Each response runs in a tenant-verified, read-only PostgreSQL `REPEATABLE READ` transaction. Counts, edges and node details in that response share a database snapshot.
- Continuation carries an aggregate relationship fingerprint. A changed relationship set returns `409 GRAPH_CHANGED` and requires refresh. This detects graph changes; it does not retain a historical database transaction across HTTP requests. Node display metadata can refresh between requests.
- Queries have an eight-second statement budget. Timeout is reported; no truncated result is presented as complete.
- The directed path endpoint computes a shortest recorded dependency path independently of the displayed graph page. Its output is paginated. It explicitly rejects path work exceeding 100,000 relationships; full graph paging remains available.

The UI uses [React Flow](https://reactflow.dev/api-reference/react-flow) and ELK layered layout in a Web Worker. It supports orientation, pan, draggable nodes, zoom, fit, focus/search, minimap, selection, edge evidence, upstream/downstream highlighting, branch collapse, rerooted exploration, fullscreen and Escape. It starts with a readable neighborhood rather than shrinking a large graph into unreadable labels. Only visible graph elements are rendered. Source/schema grouping is in the explorer and source overview; nested database containers inside the graph and saved graph views are not implemented.

### SQL transformation intelligence and reconciliation

The analyzer resolves qualified identifiers against canonical registry IDs, respects quoted identifier casing and database/schema context, and keeps duplicate registrations ambiguous. It extracts physical source candidates, CTE/nested-query value dependencies, output expressions and supported column derivation candidates. Filters, joins, CASE, grouping and aggregates are shown as actual SQL operations. Multiple statements cannot be confirmed as one target transformation. Mismatched CREATE targets and duplicate output aliases are rejected or left unresolved appropriately.

The review UI shows inputs, selected target, SQL, candidate resolution, column expressions, operations, warnings and exact source revision. Users explicitly confirm dataset identities and supported column candidates. Unresolved references can be explicitly mapped; they are not silently auto-resolved.

Confirmation stores an immutable `lineage_evidence` snapshot and a stable transformation asset keyed by its target UUID. Repeating identical evidence is idempotent. Changed evidence revokes only the analyzer's prior edges and preserves historical evidence; human-curated mappings are retained. An explicit source mapping requires write permission for both endpoints. SQL definitions remain metadata and are never executed.

Definition history is paginated; the earlier compatibility endpoint still returns its latest 100 records. Missing/renamed columns are not guessed into new identities. Missing inventory objects retain their identity and history and expose the existing not-seen inventory status. New discovery does not silently replace confirmed SQL lineage: review and confirm new evidence.

### Formula and metric workflows

Formula Studio retains its SQL editor, drafts, immutable registration, version comparison and optimistic draft revision checks. It adds input → expression → output context, named source-column links, current/proposed expression and reference changes, and downstream impact from the current registered snapshot. Invalid, unsupported or unresolved SQL can be retained as a draft but cannot be registered. Registration means a registry snapshot, not formal approval or Snowflake deployment. DAX/business-rule validation remains text/size validation.

The original `Revenue` formula was preserved. A new legitimate `NovaMart net revenue by month` formula was registered from a calculation excerpt of the committed monthly-revenue SQL, with actual curated source and column references. The registered `NET_REVENUE` metric uses that immutable formula version. The definition follows the supplied SQL: recognized-order net amounts excluding tax, less processed net refunds attributed to the original order date, aggregated by month. No owner identity was invented.

Metric version creation now captures business metadata in an immutable snapshot. Historical versions created before V17 explicitly show that this snapshot is unavailable. Metric details show readable calculations, source dependencies, history and graph actions instead of an opaque formula UUID alone. Existing report mappings stay attached to their original metric version when a new version is registered. Structured and text JSON snapshots are handled safely. A workspace error boundary prevents an unexpected view-render failure from leaving a blank screen.

Catalog now labels and filters the discovered Snowflake tables/views using `metadata.objectType`, preserving existing canonical `DATASET` identities. Asset details link directly to impact analysis.

### Reporting and impact

Report Mappings works with actual manually registered or imported reports, measures, models and visuals, specific metric versions, evidence and revocation history. NovaMart has no reporting assets or mappings, so its UI shows honest onboarding and Power BI remains unconnected.

A separate disposable organization verified manual asset registration, version-specific metric-to-measure usage, model/measure and report/visual membership, reload and backend-restart persistence, consumer reachability, and revocation. Containment records retain their original stored direction; graph traversal projects measure → model and visual → report so impact reaches containing consumers. No disposable report was added to NovaMart.

Impact is a read-only hypothetical scenario over recorded dependencies. It distinguishes direct and transitive paths and shows recorded calculations and reporting consumers. It does not assign unsupported risk scores, guarantee breakage, or claim knowledge of unregistered consumers. Column mode describes recorded value derivations, not complete row-selection/control lineage.

The verified NovaMart path is:

```text
NOVAMART_DB.RAW.FACT_ORDERS.NET_AMOUNT
→ NOVAMART_DB.STAGING.STG_FACT_ORDERS.NET_AMOUNT
→ NOVAMART_DB.CURATED.FCT_RECOGNIZED_ORDERS.NET_REVENUE_INR
→ NovaMart net revenue by month · v1
→ NovaMart net revenue · v1
```

No report is appended to this path because none is registered.

## Preservation, migration and runtime

Only additive migration [V17](../../../backend/src/main/resources/db/migration/V17__lineage_evidence.sql) was introduced. Applied V1–V16 files were not rewritten. V17 adds immutable evidence storage with forced tenant RLS, evidence foreign keys, active-edge indexes and metric business-definition snapshots. Runtime startup explicitly requires these V17 capabilities and retains the restricted `trace_runtime` role checks. Graph reads never remove RLS or organization filters.

The V16→V17 rollout took a verified custom-format backup under `.trace-local/backups/lineage-v17-20261111T142222Z/` and compared every existing table projection before and after migration. Original rows, roles and encryption-key material matched. Subsequent final restarts separately verified preservation of encrypted credentials, all non-transformation asset identities, formula/metric versions, evidence and mappings. No administrator credential was reset. The final backend runs from an immutable JAR outside `target/`; the parser was restarted with the final source. Backend readiness is UP.

See [migration preservation](rollout.json), [final runtime and preservation checks](final-runtime.json), and [changed implementation files](changed-files.json). `backend/ops/build-release.sh` now names future artifacts `trace-v17-<sha>.jar`.

## Automated results

Final results: **119 backend tests, 140 processor tests, 58 frontend component tests and four frontend utility tests passed**, with no failures. Production frontend build and lint passed. See [machine-readable automated results](automated-tests.json), [frontend build](frontend-build.txt), [frontend lint](frontend-lint.txt), [frontend tests](frontend-tests.txt), and [processor tests](processor-tests.txt).

The final backend suite uses a fresh disposable PostgreSQL 16 server on **55459**, never the persistent development database on 5433, older acceptance on 55433, or the browser fixture on 55449. It covers historical upgrade preservation, tenant isolation, authorization, immutable versions, SQL confirmation/reconciliation, full-depth traversal, cycles, complete pagination, snapshot changes, concurrent-response consistency, large fanout, reporting membership direction, column→formula→metric→report reachability, readable references and catalog type filtering.

Frontend tests cover traversal continuation, direction changes, rerooting, error handling, explicit SQL confirmation, structured metric snapshots, named column references and recoverable view failures in addition to the existing suite. Processor tests cover ambiguity, quoted/contextual identifiers, CTEs, value expressions, unsupported syntax, multiple statements, duplicate aliases and target consistency. Unit/component tests do not substitute for the separate real-browser evidence.

To rerun, use the commands in `automated-tests.json`. Only set `TRACE_TEST_ALLOW_RESET=true` with a newly provisioned disposable database. The existing integration suite intentionally resets that disposable test schema.

## Browser evidence and acceptance status

All images under `before/`, `after/` and `intermediate/` are real browser captures from the running application. See [screenshot index](screenshots.md).

| Acceptance scenario | Result |
| --- | --- |
| A — actual committed source inventory | API and browser verified: 22 S3 files; 22/22/3/6 Snowflake layers |
| B — cross-system linkage | 22 explicit COPY/stage-backed ingestion declarations registered; representative edge evidence inspected in browser; execution/load history not independently verified |
| C — Snowflake transformations | 31 actual definitions registered; representative staging/curated/analytics upstream traversal verified |
| D — individual columns | ORDER_ID, NET_AMOUNT, ORDER_TOTAL, CUSTOMER_ID recorded reachability verified; NET_AMOUNT browser inspector/path exercised |
| E — formula lifecycle | Legitimate NovaMart draft→registered snapshot verified through API; validation and immutable history inspected in browser |
| F — metric registry | Real NET_REVENUE calculation/version and upstream path verified; metric detail inspected; final named dependencies and readable snapshot presentation verified in browser |
| G — reporting | NovaMart empty state verified; complete manual registration/mapping/revocation exercised only in disposable organization |
| H — hypothetical NET_AMOUNT impact | 16 reachable nodes / 15 recorded relationships; exact metric path verified; no source mutations |
| I — depth/cycles/progressive exploration | Browser reached level 13 in a 14-node cyclic chain; 106-node/106-edge continuation and previous page verified; automated larger fanout and path paging passed |
| J — persistence and tenancy | Existing data preserved through migration/restarts; reporting mapping reload/backend-restart persistence verified; cross-organization denial covered by actual PostgreSQL/authenticated HTTP tests |

Before captures exist for Connections, Lineage (including the original mapping form), Formula Studio, Metrics and Report Mappings. Catalog was captured before its own content changes but after the new navigation links appeared. A separate old impact page did not exist; impact was the old lineage direction control. Source-detail and individual asset-detail baseline screenshots were not captured before implementation, so they are not fabricated or relabeled from later states.

Visual review found and corrected a too-small fit-to-all viewport, clipped fullscreen toolbar sizing, long evidence URLs, ambiguous repeated column names, a standalone overview stylesheet import, metric-snapshot rendering, an ambiguous column-derivation count label and overly narrow metric-history SQL wrapping. The source overview and metric-detail images that preceded their latest corrections are retained under `intermediate/`. Fresh final captures are linked in the screenshot index.

**Final browser pass:** local browser access was restored. The final standalone source overview, named formula/metric dependencies, readable registered business snapshot, SQL candidate analysis and evidence-history endpoint were verified in the running application. The NET_AMOUNT impact view returned 16 nodes / 15 relationships, and its complete-path control displayed the exact five-node path to NET_REVENUE. At 390px, source overview, lineage, impact, transformation review, formula and metric views reflowed without page-level horizontal overflow. At 1024px, formula and lineage views also fit the viewport; the inspector moved below the graph. Mobile fullscreen and Escape were exercised; the temporary viewport override was reset. See [final browser results](browser-final-acceptance.json) and the [screenshots](screenshots.md). These are CSS viewport checks, not physical-device or assistive-technology certification.

## Before and after

| Before | After |
| --- | --- |
| Inventory without stored dependencies | 31 confirmed SQL definitions, 22 COPY/stage-backed ingestion declarations and 251 column derivations with evidence |
| Five-level graph with no continuation | Complete cycle-safe traversal, bounded graph pages, complete counts and separate path inspection |
| Simple lineage row and opaque mappings | Interactive layered graph, source/schema explorer, node inspector and selectable evidence |
| Formula and metric references difficult to interpret | Qualified input columns, calculation/output preview, immutable registered versions and readable metric snapshots |
| No clear reporting onboarding or consumer impact | Honest NovaMart empty state; manual reporting registration, version mapping, persistence and revocation proved separately |

## How to use the new interface

1. Sign in to [local TRACE](http://127.0.0.1:5173) with the existing account and select NovaMart. Backend restarts expire the existing in-memory session.
2. Open **Data Flow** for source/schema inventory, discovery timestamps, committed SQL evidence and recorded cross-system relationships.
3. Open **Lineage**, search in the explorer, filter asset type and select an asset. Choose direction, inspect nodes/edges, expand a branch, or focus a resource. Use **Continue exploration** when only a portion is displayed; complete reachable counts remain visible.
4. Use a column link or **Column lineage** to inspect actual field derivations. Use **Impact Analysis** for a read-only change scenario and **Inspect complete recorded path** for a consumer path across graph pages.
5. Open **Transformations**, choose an existing output, inspect its definition or supply actual versioned SQL, analyze candidates and explicitly confirm identities/column mappings. Definition evidence history is paginated. To register ingestion, use **Declare mapping** with the actual source/target and COPY/load/manual evidence.
6. In **Formula Studio**, open `NovaMart net revenue by month`, inspect named inputs/linked output, validate, compare versions and review current downstream impact. Edit a draft or save a new version; registered versions remain immutable.
7. In **Metrics**, open `NET_REVENUE` for its definition, calculation, immutable version metadata and lineage. Review a proposed registered formula version before adding a metric version.
8. In **Report Mappings**, follow onboarding until genuine reporting assets exist. Select an exact metric version and a real registered consumer, supply evidence, and use revocation to retire usage while retaining history. Create explicit model/measure/report/visual relationships in Lineage as needed.

## Remaining limits

- No independent Snowflake COPY/load-history check or equality check between the committed SQL and current deployed view definitions was performed. Repository evidence and confirmation are labeled accordingly.
- Column mappings cover supported value expressions. Filters/join predicates are shown in SQL operations; complete control-dependency lineage is not inferred. Wildcards, ambiguous identifiers and unsupported syntax require explicit review/mapping. No S3-to-RAW field mapping is invented from matching names.
- SQL analysis is scoped to at most 5,000 Snowflake dataset identities and 100 referenced datasets per statement. Selectors expose an explicit 10,000-record bound. These acquisition/selection bounds do not impose a lineage depth limit.
- Traversal uses statement budgets; a path request over 100,000 edges requires narrowing. Pages can show disconnected portions of the complete graph; this is explicitly labeled.
- Graph grouping is currently source/schema exploration in the left panel/overview, rather than nested graph containers; saved graph views are not implemented.
- Unconnected/unregistered reporting consumers remain unknown. Power BI was not connected.
- Responsive checks used browser viewport overrides at 390px and 1024px. Physical mobile devices, touch hardware and a complete screen-reader audit were not tested. Narrow metric history retains internal horizontal table scrolling.
