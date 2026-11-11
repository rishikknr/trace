# Step 09 amendment — local Sign Up and Sign In

## Implemented behavior

The amendment extends the existing Spring Security, BCrypt, HttpOnly cookie sessions,
CSRF, invitations and tenant authorization. It does not replace authentication.

Sign In keeps the existing email/password Spring Security flow, with show/hide
password, loading/errors, Sign Up navigation and a Forgot Password entry point.
Forgot Password explains the existing platform-administrator-assisted recovery
process and accepts an already-issued link/token. It does not pretend to send
email or introduce an insecure reset-by-email endpoint.

Sign Up has Full Name, Email, Set Password and Confirm Password. It provides
visibility controls for both password fields, guidance derived from the server's
password policy, live confirmation matching, browser email validation, backend
validation, loading/error states and case-insensitive duplicate-account feedback.
Success displays **Account created successfully.** and returns to Sign In.
Registration does not authenticate the new account automatically.

New accounts receive only `USER`, with no organization or team membership. After
sign-in, an account with no active memberships sees:

> Your account is ready. Join an organization through an invitation.

The empty state links to an invitation entry form. Existing invitation acceptance
continues to require the matching authenticated identity for an existing account.
Platform organization provisioning remains platform-admin-only. No OTP, SMS or
email-verification screen was added.

## API

`GET /api/auth/registration` is an unauthenticated capability response:

```json
{"enabled":true,"minimumPasswordLength":12,"maximumPasswordBytes":72}
```

`POST /api/auth/register` requires a valid CSRF header obtained from
`GET /api/auth/csrf`, even though the caller need not be signed in.

```json
{
  "displayName":"Example User",
  "email":"user@example.com",
  "password":"a user-chosen long passphrase",
  "confirmPassword":"a user-chosen long passphrase"
}
```

The API validates a nonblank display name (maximum 150 characters), normalized
email, the existing configurable password policy and matching confirmation.
The default password minimum is 12 characters, with a maximum of 72 UTF-8 bytes.
The existing configured BCrypt PasswordEncoder hashes passwords. Confirm Password
is never persisted. Only safe identity fields and the result message are returned:

```json
{
  "id":"a-generated-user-uuid",
  "displayName":"Example User",
  "email":"user@example.com",
  "message":"Account created successfully."
}
```

| Status | Meaning |
| --- | --- |
| 201 | Account, credentials and USER_REGISTERED audit event committed atomically |
| 400 | Invalid fields, password policy failure or mismatched confirmation |
| 403 | Missing/invalid CSRF or signup unavailable in this environment/request |
| 409 / ACCOUNT_EXISTS | Existing case-insensitive identity, including credentialless legacy users |
| 413 | Request exceeds existing authentication/JSON size limits |
| 429 | Existing per-IP/route abuse threshold exceeded |
| 500 | Persistence/audit failure; account creation rolls back |

Duplicate registration is serialized by PostgreSQL's existing unique normalized
email index. Concurrent duplicates permit one successful account only. Existing
identities, credentials, memberships and administrator accounts are never updated
by registration. A failed audit insert rolls back both account and credentials.
No raw password, hash, confirmation or session identifier appears in the response
or registration audit metadata.

## Local-only configuration and deployment limits

The global/default configuration is:

```properties
trace.security.local-signup-enabled=false
```

The existing `local-dev` profile uses:

```properties
server.address=127.0.0.1
trace.security.local-signup-enabled=${TRACE_LOCAL_SIGNUP_ENABLED:true}
```

Thus local signup is enabled with the exclusive loopback `local-dev` profile.
Set `TRACE_LOCAL_SIGNUP_ENABLED=false` to disable it there. Default and production
profiles remain disabled. Forcing this feature on production, mixed profiles or a
non-loopback listener rejects startup. The request policy additionally rejects
remote sockets, forwarded/proxied address headers and cross-site requests.
The existing same-origin Vite proxy continues to work.

The feature does not establish ownership of an email address. Do not expose this
profile through a tunnel, ingress or public reverse proxy. Before any public signup
deployment, implement verified email ownership and appropriate deployment/abuse
protections. Merely disabling future signup does not verify accounts previously
created in a development database; treat such identities as unverified during any
future migration to a production identity model. No verification claim is added
by this amendment.

Sign-in, session cookies, CSRF, password change/reset, organization selection,
fresh membership checks and PostgreSQL business RLS are unchanged.

