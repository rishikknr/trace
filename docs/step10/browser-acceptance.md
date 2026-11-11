# Step 10 V10 manual browser acceptance

Work settings currently disables local browser automation. This procedure is
for a human operator using the existing isolated app. Each expected result is
a criterion to record after observation. The earlier browser screenshots and
automated checks are in the [verification report](verification-report.md).

## Isolated setup

- Open [isolated TRACE](http://127.0.0.1:15173/). The expected path is Vite 15173
  to Spring 18081, FastAPI 18000, and PostgreSQL 55433. Confirm the
  backend command explicitly uses `jdbc:postgresql://localhost:55433/trace_tenancy_test`
  before restarting anything.
- Use the previously provisioned owner `step10-browser@example.test` and
  viewer `step10-viewer@example.test` with their private fixture credentials.
  The owner has access to **Completion Acceptance** and **Step 10 Browser Acceptance**.
  The viewer belongs to **Step 10 Browser Acceptance** and has VIEWER on
  **Metadata Engineering**. Obtain fixture credentials privately from the local
  test operator. Keep credentials and browser cookies out of evidence.
- Leave existing fixtures in place. Pick a unique suffix such as the current
  UTC date and time in digits for new smoke names. Use **Completion Acceptance**
  for new manual records and **Step 10 Browser Acceptance** for the existing
  discovery, pagination and viewer fixtures.
- Use the two demo files under
  [demo/metadata-imports/step10](../../demo/metadata-imports/step10).
  The controlled processor must be running `tests.acceptance_processor:app`
  for the fixture in step 13. The real operator processor uses `app:app`.
- Record timestamp, browser version, selected organization, actor role, and
  screenshot or record/run ID for each step. Record **Pass**, **Fail** or
  **Blocked**. Keep the browser Network panel available if a step fails, and
  record only the method, path and status.

Run these checks from a local terminal.

```zsh
lsof -nP -iTCP:15173 -iTCP:18081 -iTCP:18000 -iTCP:55433 -sTCP:LISTEN
curl -fsS http://127.0.0.1:15173/api/auth/registration
```

## Manual workflow

| Step | Browser action | Expected result and evidence |
| --- | --- | --- |
| 1. Sign in | Open the isolated URL in a fresh window, choose **Sign In**, and enter the owner credentials. | Sign-in succeeds and the header identifies the fixture owner. Record the resulting screen. |
| 2. Select organization | Choose **Completion Acceptance** in the organization selector. | The selector and page scope show Completion Acceptance. Data belonging to Step 10 Browser Acceptance is absent. |
| 3. Set up team | Open **Connections**. Follow the no-writable-team link to **Teams**. Create `Acceptance Engineering` with slug `acceptance-engineering`. If a previous run created it, reuse it and record that the no-team state could not be reproduced in this organization. | The saved team is listed, and its name appears as an owning-team option in Connections. |
| 4. Create and edit connection | Open **Connections**, choose **Manual source**, name it `Manual Acceptance <suffix>`, select the team and click **Save connection**. Select the saved row, edit the description, save, then refresh and reopen it. | The same source retains the new description and owning team. Save its displayed source ID if available and capture the edit screen. |
| 5. Upload CSV and JSON | In **Import**, select that source, choose `GENERIC_CSV`, and upload `generic.csv`. Map `db_name → database`, `sch_name → schema`, `object_name → table`, `field_name → column`, and `type → data_type`. Click **Validate and preview**. After step 6 for CSV, repeat with `METADATA_JSON` and `report.json`, which needs no header map. | CSV preview contains `NOVAMART.CURATED.FACT_ORDERS` with two columns. JSON preview contains Executive Sales Report, Net Revenue Measure and Net Revenue Card. Both show `PREVIEW_READY`. Save both batch IDs. |
| 6. Preview and commit | For each file, use a second tab in the same browser session to check Catalog before commit. In the original tab click **Commit metadata**, then open Catalog. | The new records for this source appear only after the commit. Status is `COMMITTED`. Record the before/after catalog views and commit result. |
| 7. Verify catalog persistence | Reload Catalog. Open the CSV dataset and the imported report, and save their `#asset/<UUID>` URLs. Reimport the same CSV using the same source and mapping. | The original records and column names still appear. Reimport reports no additions for the same source and preserves the dataset UUID. |
| 8. Map dataset and columns | Use **Register** to create `Acceptance Raw Orders <suffix>` as `DATASET` with key `BROWSER.RAW.ORDERS.<suffix>` and one `GROSS_AMOUNT` column of type `NUMBER`. Use the same source and team. In **Lineage → Declare a mapping**, select Raw Orders upstream and the imported FACT_ORDERS downstream, and save `DATA_FLOW`. Then save `COLUMN_DERIVATION` from `GROSS_AMOUNT` to `NET_AMOUNT`. Provide an evidence reference for each. | Both mappings save with manual provenance and correct direction. Record the raw asset URL and mapping evidence. |
| 9. Create SQL formula | In **Formulas**, create `Acceptance Revenue <suffix>` with category `SQL_TRANSFORMATION`, language SQL, the owning team and the linked FACT_ORDERS asset. Enter the first expression below. Select Raw Orders under **Referenced assets** and its `GROSS_AMOUNT` under **Column reference parent asset**. Click **Validate expression**, select **REGISTERED** and **Save new version**. | SQL keywords are highlighted. Validation is a parse result. History shows version 1 REGISTERED with the expression and declared dependencies. |
| 10. Edit draft and compare | Open version 1 and choose **Use as next version**. Select DRAFT and **Save new version**. Expand version 2, choose **Edit draft version 2**, enter the second expression below, and **Save draft changes**. Change the expression again temporarily and try clicking Catalog, then decline the discard prompt. Undo the temporary edit or reload the saved draft. Select version 1 as **Left version**, version 2 as **Right version**. In edit mode select REGISTERED and save version 2. | Version 2 stays the same version number while its revision advances. The discard prompt protects the edit. The comparison shows both expressions and added/removed lines. Registered versions stay visible and offer no draft-edit action. Save comparison evidence. |
| 11. Register metric and map report | In **Metrics**, create `Acceptance Net Revenue <suffix>`, key `ACCEPTANCE_REVENUE_<suffix>`, and the same owning team. Under **Register a metric version**, choose the formula and registered version 2. Under **Map a version to a report or measure**, choose metric version 1 and the imported Executive Sales Report. Enter an evidence reference and **Save report mapping**. | Metric version 1 points to the intended registered formula version. Recorded metric usage names the correct report. |
| 12. Inspect lineage | In **Lineage**, choose Raw Orders as **Explore asset**, direction both, depth 3 or higher. Open the relevant asset and column mapping history, and inspect the metric/report relationship. | The graph uses stored dataset and metric/report edges. Column lineage shows the declared source and target columns. Provenance and graph limits are shown. Record the graph and mapping history. |

Use Snowflake dialect with these multiline expressions. The explicit metadata
references above associate the saved formula with catalog records.

```sql
SELECT GROSS_AMOUNT AS NET_AMOUNT
FROM RAW.ORDERS;
```

```sql
SELECT GROSS_AMOUNT - 1 AS NET_AMOUNT
FROM RAW.ORDERS;
```

## Discovery, paging and authorization

13. **Sync progress, retry and cancellation.** Select **Step 10 Browser
    Acceptance**, filter Connections for `Controlled API acceptance discovery`,
    and open that existing GitHub SQL source. Keep its stored fixture
    credentials, owner `trace-fixture` and repository `controlled-metadata`.

    - Change revision to `stable`, save, and click **Discover metadata**. Record
      the queued run ID from the notice. **Discovery history** should show a
      real phase and finish `PARTIALLY_COMPLETED · PREVIEW_READY` with the
      controlled simulation warning. Open **Attempt history** and **Review
      preview**. The preview contains `fact_orders.sql`. Its canonical record
      changes only on an explicit commit.
    - Reset the fixture's transient counter by restarting only the isolated
      acceptance processor as described below. Change revision to
      `retry-first` and start discovery. Watch history immediately for
      `RETRY_WAIT`, `UNAVAILABLE`, and the next attempt time. Expect the same
      run ID to finish with attempt 2 of 3. The history must show the first
      failure and second result.
    - Save revision `slow-cancel`, start discovery and click **Cancel discovery**
      while status is RUNNING. Expect cancellation acknowledgement and then
      `CANCELLED`, with no preview link for that run. Click **Retry discovery**.
      Expect a new ID and eventual preview after the controlled delay.
    - Save run IDs, attempt statuses, timestamps, and one screenshot showing
      the simulation warning. This evidence is for the application queue.

14. **Pagination past 100.** In **Step 10 Browser Acceptance**, open Connections
    and enter `Pagination fixture` in **Filter connections**. Click **Search**.
    Record `1–25 of 125 connections` and page forward four times. The last page
    shows `101–125 of 125 connections` with rows `Pagination fixture 100`
    through `Pagination fixture 124`. **Next connections** is disabled. Open
    the final row and verify its saved detail. Capture the last page.

15. **Ownership and tags.** Switch to **Completion Acceptance**, open the raw
    asset, and choose **Edit metadata / add columns**. Set distinct technical and business
    owners and a description. Use **Create organization tag** to add
    `acceptance-<suffix>`, then select the tag and save. Reopen the asset and
    inspect **Curated ownership history**. Expect both owners, the owning team,
    description and tag to persist, with a field-change event and a tag event.
    Keep the source UUID and source metadata.

16. **Viewer denial.** Use a separate private browser window for the viewer.
    Select **Step 10 Browser Acceptance** and open the controlled connection.
    Expect read access with no usable save, credential, discover or cancel
    action. The manual asset registration form must offer no writable team.
    Capture the read-only view. To verify the server denial in the same
    browser session, open DevTools on the isolated app and run the guarded
    snippet below. Replace the UUID with the connection ID shown in the
    owner's `/api/browse/connections` response for that source. Expect HTTP 403.

    ```javascript
    {
      const id = "REPLACE_WITH_CONTROLLED_CONNECTION_UUID";
      if (location.origin !== "http://127.0.0.1:15173" ||
          !/^[a-f0-9-]{36}$/i.test(id)) throw new Error("Check isolated origin and UUID");
      const me = await (await fetch("/api/auth/me")).json();
      if (me.user?.email !== "step10-viewer@example.test" ||
          me.selectedOrganization !== "10000000-1111-4111-8111-000000000001")
        throw new Error("Select the isolated viewer organization");
      const csrf = await (await fetch("/api/auth/csrf")).json();
      const response = await fetch(`/api/connections/${id}/sync`, {
        method: "POST", headers: { [csrf.headerName]: csrf.token }
      });
      console.log("Viewer sync HTTP status", response.status);
    }
    ```

17. **Restart persistence.** As the owner in **Step 10 Browser Acceptance**,
    save revision `slow-restart`, start discovery and record its RUNNING ID.
    Stop and restart only the isolated backend using the commands below.
    Sign in again. Reopen discovery history and expect the same ID, an
    interrupted first attempt, and a later preview. Allow at least one lease
    interval plus the simulated provider delay. Then switch back to
    Completion Acceptance and reopen the saved asset URLs, formula version,
    metric mapping and ownership history. Expect the same IDs and data.

18. **Cross-organization isolation.** As the owner, capture the raw asset URL
    from **Completion Acceptance**, then switch to **Step 10 Browser
    Acceptance**. Search for the raw asset and paste its direct
    `#asset/<UUID>` URL while the other organization remains selected.
    Expect no search match and an unavailable/not-found detail, with no
    asset fields rendered. Check the lineage and formula selectors for the
    same absence. Switch back to Completion Acceptance and verify the URL
    loads again. As the viewer, verify Completion Acceptance is absent
    from the organization selector. Record both scope and denial evidence.

## Restart commands for the isolated stack

Use the existing terminal/supervisor where available. Confirm the exact PID and
command before stopping a service. If the isolated backend is detached, this
command sends TERM only to a single matching listener on 18081.

```zsh
(
  set -e
  trace_accept_pid=$(lsof -t -nP -iTCP:18081 -sTCP:LISTEN)
  [[ "$trace_accept_pid" == <-> ]]
  ps -p "$trace_accept_pid" -o command= | rg -q -- 'localhost:55433/trace_tenancy_test'
  kill -TERM "$trace_accept_pid"
)
```

Use the same procedure for a detached processor with port 18000 and a command
match of `tests.acceptance_processor:app`. Wait for the listener to stop before
starting its replacement. In the original stack the unchanged copied
JAR is `/tmp/trace-step10-completion.jar`. If it has gone away, stage a fresh
immutable copy of the final JAR. Use the existing isolated secret environment
from the acceptance setup, typically `/tmp/trace-step10-test.env`. It contains
test-only role passwords, the private processor token and encryption key. Keep
the key that was used to store the fixture credentials.

Processor restart for the one-time `retry-first` outcome, after the preceding
run is finished and the old isolated processor has stopped.

```zsh
source /tmp/trace-step10-test.env
(cd processor && exec .venv/bin/uvicorn tests.acceptance_processor:app --host 127.0.0.1 --port 18000)
```

Backend restart, after stopping the old process whose command points at
`55433/trace_tenancy_test`.

```zsh
source /tmp/trace-step10-test.env
java -jar /tmp/trace-step10-completion.jar \
  --spring.datasource.url=jdbc:postgresql://localhost:55433/trace_tenancy_test \
  --spring.flyway.enabled=false --spring.profiles.active=local-dev \
  --server.address=127.0.0.1 --server.port=18081 \
  --trace.processor.url=http://127.0.0.1:18000 --trace.discovery.lease-seconds=10
```

For step 17, have the restart command ready before queuing the 12-second
fixture. If it completes before you stop the process, repeat with another
`slow-` revision and record the new run ID. If Vite needs restarting, use
`TRACE_BACKEND_URL=http://127.0.0.1:18081 npm --prefix frontend run dev -- --port 15173`.
Keep the existing PostgreSQL container and fixtures.

## Record the result

Use one row per numbered step. Attach evidence with fixture IDs and observed
states. Redact cookies, credentials, request headers, and unrelated data.

| Step | Pass, Fail or Blocked | Observed result and evidence |
| --- | --- | --- |
| 1–18, one row per step | Pending operator run | Local browser automation disabled during the audit. |
