# Real browser screenshot index

These are actual application screenshots captured during implementation. They are not generated mockups. Earlier captures are retained alongside the final refreshed captures. See the [verification report](README.md#browser-evidence-and-acceptance-status) and [final browser checks](browser-final-acceptance.json).

## Before

| Screen | Capture |
| --- | --- |
| Connected source inventory | [Connections](before/connections.jpg) |
| Original lineage, depth restriction and mapping form | [Lineage and mappings](before/lineage.jpg) |
| Original Formula Studio | [Formula Studio](before/formula-studio.jpg) |
| Original metric registry | [Metrics](before/metrics.jpg) |
| Original report mapping | [Report mappings](before/report-mappings.jpg) |
| Catalog before its own content changes; new sidebar links had already appeared | [Catalog](before/catalog.jpg) |

No separate original impact, source-detail or asset-detail baseline is claimed.

## Implemented browser states

| State | Capture |
| --- | --- |
| Final standalone connected source overview | [Source overview](after/source-overview-final.jpg) |
| Final formula inputs, named columns and linked output | [Formula dependencies](after/formula-dependencies-final.jpg) |
| Final NET_REVENUE calculation and version information | [Metric detail](after/metric-detail-final.jpg) |
| Final complete five-node path to NET_REVENUE | [Complete impact path](after/impact-metric-path-final.jpg) |
| Real SQL candidates and column mapping review | [Transformation review](after/transformation-review.jpg) |
| Interactive Snowflake workspace | [Snowflake lineage](after/snowflake-lineage.jpg) |
| Explicit S3 COPY/stage evidence | [Cross-system evidence](after/cross-system-evidence.jpg) |
| Curated transformation, SQL and neighbors | [Transformation inspector](after/transformation-inspector.jpg) |
| Upstream highlight | [Highlighted upstream](after/expanded-upstream.jpg) |
| Fullscreen graph | [Fullscreen](after/fullscreen-multiple-layers.jpg) |
| Actual field dependencies | [Column lineage](after/column-lineage-detail.jpg) |
| Read-only NET_AMOUNT scenario | [Column impact](after/column-impact.jpg) |
| Recorded path through formula to NET_REVENUE | [Impact path](after/impact-path-to-metric.jpg) |
| Legitimate registered SQL formula | [Formula Studio](after/formula-studio.jpg) |
| Immutable registered version | [Formula history](after/formula-version-history.jpg) |
| No reporting assets / Power BI unconnected | [Reporting onboarding](after/report-mapping-empty-state.jpg) |

## Disposable acceptance only

These images use a separate organization on port 15189 / database 55449. Their reports, metrics and graphs are clearly named test fixtures and are not NovaMart discoveries.

| State | Capture |
| --- | --- |
| Selected level 13 in a cyclic 14-level graph | [Beyond five levels](after/disposable-beyond-five-levels.jpg) |
| Full upstream reachability | [Upstream](after/disposable-upstream-traversal.jpg) |
| Second page of 106 reachable relationships | [Progressive continuation](after/disposable-progressive-page-2.jpg) |
| Manual report registration | [Manual report](after/disposable-manual-report-registration.jpg) |
| Version-specific measure usage | [Usage mapping](after/disposable-report-mapping.jpg) |
| Declared model/measure/report/visual memberships | [Manual lineage form](after/manual-lineage-mapping.jpg) |
| Metric → measure → model/visual → report reachability | [Reporting chain](after/disposable-metric-report-chain.jpg) |
| Revocation retains historical evidence | [Revoked usage](after/disposable-report-mapping-revoked.jpg) |
| Revoked usage removed from active impact | [Revoked impact](after/disposable-revoked-impact.jpg) |

## Responsive browser checks

| Viewport / state | Capture |
| --- | --- |
| 390px source overview | [Overview](after/responsive-overview-390.jpg) |
| 390px lineage workspace | [Lineage](after/responsive-lineage-390.jpg) |
| 390px fullscreen graph | [Fullscreen](after/responsive-fullscreen-390.jpg) |
| 390px column impact | [Impact](after/responsive-impact-390.jpg) |
| 390px SQL review | [Transformation](after/responsive-transformation-390.jpg) |
| 390px formula dependencies | [Formula](after/responsive-formula-390.jpg) |
| 390px metric dependencies | [Metric](after/responsive-metric-390.jpg) |
| 1024px graph and inspector | [Tablet lineage](after/responsive-lineage-1024.jpg) |

No page-level horizontal overflow was observed in these checks. Graph canvases pan and metric history tables scroll internally. Some full-page captures show sticky navigation at the current scroll position.

## Intermediate captures retained for diagnosis

- [Source overview before the missing stylesheet import was fixed](intermediate/source-overview-before-stylesheet-fix.jpg). The final source imports the stylesheet directly; the corrected final capture is linked above.
- [Metric detail before the latest named-column/dependency panel and readable snapshot presentation](intermediate/metric-detail-before-dependency-panel.jpg). The final code, API and browser rendering are verified; the final capture is linked above.

Earlier formula screenshots precede the final named-column labels. The final formula and responsive captures above show those labels. Browser access was restored for the final pass.
