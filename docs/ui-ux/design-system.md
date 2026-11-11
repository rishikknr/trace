# TRACE design system

TRACE uses a dark teal navigation rail, a warm off-white workspace, and compact white surfaces. The branching mark carries the product’s lineage motif into navigation and sign-in. Provider icons identify source families through simple shapes and text labels.

## Tokens

| Role | Token | Value |
| --- | --- | --- |
| Workspace | `--canvas` | `#f6f7f4` |
| Surface | `--surface` | `#ffffff` |
| Inset surface | `--inset` | `#f1f4f1` |
| Text | `--ink` | `#182824` |
| Supporting text | `--muted` | `#53665f` |
| Separator | `--line` | `#dbe3de` |
| Control boundary | `--control` | `#7e9188` |
| Primary | `--accent` | `#126554` |
| Primary hover | `--accent-hover` | `#0a5143` |
| Selected surface | `--accent-soft` | `#e6f1eb` |
| Sidebar | `--sidebar` | `#152c2a` |
| Success, warning, error text | `--success`, `--warning`, `--danger` | `#216746`, `#785414`, `#a13735` |

- The spacing scale uses 4, 8, 12, 16, 24, and 32 px. Default controls use 7 px corners. Floating dialogs and the account popover use a shadow.
- Body text is 14 px. Page headings scale from 26 to 34 px, section headings are 17 px, form labels and table body text are 13 px, and supporting metadata is 12 px. The UI uses a locally available Inter or system sans-serif stack. Technical identifiers and code use the system monospace stack. Timestamps and counts use tabular numerals.
- Buttons and links use 140 ms color transitions. The reduced-motion rule suppresses nonessential transitions.

## Shared components

| Component | Use |
| --- | --- |
| `Brand`, `Icon` | Wordmark and single-weight vector icons |
| `PageHeader` | Area, title, context, and primary actions |
| `Status`, `Timestamp` | Recorded states and readable dates |
| `TableRegion`, `Pager`, `PageNavigation` | Named, keyboard-scrollable tables and server-backed paging |
| `EmptyState`, `Feedback`, `Loading`, `Success` | Empty, failure, progress, and saved states |
| `Dialog`, `ConfirmDialog` | Native modal focus containment, Escape, and guarded actions |
| `TeamSelect`, `AssetSelect`, `PasswordField` | Role-aware ownership choices, asset filtering, and password visibility |
| `WorkspaceShell`, `AuthShell` | Tenant scope, grouped navigation, search, account controls, and public identity screens |
| `AssetActivity`, `LineageGraph` | Paginated curation events and the selectable relationship inspector |

Native inputs, selects, disclosure elements, and fieldsets provide the form controls. CodeMirror supplies the SQL editor and syntax highlighting. JSON views remain available for technical evidence and long-tail fields.
