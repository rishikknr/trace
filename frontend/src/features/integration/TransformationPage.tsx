import "./lineage.css";
import { useEffect, useState } from "react";
import { request, mutate } from "../../services/api";
import { useAction, useWorkspace } from "./hooks";
import { AssetSelect } from "./shared";
import { PageHeader } from "../../components/Design";
import { Feedback, Loading, Success } from "../../components/Feedback";
import { allowed } from "../../app/permissions";
import type { Session } from "../../types/api";
type Analysis = {
  status: string;
  definition: string;
  definitionHash: string;
  dialect: string;
  sourceRef: string;
  references: {
    identifier: string;
    status: string;
    matches: { id: string; name: string }[];
  }[];
  columnMappings: {
    sourceAssetId: string;
    sourceColumn: string;
    targetColumn: string;
    expression: string;
  }[];
  rules: { kind: string; expression: string }[];
  warnings: string[];
};
export function TransformationPage({
  session,
  initialTarget,
}: {
  session: Session;
  initialTarget?: string;
}) {
  const a = useAction(),
    w = useWorkspace(a.revision, { assets: true });
  const [target, setTarget] = useState(initialTarget || "");
  const [definition, setDefinition] = useState("");
  const [sourceRef, setSourceRef] = useState("");
  const [loadError, setLoadError] = useState<unknown>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [columns, setColumns] = useState<number[]>([]);
  const [historyPage, setHistoryPage] = useState({
    total: 0,
    offset: 0,
    hasMore: false,
  });
  const [history, setHistory] = useState<
    {
      id: string;
      definition: string;
      definition_hash: string;
      source_ref: string;
      created_at: string;
    }[]
  >([]);
  useEffect(() => {
    if (!target) return;
    let active = true;
    Promise.all([
      request<{ metadata: string; last_import_id: string }>(
        `/assets/${target}/curation`,
      ),
      request<{
        items: typeof history;
        total: number;
        offset: number;
        hasMore: boolean;
      }>(`/transformations/${target}/history/page?limit=20&offset=0`),
    ])
      .then(([asset, h]) => {
        if (!active) return;
        const m = JSON.parse(asset.metadata || "{}");
        setDefinition(
          String(m.viewDefinition || m.sql || h.items[0]?.definition || ""),
        );
        setSourceRef(
          String(
            m.sourceRef ||
              h.items[0]?.source_ref ||
              `Registry asset ${target} · import ${asset.last_import_id || "manual"}`,
          ),
        );
        setHistory(h.items);
        setHistoryPage({
          total: h.total,
          offset: h.offset,
          hasMore: h.hasMore,
        });
        setAnalysis(null);
        setRefs({});
        setColumns([]);
      })
      .catch((e) => {
        if (active) setLoadError(e);
      });
    return () => {
      active = false;
    };
  }, [target]);
  async function loadHistory(offset: number) {
    const page = await request<{
      items: typeof history;
      total: number;
      offset: number;
      hasMore: boolean;
    }>(`/transformations/${target}/history/page?limit=20&offset=${offset}`);
    setHistory(page.items);
    setHistoryPage({
      total: page.total,
      offset: page.offset,
      hasMore: page.hasMore,
    });
  }
  const selected = w.assets.find((x) => x.id === target);
  const writable = selected && allowed(session, selected.owner_team_id);
  return (
    <>
      <PageHeader
        area="Definitions"
        title="Transformation intelligence"
        description="Turn actual SQL into inspectable, versioned dependency evidence."
        actions={
          <a className="button" href="#lineage">
            Open lineage workspace
          </a>
        }
      />
      <Feedback error={a.error || loadError || w.error} />
      {a.notice && <Success>{a.notice}</Success>}
      <div className="transformation-workspace">
        <aside className="panel">
          <p className="eyebrow">Definition source</p>
          <AssetSelect
            assets={w.assets.filter((x) =>
              ["DATASET", "VIEW", "TABLE"].includes(x.asset_type),
            )}
            name="target"
            label="Target dataset or view"
            value={target}
            onChange={setTarget}
          />
          <p className="hint">
            Choose the existing output identity. Supply the Snowflake definition
            or SQL from a versioned repository.
          </p>
          <h3>Evidence semantics</h3>
          <p>
            Parsing produces candidates. Confirm identities and column mappings
            before they contribute to the canonical graph.
          </p>
          <p className="hint">
            No SQL is executed. Confirmation does not deploy a view, grant
            approval or alter source data.
          </p>
          {target && <a href={`#asset/${target}`}>Open target in catalog →</a>}
        </aside>
        <section className="panel transformation-editor">
          {!target ? (
            <p>Select a target to inspect its transformation and history.</p>
          ) : (
            <>
              <div className="section-title">
                <h2>{selected?.name || "Selected target"}</h2>
                <span className="badge">SQL · Snowflake</span>
              </div>
              <label>
                Definition evidence / revision
                <input
                  value={sourceRef}
                  onChange={(e) => {
                    setSourceRef(e.target.value);
                    setAnalysis(null);
                  }}
                  placeholder="GitHub commit URL, view definition revision or source record"
                  maxLength={2000}
                />
              </label>
              <label>
                SQL definition
                <textarea
                  className="sql-input"
                  aria-label="SQL definition"
                  value={definition}
                  onChange={(e) => {
                    setDefinition(e.target.value);
                    setAnalysis(null);
                  }}
                  placeholder="Paste the actual SELECT or CREATE VIEW statement. No definition is guessed."
                  maxLength={100000}
                  spellCheck={false}
                />
              </label>
              <button
                className="primary"
                disabled={a.busy || !definition.trim()}
                onClick={() =>
                  void a.run(async () => {
                    const r = await mutate<Analysis>(
                      `/transformations/${target}/analyze`,
                      { definition, dialect: "snowflake", sourceRef },
                    );
                    setAnalysis(r);
                    setRefs(
                      Object.fromEntries(
                        r.references
                          .filter((x) => x.matches.length === 1)
                          .map((x) => [x.identifier, x.matches[0].id]),
                      ),
                    );
                    setColumns(r.columnMappings.map((_, i) => i));
                  })
                }
              >
                Analyze dependency candidates
              </button>
              {a.busy && (
                <Loading>Checking SQL and registry identities…</Loading>
              )}
              {analysis && (
                <section className="dependency-review">
                  <div className="section-title">
                    <h3>Dependency review</h3>
                    <span className="badge">
                      {analysis.status} · candidates
                    </span>
                  </div>
                  <code className="hash-label">
                    SHA-256 {analysis.definitionHash}
                  </code>
                  <div className="dependency-lanes">
                    <div>
                      <small>Reads from</small>
                      {analysis.references.map((ref) => (
                        <label key={ref.identifier}>
                          <strong>{ref.identifier}</strong>
                          <small>{ref.status}</small>
                          <select
                            aria-label={`Resolve ${ref.identifier}`}
                            value={refs[ref.identifier] || ""}
                            onChange={(e) =>
                              setRefs({
                                ...refs,
                                [ref.identifier]: e.target.value,
                              })
                            }
                          >
                            <option value="">Leave unresolved</option>
                            {(ref.matches.length
                              ? ref.matches
                              : w.assets.map((x) => ({
                                  id: x.id,
                                  name: x.external_key,
                                }))
                            ).map((x) => (
                              <option key={x.id} value={x.id}>
                                {x.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                    <span className="dependency-arrow">→</span>
                    <div>
                      <small>Produces</small>
                      <strong>{selected?.external_key}</strong>
                      <p>
                        {analysis.columnMappings.length} supported column
                        candidates
                      </p>
                    </div>
                  </div>
                  <h3>Input → output columns</h3>
                  {analysis.columnMappings.length ? (
                    <div className="mapping-review-list">
                      {analysis.columnMappings.map((m, i) => (
                        <label className="mapping-review" key={i}>
                          <input
                            type="checkbox"
                            checked={columns.includes(i)}
                            onChange={(e) =>
                              setColumns(
                                e.target.checked
                                  ? [...columns, i]
                                  : columns.filter((x) => x !== i),
                              )
                            }
                          />
                          <span>
                            <strong>
                              {m.sourceColumn} → {m.targetColumn}
                            </strong>
                            <code>{m.expression}</code>
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="hint">
                      No column mapping resolved uniquely. Dataset references
                      can be confirmed independently.
                    </p>
                  )}
                  <h3>SQL operations</h3>
                  {analysis.rules.map((r, i) => (
                    <details key={i}>
                      <summary>{r.kind}</summary>
                      <pre className="sql-viewer">{r.expression}</pre>
                    </details>
                  ))}
                  <details>
                    <summary>
                      Parser limitations and unresolved references
                    </summary>
                    <ul>
                      {analysis.warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </details>
                  <p className="notice">
                    Confirming stores the selected identities as SQL
                    dependencies with this exact immutable definition.
                    Unselected references remain unresolved in the evidence
                    snapshot.
                  </p>
                  <button
                    className="primary"
                    disabled={
                      !writable ||
                      a.busy ||
                      !Object.values(refs).some(Boolean) ||
                      analysis.status !== "PARSED"
                    }
                    onClick={() =>
                      void a.run(async () => {
                        await mutate(`/transformations/${target}/confirm`, {
                          definition: analysis.definition,
                          dialect: analysis.dialect,
                          sourceRef,
                          references: Object.fromEntries(
                            Object.entries(refs).filter(([, v]) => v),
                          ),
                          columnMappings: columns.filter((i) =>
                            Object.values(refs).includes(
                              analysis.columnMappings[i].sourceAssetId,
                            ),
                          ),
                        });
                        await loadHistory(0);
                        a.setNotice(
                          "Selected SQL dependencies confirmed. Prior evidence is preserved.",
                        );
                      })
                    }
                  >
                    Confirm selected dependencies
                  </button>
                  <a className="button" href={`#lineage/${target}`}>
                    Inspect resulting lineage
                  </a>
                </section>
              )}
              <details className="transformation-history">
                <summary>
                  Definition history · {historyPage.total} snapshots
                </summary>
                <div className="action-row">
                  <span className="hint">
                    Snapshots {history.length ? historyPage.offset + 1 : 0}–
                    {historyPage.offset + history.length} of {historyPage.total}
                  </span>
                  <button
                    disabled={!historyPage.offset || a.busy}
                    onClick={() =>
                      void a.run(() =>
                        loadHistory(Math.max(0, historyPage.offset - 20)),
                      )
                    }
                  >
                    Previous evidence
                  </button>
                  <button
                    disabled={!historyPage.hasMore || a.busy}
                    onClick={() =>
                      void a.run(() => loadHistory(historyPage.offset + 20))
                    }
                  >
                    Next evidence
                  </button>
                </div>
                {history.map((h) => (
                  <details key={h.id}>
                    <summary>
                      {new Date(h.created_at).toLocaleString()} ·{" "}
                      {h.definition_hash.slice(0, 12)}
                    </summary>
                    <p>{h.source_ref}</p>
                    <pre className="sql-viewer">{h.definition}</pre>
                  </details>
                ))}
              </details>
            </>
          )}
        </section>
      </div>
    </>
  );
}
