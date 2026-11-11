# Security review

The [Step 09 design](../authentication-and-authorization.md) and [tenant trust boundary](../tenancy.md) remain authoritative. This pass independently reruns their authentication, CSRF, fixation, logout, rate-limit, registration, invitation, password change/reset/replay/expiry, audit rollback, ownership and tenant tests.

## Findings corrected

- **H01 / P1 — registered dependency insertion.** V10 protected UPDATE/DELETE, while INSERT could still extend a registered asset/column dependency set. V12 protects all three operations, forbids moving a dependency to another parent and locks the DRAFT parent. Java finalizes only after dependency insertion. Restricted SQL regressions cover forbidden insert/update and metric-to-draft references.
- **H02 / P1 — owner promotion versus deactivation.** `trace_user_state` serialized deactivation but ownership-establishing functions did not share its lock. A disposable V14 rehearsal reproduces an active organization with zero active owners after the interleaving. V15 acquires the same lock before organization rows in creation, organization membership, team creation/membership, invitation acceptance and ownership transfer. The new regression verifies promotion blocks on that lock and subsequent owner deactivation is refused. Earlier concurrent last-owner tests remain passing.
- **H03 / P1 — unbounded upstream buffering.** The private and legacy Java transports previously checked response length after buffering. Both now cancel the response subscriber beyond 8 MiB, retaining request/connect time limits and safe errors. The streaming regression deliberately exceeds the bound without relaying payloads.
- **H04 / P2 — stale provider test result.** A result from old configuration/credentials could mark newer settings CONNECTED. The return transaction compares its captured settings timestamp and rejects a changed source with CONFIGURATION_CHANGED. Provider reason codes are allowlisted in shape; credential byte buffers are cleared in finally blocks.

## Authorization matrix

OWNER/ADMIN can write active organization resources, subject to stricter ownership-transfer rules. MEMBER needs OWNER/EDITOR on every relevant active team. Organization VIEWER overrides stale team write roles. Both endpoints of a mapping and the formula/report involved in metric registration/usage are checked. Platform administration alone does not grant tenant metadata access.

The expanded HTTP matrix exercises organization OWNER, ADMIN, MEMBER with team OWNER/EDITOR/VIEWER, and organization VIEWER with stale team EDITOR/VIEWER, across connection/asset/column/formula/metric/profile writes. The foreign-UUID matrix covers connections/credential mutation, runs, previews, assets/columns, mappings, formula snapshots, metrics/versions, reports and teams; profile/tag/usage browse results remain hidden. Restricted SQL separately checks all relevant tenant relations under the other organization context.

RLS trusts transaction-local context supplied by the authenticated Java service. It is defense against missing tenant predicates/pool leakage, not a claim that a compromised service holding runtime credentials cannot set a different GUC. User-level RBAC remains mandatory in the service and identity bridge. Runtime is not superuser/BYPASSRLS, owns no tenant tables, cannot alter policies or directly modify identity tables, and has no Flyway-history grants.

## Secrets and public boundaries

AES-256-GCM remains organization/connection/version bound with random nonces and an externally supplied stable key. Tampering, wrong binding, missing/weak keys and credential rotation are tested. No ordinary API exposes secrets/nonces/ciphertext; no browser authentication storage was introduced. Request diagnostics log generated correlation ID, method, route template, status and duration, never bodies/query strings/cookies/provider payloads. Queue errors and provider messages remain sanitized.

Public signup and local token delivery remain exclusive-loopback local-dev features. No public email-ownership proof, email sender, MFA or SSO was fabricated. Session/rate-limit sharing and bulk encryption-key migration remain outside this single-instance release. Preserve the real encryption key; re-generating it does not recover existing ciphertext.

## Existing development preflight

Read-only inspection found the original `Legacy registry (unassigned)` organization, UUID `00000000-0000-0000-0000-000000000001`, active with zero members/owners. This is the pre-existing quarantine created for legacy metadata, not an organization created by this pass. No private membership was granted and no data changed. The operator must explicitly keep it quarantined/suspend it or authorize a deliberate ownership/data adoption procedure before completing rollout. See [recorded preflight](evidence/development-owner-preflight.txt).
