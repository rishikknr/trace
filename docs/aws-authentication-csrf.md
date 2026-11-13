# TRACE authentication through the EC2 HTTPS tunnel

## Observed failure (November 13, 2026)

The public EC2 HTTP endpoint returned a valid CSRF response and a
`JSESSIONID; Path=/; Secure; HttpOnly; SameSite=Lax` cookie. A browser cannot send
that Secure cookie over public HTTP. Login therefore arrives without the session
that owns the CSRF token. Spring Security's **CsrfFilter**, before credential
validation, rejects the request with 403. The original shared access-denied handler
made this look like an authorization or password problem.

A synthetic probe against EC2 confirmed the distinction: normal browser cookie
policy produced the reported 403; explicitly carrying the original cookie and
token reached credential validation and returned 401 for synthetic credentials.
No real account password was used in this HTTP probe.

The supplied Quick Tunnel hostname failed DNS resolution. The EC2 public IP had
no HTTPS listener on port 443. Consequently, this investigation does **not** prove
that the original HTTPS browser exchange had the same cookie failure, or that a
real deployed HTTPS login succeeds. That requires a running tunnel and browser
validation after deployment. Forwarded-header handling was absent in staging and
has been configured and regression tested.

## Session and CSRF contract

- `/api/auth/csrf` returns Spring's masked request token and `X-CSRF-TOKEN` header
  name. The raw token stays in the server-side session. No JavaScript-readable
  authentication cookie or token localStorage is introduced.
- All frontend API URLs remain relative `/api/...`; fetch uses same-origin cookies
  and no-store caching. There is no wildcard CORS or tunnel-hostname allowlist.
- Concurrent mutations share an in-flight CSRF fetch. Later mutations fetch again,
  so login/logout, password changes and other-tab session changes do not leave a
  long-lived stale token cache.
- `CSRF_INVALID` is emitted specifically for Spring CSRF exceptions. The client
  fetches a new token and retries once only for that filter rejection, which occurs
  before a domain mutation. Permission denials and network failures are not replayed.
- Invalid credentials, expired/revoked sessions, permission failures, token fetch
  failures and connection failures have distinct recovery messages. 401 clears
  the workspace; an existing session's expiry displays a sign-in notice.
- Spring retains session fixation protection and CSRF rotation at login/logout.
  A backend restart still ends in-memory sessions; ordinary recovery is sign-in.
- With Secure cookies configured, an insecure CSRF bootstrap returns
  `HTTPS_REQUIRED`, with instructions to use the HTTPS address. Disabling Secure
  cookies on a public HTTP deployment is not part of this fix.

## Proxy trust and deployment

The request path is:

```text
Browser HTTPS -> Cloudflare -> cloudflared on EC2
  -> http://127.0.0.1:8080 -> Nginx container :8080
  -> private backend :8081 -> Spring Security -> application
```

`compose.prod.yml` now maps host `127.0.0.1:8080` to container `8080`, preserving
the existing cloudflared origin URL. Public host port 80 still maps to container
80 for frontend access; it does not provide a secure login transport.

Nginx accepts the exact forwarded scheme `https` only on its tunnel listener
8080. On public listener 80 it derives the scheme from its own HTTP connection,
regardless of client-supplied forwarded headers. Both listeners preserve Host,
replace X-Forwarded-Host and X-Forwarded-For, and remove incoming Forwarded and
X-Forwarded-Port. Client-supplied forwarded IPs are not used for authentication
or rate-limit identity. Rate limiting currently groups tunnel traffic by its
origin socket peer; per-user/distributed limiting is separate work.

Staging uses Tomcat's native forwarded-header support for internal proxy peers.
The backend remains published only on host loopback and on the private Docker
network. This trust model assumes local host processes and private Compose
network peers are trusted; do not publicly expose the backend or container tunnel
listener. An integration test verifies untrusted socket peers cannot forge HTTPS.

No CI/CD OIDC, ECR, SSM, database migration, persistent volume, database grants or
health-check behavior changes are required. Deploy both frontend and backend
images with the updated Compose port mapping. No secret rotation is required.

Staging explicitly enables public signup over HTTPS. The previous local-only
signup option remains local-only; private invitation/recovery token delivery is
still gated separately. Registration creates an unprivileged USER with **no
organization membership**. Existing password policy, BCrypt, abuse limits,
tenant authorization, runtime database restrictions and forced RLS remain enforced.
Public registration does not imply email verification or organization access.

## Validation

Use a new disposable PostgreSQL 16 database for integration checks. The integration
suite intentionally resets its named test database; never point it at TRACE data.

```sh
TRACE_TEST_ADMIN_URL=jdbc:postgresql://127.0.0.1:55479/trace_tenancy_test \
TRACE_TEST_ALLOW_RESET=true mvn -B -f backend/pom.xml test
npm --prefix frontend ci
npm --prefix frontend run test
npm --prefix frontend run build
npm --prefix frontend run lint
processor/.venv/bin/python -m pytest -q processor/tests
python3 frontend/test/proxy_integration.py
```

Final local results: backend **138 passed, zero skipped** against the new disposable
PostgreSQL 16 container; frontend **79 Vitest + 4 Node tests passed**; production
build and lint passed; processor **140 passed** (one upstream deprecation warning);
Nginx **3 passed**, and `nginx -t` passed. These are local results, separate from
GitHub deployment and real HTTPS browser validation.

The standalone Nginx test uses an isolated official nginx:alpine container with a
synthetic upstream, verifies both ingress ports and forged-header stripping, and
stops its own container. It requires a local Docker daemon. Backend transport tests
run in normal CI without PostgreSQL; the existing full DB suite runs when the
explicit disposable database environment variables are supplied.

Before declaring the deployment verified, open a currently active HTTPS tunnel in
a browser, sign in, access an authorized organization, refresh, perform a permitted
mutation, sign out and sign in again. Check the session cookie remains Secure,
HttpOnly, SameSite=Lax, host-only and Path=/; check a mutation without CSRF is still
rejected. Plain HTTP should display the HTTPS instruction. Confirm the intended
user retains only their actual memberships and permissions. Neither a green build
nor a health check substitutes for this browser check.

Spring's [CSRF reference](https://docs.spring.io/spring-security/reference/7.0/servlet/exploits/csrf.html)
describes deferred session tokens, masked request tokens, and renewal after
session/authentication changes.
