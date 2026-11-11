# Navigation and information architecture

| Group | Destinations |
| --- | --- |
| Workspace | Overview, Catalog, Lineage |
| Data sources | Connections, Import Center, Discovery History |
| Definitions | Transformations, Formula Studio, Metrics, Report Mappings |
| Management | Teams, Members, Organization Settings, Audit History |
| Administration | Platform Management |

Overview is the workspace landing route. The sticky header identifies the selected organization and current section. The account menu contains Account Settings and Sign out. Search opens a dialog from the header or with Ctrl/⌘+K and navigates to a shareable catalog query.

The desktop rail collapses to icons with accessible link names. At 768 px and below, a modal drawer contains the same destinations. Catalog owns asset detail and registration. Discovery History opens runs by source. Transformations filters the catalog to registered SQL transformation assets and links to Formula Studio for expressions and versions.

Existing hashes continue to work for catalog, asset, connection list, import and preview, formula, metric, lineage, teams, profile, and public invitation and reset flows. Additional deep links include `#overview`, `#connections/new`, `#connections/<id>`, `#connections/<id>/history`, `#lineage/<asset-id>`, `#transformations`, `#report-mappings`, `#members`, and `#audit`.

The sidebar uses the current session to show Import Center, organization administration, and platform administration. Connection, asset, formula, and mapping actions also apply the resource’s owning-team permissions. Server authorization remains authoritative. A tenant switch removes the current page from view, advances the API request epoch, and remounts workspace data under the confirmed organization. The formula discard dialog can interrupt navigation or organization switching until the user decides.
