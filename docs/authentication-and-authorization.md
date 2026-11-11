# Authentication and authorization

## Scope and verified status

Trace Step 09 implements global identities, independent organization memberships,
team ownership, secure onboarding, server-side sessions, CSRF, audit records and
protected metadata workflows in the existing application. The original JDBC
registry, parser, UUIDs, tenant transaction infrastructure and V1–V4 migrations
are preserved. A subsequent amendment adds simple registration only for loopback
`local-dev`; external public signup stays disabled, and no development authentication
bypass exists. See [local signup](local-signup.md) for the current behavior.

Spring Boot 4.1.2 resolves Spring Security **7.1.2** through its managed dependencies.
The implementation uses SecurityFilterChain, UserDetailsService, PasswordEncoder,
standard form authentication, session fixation protection and standard logout.
Spring's documented [session lifecycle](https://docs.spring.io/spring-security/reference/servlet/authentication/session-management.html)
and [CSRF behavior](https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html)
inform the integration; versions were checked against the resolved Maven tree.

This is a single-instance implementation verified on PostgreSQL 16. It is not a
claim of production readiness. Read-only inspection of the actual development
database initially confirmed V1–V4 and safe roles. The later signup-amendment
inspection on November 10, 2026 found operator-applied V1–V5. No migration or account
change was made there by the amendment; V6 rollout remains an operator action.

## Architecture and contracts

Controllers define HTTP routes. IdentityService handles session/profile/password
workflows. OrganizationService handles organization/team/invitation administration.
ResourceOwnershipService handles explicit transfers. AuthorizationPolicy and
RegistryRepository enforce service/repository permissions; tenant database mutation
functions independently reinforce identity-management permissions.

IdentityRepository and OrganizationRepository own parameterized persistence SQL.
IdentityMapper and typed request/response records define management contracts;
credentials never become response DTOs. TenantIdentityProvider reads only the
Spring principal and server session. TenantTransactions revalidates current
memberships and team roles inside every protected transaction. RuntimeDatabaseGuard
still refuses unsafe roles and grants. The Python processor remains stateless and
receives CSV bytes only, without browser sessions or organization/user headers.

## Identity schema and migration

**V5__authentication_and_authorization.sql** introduced identity management. The
signup amendment adds **V6__local_account_registration.sql**, a narrow registration
function with no new tables or broad runtime grants. V1–V5 remain byte-identical.
V5 extends existing tables instead of replacing them:

| Model | Storage and state |
| --- | --- |
| Global user | Existing `users`; normalized email, case-insensitive unique index, display name, active flag, platform role, updated/last-login timestamps, security version |
| Credentials | `user_credentials`; user FK, BCrypt hash, changed timestamp, must-change flag, creation/update timestamps; optional per user |
| Organization | Existing stable UUID/name/unique slug; `active=true` means ACTIVE, false means SUSPENDED; updated timestamp |
| Org membership | Existing unique `(organization_id,user_id)`; OWNER/ADMIN/MEMBER/VIEWER; ACTIVE/INVITED/SUSPENDED/REVOKED; timestamps |
| Team | Existing organization-scoped UUID/name; scoped unique slug, description, active flag and timestamps |
| Team membership | Existing composite FKs to team and org membership; OWNER/EDITOR/VIEWER, unique identity and timestamps |
| Invitations | Org FK, normalized fixed email, role, SHA-256 token hash, deadline, inviter, PENDING/ACCEPTED/REVOKED, accepted identity/time |
| Recovery | User FK, token hash, deadline, consumed timestamp; no plaintext token |
| Audit | Actor, optional org, type/resource/id/outcome/time and JSON object metadata; append-only for runtime |

Existing boolean activity conventions are retained instead of conflicting string
status columns. Invitations carry activation lifecycle independently of global
users. Historical INVITED membership rows remain supported. Existing creation time
continues to represent the membership's original join/creation history.

Legacy users receive no password and are not silently authenticated. The first
platform administrator can deliberately issue a recovery link to an existing
credentialless user; consuming it creates local credentials and audits activation.
Otherwise existing identities must authenticate before accepting invitations.
Optional credentials keep the domain open to a later OIDC adapter without changing
organization authorization. OIDC/SSO is not implemented here.

## Authentication, sessions and CSRF

