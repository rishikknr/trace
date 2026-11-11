import { useEffect, useState } from "react";
import {
  EmptyState,
  Icon,
  PageHeader,
  Status,
  Timestamp,
  type IconName,
} from "../components/Design";
import { Feedback, Loading } from "../components/Feedback";
import { request } from "../services/api";
import { requireCurrentBackend } from "../services/compatibility";
import type { Asset, Connection, Session, Team } from "../types/api";
import type { Page } from "../features/integration/paging";
import { allowed } from "./permissions";

type Activity = {
  id: string;
  filename: string;
  status: string;
  created_at: string;
};
type Dashboard = {
  assets?: Page<Asset>;
  connections?: Page<Connection>;
  formulas?: Page<unknown>;
  metrics?: Page<unknown>;
  imports?: Page<Activity>;
  teams?: Page<Team>;
  errors: unknown[];
};
const summaries: {
  key: "assets" | "connections" | "formulas" | "metrics";
  label: string;
  route: string;
  icon: IconName;
}[] = [
  { key: "assets", label: "Catalog assets", route: "catalog", icon: "catalog" },
  {
    key: "connections",
    label: "Connections",
    route: "connections",
    icon: "connections",
  },
  { key: "formulas", label: "Formulas", route: "formulas", icon: "formula" },
  { key: "metrics", label: "Metrics", route: "metrics", icon: "metrics" },
];

