# Connector setup and supported imports

Create a team in Teams, then select a connector card in Connections, enter the
name/team/configuration and save. Add credentials separately. Test checks actual
provider metadata access. Discover queues a durable run and returns its ID. Open
Discovery history to follow phases and attempts. Review the resulting preview and
commit it explicitly. Manual/file
connections skip the live test and remain usable without an encryption key.

## Configuration and credentials

| Type | Non-secret configuration | Credential fields | Actual acquisition |
|---|---|---|---|
| SNOWFLAKE | account,username,role,warehouse,database,schemas (array),includeViewDefinitions (API) | privateKey (PEM),privateKeyPassphrase (optional) | Authenticated INFORMATION_SCHEMA columns/tables; optional view definitions |
| AMAZON_S3 | region,bucket,prefix,maxObjects (1–1000) | accessKeyId,secretAccessKey,sessionToken (optional) | ListObjectsV2 object key/size/modified/ETag, pagination |
| GITHUB_SQL | owner,repository,revision,prefix,dialect,maxFiles (1–100) | token | Resolve revision, read bounded Git tree, fetch approved SQL blobs |
| POWER_BI | tenantId,clientId,workspaceIds (1–10 UUIDs) | clientSecret | Client-credentials OAuth; actual workspace reports and semantic models |
| MANUAL, FILE_IMPORT | empty configuration | none | File preview/commit and manual metadata |

Use low-privilege service identities. Snowflake requires a registered service-user
public key and appropriate database/schema metadata visibility; only the private
key is stored encrypted. Tables and views reconcile as DATASET with objectType,
comments and ownership in the source metadata, preserving the Step 08 identity
model. Nullability and ordinal position are stored on columns. Query and network
timeouts are set; business rows are never selected. A single configured database
and optional schema allowlist are supported. No query history or executed-lineage
claims are made.

S3 requires bucket-scoped `s3:ListBucket` restricted to the configured prefix.
Connector-specific credentials, including temporary session credentials, are
explicit; the process never silently adopts a machine AWS profile. No object body,
HeadObject custom tags, object versions or schema inference is acquired. ETag is
opaque metadata, not a guaranteed content hash. Standard commercial AWS regions
are supported by this configuration validator.

GitHub requires token access to the selected repository's contents. Only GitHub's
fixed API host is used; redirects and arbitrary URLs are disallowed. The selected
commit SHA, file path, blob SHA and source text are preserved. SQL files are at
most 100 KB each, 2 MB combined, with a maximum of 100 files and 110 HTTP requests.
A truncated Git tree produces a partial warning; it is not a complete inventory.

Power BI requires a Microsoft Entra application, the tenant's permitted service
principal configuration and access to each explicitly allowed workspace. Returning
an OAuth token alone does not pass Test. Reports and datasets are read from actual
workspace endpoints. datasetId references create stored model → report relationships
only when both actual objects are present in the acquired inventory. Basic owner/
refreshability fields are retained when returned. Refresh history, admin scanning,
XMLA/TMDL, full DAX expressions and visual extraction are outside this adapter.
Use imports/manual declarations for them. Never infer visual usage from names.

