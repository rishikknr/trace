# Frontend and accessibility

The existing teal design system, compact tables, responsive shell and route/editor splitting are preserved. Changes complete existing flows rather than redesigning the interface.

## Functional corrections

Preview URLs now persist review across refresh. Asset editors remount for the exact record ID, preventing edit-to-edit reuse of another asset's form state. Added columns refresh the visible curation list. Source/column history and missing-column status are visible. Metric metadata can be edited with revisions, usage can be revoked with confirmation/history, and later comparison selections cannot be overwritten by slower earlier responses. Column reference choices clear during parent changes. Discovery attempts load on expansion and follow run state; foreign creator-only preview links are replaced by an explanation. Workspace integrationVersion checking makes the old backend mismatch explicit.

Component tests use maintained Vitest, Testing Library and jsdom; browser tests use Playwright with a separate Chrome context and a real isolated Spring/PostgreSQL/Python stack. They are not a substitute for one another. The complete control/API index is in [inventory](01-feature-inventory.md).

## Observed automated scope

- Existing four helper tests plus 33 component/transport/feature tests: 37 frontend tests.
- Real journeys cover signup/no-org onboarding; source creation/edit/reload; mapped CSV/profile reuse; preview refresh and explicit commit/reimport; catalog; added columns/owners/tags; direct edit navigation; manual dataset/column lineage; formula draft/registration/discard/comparison; metric registration/edit/usage/revoke; team create/edit/owner; viewer denial/tenant switch; platform provisioning/invitation/reset; queue cancellation/retry and attempts.
- 126 workspace layout checks: 21 routes × 320, 390, 768, 1024, 1280 and 1440 pixels; plus 12 sign-in/signup checks at those widths. Loaded pages must have their heading, finish loading, expose no error alert and have no page-level horizontal overflow. Table/graph regions remain intentionally scrollable.
- axe WCAG 2 A/AA and 2.1 AA rules on Overview plus 17 loaded list/form/detail/lineage surfaces; zero reported violations within that automated scope. Native mobile dialog Escape dismissal is exercised.
- Browser paging reaches the 101–125 final connection page; final record opens. Sign-in does not fetch CodeMirror; the editor renders only after opening its workspace/formula.

Successful screenshots are under [evidence](evidence/). They contain synthetic identities and metadata. Test credentials/session traces stay in the private temporary test state, not repository evidence. Failed exploratory test runs were corrected; only the final successful suite is used for acceptance totals.

## Pending human assistive-technology procedure

Axe is not a screen reader and does not establish WCAG conformance. Pending operator walkthrough on disposable acceptance:

1. Use VoiceOver + Safari or NVDA + Firefox/Chrome; record OS/browser/reader versions and zoom. Keep test credentials private.
2. Traverse Sign In/Sign Up without a mouse. Confirm labels, password reveal state, match/policy help, error announcement and focus after failure.
3. Sign in, use skip-to-main, open/close the navigation/search/account controls, and change organization. Confirm the new scope is announced and old results are absent.
4. Open a scrollable table, page it, enter a search, provoke an error and retry. Confirm headers, result count and disabled paging semantics.
5. Open create-tag/confirm-revoke/discard dialogs. Confirm modal focus containment, initial safe focus, Escape/cancel, and focus restoration to the trigger.
6. In Import, map fields, reuse a profile, preview, announce warnings/counts and commit. Verify expired/denied preview cannot be mistaken for committed metadata.
7. In Formula Studio, enter multiline SQL, leave via Tab, choose references, save/edit a draft, cancel discard and compare two stored versions. Confirm editor/read-only semantics and added/removed line descriptions.
8. Traverse graph nodes/edges by keyboard and read inspector evidence. Confirm an equivalent relationship list is understandable without relying on graph color/position.
9. Repeat important flows at 200% and 400% zoom, reduced motion and forced colors; verify focus and state indicators remain distinguishable.

Record pass/fail and exact blocker for each step. Screen-reader/forced-color/manual conformance remains PENDING; this report does not silently mark it complete.

## Retained scale limits

Primary lists are server paginated. Some ownership/dependency selectors intentionally load bounded options up to 10,000 and search those options locally; they explicitly error beyond that limit. Universal audit paging and maximum-size browser graph/editor/import throughput are not certified by the current measurements. These are disclosed scope/scale boundaries, not claims of infinite scalability.
