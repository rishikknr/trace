# TRACE product experience — implementation and verification

November 11–12, 2026, Asia/Kolkata. Changes are implemented in the existing repository and the local application is running with schema V18.

**Status:** desktop journeys, isolated write workflows, automated suites, migration preservation and persistence after backend restart were verified. The final mobile/tablet viewport pass remains **unverified**: local browser access became disabled and remained unavailable after two user-reported settings changes. No mobile acceptance is claimed for this release. The screenshots here are actual browser captures, not mockups.

## What was wrong

The previous implementation exposed the registry's storage model instead of the user's task. A writable user with no selected formula or metric fell directly into a creation form. Transformations opened a target selector and SQL input instead of the stored library. Reporting placed metric selection and mapping creation ahead of existing usage. These conditions made an already populated registry look unfinished.

The dark green navigation, mixed hard-coded colors, repeated form panels and dense technical explanations competed with the main information. Graph reachability worked, but users had to interpret nodes and opaque references to find the relevant path. Catalog schema, ownership, dependencies and actions lacked a coherent workspace. Registration existed, but a separate review/approval lifecycle did not.

The solution preserves the graph engine, identities, credentials, connectors and immutable versions while changing the default experience to **browse → inspect → deliberately edit/create → review → save/confirm → inspect the result**.

## Information architecture and design

| Group | Destinations | Purpose |
| --- | --- | --- |
| Workspace | Overview, Sources, Catalog, Data Flow | Understand what exists and where it comes from |
| Define & measure | Transformations, Formula Studio, Metrics, Reporting | Inspect calculations, versions and declared usage |
| Change & review | Impact Analysis, Governance | Plan a hypothetical change and review immutable versions |
| Source tools, collapsed by default | Source overview, Import Center, Discovery History | Acquisition, evidence and discovery follow-up |
| Workspace settings, collapsed by default | Teams, Members, Organization Settings, Audit History, Platform Management | Authorized administration |

The shared light-blue system uses `#F8FBFF` canvas, white surfaces, `#F1F7FD` insets, `#2563EB` actions/selection, `#172B4D` text and `#E1EAF3` borders. Navigation is light and compact. Typography, table headers, spacing, buttons, selected tabs, editor gutters, graphs and authentication surfaces use the same palette. Restrained semantic colors remain for real success, warning and error states. No LLM or assistant widget was added.

Shared workflow primitives provide progress steps, contextual action explanations, guided fields, named ownership suggestions and searchable dependency inputs. They keep earlier-step form values mounted so final submission includes the complete definition. Browser acceptance exercised actual multi-step saves.

## Implemented product behavior

### Overview

Existing registry totals remain available. Three task-oriented links lead to dataset exploration, hypothetical change analysis and governance review. Needs-attention rows are calculated from tenant-scoped current records and explain their basis. The verified NovaMart view showed 55 datasets without recorded technical owners and one metric without a recorded business owner. Additional checks cover pending reviews, failed source statuses and metadata observations older than seven days. Observation thresholds are explicitly separated from business-data refresh.

### Catalog and dataset workspace

Server-side filters cover source, database, schema, asset type, owning team or missing technical owner, observation age/unknown observation, and presence/absence of recorded asset relationships. Filters apply before pagination. Existing search, ordering, pagination, tags and inventory states remain.

Dataset details have Overview, Schema, Lineage, Transformations, Formulas & metrics, Consumers and Activity sections. Each field can open its column lineage or impact scope. Ownership and source provenance are shown as recorded, with explicit missing descriptions and unknown refresh information.

The relationship panel separates direct inputs/outputs, SQL transformations, downstream formula/metric versions and downstream reporting consumers. It follows **directed paths** so sibling reports sharing an upstream dataset are not labelled consumers of the selected dataset; a regression test covers that case. Direct relationships expose their provenance/evidence. The panel labels its 80-relationship bound and links to the full paged graph.

Ownership editing remains permission checked. Owner fields offer current authorized organization-member suggestions to administrators when available, with manual verified entry available. Assignment records metadata and does not grant access.

### Data Flow

The existing React Flow/ELK graph, complete paged traversal, evidence inspector, column scope, branch exploration, paths and version nodes are retained. Graph and minimap colors use the light-blue language. The catalog and definition workspaces link into this canonical graph instead of creating a second lineage model.

### Transformations

The default is a searchable, paginated library of registered SQL definitions, with output identity, source, owning team and registration date. Schema filtering happens before paging. Ingestion declarations are a separate tab backed by stored `DATA_FLOW` manual declarations and their evidence; this includes the existing COPY/stage-backed NovaMart records. These declarations are not labelled warehouse execution history.

