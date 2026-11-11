# Tenant isolation and database privileges

Step 09 replaces Step 08's server-wide development identity with an authenticated
Spring Security principal and a selected organization stored in the server session.
The former DevelopmentAccessFilter is removed. TRACE_DEV_* environment variables
and old trace.dev-tenant properties grant no access in any profile.

## Trust boundary

1. Spring Security loads the authenticated principal from an HttpOnly cookie session.
2. AccountStateFilter reloads account activity and security version every request.
3. TenantIdentityProvider combines that principal with the session's selected UUID.
4. TenantTransactions opens a new transaction and sets `trace.organization_id` using
   `set_config(..., true)`, local to that transaction.
5. `trace_active_membership` verifies active account, organization and membership.
6. Current roles are loaded from team memberships joined to active teams.
7. Repositories require a verified TenantContext inside that transaction.
8. Forced PostgreSQL RLS and organization-aware foreign keys constrain all registry
   access, including compatibility import endpoints.

A browser can request an organization selection, but cannot authenticate a user or
choose a trusted tenant by sending headers. UUIDs belonging to another organization
return the same 404 as absent UUIDs. Imports remain scoped to their creators;
organization administrators have no automatic creator-recovery bypass.

## Database roles

`trace_migrator` owns application tables/functions and runs Flyway. It has no
SUPERUSER/BYPASSRLS. `trace_runtime` owns no tables, inherits no roles, has no schema
CREATE, cannot inspect Flyway history or directly read users/credentials/reset
tokens, and cannot directly mutate identities, memberships, teams, invitations or
audit records. RuntimeDatabaseGuard refuses unsafe role grants and missing forced
RLS on every protected table, including the new invitations and audit tables.

Business records still have transaction-scoped RLS; there is no platform-admin
policy on assets, columns, connections, imports or lineage. Global platform status
operations never imply access to private tenant data.

## Narrow identity bridge

V5 adds SECURITY DEFINER functions owned by the restricted migrator, with fixed
`search_path=pg_catalog`, schema-qualified relations and explicit EXECUTE grants.
PUBLIC execution is revoked. Only the migrator may call the one-time administrator
bootstrap. Runtime cannot disable RLS, take the migration role, or issue identity
DML directly.

Pre-tenant lookup functions return a single credential/profile or that user's
active organization list. Definer-only discovery policies on organization identity
records support this list without altering business RLS. Invitation possession is
verified through a token hash policy, followed by organization status checks and
row locks. Platform directory functions validate the current server-resolved
platform administrator and expose only organization directory/status data.

These functions are an application/database trust boundary, not protection against
arbitrary execution as a compromised runtime role. The runtime necessarily has
credential-verification and account-management capabilities through the bridge.
Protect its credentials, use parameterized SQL, and do not expose arbitrary SQL.

## Mutations and ownership

Identity functions enforce trusted roles, lock the organization for membership and
team mutations, and append audit records in the same transaction. Runtime still
has no direct membership UPDATE privilege. Concurrent final-owner demotions cannot
both succeed. An owner can atomically transfer organization ownership to an active
member; the previous owner becomes ADMIN. ADMIN cannot modify OWNER memberships
or grant OWNER through invitations.

The final effective team owner cannot be removed/demoted. Revoking an organization
membership that would remove a team's final effective owner is rejected until
responsibility is transferred. Global disabling requires prior transfer/demotion
of organization/team owner roles, and cannot disable the final platform admin.
Teams have no destructive deletion endpoint. Explicit connection/asset ownership
transfers require org administration or source team ownership plus target team
write permission. Dataset owners remain explicit when a connection changes teams.

## Transactions and pooling

LOCAL settings disappear on commit/rollback before a connection is reused. No
ThreadLocal identity, pooled connection session setting, or client header drives
access. Fresh membership/team checks happen at protected transaction boundaries;
requests already authorized and in flight may complete their transaction before
a later revocation, as with ordinary transactional authorization.

Preview checks permissions before contacting the parser and again before storing
its batch. It records the initiating tenant/user and rejects a changed selection.
Commit locks the batch and source, rechecks both current and original owning team
permissions, and preserves the creator restriction. Existing UUIDs, human metadata,
idempotency, results and column provenance are preserved.

## Migration and verification

V1–V5 remain byte-identical after the signup amendment. V5 extends existing identities, membership role/status
checks, and team fields; adds credentials, invitations, reset tokens and immutable
audit storage; and grants only narrow bridges. Legacy fixture users receive no
password and are not authenticated automatically.

The test URL is strictly opt-in and named `trace_tenancy_test` on port 55433. The
suite upgrades real legacy V1 rows through V6 as a non-superuser migrator, verifies
preserved IDs, tests forced RLS with the actual runtime role, composite foreign
keys, context absence, pooled connection reuse after commit/rollback, concurrent
imports/ownership changes, and real authenticated cross-organization HTTP access.
H2 is not used.

The latest read-only development inspection on November 10, 2026 confirmed
operator-applied V1–V5 on localhost:5433/trace. The signup amendment leaves that
database, its administrator, and its fixtures unchanged; V6 is an operator rollout. See [authentication and authorization](authentication-and-authorization.md)
for the complete API, operator commands, test evidence and current limitations.

## Local registration amendment

V6 adds only `trace_register_user(text,text,text)`, a restricted definer bridge.
It inserts a fresh normalized USER identity, BCrypt credentials, and an audit event
atomically. Uniqueness conflicts never update an existing identity or its credentials.
It does not insert organizations, memberships or teams. Runtime still has no direct
identity DML or business RLS bypass. HTTP availability is separately restricted to
an exclusive loopback `local-dev` profile and non-forwarded local requests.
Production signup remains disabled; this is not email ownership verification.
See [local signup](local-signup.md) for configuration and verification.
