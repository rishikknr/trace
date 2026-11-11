# Step 10 API reference

All paths below start with `/api`. All metadata reads require an authenticated
session and a freshly verified active organization membership. All mutations
require the existing CSRF header from `GET /auth/csrf`. OWNER/ADMIN can write
organization resources; MEMBER requires OWNER/EDITOR on the relevant active team.
Mapping writes require both endpoint teams. Ownership transfer retains its existing
stricter organization admin/team owner policy. Platform administration alone does
not grant metadata access.

| Method | Path | Request / behavior |
|---|---|---|
| GET | /registry/status | Registry counts, organization, integrationVersion=2 |
| GET, POST | /connections | Paginated list / create ConnectionSettings |
| GET, PATCH | /connections/{id} | Safe detail / replace name, description, non-secret configuration |
| PATCH | /connections/{id}/owner-team | Existing explicit ownership transfer: ownerTeamId |
| PATCH | /connections/{id}/status | `{enabled:boolean}`; disabling retains catalog records |
| PUT | /connections/{id}/credentials | Provider-specific secret fields; encrypted, never returned |
| POST | /connections/{id}/test | Real provider metadata access check; inspect status and reason_code |
| POST | /connections/{id}/sync | 202 with the persisted PENDING run and its ID. Poll run detail for progress and preview. |
| GET | /connections/{id}/sync-runs | Paginated run history |
| GET | /connections/{id}/sync-runs/{run} | Scoped run detail by ID |
| POST | /connections/{id}/sync-runs/{run}/cancel | Cancel queued/retrying work or request cancellation of an active attempt |
| POST | /connections/{id}/sync-runs/{run}/retry | 202 with a new run for a failed/cancelled run |
| GET | /connections/{id}/capabilities | Implemented capabilities; no automatic DAX/visual claim |
| GET | /imports/formats | Exact supported formats |
| POST | /imports/preview | Multipart connectionId,file,format,mapping (JSON),dialect |
| GET | /imports/{id} | Creator-owned preview/results; organization scoped |
| POST | /imports/{id}/commit | Atomic, serialized, idempotent reconciliation |
| GET | /imports | Creator's paginated previews and commits |
| GET, POST | /import-mappings | List / save mapping profile; same connection+name updates the profile |
| POST | /assets | Create manually registered asset and optional columns |
| GET | /assets/{id}/curation | Curated owners, tags, description, revision, separate source metadata and provenance |
| PATCH | /assets/{id} | Curate name, description, technical/business owners and tag assignment using expected revision |
| PATCH | /assets/{id}/owner-team | Explicit owning team transfer with existing ownership policy |
| POST | /tags | Create a case-insensitively unique organization tag as OWNER/ADMIN |
| POST | /assets/{id}/columns | Register Column |
| PATCH | /assets/{id}/columns/{column} | Curate description/nullability/ordinal; source identity/type retained |
| GET | /assets, /assets/{id}, /assets/{id}/columns | Existing catalog API; paginated asset search retained |
| POST | /lineage/mappings | Declare typed Mapping; columns require existing column IDs |
| GET | /lineage/mappings/{id} | Evidence, active state, creator, revocation timestamp |
| POST | /lineage/mappings/{id}/revoke | Revoke with history retained |
| GET | /lineage/{asset}?depth=1&direction=both | Graph; depth 1–5, direction both/upstream/downstream |
| GET | /lineage/{asset}/upstream, /downstream | Bounded graph; default depth 3 |
| GET, POST | /formulas | Paginated list / create Formula identity |
| GET | /formulas/{id} | Identity, versionsTotal and a compatibility window of up to 100 versions |
| POST | /formulas/{id}/versions | New draft or immutable registered snapshot |
| GET, PATCH | /formulas/{id}/versions/{version} | Read one snapshot / edit a draft using DraftEdit |
| POST | /formulas/validate | SQL AST parsing; DAX/business rule text checks |
| GET, POST | /metrics | Paginated list / create stable business identity |
| GET | /metrics/{id}, /metrics/{id}/versions | Definition and immutable versions |
| POST | /metrics/{id}/versions | Reference an actual REGISTERED formulaVersionId |
| GET, POST | /metric-mappings | Read / declare version-specific report/measure usage |

## Request contracts

`ConnectionSettings`: name, ownerTeamId, connectionType, description, configuration.
Missing connectionType on legacy create requests retains SNOWFLAKE compatibility.
Type is immutable. Owning team changes use the explicit transfer endpoint.
Configuration is a complete replacement; omit credentials entirely.

`Asset`: connectionId, ownerTeamId, name, assetType, externalKey, description,
technicalOwner, businessOwner, tagIds[], columns[], and revision (required on edit).
Legacy owner aliases technicalOwner. Omitted tagIds preserves assignments and an
empty array clears them. Categories: FILE, DATASET, TABLE, VIEW,
SQL_TRANSFORMATION, SEMANTIC_MODEL, REPORT, VISUAL, MEASURE, WORKSPACE. A COLUMN is
an asset_columns row under a parent asset. Editing never changes external identity.

`Column`: name, dataType, description, nullable, ordinalPosition.