## Why V6 is required

`trace_runtime` deliberately cannot INSERT directly into `users` or
`user_credentials`. V5 exposes only the existing identity-management functions;
none safely creates a normal, uninvited account without changing another workflow.

**V6__local_account_registration.sql** therefore adds one narrowly scoped
SECURITY DEFINER function with a fixed search path and schema-qualified SQL. It
explicitly inserts USER, requires a BCrypt-shaped hash, creates credentials and
appends USER_REGISTERED in the same database operation. EXECUTE is revoked from
PUBLIC and granted to the restricted runtime. It grants no direct table DML,
changes no business RLS policy, adds no tables and alters no existing accounts.
V1–V5 are unchanged and their original SHA-256 checksums were verified.

## Verification

On November 10, 2026:

- **55 backend tests passed:** 13 unit/configuration/transport and 42 actual
  PostgreSQL/HTTP integration tests, with no failures/errors/skips.
- New PostgreSQL tests cover registration success/BCrypt/no secrets/no privileges,
  login/logout/relogin, every input rule, confirmation mismatch, duplicate email,
  existing credentialless identity protection, concurrent duplicates, audit rollback,
  signup rate limits, CSRF, disabled production/local settings, forwarded requests,
  and existing-user invitation acceptance after registration.
- Unit configuration tests reject production/mixed/external signup settings and
  remote/cross-site traffic.
- All existing platform administrator login, invitations, organization switching,
  RBAC, PostgreSQL RLS/foreign-key/pooling and real CSV ingestion tests still pass.
- **20 Python parser tests passed.**
- React TypeScript/Vite production build and lint passed without warnings.
- V1–V5 checksum comparisons all passed.

Tests reset only `trace_tenancy_test` on **55433**. They did not reset or migrate the
actual development database on **5433**. A new disposable PostgreSQL container was
used. Existing user-started services on 5173/8081 were left running untouched.

### Browser verification

The browser used the actual React → Spring Boot → restricted PostgreSQL path on
**5174/8082/55433**. No fake account creation or hardcoded frontend identity was used.
A test administrator was provisioned in the disposable database before signup.

1. Opened Sign In and followed Sign Up.
2. Verified all four fields, guidance, mismatch feedback and disabled submission.
3. Exercised password show/hide and matching confirmation.
4. Registered a new synthetic account using the real API.
5. Verified success message and redirect to Sign In.
6. Signed in and saw the exact empty-organization message and invitation entry.
7. Logged out and signed in again successfully, then logged out.
8. Signed in with the pre-existing disposable administrator and opened Platform.
9. Opened Forgot Password and verified administrator-assisted recovery guidance.
10. Retried the registered email and saw the backend duplicate-account error.
11. Checked mobile at **390×844** and desktop at **1280×900**, with no horizontal
    overflow; visually inspected screenshots and restored the browser viewport.
12. Left the browser signed out.

Evidence: [Sign Up](signup-browser.jpg), [empty organization state](signup-empty-organization-browser.jpg),
[mobile layout](signup-mobile-browser.jpg), [desktop layout](signup-desktop-browser.jpg).

## Operator rollout — not applied automatically

Read-only inspection found **V1–V5 already applied** on the real development
database. This amendment did not apply V6 there, change its existing administrator,
rotate credentials, replace `.env`, or reset any development data.

Stop/restart your existing backend deliberately during rollout; an already-running
jar will not gain the new endpoint from frontend HMR. From the repository root:

```zsh
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
cd backend
./mvnw package
cd ..
# Export your existing distinct role secrets privately as in README.md.
java -jar backend/target/backend-0.0.1-SNAPSHOT.jar --migrate-only
# Do not run --bootstrap-admin if your administrator already exists.
export TRACE_LOCAL_SIGNUP_ENABLED=true
java -jar backend/target/backend-0.0.1-SNAPSHOT.jar --spring.profiles.active=local-dev
```

Then start or restart the same-origin frontend (`cd frontend && npm run dev`).
If you use backend port 8081, retain `--server.port=8081` and
`TRACE_BACKEND_URL=http://127.0.0.1:8081` in the frontend terminal. Reuse your actual
administrator's existing credentials. No new real administrator is necessary.

To repeat isolated verification, stop any manually started test app using 55433,
then use the disposable database/test commands in README.md. Never point the reset
suite at the actual development database. Production public signup/email ownership
verification and distributed abuse/session infrastructure remain outside this amendment.