Provider documentation used for implementation:
[Snowflake Python connection](https://docs.snowflake.com/en/developer-guide/python-connector/python-connector-connect),
[S3 pagination](https://docs.aws.amazon.com/boto3/latest/reference/services/s3/paginator/ListObjectsV2.html),
[GitHub Git trees](https://docs.github.com/en/rest/git/trees),
[Power BI workspace reports](https://learn.microsoft.com/en-us/rest/api/power-bi/reports/get-reports-in-group).

## Secrets and private processor configuration

Export a privately generated random 32-byte key, base64 encoded, as
`TRACE_CONNECTOR_ENCRYPTION_KEY` in the backend process. Persist it in the operator's
secret storage so restart does not lose access to previously encrypted credentials.
Generate it once with `openssl rand -base64 32`; do not regenerate it on each start.
Never commit it. Key version 1 is recorded; bulk re-encryption/key migration tooling
is not implemented. Credential rotation uses a fresh 96-bit nonce with AES-256-GCM;
organization UUID, connection UUID and format version are authenticated associated
data. Secret storage is separate from configuration, tenant scoped and forced RLS.
No ordinary API returns ciphertext, nonces or plaintext. Audits contain action and
resource identity, never credential content.

Set the same high-entropy `TRACE_PROCESSOR_TOKEN` privately in backend and Python
processes. Keep Python bound to 127.0.0.1 or an authenticated private service network.
Do not publish the processor port. Legacy Snowflake CSV remains available without
the new token, but generic parsing, SQL validation and provider acquisition fail
closed until the private token is configured.

## Templates and field mapping

Templates are under `demo/metadata-imports/step10/`; they are explicitly synthetic
examples, never auto-seeded as provider discoveries.

| Format | Content |
|---|---|
| SNOWFLAKE_CSV | Original required headers database,schema,table,column,data_type; legacy literal header family retained |
| GENERIC_CSV | Map arbitrary headers; external_key or database+schema+table identifies an asset; column requires data_type |
| S3_INVENTORY | bucket,key; optional size,last_modified,etag; creates FILE assets without fabricated columns |
| METADATA_JSON | Versioned datasets[] with externalKey,name,assetType,columns[],metadata; optional typed relationships[] |
| SQL | UTF-8 SQL source; filename is stable source identity; AST validation and unresolved candidates retained |
| SQL_ZIP | At most 100 safe relative .sql entries, 100 KB each, 2 MB expanded; rejects traversal, symlinks, other types and extreme compression |
| POWERBI_CSV | external_key,name,asset_type (REPORT,VISUAL,SEMANTIC_MODEL,MEASURE,WORKSPACE) |
| POWERBI_MAPPING_CSV | report_name,visual_name,metric_name,measure_name; declared report/visual/measure objects and imported relationships |

For `generic.csv`, map db_name→database,sch_name→schema,object_name→table,
field_name→column,type→data_type. Save a named mapping profile for the connection.
Duplicate target mappings are rejected. Generic identifiers retain their literal
spelling; use consistent keys on reimport. Snowflake CSV retains its established
normalization rules. CSV uses UTF-8/BOM-aware quoting and bounded rows; JSON depth
is limited to 20. Invalid files create no catalog records.

Power BI mapping CSV records imported declarations, not scanned visuals.
metric_name is retained as an unresolved declaration, with a warning. The user
must select an actual immutable metric version in Metrics to confirm usage; Trace
does not choose a metric or version merely because a name matches.

All acquisition modes use ImportService's shared comparison, connection locking,
atomic commit and stable natural keys. Omitted columns remain. Curated names, descriptions, technical and business owners,
owning teams and tags are preserved. Only complete, warning-free live
inventories mark previously live-discovered objects absent from that inventory;
these are retained with NOT_SEEN_IN_LATEST_COMPLETE_INVENTORY, never deleted.
Partial inventories do not mark omissions. Scope changes can explain absence; the
state is an inventory observation, not proof an upstream object was deleted.

## Discovery lifecycle and verification

A PostgreSQL worker claims due runs with an exclusive lease. It rechecks the
initiator's current organization membership, team permission and connection
configuration before acquisition and again before saving a preview. Results
from an expired lease cannot publish. Restart recovery resumes the same run
under a new lease and records the interrupted attempt. One run per connection
may be active at a time.

Transient timeout, throttling and availability failures get up to three attempts
in total. The first two retry delays use exponential backoff from five seconds
plus zero to two seconds of jitter. Credential, permission and invalid
configuration failures stop the run. Cancel immediately stops queued work and
asks the worker to interrupt active work. An upstream request can continue until
its bounded timeout, while Trace fences the cancelled attempt from publishing a
preview. A manual retry creates a separate run for a failed or cancelled one.

Deterministic adapter tests use the Snowflake cursor, S3 SDK paginator, GitHub
tree/blob transport and Power BI workspace HTTP boundaries. GitHub's recursive
tree endpoint signals truncation instead of providing a next page. Power BI
pagination is confined to the original workspace endpoint. The four adapters are
implemented and live unverified. The isolated acceptance processor fixture at
`processor/tests/acceptance_processor.py` uses controlled GitHub responses with
an explicit warning. The operator entry point is `app:app`.
