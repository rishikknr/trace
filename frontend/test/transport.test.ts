import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, clearOrganizationCache, request } from "../src/services/api";
afterEach(() => vi.unstubAllGlobals());
describe("session and tenant request boundary", () => {
  it("obtains CSRF before sending a mutation and uses same-origin cookies", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ headerName: "X-CSRF-TOKEN", token: "masked" }),
        ),
      )
      .mockResolvedValueOnce(new Response('{"saved":true}'));
    vi.stubGlobal("fetch", fetch);
    await request("/connections", { method: "POST", body: "{}" });
    expect(fetch.mock.calls[0][0]).toBe("/api/auth/csrf");
    expect(fetch.mock.calls[1][1].headers.get("X-CSRF-TOKEN")).toBe("masked");
    expect(fetch.mock.calls[1][1].credentials).toBe("same-origin");
  });
  it("a tenant switch invalidates an old read before it can populate the UI", async () => {
    let resolve!: (r: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>((r) => (resolve = r))),
    );
    const pending = request("/assets");
    clearOrganizationCache();
    resolve(new Response('[{"name":"Other tenant data"}]'));
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });
  it("a switch while CSRF loads prevents the old mutation from being sent", async () => {
    let resolve!: (r: Response) => void;
    const fetch = vi.fn(() => new Promise<Response>((r) => (resolve = r)));
    vi.stubGlobal("fetch", fetch);
    const pending = request("/assets", { method: "POST" });
    clearOrganizationCache();
    resolve(new Response('{"headerName":"X-CSRF-TOKEN","token":"old"}'));
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(fetch).toHaveBeenCalledOnce();
  });
  it("authentication expiry emits a global event and retains a safe error", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            '{"code":"AUTHENTICATION_REQUIRED","message":"Sign in again"}',
            { status: 401 },
          ),
        ),
    );
    const expired = vi.fn();
    window.addEventListener("trace:unauthenticated", expired, { once: true });
    await expect(request("/assets")).rejects.toMatchObject({ status: 401 });
    expect(expired).toHaveBeenCalledOnce();
  });
  it("revoked organization access clears the workspace through an event", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            '{"code":"ORGANIZATION_ACCESS_REVOKED","message":"Membership required"}',
            { status: 403 },
          ),
        ),
    );
    const invalid = vi.fn();
    window.addEventListener("trace:organization-invalid", invalid, {
      once: true,
    });
    await expect(request("/assets")).rejects.toBeInstanceOf(ApiError);
    expect(invalid).toHaveBeenCalledOnce();
  });
  it("unavailable transport has an actionable retry message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("fetch failed")),
    );
    await expect(request("/assets")).rejects.toMatchObject({
      code: "NETWORK_ERROR",
      message: expect.stringContaining("backend"),
    });
  });
  it("an HTML response cannot be treated as success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<html>Proxy error</html>")),
    );
    await expect(request("/assets")).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });
});
