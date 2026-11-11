import { DefinitionDependencies } from "./DefinitionDependencies";
import { beforeLeave } from "../../app/navigationGuard";
import { lazy, Suspense } from "react";
const CodeEditor = lazy(() =>
  import("./CodeEditor").then((m) => ({ default: m.CodeEditor })),
);
import { VersionComparison } from "./VersionComparison";
import { usePage, loadOptions } from "./paging";
import { Pager } from "./pagination";
import { useEffect, useState } from "react";
import { mutate, request } from "../../services/api";
import type { AssetColumn, Session } from "../../types/api";
import {
  ConfirmDialog,
  EmptyState,
  Icon,
  PageHeader,
  Status,
} from "../../components/Design";
import { humanize } from "../../components/format";
import { Feedback, Loading, Success } from "../../components/Feedback";
import { AssetSelect, TeamSelect } from "./shared";
import { useAction, useWorkspace } from "./hooks";
import { allowed } from "../../app/permissions";
export type FormulaVersion = {
  id: string;
  revision: number;
  referenced_columns: string;
  version: number;
  expression: string;
  state: string;
  dialect: string;
  validation: unknown;
  created_at: string;
  created_by?: string;
  referenced_assets: string;
};
export type Formula = {
  id: string;
  name: string;
  description: string;
  category: string;
  language: string;
  owner_team_id: string;
  asset_id?: string;
  versions?: FormulaVersion[];
};
type Validation = {
  status: string;
  inputs?: string[];
  outputs?: string[];
  columns?: string[];
  warnings?: string[];
};