Email lookup trims and normalizes case. BCrypt strength defaults to 12, configurable
within 10–16. New passwords default to at least 12 characters and at most 72 UTF-8
bytes, avoiding BCrypt truncation. The configurable minimum must remain 12–64.
Passwords and hashes are not returned or logged. Wrong password, unknown email and
disabled-account login use the same 401 message. Spring's authentication provider
performs password verification and dummy hashing for unknown identities.

```mermaid
sequenceDiagram
  participant R as React
  participant S as Spring Security
  participant D as PostgreSQL identity bridge
  R->>S: GET /api/auth/csrf
  S-->>R: Masked CSRF token + HttpOnly session cookie
  R->>S: POST /api/auth/login (email/password + CSRF header)
  S->>D: Normalized credential lookup
  D-->>S: Credential + account state
  S->>S: BCrypt verify; rotate session ID
  S->>D: Last login + LOGIN_SUCCESS audit
  S-->>R: Safe success; rotated HttpOnly cookie
  R->>S: GET /api/auth/me
  S-->>R: Safe identity + memberships + selected context + permissions
```

Sessions are servlet sessions in backend memory. Their identifier is never in
application JavaScript or localStorage. Cookies are HttpOnly, SameSite=Lax, and
Secure when `TRACE_SECURE_COOKIES=true`; HTTP loopback development uses false.
Tracking is cookie-only, preventing session IDs in URLs. Idle timeout defaults to
30 minutes (`TRACE_SESSION_TIMEOUT`). Logout is CSRF-protected POST and invalidates
the session. Backend restart also ends all sessions. This is suitable for the
current one-instance loopback deployment; shared JDBC session storage is required
before horizontal scaling or restart persistence is promised.

Every request with a session reloads global activity and security version. Password
change/reset increments the version and revokes prior sessions on their next
request, including sessions on other instances if database identity checks are
preserved. No session table grants access to tenant business records. Disabling a
user also changes the version. Login fails closed if its audit write fails: the
new session is invalidated and the client gets 503.

React obtains a fresh masked CSRF token before every mutation, including login,
logout, organization switching, team/membership changes, connections and multipart
imports. Token refresh after login/logout is necessary because Spring clears the
prior token. CSRF is never globally disabled. Requests use the existing same-origin
Vite proxy and credential cookies; wildcard credentialed CORS is not configured.

## Organization selection and tenant authorization

```mermaid
sequenceDiagram
  participant R as React
  participant A as IdentityService
  participant D as PostgreSQL
  R->>A: POST select-organization(UUID) + CSRF
  A->>D: Current user's active memberships and active organizations
  D-->>A: Authorized choices
  A->>A: Verify selection; store UUID in server session
  A->>D: Revalidate tenant membership; audit organization selection
  A-->>R: Current roles and permissions
  R->>R: Clear tenant views, discard old in-flight responses
```

```mermaid
sequenceDiagram
  participant B as Browser
  participant S as Security / TenantTransactions
  participant D as Restricted runtime / PostgreSQL
  B->>S: Protected request + cookie (untrusted headers ignored)
  S->>D: Fresh global activity/security-version check
  S->>S: Resolve principal + server-stored organization
  S->>D: BEGIN; SET LOCAL trace.organization_id
  S->>D: Active org membership + current active-team roles
  S->>S: Enforce operation and resource ownership
  S->>D: Registry SQL under forced tenant RLS
  D-->>S: Tenant-only result / FK constraint failure
  S->>D: COMMIT or ROLLBACK clears local context
  S-->>B: Safe response
```

No user, role or organization header selects identity. A platform administrator
has no blanket data permission. Platform directory/status functions affect only
provisioning and status; newly created organizations explicitly grant their creator
an OWNER membership. Pre-existing organizations require an independent membership.

Unauthorized selection fails with 403. Revoked/suspended membership, suspended org
or disabled account removes effective access. An invalid selected org is cleared
from the session. Team roles are freshly loaded, so removed memberships/demotions
cannot remain cached as authority. React rechecks on focus and every 30 seconds;
its next denied tenant request also refreshes selection. Switching remounts all
tenant pages, clears import state and discards stale in-flight responses.
Already-authorized requests in flight may finish their transaction before a later
revocation; this implementation does not cancel PostgreSQL statements mid-flight.

## Permission matrix

