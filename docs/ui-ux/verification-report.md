# TRACE UI verification report

> Historical report. For the current V15 release, immutable artifact commands and
> protected test databases, follow [final hardening rollout](../final-hardening/11-operator-rollout.md).


Verified 11 November 2026, Asia/Kolkata. Browser evidence comes from the running TRACE application with persisted acceptance records.

## Environment

| Service | Target |
| --- | --- |
| Vite frontend | `127.0.0.1:15173` |
| Spring Boot | `127.0.0.1:18081` |
| Acceptance processor | `127.0.0.1:18000`, `tests.acceptance_processor:app` |
| Acceptance PostgreSQL | `127.0.0.1:55433/trace_tenancy_test` |
| Reset-capable regression database | Temporary PostgreSQL 16 container on `127.0.0.1:55436`, removed after testing |

The existing acceptance database and services were checked before browser writes. Spring was relaunched with the tested JAR and Flyway disabled after the read-only browse changes. Browser tests added uniquely named records in Completion Acceptance. The pre-existing browser fixtures were retained. The persistent development database on 5433 was outside these runs.

## Verification results

| Check | Result |
| --- | --- |
| TypeScript and Vite production build | Passed with `npm --prefix frontend run build` |
| Frontend lint | Passed with `npm --prefix frontend run lint` |
| Frontend tests | 4 passed with `npm --prefix frontend test`, covering role gates, guarded navigation, CSV header handling, and mapping conflicts |
| Backend package and regression | 76 passed, zero failed or skipped, against port 55436. The pagination test now covers provider filters, catalog sort and source scope, and tenant isolation. |
| Processor regression | 96 passed with `.venv/bin/python -m unittest discover -s tests` from `processor` |
| Responsive pass | 108 loaded workspace checks across 18 surfaces and six widths. Both auth pages also checked at the same widths. Zero page-level overflow in the final loaded workspace sweep. |

## Browser acceptance

| Workflow | Observed result |
| --- | --- |
| Identity and tenant switching | Signed in and selected Completion Acceptance. Switched to Step 10 Browser Acceptance. The earlier tenant's source was absent. Signed out from both owner and viewer sessions. |
| Connections | Created and edited `UI Manual 36743094`. Reopened after reload and confirmed the edited description. The rebuilt list matched Manual and excluded Snowflake for that source. A GitHub configuration reached the credentials step with the recorded status Not tested. |
| Imports | Mapped the five source fields in `generic.csv`, previewed `NOVAMART.CURATED.FACT_ORDERS`, committed, and opened its two columns in Catalog. Also committed `report.json` for the mapping workflow. |
| Catalog | Confirmed a connection-scoped result set of five assets and server-side reverse-name sort. Registered `UI Raw Orders 36743094`, added a column, and saved ownership and an organization tag that appeared after navigation. |
| Lineage | Saved asset and column relationships from the registered raw asset. Keyboard selection opened the stored edge evidence in the inspector. Verified fit controls and contained horizontal scrolling at 390 px. |
| Formula | Validated SQL and saved registered version 1 plus draft version 2. Edited version 2, cancelled discard and checked that the unsaved text survived, then registered the same version and compared both expressions. |
| Metric and mapping | Created `UI Net Revenue 36743094`, registered metric version 1 against formula version 2, and mapped it to Executive Sales Report. The separate mapping list displayed the saved evidence. |
| Discovery | Opened a real source's persisted run history and observed five stored runs. |
| Pagination | Used the 125-connection fixture and advanced through all five pages to `101–125 of 125 connections`. Next was disabled and the last record's detail opened. |
| Permissions | A team viewer could read the controlled connection and had no settings, credential, or discovery write actions. Manual registration had no writable team. The import deep link showed access denied. The owner without a platform role was denied Platform Management. |
| Keyboard and navigation | Verified main-landmark skip, rail collapse, Escape dismissal, mobile drawer navigation, catalog search, and browser back/forward. |

