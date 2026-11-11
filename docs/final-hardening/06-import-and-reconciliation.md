# Import and reconciliation correctness

All eight formats remain: Snowflake CSV, generic CSV, S3 inventory, metadata JSON, SQL, SQL ZIP, Power BI inventory CSV and reporting mapping CSV. The real Python parser retains BOM/quoted-cell handling, duplicate/conflict detection, file/row/object/column/decompression/depth limits, ZIP path/symlink rejection, and parse-only SQL behavior. Java revalidates the normalized boundary before persistence. Metadata JSON rejects duplicate object keys, nonfinite numeric values, blank identities/columns, excessive per-object metadata/columns, invalid warnings and missing relationship endpoints with actionable 422 responses at the parser boundary.

## Corrections

- **H05 / P1:** complete inventory inference from empty warnings was unreliable. Informational Power BI warnings prevented removal observations, while implicit completeness was too weak. Explicit provider completeness plus a configured-scope hash now governs missing-asset/column observation. Scope changes and partial snapshots never retire an old scope. Data and lineage endpoints are retained, visibly NOT_SEEN rather than deleted.
- **H06 / P1:** an older live preview could overwrite newer committed source metadata. Commit rejects a live preview if a newer acquisition for that connection has already committed. A changed source settings timestamp invalidates an uncommitted preview. Old pre-release previews without that snapshot must be recreated.
- **H07 / P1:** optional provider fields removed from a newer live snapshot survived the old JSON merge. Live source metadata now replaces the provider snapshot, with source name, scope and provenance retained separately from curated fields. File imports remain partial merges. Changed source state is recorded with actor/import and old/new values.
- **H08 / P2:** nullability/ordinal changes were omitted from effective change counts and manual curation could be overwritten. Counts consider non-curated effective changes; curation flags preserve explicit human values. Newly missing imported columns are marked, not deleted. Older manual never-imported columns receive conservative curation flags in V14.
- **H09 / P2:** mapping/normalized header collisions silently replaced values in a Python dict. Effective headers must now be unique. Reporting exports accept mapping to report_name/visual_name/measure_name/metric_name. Saved profiles validate supported target names and audit saves.
- **H10 / P2:** preview state existed in the database but the new-file UI did not change its URL. Successful preview routes to `#import/{id}`, preserving review through refresh. Existing history remains creator-owned. Correct committed links enter a source-scoped catalog, then the actual asset detail.
- **H11 / P2:** re-saving an unchanged tag set produced removal/addition history. Differential tag assignment now records only real changes.

## Transaction and identity rules

Preview creates no canonical assets/columns/edges. Commit locks its batch and source, rechecks tenant/creator/original and current team rights, expiry and settings, recomputes effective counts, reconciles and writes audit/history/COMMITTED together. A late integrity or audit error rolls back the entire transaction. Repeated commit of the same already-committed batch returns its original results; competing batches are serialized on the connection.

Natural identity remains organization + connection + external key + asset type, and parent asset + column name. Unchanged identities retain UUIDs, manual names/descriptions/owners/team/tags and immutable formula snapshots. Renames producing a new external identity are not automatically equated with the old object. A partial file never deletes omitted metadata.

Source/column history starts with actual changes after this release and links the observing import where applicable. It does not reconstruct earlier values. Effective curated nullability/ordinal may differ from an acquired observation; the normalized batch retains the original acquired column fields. That difference is not falsely reported as an effective canonical update. A missing object/column is an inventory observation, not proof of provider deletion or executed-flow breakage.

Evidence includes real CSV mapping/profile reuse, preview refresh, explicit commit, unchanged reimport/UUID preservation, curation and added-column visibility in the browser, plus JSON/SQL/ZIP/invalid/rollback/concurrency/expiry coverage in backend/Python tests.
