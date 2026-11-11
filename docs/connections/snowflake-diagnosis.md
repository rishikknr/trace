# Snowflake connection repair — November 11, 2026

The saved NovaMart Snowflake connection failed before provider authentication because its `privateKey` field contained a base64 RSA public key, including a trailing terminal `%`. TRACE requires the matching complete private-key PEM. Its Warehouse field also contained the schema allowlist (`RAW, STAGING, CURATED, ANALYTICS`). The account identifier `YJUJFLN-CW27089` was retained.

A local key-file search found `/Users/rishi/trace_snowflake_private.pem`. In-memory cryptographic checks confirmed that the existing stored passphrase opens this encrypted private key and that its derived public key exactly matches the supplied public key. No key contents or passphrase were printed or written to a plaintext transfer file.

An actual Snowflake login then succeeded as `TRACE_METADATA_READER` with `TRACE_METADATA_ROLE` in `NOVAMART_DB`. The requested `ECOMMERCE_WH` could not be selected by this role (Snowflake error 2043); the temporary session had no current warehouse. The role could see `SNOWFLAKE_LEARNING_WH` and `SYSTEM$STREAMLIT_NOTEBOOK_WH`. The user explicitly selected `SNOWFLAKE_LEARNING_WH`. No Snowflake grants, roles, users, public-key bindings, warehouse settings or database objects were changed.

With the approved warehouse, the actual processor adapter passed its live metadata-access test and discovered a complete 53-object snapshot with no warnings:

| Schema | Objects |
|---|---:|
| RAW | 22 |
| STAGING | 22 |
| CURATED | 3 |
| ANALYTICS | 6 |

The correct warehouse and matching private-key PEM were saved through the authenticated TRACE UI and its encrypted credential endpoint. The existing passphrase was retained in memory during this repair, submitted over the local authenticated workflow, and cleared from temporary buffers. The encrypted-only transfer envelope was deleted after use. The original private-key file was not modified. No credentials were placed in ordinary configuration JSON or reports.

The authenticated TRACE test then succeeded, discovery returned 53 assets, and the explicit preview commitment registered all 53 distinct external identities and their columns. The final state is recorded in the linked workflow evidence.

Implementation changes add specific, sanitized error categories for public-key input, incomplete PEM/prompt characters, missing passphrase, an unnecessary passphrase on an unencrypted key, an invalid/decryption-failing private key, and a schema allowlist entered as a warehouse. Client validation rejects public-key bodies before save. Backend and processor validation reject a schema list in Warehouse. Error codes are allowlisted through Spring and rendered with corrective instructions. Private-key hints distinguish key-file passphrases from Snowflake sign-in passwords. No migration was required.

Verification: 105 backend tests passed, including actual PostgreSQL regression tests on disposable port 55438; 129 processor tests passed; 4 frontend utility tests and 50 component/transport tests passed. Production build and frontend lint passed. The seven new processor tests use generated synthetic keys and verify redaction and that invalid keys never reach the provider. Live requests used the actual account and matching existing private key. See [runtime rollout](snowflake-diagnostics-rollout.json) and [final authenticated workflow evidence](snowflake-live-workflow.json).

Relevant provider contracts: [Snowflake Python key-pair authentication](https://docs.snowflake.com/en/developer-guide/python-connector/python-connector-connect), [SHOW WAREHOUSES visibility](https://docs.snowflake.com/en/en/sql-reference/sql/show-warehouses), and [warehouse USAGE permissions](https://docs.snowflake.com/en/user-guide/security-access-control-configure). A warehouse that cannot be selected may be absent or inaccessible; the observed error alone does not establish which condition applies.