Opening a definition offers Stored definition, Inputs & outputs and Review new SQL. Loading is explicit rather than briefly displaying a false empty definition. The input → operations → output explanation uses stored SQL parser rules and graph relationships. History keeps exact SQL, source revision, hash and timestamp.

The static textarea was replaced by CodeMirror. It supports highlighting, line numbers, bracket matching, editing/search shortcuts, table/column completion and documented function suggestions. Registered fields are loaded for referenced/selected datasets; the browser can search datasets and insert a real field. Simple uniquely resolved aliases are inspectable; ambiguous identifiers remain unresolved. The actual NovaMart completion check after `o.` offered 14 registered `FACT_ORDERS` fields, including `NET_AMOUNT`, `ORDER_ID` and `TAX_AMOUNT`.

Review new SQL retains analyze → inspect candidates/operations/warnings → explicitly confirm dependencies. SQL analysis does not execute or deploy SQL. The existing confirmation/evidence engine is retained.

### Formula Studio

The default library shows existing formulas, description, language/category, latest actual version/state, version count, owning team and update date. Language/state filters run before pagination. A formula with no expression is labelled accordingly, rather than hidden or assigned a fictitious version.

Selecting a record opens Overview & dependencies. Editing and version comparison are deliberate tabs. Long repository URLs are moved out of the main description into a source link. Dependencies use named inputs and fields. Creation first collects purpose, then ownership/output; saving the entry opens the expression editor with explicit next-step feedback.

SQL editing uses registered metadata suggestions and searchable checkbox dependency pickers. Dataset/field declarations remain explicit, independently of autocomplete text insertion. The existing validation and immutable-registration controls remain. Drafts are editable; registered versions are immutable. Version comparison shows expressions, added/removed inputs, field references and a link to recorded consumers. Registered versions can be submitted for independent review.

### Metrics

The default library shows existing definitions and drafts, business key, description, current registered formula/version, grain, unit, ownership and recorded consumer count. Missing/assigned business-owner filters apply server-side.

Creation is guided through Business meaning → Measurement → Responsibility. It saves the definition, explains that a calculation is not yet attached, then opens the existing registered-formula selection/review. Formula selection is searchable, dependencies are inspectable, and registering a metric version retains the business-definition snapshot. Details include calculation context, ownership and immutable history. Registration and governance approval remain distinct.

### Reporting

The default shows recorded metric usage, provenance, evidence and active/revoked state. Adding a mapping is deliberate: choose an existing metric, choose its exact immutable version, select a genuine registered reporting resource, supply evidence, then confirm. The created declaration appears in the recorded table and graph impact; existing mappings retain their original metric version.

NovaMart has no registered reporting resources or mappings. Its onboarding explicitly says Power BI is not connected. A separate disposable workspace verified the complete manual measure-mapping workflow, reload and backend-restart persistence. No acceptance report/measure was added to NovaMart.

### Suggested source mappings

Suggestions appear after a committed import/discovery and on source details with registered inventory. They deterministically compare registered S3 file basenames with Snowflake RAW table names, show matching column-name counts and expose ambiguity. They are candidates, not discovered load-history facts.

A single explicit **Confirm declaration** action rechecks identities, ambiguity, team permissions and cycle safety on the server, then stores a `MANUAL_DECLARATION` relationship with the exact name-match basis, actor and audit event. It does not create column derivations or claim execution/refresh. Duplicate confirmations preserve an existing relationship instead of duplicating it. Dismiss for now affects only the current UI session. Existing confirmed relationships are excluded from suggestions.

NovaMart already has its 22 source-to-RAW relationships, so its source review correctly shows no unrecorded exact-name candidates. A genuinely unmatched disposable fixture was reviewed and confirmed in the browser, and its provenance and persistence were independently checked through the API.

### Impact Analysis

The starting experience asks what is changing, offers clear scenarios, then requests an existing dataset/field. It does not traverse a graph before a resource is chosen. Existing formula/metric versions can enter impact from their detail/lineage links.

Results start with affected resources and recorded paths; a graph is available as an alternate view. Direct, transitive, formula/metric and reporting categories help review the returned page. Individual consumers expose a complete recorded path from the server, with readable numbered steps. Unregistered consumers, partial graph pages and incomplete coverage remain explicit.

Scenarios are read-only labels for a dependency assessment. They do not execute a proposed SQL expression or simulate whether a rename/type change will fail.

### Governance and approval

Additive V18 introduces tenant-isolated `governance_reviews` and append-only `governance_events`. A request references a registered formula or metric version and stores the submitted/previous definition snapshots. Existing version states and history are not rewritten.

