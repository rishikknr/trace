# Lineage, formula and metric correctness

Lineage remains evidence-based registry metadata. Dataset/column mappings validate endpoint existence, same tenant, required team writes, supported direction/types, active uniqueness and self/cycle rules. Manual cycle checks and writes share an organization advisory lock and a five-second query budget. Parsed SQL candidates are not automatically confirmed edges. No SQL/DAX is executed.

## Corrections and invariants

**H12 / P1:** changed live Power BI report/model association previously accumulated both relationships as current. Complete snapshots with an actually observed association now retire obsolete LIVE_DISCOVERY edges for that returned report and append audit; manual/imported declarations remain untouched. An inaccessible/omitted model association is unresolved and cannot erase earlier evidence. Old edges are inactive history, not deleted.

**H13 / P2:** graph traversal stopped processing even edges between existing nodes at exactly 100 nodes, and duplicate edges could produce false truncation. Bounds now count new endpoints/edges. Each emitted edge has both emitted endpoints. Graph node projection excludes large SQL/source metadata. The measured synthetic fanout test checks truncation and endpoint integrity; traversal still uses at most depth 5, 100 nodes, 200 edges, with explicit limits. Column graph data remains the root asset's directly incident column mappings; arbitrary multi-hop column expression impact is not implemented.

**H01 / P1:** registered dependency sets now reject INSERT as well as UPDATE/DELETE through restricted SQL, and registration locks the same parent as dependency edits. Java creates a DRAFT plus references and finalizes atomically. Existing registered versions retain IDs/text/references. Draft edits use expected revision and serialize on the formula identity; registered expression and metric versions remain immutable.

**H14 / P2:** version comparisons could display a slower earlier selection after a newer selection. Independent left/right sequences now keep the latest choice. Parent-column options are keyed to the selected asset while loading, so stale columns are not offered under a new parent. Dirty text/reference navigation, tenant switch, sign-out and unload protection remain.

**H15 / P2:** metric identity metadata lacked editing and usage lacked revocation. Metric name/definition/unit/grain/aggregation/descriptive owners now edit with a revision check; business key and owning team remain stable. Registered metric versions keep their formula reference. Usage revoke preserves evidence/time/audit and immediately removes that association from potential impact; active uniqueness permits a later explicit replacement.

Formula validation reports the actual SQLGlot status (PARSED/INVALID/UNRESOLVED/UNSUPPORTED), never execution evidence. Draft/registered is a registry lifecycle, not approval, deployment or semantic correctness. DAX/business rules have text/size checks only. Macro/dynamic SQL and ambiguous references require manual resolution. Metric versions snapshot the formula reference; mutable business metadata is not a reconstructed historical full metric-definition snapshot.

The graph's label remains potential impact from recorded relationships. Registered formula/metric changes do not rewrite Snowflake/GitHub/Power BI, automatically move usage to the newest version, or infer an S3-to-Snowflake pipeline. Source removal keeps historical UUIDs/edges available for review. No automatic business impact or execution verification was fabricated.

Browser evidence covers explicit dataset and column mappings, graph persistence, formula versions/draft edit/discard, stored comparison, metric registration/edit, report usage and revoke. SQL/HTTP regressions cover forbidden references, cycles, viewer/foreign tenant rejection, optimistic conflicts and immutability. See [inventory](01-feature-inventory.md) and [results](10-end-to-end-test-results.md).