| Action | Platform admin without org access | Org OWNER | Org ADMIN | MEMBER | VIEWER |
| --- | --- | --- | --- | --- | --- |
| Create/list/suspend orgs | Yes, platform scope | Only with platform role | Only with platform role | No | No |
| Catalog / connections / teams read | No | Yes | Yes | Yes | Yes |
| Organization settings/members/invitations | No | Yes | Yes, cannot grant/change OWNER | No | No |
| Create teams | No | Yes | Yes | No | No |
| Manage team membership | No | Yes | Yes | Team OWNER only | No |
| Create source/import/edit team resources | No | Yes | Yes | That team's OWNER/EDITOR | No |
| Transfer resource ownership | No | Yes | Yes | Source team OWNER and target team write | No |
| Transfer organization ownership | No | Yes | No | No | No |
| Global account state/recovery | Yes, platform scope | Only with platform role | Only with platform role | No | No |

Organization VIEWER overrides every team write role. Team VIEWER never imports.
Finance EDITOR cannot write Data Engineering resources. All org members can read
the organization catalog; private per-team read partitions are not defined in this
milestone. Organization administration never implies future KPI approval authority.
No metric proposal/approval executor is implemented.

Final active organization ownership is protected with serialized row locks. Team
owner removal/demotion is protected similarly; membership revocation requires
transferring a team's final effective owner first. Teams have no destructive delete
API. Resource transfers are explicit and audited. Changing a source's team does
not silently change historical asset or import-batch ownership. Import creators
must still have permission for both the current connection and original batch team.
No administrative import-creator bypass has been added.

## Invitations and password management

```mermaid
sequenceDiagram
  participant A as Org administrator
  participant S as Invitation service / DB bridge
  participant U as Invited user
  A->>S: Invite fixed email + allowed org role
  S->>S: Generate 256-bit opaque token; persist SHA-256 hash
  S-->>A: One-time local delivery link (authorized local-dev only)
  U->>S: Accept token + new profile/password, or matching existing session
  S->>S: Lock org then invitation; validate active org, expiry, identity, state
  S->>S: Create identity if new; activate membership; consume token; audit atomically
  S-->>U: Rotate session; require/select active organization
```

Default invitation lifetime is 48 hours, configurable up to seven days. A replacement
revokes a prior pending invitation for that email in the org and audits replacement.
Tokens are single-use, cryptographically random and never stored in plaintext.
Replayed, expired, revoked, mismatched-user or suspended-org invitations fail.
Concurrent acceptance permits exactly one successful transaction. Existing account
acceptance requires its authenticated identity and cannot overwrite its password.
Tokens live in URL fragments for local delivery, avoiding HTTP request logs/referrers.
Do not share links outside the intended recipient; tokens are sensitive bearer
activation capabilities. There is no public lookup-by-email API. Registration is
local-development-only, as described in [the amendment](local-signup.md).

Password change requires the current password and a valid session/CSRF token. It
signs the caller out and revokes other sessions through security version checks.
Recovery is narrowly platform-admin assisted, with a 30-minute single-use token
(configurable up to 60 minutes). Only its hash is stored. Recovery can deliberately
activate an existing legacy identity without credentials; it does not create an
arbitrary new user. Reset invalidates other outstanding tokens and all old sessions.
Expired/replayed tokens cannot change credentials. No public reset-by-email endpoint
is exposed without an actual delivery channel.

Local delivery requires exactly the `local-dev` profile, loopback binding and
`TRACE_LOCAL_TOKEN_DELIVERY=true`. Production/mixed/external profiles reject this
configuration at startup. Outside this workflow, invitation/recovery issuance fails
503 until a real delivery provider is implemented. No email is sent in this step.

## Audit, revocation and abuse controls

```mermaid
sequenceDiagram
  participant A as Org administrator
  participant D as PostgreSQL
  participant U as Existing user session
  A->>D: Authorized member status/role change; lock organization
  D->>D: Final org/team owner checks + membership mutation + audit
  D-->>A: Commit (audit failure rolls all changes back)
  U->>D: Next protected request resolves current membership
  D-->>U: 403; clear invalid selection
  U->>U: Clear org data; refresh authorized organizations
```