## Rendered evidence

| Surface | Desktop | Mobile |
| --- | --- | --- |
| Sign in | [Sign in](screenshots/01-sign-in-desktop.jpg) | [Sign in](screenshots/mobile-sign-in.jpg) |
| Sign up | [Sign up](screenshots/02-sign-up-desktop.jpg) | [Sign up](screenshots/mobile-sign-up.jpg) |
| Overview | [Overview](screenshots/03-overview-desktop.jpg) | [Overview](screenshots/mobile-overview.jpg) |
| Connections | [List](screenshots/04-connections-desktop.jpg), [setup](screenshots/05-connection-setup-desktop.jpg), [credential step](screenshots/05b-connection-credentials-desktop.jpg), [detail](screenshots/06-connection-detail-desktop.jpg) | [List](screenshots/mobile-connections.jpg) |
| Import Center | [Mapping](screenshots/07-import-mapping-desktop.jpg), [preview](screenshots/08-import-preview-desktop.jpg), [commit](screenshots/08b-import-committed-desktop.jpg) | [Import Center](screenshots/mobile-import.jpg) |
| Catalog | [Catalog](screenshots/09-catalog-desktop.jpg), [dataset](screenshots/10-dataset-detail-desktop.jpg), [registration](screenshots/11-manual-registration-desktop.jpg) | [Catalog](screenshots/mobile-catalog.jpg), [registration](screenshots/mobile-register.jpg) |
| Lineage | [Explorer](screenshots/12-lineage-desktop.jpg), [mapping](screenshots/13-manual-mapping-desktop.jpg) | [Explorer](screenshots/mobile-lineage.jpg) |
| Formula Studio | [Editor](screenshots/14-formula-studio-desktop.jpg), [comparison](screenshots/15-formula-comparison-desktop.jpg) | [Editor](screenshots/mobile-formula-studio.jpg), [comparison](screenshots/mobile-formula-comparison.jpg) |
| Metrics | [Detail](screenshots/16-metric-desktop.jpg), [report mappings](screenshots/16b-report-mappings-desktop.jpg) | |
| Management | [Teams](screenshots/17-teams-desktop.jpg), [members](screenshots/18-members-desktop.jpg), [settings](screenshots/19-organization-settings-desktop.jpg), [audit](screenshots/19b-audit-desktop.jpg) | [Navigation drawer](screenshots/mobile-navigation.jpg) |
| State and role examples | [Empty](screenshots/20-empty-connections-desktop.jpg), [loading](screenshots/20-loading-desktop.jpg), [service error](screenshots/20-service-error-desktop.jpg), [denied](screenshots/20-access-denied-desktop.jpg), [viewer](screenshots/connection-viewer-desktop.jpg) | |
| Discovery and paging | [Run history](screenshots/discovery-history-desktop.jpg), [last page](screenshots/connections-pagination-desktop.jpg) | |

The original implementation was audited in source and rendered in the browser before the change. For historical images of the prior design, see [sign up](../signup-desktop-browser.jpg), [formula workspace](../step10/formula-browser.jpg), and [lineage](../step10/lineage-browser.jpg). See [page design specifications](page-design-specifications.md) for the before/after inventory.

## Bundle measurements

Both builds used Vite 8.3.7 with the same installed dependencies. Sizes use Vite's reported decimal kB.

| Asset | Before | After |
| --- | --- | --- |
| Startup JavaScript | 314.63 kB raw / 91.32 kB gzip | 253.68 kB raw / 79.12 kB gzip |
| Startup CSS | 10.97 kB raw / 3.20 kB gzip | 22.79 kB raw / 5.79 kB gzip |
| CodeMirror editor | 426.20 kB raw / 138.49 kB gzip | 426.21 kB raw / 138.49 kB gzip, lazy |
| Lazy workspace chunks | Workspace pages bundled into startup | Major workspace chunks about 6–17 kB raw each, plus shared helpers |