export function OverviewPage({
  session,
  canImport,
}: {
  session: Session;
  canImport: boolean;
}) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [retry, setRetry] = useState(0);
  const org = session.organizations.find(
    (item) => item.id === session.selectedOrganization,
  );
  useEffect(() => {
    const controller = new AbortController();
    const ready = requireCurrentBackend(controller.signal);
    const read = async <T,>(kind: string, limit: number) => {
      await ready;
      return request<Page<T>>(`/browse/${kind}?limit=${limit}`, {
        signal: controller.signal,
      });
    };
    void Promise.allSettled([
      read<Asset>("assets", 5),
      read<Connection>("connections", 5),
      read("formulas", 1),
      read("metrics", 1),
      canImport ? read<Activity>("imports", 5) : Promise.resolve(undefined),
      read<Team>("teams", 25),
    ]).then(([assets, connections, formulas, metrics, imports, teams]) => {
      if (controller.signal.aborted) return;
      const value = <T,>(result: PromiseSettledResult<T>) =>
        result.status === "fulfilled" ? result.value : undefined;
      setData({
        assets: value(assets),
        connections: value(connections),
        formulas: value(formulas),
        metrics: value(metrics),
        imports: value(imports),
        teams: value(teams),
        errors: [
          assets,
          connections,
          formulas,
          metrics,
          imports,
          teams,
        ].flatMap((result) =>
          result.status === "rejected" ? [result.reason] : [],
        ),
      });
    });
    return () => controller.abort();
  }, [retry, canImport]);
  const canWrite = data?.teams?.items.some(
    (team) => team.active && allowed(session, team.id),
  );
  return (
    <>
      <PageHeader
        area="Workspace"
        title="Overview"
        description={`Explore the sources, definitions, and metadata registered in ${org?.name ?? "this organization"}.`}
        actions={
          <>
            {canImport && (
              <a className="button" href="#import">
                <Icon name="upload" size={16} />
                Import metadata
              </a>
            )}
            {canWrite && (
              <a className="button primary" href="#connections/new">
                <Icon name="plus" size={16} />
                Add connection
              </a>
            )}
          </>
        }
      />
      {!data ? (
        <Loading>Loading organization overview…</Loading>
      ) : (
        <>
          {data.errors.length > 0 && (
            <>
              <Feedback error={data.errors[0]} />
              <div className="action-row">
                <button
                  onClick={() => {
                    setData(null);
                    setRetry((value) => value + 1);
                  }}
                >
                  Retry overview
                </button>
              </div>
            </>
          )}
          <section
            className="panel overview-summary"
            aria-label="Registry totals"
          >
            {summaries.map(({ key, label, route, icon }) => (
              <a key={key} href={`#${route}`}>
                <span>
                  <Icon name={icon} size={16} />
                  {label}
                  <Icon name="arrow" size={13} />
                </span>
                <strong>{data[key]?.total.toLocaleString() ?? "—"}</strong>
              </a>
            ))}
          </section>
          <div className="overview-grid">
            <section className="panel">
              <div className="section-title">
                <h2>Source status</h2>
                <a href="#connections">
                  All connections <span aria-hidden="true">→</span>
                </a>
              </div>
              {data.connections ? (
                data.connections.items.length ? (
                  data.connections.items.map((item) => (
                    <div className="list-row" key={item.id}>
                      <div className="provider-line">
                        <span className="resource-icon">
                          <Icon name="connections" size={16} />
                        </span>
                        <div>
                          <a href={`#connections/${item.id}`}>{item.name}</a>
                          <small>
                            {item.platform === "AMAZON_S3"
                              ? "Amazon S3"
                              : item.platform === "GITHUB_SQL"
                                ? "GitHub SQL"
                                : item.platform === "POWER_BI"
                                  ? "Power BI"
                                  : item.platform === "FILE_IMPORT"
                                    ? "File import"
                                    : item.platform === "SNOWFLAKE"
                                      ? "Snowflake"
                                      : "Manual source"}
                          </small>
                        </div>
                      </div>
                      <Status value={item.status} />
                    </div>
                  ))
                ) : (
                  <EmptyState
                    icon="connections"
                    title="No connections yet"
                    description="Source connections identify where catalog metadata comes from."
                    actions={
                      canWrite ? (
                        <a href="#connections/new">Add a connection</a>
                      ) : data.teams &&
                        session.permissions.permissions.includes(
                          "team:create",
                        ) ? (
                        <a href="#teams">Set up an owning team</a>
                      ) : undefined
                    }
                  />
                )
              ) : (
                <p className="muted">Source status unavailable.</p>
              )}
            </section>
            <section className="panel">
              <div className="section-title">
                <h2>{canImport ? "Recent imports" : "Explore the registry"}</h2>
                {canImport && (
                  <a href="#import">
                    Import Center <span aria-hidden="true">→</span>
                  </a>
                )}
              </div>
              {canImport ? (
                data.imports ? (
                  data.imports.items.length ? (
                    data.imports.items.map((item) => (
                      <div className="list-row" key={item.id}>
                        <div>
                          <a href={`#import/${item.id}`}>{item.filename}</a>
                          <small>
                            <Timestamp value={item.created_at} />
                          </small>
                        </div>
                        <Status value={item.status} />
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      icon="upload"
                      title="No recent imports"
                      description="Your previews and committed imports will appear here."
                    />
                  )
                ) : (
                  <p className="muted">Import history unavailable.</p>
                )
              ) : (
                <div className="quick-links">
                  <a href="#catalog">
                    <Icon name="catalog" />
                    Browse catalog
                  </a>
                  <a href="#lineage">
                    <Icon name="lineage" />
                    Explore lineage
                  </a>
                  <a href="#metrics">
                    <Icon name="metrics" />
                    Browse metric definitions
                  </a>
                </div>
              )}
            </section>
            <section className="panel">
              <div className="section-title">
                <h2>Catalog snapshot</h2>
                <a href="#catalog">
                  Open catalog <span aria-hidden="true">→</span>
                </a>
              </div>
              {data.assets ? (
                data.assets.items.length ? (
                  data.assets.items.map((item) => (
                    <div className="list-row" key={item.id}>
                      <div>
                        <a href={`#asset/${item.id}`}>{item.name}</a>
                        <small className="qualified">{item.external_key}</small>
                      </div>
                      <span className="badge">{item.asset_type}</span>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="No assets yet"
                    description="Registered datasets, files, and reports are listed in the catalog."
                  />
                )
              ) : (
                <p className="muted">Catalog snapshot unavailable.</p>
              )}
            </section>
            <section className="panel">
              <h2>Quick links</h2>
              <div className="quick-links">
                <a href="#lineage">
                  <Icon name="lineage" />
                  Explore lineage
                </a>
                {canWrite && (
                  <>
                    <a href="#register">
                      <Icon name="catalog" />
                      Register an asset
                    </a>
                    <a href="#metrics">
                      <Icon name="metrics" />
                      Create a metric
                    </a>
                  </>
                )}
                <a href="#discovery">
                  <Icon name="history" />
                  Review discovery history
                </a>
              </div>
            </section>
          </div>
        </>
      )}
    </>
  );
}