Audits cover bootstrap, login success/failure, logout, password change/reset/issuance,
profile updates, organization selection/create/status/settings, invitations and
replacement/revocation/acceptance, organization/team membership and role changes,
team creation/settings, account status, and organization/resource ownership transfer.
Structured metadata includes safe role/status/team before/after values where
applicable. No raw passwords, token values, cookies, session IDs or secrets appear
in audit metadata. Runtime has no UPDATE/DELETE privilege on history. Tenant audit
visibility is RLS-scoped and API-restricted to organization administrators; global
security audit records currently require controlled database-operator inspection.
Critical privilege changes and their audit inserts share a database transaction.

Baseline abuse control is a bounded, synchronized process-local fixed-window limiter
per socket IP and sensitive route (20 attempts/60 seconds, up to 10,000 keys by
default). It limits signup, login, invitation acceptance, public reset consumption and
administrator recovery issuance without permanent account lockout. Forwarded
identity/IP headers do not confer authority. Public deployment needs an explicitly
trusted proxy strategy and distributed limits if multiple instances are used.
Authentication form parsing is bounded to 16 KiB; JSON requests are bounded to
16 KiB even without Content-Length. Multipart imports retain 5 MiB file/6 MiB request
limits and parser row/column limits. Safe JSON errors omit internal SQL/stack traces.

## API reference

All mutations require a valid CSRF header and session except possession-based
invitation/reset consumption, which still require CSRF. Successful mutations return
a typed object/ID or `{ "ok": true }`. API 401 is unauthenticated/revoked session;
403 is missing permission/selection/CSRF; 404 hides absent or foreign UUIDs; 409 is
conflicting state/reference/ownership. Abuse limits return 429; unconfigured delivery
or unavailable login audit storage returns 503.

| Method | Endpoint | Contract |
| --- | --- | --- |
| GET | `/api/auth/registration` | Safe local signup availability and password length bounds |
| POST | `/api/auth/register` | Local-only `{displayName,email,password,confirmPassword}`; 201 safe account response, no automatic login/membership |
| GET | `/api/auth/csrf` | `{token,headerName}`; token is CSRF only, not a session ID |
| POST | `/api/auth/login` | Standard Spring form body `email=...&password=...`, content type `application/x-www-form-urlencoded`; rotated cookie, safe success |
| POST | `/api/auth/logout` | Invalidate cookie session |
| GET | `/api/auth/me` | Safe user, current organizations, selection, org/team roles, typed effective permissions |
| POST | `/api/auth/select-organization` | `{organizationId}`; `/api/auth/organization` is an equivalent protected alias |
| GET | `/api/me/organizations` | Current user's active organization memberships |
| GET | `/api/me/permissions` | Selected org, permissions, per-team roles/permissions |
| PATCH | `/api/auth/profile` | `{displayName}` |
| POST | `/api/auth/change-password` | `{currentPassword,newPassword}`; `/api/auth/password/change` is an equivalent alias |
| POST | `/api/auth/invitations/accept` | `{token,displayName,password}` for new identity; existing identity must be signed in and needs `{token}` only |
| POST | `/api/auth/password/reset` | `{token,newPassword}`; expires/revokes all previous sessions |
| GET/POST | `/api/platform/organizations` | Platform-only directory / `{name,slug}` provisioning |
| PATCH | `/api/platform/organizations/{id}/status` | Platform-only `{active}` |
| PATCH | `/api/platform/users/{id}/status` | Platform-only `{active}`; owner protections apply |
| POST | `/api/platform/users/{id}/password-recovery` | Platform-only one-time local delivery |
| GET/PATCH | `/api/organization` | Selected org info / `{name}` |
| GET | `/api/organization/members` | Org admin member list; no credential data |
| PATCH | `/api/organization/members/{user}` | `{role,status}`; status ACTIVE/SUSPENDED/REVOKED |
| POST | `/api/organization/transfer/{user}` | OWNER atomically transfers to an active member and becomes ADMIN |
| GET/POST | `/api/organization/invitations` | Org admin pending/history list / `{email,role}` |
| DELETE | `/api/organization/invitations/{id}` | Revoke pending invitation |
| GET | `/api/organization/audit` | Most recent 200 scoped audit events; org administrators only |
| GET/POST | `/api/teams` | Scoped list / `{name,slug,description}`; create automatically assigns creator team OWNER |
| GET/PATCH | `/api/teams/{id}` | Details/members/owned resources / update `{name,slug,description}` |
| GET | `/api/teams/{id}/candidates` | Active-org member candidates for authorized team managers |
| POST | `/api/teams/{id}/members` | `{userId,role}`; existing active org member only |
| PATCH | `/api/teams/{id}/members/{user}` | `{role}` |
| DELETE | `/api/teams/{id}/members/{user}` | Remove team membership, preserving final owner |
| PATCH | `/api/connections/{id}/owner-team` | Explicit `{ownerTeamId}` transfer |
| PATCH | `/api/assets/{id}/owner-team` | Explicit `{ownerTeamId}` transfer |
| GET | `/api/registry/status` | Tenant-scoped database status, asset count and org display |
| GET | `/api/assets?q=&limit=&offset=` | Tenant catalog, bounded stable pagination |
| GET | `/api/assets/{id}` | Tenant dataset details |
| GET | `/api/assets/{id}/columns` | Tenant column list; foreign parent is 404 |
| GET/POST | `/api/connections` | Tenant sources / `{name,ownerTeamId}` with team write authorization |
| POST | `/api/imports/preview` | CSRF-protected multipart connectionId/file, authorized current team |
| POST | `/api/imports` | Same protected preview compatibility alias |
| GET | `/api/imports/{id}` | Tenant + creator-owned stored preview/results |
| POST | `/api/imports/{id}/commit` | Tenant + creator + both owning-team permissions, atomic idempotent import |

