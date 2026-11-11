# Accessibility checklist

The browser pass covered desktop and mobile navigation, responsive layout, keyboard interaction, and representative status feedback. This is a targeted check toward WCAG 2.2 AA. Full assistive-technology and conformance testing remains open.

| Check | Result |
| --- | --- |
| Keyboard focus | Skip to content focused the main landmark. Sidebar links remained operable after collapse. Keyboard selection opened stored lineage edge evidence. |
| Dialogs | Search closed with Escape. Cancelling the formula discard dialog preserved the typed expression. Modal dialogs use the browser’s native focus containment. |
| Navigation | Active links expose `aria-current`. Back and forward returned to the expected workspace pages. The mobile menu used the same permission-aware destinations. |
| Forms | Labels, native required fields, grouped fieldsets, signup password hints, and named column inputs. File errors use an alert. |
| Status | Badges pair text with a dot and semantic color. Loading and success use status roles. Request failures and row-level API validation use alerts. |
| Scroll regions | Catalog, connections, import mapping, and column tables have named, focusable scroll regions. Graph pan preserves a separate scroll container. |
| Reflow | Eighteen loaded workspace surfaces and both public auth pages were checked at 1440, 1280, 1024, 768, 390, and 320 px. The final workspace sweep found zero page-level overflow. |
| Motion | `prefers-reduced-motion` removes transition and animation durations. |
| Contrast | Ink on canvas 14.28:1, muted text on canvas 5.69:1, white on primary 6.96:1, sidebar supporting text on rail 7.72:1, control border on white 3.34:1. Focus color measured 4.45:1 on white and 3.31:1 on the rail. |

Remaining checks include full screen-reader task runs, forced-colors mode, live connector errors, and the authorized Platform Management and invitation/recovery flows. Scrollable technical tables and the lineage canvas retain their readable widths on phones.