The queue supports all requests, my pending reviews and my submissions, status filtering and pagination. Details compare expressions, named dependencies and metric business metadata; link to impact; and show actor, timestamp and reason history.

Lifecycle: **Submitted → Under review → Approved / Rejected**, with **Changes requested → requester clarification/resubmission**. A different organization owner/admin or owning-team owner must decide. Authors cannot approve their own submissions; team editors/viewers cannot approve. Final decisions cannot be revised through the service. Reasons are required, revision conflicts are rejected, and decisions/audit events commit together. A reviewer waiting for clarification is not offered an invalid decision transition in the UI.

Approval records a decision on that exact version. It does not deploy SQL or automatically move report mappings. A changed definition needs a new version and review. Automatic supersession is not implemented.

## Actual NovaMart evidence

Desktop browser inspection verified:

| Registry information | Observed state |
| --- | ---: |
| Existing catalog assets | 108 |
| Dataset identities | 55, including two earlier imported datasets |
| Known catalog columns | 441 |
| Registered SQL transformation assets | 31 |
| Active stored asset relationships | 90 |
| Confirmed column derivations | 251 |
| S3 files | 22 |
| Snowflake RAW / STAGING / CURATED / ANALYTICS | 22 / 22 / 3 / 6 |
| Formula entries | 2 |
| Immutable registered formula versions | 1 |
| Registered metrics | 1 |
| NovaMart reporting consumers/mappings | 0 |
| NovaMart governance review requests | 0; no fabricated acceptance decisions |

The `RAW.FACT_ORDERS` dataset exposes `fact_orders.csv` as its direct recorded input, and the staging SQL transformation as a direct output, with inspectable evidence. Its schema links `NET_AMOUNT` to column impact.

The verified field impact returned **16 reachable nodes and 15 relationships**. The complete five-node path was:

```text
NOVAMART_DB.RAW.FACT_ORDERS.NET_AMOUNT
→ NOVAMART_DB.STAGING.STG_FACT_ORDERS.NET_AMOUNT
→ NOVAMART_DB.CURATED.FCT_RECOGNIZED_ORDERS.NET_REVENUE_INR
→ NovaMart net revenue by month · v1
→ NovaMart net revenue · v1
```

No report was appended because none is registered. Provider discovery was not rerun during this redesign; existing committed inventory and repository-backed SQL evidence were inspected. This does not independently verify current warehouse execution, COPY history or equality with deployed view SQL.

## Database preservation and runtime

Only [V18](../../../backend/src/main/resources/db/migration/V18__governance_reviews.sql) was added. [Checksum verification](migration-checksums.json) confirms V1–V17 match the repository baseline exactly.

The rollout verified the existing loopback database on port 5433, no active discovery jobs, the intended backend identity and existing release. It took a custom-format backup under the private `.trace-local/backups/product-v18-20261111T180048Z/` directory, verified the dump listing, compared every pre-existing table fingerprint before/after migration, and verified database roles and the encryption-key file. Existing users, connections, encrypted credentials, assets, lineage, formula/metric versions and history were preserved.

The final backend runs from an immutable V18 JAR outside `target/`, with readiness UP. Further restarts independently compared asset, relationship, column-lineage, immutable-version and encrypted-credential fingerprints. No credentials were rotated. See [rollout](rollout.json) and [final runtime](final-runtime.json). `build-release.sh` now names future artifacts `trace-v18-<sha>.jar`.

Runtime checks require V18 and retain the restricted runtime-role/RLS checks, extended to the new governance tables. Normal data operations still use verified tenant transactions. The persistent database was never used as the resettable test database.

## Executed verification

| Check | Result |
| --- | --- |
| Backend | **132 tests passed**, zero failures/errors/skips |
| Processor | **140 tests passed** |
| Frontend components | **71 tests passed** |
| Frontend utilities | **4 tests passed** |
| Production frontend build | Passed; pre-existing ELK worker IIFE-name warning remains |
| Frontend lint | Passed without warnings |
| Original migration checksums | V1–V17 unchanged |
| Local migration/restart preservation | Passed |
| Desktop real-browser journeys | Passed for the recorded scenarios below |
| Isolated write workflow persistence | Passed after reload and backend restart |
| Final 390px/1024px browser pass | **Unverified — browser tool disabled** |

The prior 321-check baseline became **347 executed automated checks** (132 + 140 + 71 + 4). Existing coverage was retained. Additional coverage includes browse-first pages, guided creation, exact reference resolution, explicit/ambiguous suggestion handling, permissions, review transitions, self-approval denial, owning-team authorization, immutable review snapshots/events, metric snapshots, audit history, tenant isolation, catalog filters and exclusion of sibling consumers.

