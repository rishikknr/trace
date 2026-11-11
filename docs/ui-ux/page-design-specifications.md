# Page design specifications

## Audit and design changes

| Surface | Finding in the original application | Implemented design |
| --- | --- | --- |
| Shell and landing | Long horizontal navigation wrapped and lacked a clear active section. Catalog served as the default landing. | Grouped sidebar, contextual header, active tenant control, search, and a real-data Overview. |
| Connections and discovery | Provider selection, lists, and edit forms competed on one page. Technical records carried most status information. | A filterable list, provider setup, connection detail, and source-scoped run history. Separate columns for last test, last successful discovery, and latest stored run. |
| Import | Field mappings were stacked controls and change counts were raw JSON. | File drop and picker, field table with duplicate checks, six-stage progress, counts and warnings, and a commit result linked to a source-scoped catalog query. |
| Catalog and asset detail | Listing treated all resources as datasets. Asset details used raw provenance and had no asset-specific lineage entry. | Resource type, source, owner team, owners, tags, and inventory state. Server filters and sort, column nullability, curation activity, and a direct lineage entry. |
| Manual registration | Repeated column cards made multiple columns hard to scan. | Identity, source and owner groups plus an editable column table with per-row labels. |
| Lineage | Large vertical SVG nodes sent all relationships around the same side. | Layered graph, keyboard-selectable edge handles, pan, zoom, fit/reset, evidence inspector, manual mapping, and bounded history. |
| Formula Studio | Registry, editor, validation JSON, and comparison shared a single long view. | Editor and version panes, linked asset and team context, SQL highlighting, structured parse results, diff and dependency evidence, and discard protection. |
| Metrics and report mappings | Metric versions displayed JSON and usage lived at the bottom of the metric form. | Business definition and ownership, registered version table, searchable report selector, and a separate mapping registry with evidence and resource links. |
| Teams, members, settings, audit | Organization settings combined unrelated tasks. Management screens used mixed row and form patterns. | Dedicated settings, Members and invitations, Audit History, and team list/detail. Role changes, transfers, and invitation revocation have confirmations. |
| Sign-in and account | Identity screens used a generic centered card. | Shared identity layout, compact password and account controls, mobile brand header, empty organization membership state, and account settings panels. |

The existing public invitation, password-reset and help routes use the identity layout. Platform Management uses the same management structure for provisioning and recovery. Existing Snowflake, Amazon S3, GitHub SQL, Power BI, manual, and file import setup still use their supported operations.

## Data and interaction semantics

- Overview reports browse endpoint totals and shows up to five sources, catalog records, and creator-owned imports. Catalog snapshot ordering follows the registry browse order. Counts display an unavailable state if a read fails.
- Connection detail uses configuration and credential-presence fields returned by the backend. Credential rotation, testing, and discovery remain separate actions. Provider glyphs are neutral icons.
- Preview statistics are the server’s comparison or commit results. The review table uses each dataset’s qualified identity. Post-commit links include the source connection to disambiguate identical identifiers.
- Graph edges represent persisted relationships. The inspector presents relationship type, provenance, evidence, and creator/date where supplied. Depth, direction and truncation are explicit. Report mappings remain declared usage.
- Formula validation shows processor parse outcomes for SQL and stored-text checks for DAX or business rules. Comparison keeps the registered expression and version identifiers visible. Access for draft editing is restricted to writable formulas.
- Paginated views fetch a bounded page and keep tables inside a scroll region. Some existing dependency and ownership pickers use bounded option loading. See the verification report for the remaining scale limitations.