`Mapping`: sourceAssetId,targetAssetId,relationshipType,evidenceRef,description,
optional supersedes. COLUMN_DERIVATION uses sourceColumnId,targetColumnId instead.
Direction: upstream → downstream. REPORT_USES_MODEL is model → report;
VISUAL_USES_MEASURE is measure → visual. Additional reporting containment types:
REPORT_CONTAINS_VISUAL and MODEL_CONTAINS_MEASURE. DATA_FLOW, TRANSFORMATION_INPUT,
TRANSFORMATION_OUTPUT, MODEL_SOURCE and column dependencies reject cycles.
Supersession revokes the old asset mapping and creates the replacement atomically.
Column changes use explicit revoke and create operations.

`Formula`: name,description,category,language,ownerTeamId,optional assetId.
Categories SQL_TRANSFORMATION,COLUMN_FORMULA,BUSINESS_METRIC,DAX_MEASURE,BUSINESS_RULE;
languages SQL,DAX,BUSINESS_RULE. `FormulaVersion`: expression,dialect,state,
referencedAssets[],referencedColumns[]. State DRAFT or REGISTERED. Saving produces
a new numbered snapshot through POST. To update a draft, PATCH with
`{definition: FormulaVersion, expectedRevision: number}`. The update replaces
explicit dependencies in the same transaction and advances revision. Sending
REGISTERED finalizes the edited draft. Stale revisions and edits to registered
versions return 409. SQL validation parses without executing. DAX checks basic text
structure and provides no Power BI execution result.

`Metric`: name,businessKey,description,unit,aggregation,grain,businessOwner,
technicalOwner,ownerTeamId. Business key uses `[A-Z][A-Z0-9_]{0,99}`.
`MetricVersion`: formulaVersionId. `MetricMapping`: metricVersionId,assetId,evidenceRef.

## Browse pages

`GET /browse/{kind}?limit=25&offset=0&q=example` returns
`{items,total,limit,offset,hasMore}`. Limits are 1–100 and offsets are 0–1,000,000.
The search parameter is a case-insensitive substring of the resource's display
field, such as asset name or external key, import filename, or run status. An
asset page accepts `type`, a connection UUID in `source`, and `sort=name-desc`
or `sort=last-seen`. Connection pages accept a provider in `type`. Connections,
imports, and sync runs accept `status`. Each page has a deterministic ordering
with an ID tie breaker. Refresh from the first page after concurrent registry
changes if positions shift.

Connection rows include the owning team name and the latest stored run status.
Asset rows include technical and business ownership, inventory state, and tags.

| Kind | Parent filter |
|---|---|
| connections, assets | Optional owning team ID |
| teams, formulas, metrics, imports, profiles, tags, metric-mappings | Organization scope. Import history also requires the current creator. |
| sync-runs, sync-attempts | Required connection or run ID, respectively |
| formula-versions, metric-versions | Required formula or metric ID |
| mappings, column-mappings | Optional endpoint asset ID |
| asset-history, columns | Required asset ID |

The compatibility lists for connections, assets, teams, formulas, metrics,
imports, connection runs, profiles and metric mappings keep their array bodies.
They provide page totals and position in `X-Total-Count`, `X-Page-Limit`,
`X-Page-Offset`, and `X-Has-More` response headers. For version histories beyond
the detail window, use the version browse pages.

## Discovery runs

The queue states are PENDING, RUNNING, RETRY_WAIT, COMPLETED,
PARTIALLY_COMPLETED, FAILED, and CANCELLED. A second active run on the same
connection returns 409. Run detail includes phase, queue and attempt times,
attempt count, retry time, cancellation request time, warnings, safe error code,
discovered record count and preview ID when available. Attempt history records
the outcome of each lease. A retry starts a new run and preserves the original
history.

COMPLETED and PARTIALLY_COMPLETED describe acquisition and preview creation.
Preview review and canonical writes still use the authorized import endpoints.
Cancellation of RUNNING work can briefly show CANCELLATION_REQUESTED until the
worker acknowledges it or its lease expires.

## Errors and bounds

Safe JSON `{code,message,errors[]}`. 400 invalid request/configuration; 401 session
required; 403 role/CSRF denial; 404 absent or foreign tenant resource (indistinguishable);
409 conflict, cycle, disabled source, stale revision or expired preview; 413 upload
limit; 422 invalid file metadata; 502 invalid processor response; 503 unavailable
processor/authentication boundary/encryption. Provider test/discovery failures also
persist safe reason codes; HTTP acceptance alone does not mean a provider pass.

Files: 5 MiB; 20,000 columns/rows; 1,000 assets; 2,000 columns per asset.
Graph: 100 nodes, 200 edges, depth 5; truncation is explicit. Formula: 100 KB,
20 statements, 10,000 AST nodes, supported dialect allowlist. Import preview expires
in 24 hours. Browse statements have a five-second query budget and return
503 QUERY_TIMEOUT when it is exceeded.

The processor binds to loopback and `/internal/*` requires X-Trace-Processor-Token.
It has no database credentials and cannot choose the trusted tenant or actor.
The old bounded `/parse/snowflake-columns` parser remains compatible.
