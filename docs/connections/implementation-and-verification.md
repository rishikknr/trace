# TRACE Connections — implementation and verification

November 11, 2026. This report distinguishes actual AWS verification from deterministic provider simulations. At the original S3 delivery, live Snowflake access had not yet been verified. A subsequent [Snowflake repair and live verification](snowflake-diagnosis.md) now confirms 53 registered Snowflake objects and 435 columns. GitHub SQL and Power BI are covered by deterministic regression tests; live access to those providers was not tested.

The NovaMart S3 failure was a configuration mismatch before any AWS request: the saved connection contained `maxObjects: 10000000`. The processor accepts integers from 1 through 1,000, matching its bounded metadata-batch contract. The previous frontend exposed an unbounded text field, Spring persisted the value without provider-specific validation, the processor raised generic `CONFIGURATION_ERROR`, and the API stored only that broad status. Healthy backend and processor services, working private transport authentication, existing decryptable credentials, and successful requests with only the in-memory limit corrected ruled out an AWS credential, Region, or IAM failure for this incident.

An actual read-only request using the existing encrypted NovaMart credentials reached S3 successfully. Discovery returned exactly 22 CSV objects from `novamart-trace-test-space/novamart/baseline/` in `ap-south-1`, with a complete snapshot and no truncation warnings. Through the authenticated NovaMart UI, the saved limit was corrected to 1,000, stored credentials were retained, a real provider test succeeded, discovery created a 22-object preview, and explicit commitment populated the source-filtered catalog with 22 assets. The repeat discovery/commit preserved all 22 asset IDs and 22 distinct external keys. No S3 lineage edges were generated. Existing manually imported datasets remained separate. See the sanitized [adapter evidence](live-aws-verification.json) and [authenticated workflow evidence](live-workflow-verification.json).

The implementation includes:

- A Connections dashboard with provider/category, owning organization/team, actual status, recorded successful test time, successful discovery time, discovered and cataloged counts, latest error, and contextual source/history actions. Missing historical success evidence remains explicitly unknown.
- Seven setup stages: provider, source settings, authentication, access instructions, real test, background discovery, and searchable/filterable preview with explicit Commit to Catalog. Existing sources and failed tests remain editable. Live source creation navigates to the persisted source setup URL.
- Provider-specific fields and explanations for S3, Snowflake, GitHub SQL, Power BI, manual registration, and file imports. Existing ownership transfer, enable/disable, metadata imports, discovery history, attempt history, cancellation, and retry remain available.
- Masked credential entry, no stored-secret readback, full-replacement credential rotation, preservation of PEM line breaks and passphrase spaces, and clearing entered values after successful persistence. Optional omitted fields are cleared on replacement. AWS credential whitespace is rejected without echoing the value.
- Matching frontend, Spring, and processor discovery bounds. Oversized limits are rejected with a field-specific error before save. Existing invalid saved configurations receive a specific actionable test outcome.
- A real S3 `ListObjectsV2` test using the exact bucket/prefix and `MaxKeys=1`; inventory uses bounded pagination. No ambient AWS identity, configured custom endpoint, object-body read, or speculative cross-source lineage is used. SDK clients close after requests. Failed later pages do not publish a partial success; bounded successful inventories are explicitly partial.
- Stable allowlisted reasons for invalid keys, signature mismatch, expired sessions, Region mismatch, absent buckets, denied listing, clock skew, throttling, timeouts, missing credentials, processor failures and encryption/configuration problems. AWS messages, headers, credentials and raw responses are not relayed. An S3 AccessDenied outcome recommends checking ListBucket and explicit denies without asserting which policy caused denial.
- Test outcomes and diagnostic UUIDs persist across refresh. Processor transport failure changes status to unavailable instead of leaving a stale connected state. Successful test evidence is stored separately from last attempted test. Existing concurrency/version checks prevent a stale test overwriting credential rotation.
- A shared per-connection budget of 20 test/discovery acquisition requests per minute, serialized under the existing tenant-scoped connection row lock. Durable discovery retains its existing bounded workers, three-attempt retry policy, lease fencing and cancellation behavior.