Backend integration tests ran on a newly provisioned disposable PostgreSQL 16 container, loopback port **55467**, database `trace_tenancy_test`. Its reset-based suite never targeted persistent port 5433 or historical acceptance port 55433. Test commands and suite counts are in [automated-tests.json](automated-tests.json); [frontend tests](frontend-tests.txt), [build](frontend-build.txt), [lint](frontend-lint.txt) and [processor tests](processor-tests.txt) contain actual outputs.

The separate browser database `trace_product_browser` on 55467 used backend 18096 and frontend 15196. Its manually seeded assets are named acceptance fixtures and have no cloud credentials. Browser interactions created a draft with named inputs, registered a metric against an existing formula, submitted/independently approved a version, confirmed a name-match declaration and recorded a metric-to-measure mapping. [Authenticated API checks](api-acceptance.json) verified all of these after a backend restart, including reporting reachability and removal of the confirmed candidate from suggestions.

### Desktop browser acceptance

- Existing Formula Studio and Metrics libraries appear before creation forms; record details and immutable histories are inspectable.
- Guided formula creation, validation, explicit input/field selection and draft persistence were exercised in the disposable workspace.
- Guided metric metadata creation and immutable registered-formula selection/version registration were exercised in the disposable workspace.
- NovaMart SQL library, stored definition, input/operations/output explanation, alias-aware field suggestions and real SQL candidate analysis were inspected. NovaMart dependencies were not reconfirmed or rewritten for testing.
- Catalog database/schema filtering, `RAW.FACT_ORDERS` overview/schema, source relationship/evidence, lineage graph and `NET_AMOUNT` impact/path were inspected.
- Reporting onboarding correctly shows unknown consumers while Power BI is unconnected; guided usage declaration and reload/restart persistence were verified separately.
- A submitted formula request, old/new expressions, named inputs, independent reviewer decision, final state and audit history were exercised in the isolated workspace. The author's UI correctly prevented self-approval.
- Source details and an existing committed discovery result display the mapping follow-up. The disposable candidate was confirmed with one explicit click and its stored provenance checked through the API.
- Screenshots were visually reviewed. This is not a complete assistive-technology or physical-device audit.

## Screenshots and exact changed files

See the [before/after screenshot index](screenshots.md). Baselines include the original source served from an isolated copy of repository HEAD against the same preserved local registry, captured before V18 rollout. No source code was reverted to capture them. No separate historical governance screen existed.

Full-page captures may show sticky navigation at the scroll position used during the interaction. They are genuine browser captures and have not been rearranged or painted. Desktop screenshots prove displayed UI states, not backend correctness; separate API, PostgreSQL and automated evidence supports the functional claims.

The exact implementation/documentation file paths and SHA-256 values are listed in [changed-files.json](changed-files.json). Changes remain in the working tree; no commit or push was performed. The new database migration is V18 only.

## Remaining limits

- Final mobile/tablet visual verification is incomplete because local browser access remained disabled after resumption. Existing responsive CSS and earlier-release viewport evidence do not substitute for this release's checks.
- Suggestions currently support exact S3-basename → Snowflake RAW-table candidates. They do not parse arbitrary ingestion pipelines, establish column lineage, infer reporting usage from similar names, or prove execution. Quoted/complex identifiers and ambiguous identities require manual evidence-backed review.
- SQL editor completion uses installed CodeMirror SQL support plus registered schema metadata and documented functions. The server analyzes Snowflake SQL; client highlighting is generic SQL for dialects without a bundled dedicated parser. CTE/nested-alias reference inspection is conservative, not a full semantic SQL IDE. DAX/business-rule editing retains text/size validation.
- Impact scenarios inspect recorded reachability, not a simulated before/after execution plan or a guarantee of failure. Missing or unregistered consumers remain unknown.
- Contextual relationship panels use the first 80 graph relationships with explicit continuation links; selectors retain the existing 10,000-record bound and SQL field acquisition is limited to 30 relevant editor datasets. Full graph paging remains available.
- Governance reviews are separate from registration and attach to immutable registered versions. Automatic supersession, general-purpose deployment orchestration and notifications are not implemented. Requests/comments and final decisions remain inspectable.
- Dismissed mapping suggestions are hidden only for the current UI session. No persistent dismissal history or user-saved catalog views was added.
- No fresh provider discovery, deployed-view equivalence check, COPY/load-history verification, physical mobile-device test, complete screen-reader audit or external Power BI connection was performed.