function ValidationResult({ result }: { result: Validation }) {
  return (
    <section className="validation-result" aria-live="polite">
      <div className="section-title">
        <h3>Validation result</h3>
        <Status value={result.status} />
      </div>
      {!!result.inputs?.length && (
        <p>
          <strong>Candidate inputs</strong> ·{" "}
          <code>{result.inputs.join(", ")}</code>
        </p>
      )}
      {!!result.outputs?.length && (
        <p>
          <strong>Candidate outputs</strong> ·{" "}
          <code>{result.outputs.join(", ")}</code>
        </p>
      )}
      {!!result.columns?.length && (
        <details>
          <summary>Candidate columns ({result.columns.length})</summary>
          <p>
            <code>{result.columns.join(", ")}</code>
          </p>
        </details>
      )}
      {!!result.warnings?.length && (
        <ul>
          {result.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function FormulaStudio({ session }: { session: Session }) {
  const a = useAction(),
    w = useWorkspace(a.revision, { teams: true, assets: true });
  const formulaPage = usePage<Formula>("formulas", a.revision);
  const [editing, setEditing] = useState<FormulaVersion | null>(null);
  const [assetRefs, setAssetRefs] = useState<string[]>([]),
    [columnRefs, setColumnRefs] = useState<string[]>([]);
  const [selected, setSelected] = useState<Formula | null>(null),
    [expression, setExpression] = useState(""),
    [dialect, setDialect] = useState("snowflake"),
    [language, setLanguage] = useState("SQL"),
    [validation, setValidation] = useState<Validation | null>(null),
    [dirty, setDirty] = useState(false);
  const [pane, setPane] = useState<"editor" | "versions">("editor");
  const [confirmDiscard, setConfirmDiscard] = useState<(() => void) | null>(
    null,
  );
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    const sessionLeave = (event: Event) => {
      const resume = (event as CustomEvent<() => void>).detail;
      if (typeof resume !== "function") return;
      event.preventDefault();
      setConfirmDiscard(() => resume);
    };
    window.addEventListener(beforeLeave, sessionLeave);
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
      window.removeEventListener(beforeLeave, sessionLeave);
    };
  }, [dirty]);
  function guard(run: () => void) {
    if (dirty) setConfirmDiscard(() => run);
    else run();
  }
  async function open(id: string) {
    await a.run(async () => {
      const f = await request<Formula>(`/formulas/${id}`);
      setSelected(f);
      setPane("editor");
      setEditing(null);
      setAssetRefs(JSON.parse(f.versions?.[0]?.referenced_assets ?? "[]"));
      setColumnRefs(JSON.parse(f.versions?.[0]?.referenced_columns ?? "[]"));
      setLanguage(f.language);
      setExpression(f.versions?.[0]?.expression ?? "");
      setDialect(f.versions?.[0]?.dialect ?? "snowflake");
      setDirty(false);
      setValidation(null);
    });
  }
  const canWrite = selected
    ? allowed(session, selected.owner_team_id)
    : w.teams.some((t) => allowed(session, t.id));
  return (
    <>
      <PageHeader
        area="Definitions"
        title="Formula Studio"
        description="Write, validate, and version SQL, DAX, and business rules."
        actions={
          <a className="button" href="#transformations">
            <Icon name="code" size={16} />
            Transformations
          </a>
        }
      />
      <Feedback error={a.error ?? w.error} />
      {a.notice && <Success>{a.notice}</Success>}
      {w.loading && (
        <Loading>Loading formula permissions and references…</Loading>
      )}
      <div className="integration-columns">
        <section className="panel">
          <h2>Formula registry</h2>
          <Pager page={formulaPage} label="formulas" />
          {!formulaPage.loading &&
            !formulaPage.error &&
            formulaPage.items.length === 0 && (
              <EmptyState
                icon="formula"
                title="No formulas found"
                description="Formulas record the expressions and dependencies behind transformations and metrics."
              />
            )}
          {formulaPage.items.map((f) => (
            <button
              className="list-row team-choice"
              key={f.id}
              aria-pressed={selected?.id === f.id}
              onClick={() => guard(() => void open(f.id))}
            >
              {f.name}
              <small>
                {humanize(f.category)} · {f.language}
              </small>
            </button>
          ))}
          {w.teams.some((team) => team.active && allowed(session, team.id)) && (
            <button
              onClick={() =>
                guard(() => {
                  setSelected(null);
                  setEditing(null);
                  setAssetRefs([]);
                  setColumnRefs([]);
                  setExpression("");
                  setDirty(false);
                })
              }
            >
              New formula
            </button>
          )}
        </section>
        <section className="panel">
          {!selected && !canWrite ? (
            <EmptyState
              icon="formula"
              title="Select a formula"
              description="Open a formula to view its expression, dependencies, and registered versions."
            />
          ) : !selected ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const d = new FormData(e.currentTarget);
                void a.run(async () => {
                  const r = await mutate<{ id: string }>("/formulas", {
                    name: d.get("name"),
                    description: d.get("description"),
                    category: d.get("category"),
                    language,
                    ownerTeamId: d.get("ownerTeamId"),
                    assetId: d.get("assetId") || null,
                  });
                  setSelected(await request<Formula>(`/formulas/${r.id}`));
                  setPane("editor");
                  a.setNotice("Formula created. Add an expression version.");
                });
              }}
            >
              <h2>Create formula</h2>
              <fieldset disabled={a.busy || !canWrite}>
                <label>
                  Formula name
                  <input name="name" required maxLength={255} />
                </label>
                <label>
                  Description
                  <textarea name="description" maxLength={4000} />
                </label>
                <label>
                  Category
                  <select name="category">
                    {[
                      "SQL_TRANSFORMATION",
                      "COLUMN_FORMULA",
                      "BUSINESS_METRIC",
                      "DAX_MEASURE",
                      "BUSINESS_RULE",
                    ].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Expression language
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    <option>SQL</option>
                    <option>DAX</option>
                    <option>BUSINESS_RULE</option>
                  </select>
                </label>
                <TeamSelect teams={w.teams} session={session} />
                <AssetSelect
                  assets={w.assets.filter((x) =>
                    allowed(session, x.owner_team_id),
                  )}
                  name="assetId"
                  label="Linked transformation or asset"
                  optional
                />
                <button className="primary">Create formula</button>
              </fieldset>
            </form>
          ) : (
            <>
              <div className="section-title">
                <h2>{selected.name}</h2>
                <span className="badge">{selected.language}</span>
              </div>
              <p className="muted">
                {selected.description || humanize(selected.category)}
              </p>
              <DefinitionDependencies
                key={selected.id}
                name={selected.name}
                assets={w.assets}
                refs={assetRefs}
                columnRefs={columnRefs}
                target={selected.asset_id}
                expression={expression}
                previous={selected.versions?.[0]?.expression ?? ""}
                previousRefs={JSON.parse(
                  selected.versions?.[0]?.referenced_assets ?? "[]",
                )}
                previousColumns={JSON.parse(
                  selected.versions?.[0]?.referenced_columns ?? "[]",
                )}
                registeredId={
                  selected.versions?.find((v) => v.state === "REGISTERED")?.id
                }
              />
              <nav
                className="workbench-tabs"
                aria-label="Formula workspace sections"
              >
                <button
                  type="button"
                  aria-pressed={pane === "editor"}
                  onClick={() => setPane("editor")}
                >
                  Editor
                </button>
                <button
                  type="button"
                  aria-pressed={pane === "versions"}
                  onClick={() => setPane("versions")}
                >
                  Version history and comparison
                </button>
                {dirty && (
                  <small role="status">Unsaved expression changes</small>
                )}
              </nav>
              <form
                hidden={pane !== "editor"}
                onSubmit={(e) => {
                  e.preventDefault();
                  const d = new FormData(e.currentTarget);
                  void a.run(async () => {
                    const definition = {
                      expression,
                      dialect,
                      state: d.get("state"),
                      referencedAssets: assetRefs,
                      referencedColumns: columnRefs,
                    };
                    if (editing) {
                      const saved = await mutate<FormulaVersion>(
                        `/formulas/${selected.id}/versions/${editing.id}`,
                        { definition, expectedRevision: editing.revision },
                        "PATCH",
                      );
                      setEditing(saved.state === "DRAFT" ? saved : null);
                      a.setNotice(
                        saved.state === "DRAFT"
                          ? "Draft changes saved."
                          : "Formula version registered.",
                      );
                    } else {
                      await mutate(
                        `/formulas/${selected.id}/versions`,
                        definition,
                      );
                      a.setNotice("New expression version saved.");
                    }
                    setSelected(
                      await request<Formula>(`/formulas/${selected.id}`),
                    );
                    setValidation(null);
                    setDirty(false);
                  });
                }}
              >
                <fieldset
                  className="formula-workbench"
                  disabled={a.busy || !canWrite}
                >
                  <div className="editor-layout">
                    <div className="editor-main">
                      {language === "SQL" && (
                        <label>
                          SQL dialect
                          <select
                            value={dialect}
                            onChange={(e) => {
                              setDialect(e.target.value);
                              setDirty(true);
                            }}
                          >
                            {[
                              "snowflake",
                              "postgres",
                              "tsql",
                              "bigquery",
                              "mysql",
                              "sqlite",
                              "spark",
                              "duckdb",
                            ].map((d) => (
                              <option key={d}>{d}</option>
                            ))}
                          </select>
                        </label>
                      )}
                      <Suspense fallback={<p>Loading formula editor…</p>}>
                        <CodeEditor
                          key={editing?.id ?? selected.id}
                          value={expression}
                          language={language}
                          readOnly={a.busy || !canWrite}
                          onChange={(value) => {
                            setExpression(value);
                            setDirty(true);
                            setValidation(null);
                          }}
                        />
                      </Suspense>
                      {validation && <ValidationResult result={validation} />}
                    </div>
                    <aside className="editor-context">
                      <h3>Formula context</h3>
                      <dl>
                        <div>
                          <dt>Owning team</dt>
                          <dd>
                            {w.teams.find(
                              (team) => team.id === selected.owner_team_id,
                            )?.name ?? "Unavailable"}
                          </dd>
                        </div>
                        {selected.asset_id && (
                          <div>
                            <dt>Linked asset</dt>
                            <dd>
                              <a href={`#asset/${selected.asset_id}`}>
                                {w.assets.find(
                                  (asset) => asset.id === selected.asset_id,
                                )?.name ?? "Open catalog asset"}
                              </a>
                            </dd>
                          </div>
                        )}
                      </dl>
                      <label>
                        Referenced assets (explicit declarations)
                        <select
                          name="referencedAssets"
                          multiple
                          size={5}
                          value={assetRefs}
                          onChange={(e) => {
                            setAssetRefs(
                              Array.from(
                                e.target.selectedOptions,
                                (v) => v.value,
                              ),
                            );
                            setDirty(true);
                          }}
                        >
                          {w.assets.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.external_key} · {x.connection_name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <ColumnReferences
                        assets={w.assets}
                        selected={columnRefs}
                        onChange={(ids) => {
                          setColumnRefs(ids);
                          setDirty(true);
                        }}
                      />
                    </aside>
                  </div>
                  {editing && (
                    <p role="status">
                      Editing draft version {editing.version} · revision{" "}
                      {editing.revision}
                    </p>
                  )}
                  <label>
                    Save state
                    <select
                      name="state"
                      key={editing?.id ?? "next"}
                      defaultValue="DRAFT"
                      onChange={() => setDirty(true)}
                    >
                      <option>DRAFT</option>
                      <option>REGISTERED</option>
                    </select>
                  </label>
                  <p className="hint">
                    Registered versions are immutable registry records, not
                    business approval or deployment. DAX expressions receive
                    text and size checks.
                  </p>
                  <div className="action-row">
                    <button
                      type="button"
                      disabled={!expression}
                      onClick={() =>
                        void a.run(async () =>
                          setValidation(
                            await mutate<Validation>("/formulas/validate", {
                              expression,
                              language,
                              dialect,
                            }),
                          ),
                        )
                      }
                    >
                      Validate expression
                    </button>
                    <button className="primary" disabled={!expression}>
                      {editing ? "Save draft changes" : "Save new version"}
                    </button>
                  </div>
                </fieldset>
              </form>
              <div hidden={pane !== "versions"}>
                <VersionComparison
                  key={selected.id}
                  formula={selected.id}
                  revision={a.revision}
                  writable={canWrite}
                  onEdit={(v) => {
                    if (!canWrite) return;
                    guard(() => {
                      setPane("editor");
                      setEditing(v);
                      setExpression(v.expression);
                      setDialect(v.dialect);
                      setAssetRefs(JSON.parse(v.referenced_assets ?? "[]"));
                      setColumnRefs(JSON.parse(v.referenced_columns ?? "[]"));
                      setDirty(false);
                    });
                  }}
                  onUse={(v) => {
                    if (!canWrite) return;
                    guard(() => {
                      setPane("editor");
                      setEditing(null);
                      setExpression(v.expression);
                      setDialect(v.dialect);
                      setAssetRefs(JSON.parse(v.referenced_assets ?? "[]"));
                      setColumnRefs(JSON.parse(v.referenced_columns ?? "[]"));
                      setDirty(true);
                    });
                  }}
                />
              </div>
            </>
          )}
        </section>
      </div>
      {confirmDiscard && (
        <ConfirmDialog
          title="Discard unsaved changes?"
          description="Your edits to this formula version will be lost."
          action="Discard changes"
          onClose={() => setConfirmDiscard(null)}
          onConfirm={confirmDiscard}
        />
      )}
    </>
  );
}

function ColumnReferences({
  assets,
  selected,
  onChange,
}: {
  assets: import("../../types/api").Asset[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [resource, setResource] = useState<{
      parent: string;
      columns: AssetColumn[];
      error: unknown;
    } | null>(null),
    [parent, setParent] = useState("");
  const current = resource?.parent === parent ? resource : null;
  const columns = current?.columns ?? [];
  const error = current?.error;
  useEffect(() => {
    if (!parent) return;
    let active = true;
    loadOptions<AssetColumn>("columns", { parent })
      .then((c) => {
        if (active) {
          setResource({ parent, columns: c, error: null });
        }
      })
      .catch((e) => {
        if (active) setResource({ parent, columns: [], error: e });
      });
    return () => {
      active = false;
    };
  }, [parent]);
  return (
    <>
      <AssetSelect
        assets={assets}
        name="columnParent"
        label="Column reference parent asset"
        optional
        value={parent}
        onChange={setParent}
      />
      <Feedback error={error} />
      <p>
        {selected.length} explicitly referenced columns retained across version
        editing.
      </p>
      <label>
        Referenced columns (explicit declarations)
        <select
          name="referencedColumns"
          disabled={!!parent && (!current || !!error)}
          multiple
          size={4}
          value={selected}
          onChange={(e) => {
            const other = selected.filter(
              (id) => !columns.some((c) => c.id === id),
            );
            onChange([
              ...other,
              ...Array.from(e.target.selectedOptions, (v) => v.value),
            ]);
          }}
        >
          {selected
            .filter((id) => !columns.some((c) => c.id === id))
            .map((id) => (
              <option key={id} value={id}>
                Stored column reference {id}
              </option>
            ))}
          {columns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.data_type}
            </option>
          ))}
        </select>
      </label>
      <button type="button" onClick={() => onChange([])}>
        Clear column references
      </button>
    </>
  );
}