Only additive migration [V16](../../backend/src/main/resources/db/migration/V16__connection_test_evidence.sql) was added. It adds nullable `last_successful_test_at` and `last_test_diagnostic_id` columns; it does not update credentials, settings, metadata or historical test evidence. V1–V15 migration files were not edited. Runtime startup now checks the required V16 columns while retaining the existing V15 security/schema contract and all runtime role/RLS checks. The local rollout applied Flyway migration work under the existing restricted migrator role, retained the existing encryption-key file and database roles, verified a readable backup, and compared every original application table before and after migration. All original table fingerprints matched. The immutable local release and backup location are recorded in [local-rollout.json](local-rollout.json). Restart invalidated only in-memory sessions; no passwords were changed.

Automated verification used the real application code with deterministic provider responses, actual Spring/processor HTTP boundaries, and disposable PostgreSQL databases, separate from development port 5433. Results and commands are recorded in [automated-tests.json](automated-tests.json):

| Check | Result |
|---|---|
| Processor unittest suite | 122 passed |
| Backend suite, including PostgreSQL tenancy/migration tests | 104 passed; zero skipped |
| Frontend utility tests | 4 passed |
| Frontend component/transport tests | 48 passed |
| Browser suite on final backend artifact | 15 passed |
| TypeScript + Vite production build | Passed |
| Frontend lint | Passed |

The browser suite exercises the seven-stage S3 flow with a clearly labeled S3 SDK simulation, error recovery, explicit commitment, repeated discovery with unchanged asset IDs, source editing, manual imports, ownership, formulas, metrics, lineage, account flows, organization switching, pagination beyond 100, and responsive layouts at 320, 390, 768, 1024, 1280 and 1440 pixels. Axe checks cover the new Connections controls, metadata preview and failure state; broader existing accessibility checks also pass. The two S3 browser cases were rerun successfully after the final queued/start timestamp presentation fix; the frontend suite includes a regression for a queued run not claiming to have started. Simulated provider evidence is visibly labeled and is never represented as a live AWS result. A test navigation wait was corrected to wait for the Catalog heading before returning to source setup, so a fast hash-route transition cannot accidentally inspect the prior preview.

To connect or recheck NovaMart S3 through the UI:

