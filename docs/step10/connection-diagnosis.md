# Connection diagnosis before Step 10 implementation

Observed November 10, 2026, before implementation:

- The authenticated browser at port 5173, organization NovaMart (OWNER), shows only the Connections heading. The source code renders its entire creation form only when a writable team exists, with no empty-state explanation or path to create one. An organization without a team therefore has no visible connection action. This is the reproduced initial failure.
- POST /api/connections requires ownerTeamId and checks an active same-organization team. This is correct and must remain enforced. The frontend does send that field when its hidden form becomes available.
- The existing connection repository hardcodes SNOWFLAKE/METADATA_IMPORT. There is no live connection test, configuration, credential handling, generic/manual connection, or connection edit operation. These are missing capabilities, not successful live integrations.
- The import selector lists every organization connection, even connections whose owning team the user cannot write. Backend authorization correctly rejects unauthorized imports.
- No process listens on processor port 8000. Preview requires the processor and cannot succeed while it is stopped. Existing backend (8081) and frontend (5173) listeners are present.
- Read-only PostgreSQL inspection confirms PostgreSQL 16.15 and successful V1–V5 only. V6 is not yet applied. No development database records or credentials were changed.

Repair: preserve required team ownership; expose loading/error/empty states and a Teams link; support explicit connection types and authorized lifecycle operations; make import selection permission-aware; retain server-side authorization and RLS. Verify the real parser and database pipeline on disposable port 55433. Development migration/restart remains an operator rollout, as requested.