Startup JavaScript fell by about 19% raw and 13% gzip. Initial JS and CSS together fell from 94.52 to 84.91 kB gzip. Lineage and the editor load when their routes or tools open. These measurements describe build output rather than network or runtime timings.

## Remaining verification and product limits

- A platform administrator's provisioning and recovery screens, invitation acceptance, and password-reset submission need an authorized operator browser run. Sign-up rendering and local eligibility were checked. Sign-up submission was outside this browser run.
- Real Snowflake, S3, GitHub and Power BI credentials were unavailable. The acceptance processor uses controlled responses. The browser check inspected persisted discovery history, while the backend suite exercised queue behavior.
- Connector configuration exposes the last test time. A distinct historical last-successful-test timestamp is unavailable. Catalog sort uses last seen or name. A universal last-modified timestamp is unavailable.
- The browser verified import selection through the file picker. Drag-and-drop, saved mapping profile reuse, and expiry require additional interaction coverage.
- Large catalog lists remain paginated. Some existing ownership and dependency selectors load up to 10,000 options. Catalog and connections search on submit. Report selector filtering applies to its loaded options.
- Formal WCAG conformance, screen-reader walkthroughs, and performance on the largest allowed graphs remain open. The [accessibility checklist](accessibility-checklist.md) records the checks performed.

## Operator follow-up

1. Sign in as a provisioned platform administrator in acceptance. Check that Platform Management loads organizations, then verify provisioning, suspension, and private recovery-link delivery with disposable accounts.
2. Sign in as a local organization administrator. Issue an invitation to a test recipient, use it in a separate session, and check expiry and replay behavior. Verify password reset using a separate test account and the administrator-issued link.
3. With authorized test provider credentials, verify each connector’s test result and discovery preview. Confirm that authentication errors, permission errors, and incomplete discovery appear distinctly.
4. Drag a demo CSV onto Import Center, save a mapping profile, and reuse it on a fresh file. Confirm duplicates block preview and that an expired batch shows the server failure without a commit action.
5. Run the accessibility checklist with a screen reader and forced colors, and time the largest supported lineage traversal on representative hardware.

## Run the redesigned app

From the repository root, install and check the frontend.

```sh
npm --prefix frontend ci
npm --prefix frontend run build
npm --prefix frontend run lint
npm --prefix frontend test
```

With the existing acceptance services already running, start Vite only if port 15173 is free.

```sh
TRACE_BACKEND_URL=http://127.0.0.1:18081 npm --prefix frontend run dev -- --port 15173
```

Open [TRACE acceptance](http://127.0.0.1:15173/). To start a stopped acceptance processor and Spring process, use separate terminals. The private fixture environment file must already have been provisioned. Confirm the acceptance database is at V10 on port 55433 before starting Spring.

```sh
# Terminal 1
set -a
. /tmp/trace-step10-test.env
set +a
(cd processor && .venv/bin/uvicorn tests.acceptance_processor:app --host 127.0.0.1 --port 18000)
```

```sh
# Terminal 2
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
(cd backend && env -u TRACE_TEST_ADMIN_URL ./mvnw package)
set -a
. /tmp/trace-step10-test.env
set +a
"$JAVA_HOME/bin/java" -jar backend/target/backend-0.0.1-SNAPSHOT.jar \
  --spring.datasource.url=jdbc:postgresql://localhost:55433/trace_tenancy_test \
  --spring.flyway.enabled=false --spring.profiles.active=local-dev \
  --server.address=127.0.0.1 --server.port=18081 \
  --trace.processor.url=http://127.0.0.1:18000 --trace.discovery.lease-seconds=10
```

For the persistent development installation, follow the [application runbook](../../README.md#start-the-application) and the [existing V6–V10 rollout](../step10/operator-rollout.md). For test steps with prerequisites and expected responses, see the [isolated operator checklist](../step10/browser-acceptance.md). In Formula Studio, open **Version history and comparison** before selecting versions or choosing a draft to edit.