1. Sign in at `http://127.0.0.1:5173` and select NovaMart. Open Connections → NovaMart AWS S3 → Configure, test & discover. For a new connection, choose Add connection → Amazon S3 → Continue.
2. Open Source settings. Enter a connection name, an active writable owning team, AWS Region `ap-south-1`, bucket `novamart-trace-test-space`, prefix `novamart/baseline/`, and Maximum objects `1000`. Save and continue. The existing source’s team can be changed only with the explicit ownership-transfer action.
3. Choose Use stored credentials for this existing connection. For a new connection or rotation, supply both Access Key ID and Secret Access Key; include Session Token only for temporary credentials. Save the complete replacement securely. Never paste these values into ordinary configuration JSON.
4. Review How to configure AWS access. Its copyable policy uses the entered bucket and exact prefix. This inventory adapter requires ListBucket; its guide also includes bucket-scoped GetBucketLocation. It does not require GetObject or GetObjectVersion. Keep Block Public Access enabled. See [AWS ListObjectsV2](https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html) and [prefix conditions](https://docs.aws.amazon.com/AmazonS3/latest/userguide/amazon-s3-policy-keys.html).
5. Continue to test → Test Connection. A successful response verifies actual listing access, not file-body reads. Correct any specific failure and retry the same source.
6. Continue to discovery → Discover Metadata. Inspect the actual run ID, state, attempt count, returned count, warnings and failure reason. The provider does not expose percentage progress. Use cancellation or retry only when offered.
7. Open Review metadata preview. Review object names, complete S3 keys, sizes, modification times and ETags; filter/search the actual returned inventory. A zero-object success is identified explicitly. Partial inventory warnings must be considered before commitment.
8. Choose Commit to Catalog, then Inspect registered assets. A repeat discovery/commit reconciles the same external identities instead of creating duplicate assets.

To connect NovaMart Snowflake:

1. Choose Add connection → Snowflake → Continue. Select an active owning team.
2. Enter your actual Snowflake account identifier (organization-account or account locator, not a URL), Snowflake username, dedicated metadata role, database `NOVAMART_DB`, a usable warehouse, and schema allowlist `RAW, STAGING, CURATED, ANALYTICS`. Preserve identifier case.
3. Save settings. Paste the complete RSA private key in PEM format, preserving BEGIN/END lines. Supply its passphrase if encrypted. The matching public key must already be assigned to that Snowflake user. AWS keys used in an S3 stage cannot authenticate this connection.
4. Review the generated Snowflake setup SQL with an authorized administrator. The template scopes database/schema grants, table REFERENCES and view SELECT to the selected schemas, grants warehouse USAGE, assigns the role to the user, and includes the public-key assignment. View SELECT also permits reading view data; TRACE itself queries INFORMATION_SCHEMA. Future objects require additional grants; the template does not automatically grant future/account-wide access. Follow [Snowflake key-pair setup](https://docs.snowflake.com/en/user-guide/key-pair-auth), [privilege definitions](https://docs.snowflake.com/en/user-guide/security-access-control-privileges), and [Information Schema visibility](https://docs.snowflake.com/en/sql-reference/info-schema).
5. Test Connection, discover, inspect warnings and inventory, then explicitly commit. The NovaMart baseline expectation is 22 RAW tables, 22 STAGING views, 3 CURATED views and 6 ANALYTICS views, totaling 53 accessible source objects. These counts are acceptance expectations only and are not hardcoded. A successful metadata query does not prove that the role can see every expected object.

Follow-up: live Snowflake verification is now complete using the existing matching private key and the user-approved SNOWFLAKE_LEARNING_WH; see the linked Snowflake repair report. Remaining limitations: Automatic AWS role assumption/session refresh is not implemented; temporary session credentials must be rotated before expiry. Discovery remains bounded to 1,000 assets per snapshot; larger sources need narrower scopes. S3 discovery does not parse CSV contents or infer S3-to-Snowflake lineage. Provider-reported denial cannot by itself prove which IAM policy blocked access. These boundaries are reflected in setup guidance and outcomes.

Changed implementation files:

- `frontend/src/features/integration/ConnectionsPage.tsx`, `ConnectionWizard.tsx`, `ConnectionGuide.tsx`, `connectionModel.ts`, `MetadataInventory.tsx`, `connections.css`, `ImportCenter.tsx`.
- `frontend/src/services/api.ts`, `frontend/src/types/api.ts`, `frontend/test/connections.test.tsx`, `frontend/test/browser/connections.spec.ts`, `frontend/test/browser/hardening.spec.ts`.
- `backend/src/main/java/com/trace/backend/service/ConnectionService.java`, `DiscoveryWorker.java`.
- `backend/src/main/java/com/trace/backend/repository/ConnectionRepository.java`, `BrowseRepository.java`.
- `backend/src/main/java/com/trace/backend/integration/connectors/ConnectorValidation.java`, `ConnectorOutcomes.java`.
- `backend/src/main/java/com/trace/backend/tenancy/RuntimeDatabaseGuard.java`, migration V16, `ConnectorValidationTests.java`, `TenantIsolationIntegrationTests.java`, `MigrationUpgradeIntegrationTests.java`.
- `processor/app.py`, `processor/connectors/providers.py`, `processor/tests/test_s3_workflow.py`, `processor/tests/acceptance_processor.py`.
- Reports and browser evidence under `docs/connections/`.

This workspace has no `.git` repository, so no commit or Git diff is claimed.