Team candidates expose only safe member profile/role/status information, never
credentials. Scoped org routes deliberately omit a caller-selected org UUID;
switching must be validated first. No compatibility route bypasses security.
No destructive user/organization/team deletion endpoint is supplied.

## Frontend

The React application now has real Sign In and local Sign Up, password visibility
and confirmation feedback, recovery/invitation entry points, no-organization selection, an organization
switcher, profile/name/password management, invitation acceptance, password reset,
organization settings/members/invitations/audit, team list/detail/membership forms,
platform provisioning/status/recovery, and source connection creation/ownership
transfer. Existing catalog, dataset details and import preview/commit remain.
Permissions come from authenticated responses; server services and RLS enforce
access regardless of hidden controls. Requests never store tokens/passwords in
localStorage. 401 clears session state, revoked tenant context clears tenant pages,
403 actions show access denial, and failed mutations never claim optimistic success.

## Verification evidence — November 10, 2026

Tests run against disposable PostgreSQL 16.15 on **55433**, not the development
volume. All backend tests use Java 21. The suite performs an actual V1-to-V6 upgrade
with legacy UUID preservation and runs application SQL as `trace_runtime`.

| Check | Result |
| --- | --- |
| Backend unit/transport/configuration tests | 13 passing |
| PostgreSQL + real HTTP integration tests | 42 passing |
| Maven package | Successful; 55 total tests, zero skipped/failing |
| Python parser unit tests | 20 passing |
| React TypeScript / Vite production build | Passed |
| Frontend lint | Passed, no warnings |
| V1–V5 SHA-256 comparison | All unchanged |
| Latest development DB inspection | Read only; operator-applied V1–V5; V6 not applied by amendment |

Registration assertions cover validation, BCrypt hashing, safe typed responses,
no privileges, duplicates/races, credentialless legacy conflicts, audit rollback,
CSRF, signup abuse limits, and production/remote gates.

Integration assertions cover valid/invalid/unknown/disabled login, safe responses,
session creation/rotation/expiry/logout/replay, CSRF rejection/success, rate limits
and bounded JSON, fresh organization/team roles, forged headers, unauthorized
selection, suspension/revocation/disablement, platform scope, one-time bootstrap,
admin escalation/final-owner protection, concurrent owner demotions and invitation
acceptance, hashed/expired/revoked/replayed/mismatched invitations, password change,
recovery expiry/replay, legacy credentialless activation, audit failure rollback,
login-audit fail-closed behavior, typed permissions and resource ownership transfers.
The preserved suite tests RLS, composite FKs, pooled context cleanup, missing tenant
context, runtime grants, cross-tenant UUIDs, creator scoping, real Python imports,
reimport idempotency, incremental columns, validation, expiry and rollback.

### Browser workflow

A real browser used React/Vite → Spring Boot → Python → PostgreSQL on isolated
ports 5173/8081/8001/55433. The existing backend on 8080 was left running untouched.

