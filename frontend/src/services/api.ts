import type {
  Asset,
  AssetColumn,
  Connection,
  ImportBatch,
  RegistryStatus,
  ErrorDetail,
  RegistrationOptions,
  RegistrationRequest,
  RegistrationResponse,
} from "../types/api";

let organizationEpoch = 0;
export function clearOrganizationCache() {
  organizationEpoch++;
}
export class ApiError extends Error {
  status = 0;
  diagnosticId: string | null = null;
  code: string;
  details: ErrorDetail[];
  constructor(
    message: string,
    code = "NETWORK_ERROR",
    details: ErrorDetail[] = [],
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
  }
}
export async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  let response: Response;
  const epoch = organizationEpoch;
  const headers = new Headers(options?.headers);
  if (
    options?.method &&
    !["GET", "HEAD", "OPTIONS"].includes(options.method.toUpperCase())
  ) {
    const csrf = await fetch("/api/auth/csrf", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!csrf.ok)
      throw new ApiError(
        "Unable to obtain a security token. Reload and try again.",
      );
    const token = (await csrf.json()) as { token: string; headerName: string };
    headers.set(token.headerName, token.token);
    if (epoch !== organizationEpoch)
      throw new DOMException("Organization changed", "AbortError");
  }
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
    throw new ApiError(
      "Unable to reach Trace. Check that the backend is running, then try again.",
    );
  }
  const body = await response.json().catch(() => null);
  if (epoch !== organizationEpoch && path !== "/auth/registration")
    throw new DOMException("Organization changed", "AbortError");
  if (!response.ok) {
    if (response.status === 401 && path !== "/auth/login")
      window.dispatchEvent(new Event("trace:unauthenticated"));
    if (
      response.status === 403 &&
      ["ORGANIZATION_ACCESS_REVOKED", "ORGANIZATION_REQUIRED"].includes(
        body?.code,
      )
    )
      window.dispatchEvent(new Event("trace:organization-invalid"));
    const error = new ApiError(
      body?.message ??
        (response.status >= 500
          ? "Trace is unavailable. Check that the backend is running, then try again."
          : `Trace returned HTTP ${response.status}. Try again.`),
      body?.code ?? "HTTP_ERROR",
      body?.errors ?? [],
    );
    error.status = response.status;
    error.diagnosticId = response.headers.get("X-Request-ID");
    throw error;
  }
  if (body === null)
    throw new ApiError(
      "Trace returned an invalid response.",
      "INVALID_RESPONSE",
    );
  return body as T;
}
export const api = {
  status: () => request<RegistryStatus>("/registry/status"),
  connections: () => request<Connection[]>("/connections"),
  assets: (q: string, offset: number, signal?: AbortSignal) =>
    request<Asset[]>(
      `/assets?q=${encodeURIComponent(q)}&limit=50&offset=${offset}`,
      { signal },
    ),
  asset: (id: string, signal?: AbortSignal) =>
    request<Asset>(`/assets/${id}`, { signal }),
  columns: (id: string, signal?: AbortSignal) =>
    request<AssetColumn[]>(`/assets/${id}/columns`, { signal }),
  preview: (connection: string, file: File) => {
    const body = new FormData();
    body.append("connectionId", connection);
    body.append("file", file);
    return request<ImportBatch>("/imports/preview", { method: "POST", body });
  },
  commit: (id: string) =>
    request<ImportBatch>(`/imports/${id}/commit`, { method: "POST" }),
  batch: (id: string) => request<ImportBatch>(`/imports/${id}`),
};

export function mutate<T = { ok: boolean }>(
  path: string,
  body?: unknown,
  method = "POST",
): Promise<T> {
  return request<T>(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export const authApi = {
  registrationOptions: () => request<RegistrationOptions>("/auth/registration"),
  register: (body: RegistrationRequest) =>
    mutate<RegistrationResponse>("/auth/register", body),
};