- The operator-only interactive bootstrap provisioned a test administrator; hidden
  password prompts and real BCrypt login were exercised.
- Browser platform forms created NovaMart and RetailHub, then NovaMart Finance and
  Data Engineering and RetailHub Analytics teams.
- Browser invitation creation returned the secured one-time local link. New-account
  activation and initial team role assignment used real onboarding/management HTTP
  APIs; new-password entry was not automated through the browser.
- The engineer logged in through the browser, accepted RetailHub's invitation as
  its matching existing identity, and saw NovaMart MEMBER / RetailHub ADMIN.
- As NovaMart Data Engineering EDITOR, the browser selected the real CSV through
  the file chooser, previewed **2 datasets / 5 columns**, confirmed the import,
  browsed both datasets, and opened RAW.ORDERS with four columns.
- Switching to RetailHub showed an empty catalog. A direct NovaMart asset UUID
  displayed Resource not found.
- The Finance team VIEWER read the catalog; direct navigation to imports displayed
  Access denied. Server-side denial is independently covered by integration tests.
- An authenticated admin API revoked the engineer's NovaMart membership while its
  browser session stayed open. The next catalog request was denied; session refresh
  removed NovaMart from available organizations.
- Browser logout returned to login; navigating to the protected catalog API then
  returned AUTHENTICATION_REQUIRED. Old-cookie replay is covered by HTTP tests.

Screenshots are stored alongside this document:
[authenticated dataset](step09-dataset-browser.jpg) and
[viewer denial](step09-access-denied-browser.jpg),
[final team management](step09-team-browser.jpg), and
[immediate revocation](step09-revocation-browser.jpg).
The final packaged application also passed a browser smoke check of typed member/team
responses, team-role assignment, permission-aware navigation and immediate removal
of a revoked organization on the next protected request. The browser was signed out.

The first upload automation attempt failed; retrying the actual file input
succeeded. Browser evidence describes exercised actions, not unperformed checks.

## Acceptance checklist

| Criterion | Evidence / state |
| --- | --- |
| Real users/password hashing/session creation/invalidation/CSRF | Passed HTTP tests and real browser login/import/logout |
| Multiple memberships and validated session selection | Passed HTTP and browser, independent MEMBER/ADMIN roles |
| Organization/team authorization and denied imports | Passed HTTP; browser team editor import and viewer denial |
| Secure invitation activation and replay protection | Passed PostgreSQL/HTTP; existing-account acceptance in browser |
| Existing-session membership changes and revocation | Passed PostgreSQL/HTTP and browser |
| Cross-organization metadata access | Passed forced-RLS integration and browser foreign UUID check |
| Step 08 CSV behavior preserved | Passed authenticated real-processor regression suite and browser import |
| Audit events and atomic audit failure behavior | Passed PostgreSQL assertions and deliberately failing audit triggers |
| React uses real authenticated APIs and clears tenant state | Exercised in browser; typed build and lint passed |
| No normal dev bypass or shared admin credentials | Removed filter; obsolete-property and production delivery guard tests |
| Existing migrations/UUIDs preserved | Original hashes unchanged; real upgrade test preserved legacy IDs |
| Documented local startup | Packaged jar, migration command, bootstrap and isolated startup exercised |
| Backend, PostgreSQL, Python, frontend checks | All passing as listed above |
| Actual development rollout on port 5433 | V1–V5 already operator-applied; **V6 and amended-service restart pending operator action** |

## Limits and remaining deployment work

Use a single instance with process-local sessions/limits for this environment.
Persistence/distributed sessions and abuse controls, HTTPS enforcement/proxy trust,
production email delivery, MFA/SSO, operational monitoring/retention and a dedicated
security review remain deployment work. Secure-cookie configuration must be enabled
with HTTPS. Local HTTP does not demonstrate TLS cookie transport. Password-change/reset and invitation-based password entry have real HTTP
integration tests; public Sign Up password entry, registration and subsequent login
were exercised in the browser by the amendment. The frontend has build/lint and browser verification,
not an added automated frontend test framework. Audit history is append-only for
the runtime; database owners can administer storage, so external tamper-evident
retention would be a separate operational feature.

No production/development credential was invented or rotated. No development data,
volume, historical migration or UUID was reset. The workspace has no Git metadata,
so no commit/PR was created. No formal project execution log was produced.
