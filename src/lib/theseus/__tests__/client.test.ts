import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ENV = {
  THESEUS_API_URL: "http://api.test/",
  THESEUS_WEB_URL: "https://theseus.test",
  THESEUS_INTEGRATION_KEY: "key",
  THESEUS_PRODUCT_ID: "product-1",
  THESEUS_TENANT_ID: "vendor:v1",
  THESEUS_USER_ID: "identity:i1",
};

type Call = { url: string; init: RequestInit };

function json(status: number, body: unknown, headers: Record<string, string | string[]> = {}): Response {
  const h = new Headers({ "Content-Type": "application/json" });
  for (const [k, v] of Object.entries(headers)) for (const x of [v].flat()) h.append(k, x);
  return new Response(JSON.stringify(body), { status, headers: h });
}

// A stand-in Theseus: grants, sessions numbered from 1, and a feature list
// that accepts only the newest session.
function fakeTheseus() {
  const calls: Call[] = [];
  let sessions = 0;
  let valid = "";
  const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    if (url.endsWith("/integrations/launch-grants")) return json(200, { grant: "g" });
    if (url.endsWith("/auth/customer/session")) {
      sessions++;
      valid = `theseus_customer=s${sessions}`;
      // Exempt from CSRF: a session cookie, no CSRF cookie or token.
      return json(200, { ok: true }, { "Set-Cookie": `theseus_customer=s${sessions}; Path=/; HttpOnly`, "X-CSRF-Token": "" });
    }
    const cookie = new Headers(init.headers).get("Cookie") ?? "";
    if (url.endsWith("/me")) {
      const headers: Record<string, string> = { "X-CSRF-Token": `t${sessions}` };
      if (!cookie.includes("theseus_csrf=")) headers["Set-Cookie"] = `theseus_csrf=c${sessions}; Path=/`;
      return json(200, { kind: "customer" }, headers);
    }
    if (!cookie.includes(valid)) return json(401, { error: "unauthorized" });
    if (url.endsWith("/feature-requests") && init.method === "POST") return json(202, { featureId: "f-new" });
    if (url.endsWith("/feature-requests")) {
      return json(200, { featureRequests: [{ id: "f1", title: "", prompt: "Totals row", status: "PLANNING", awaiting: "answer", createdAt: "2026-10-17T10:00:00Z" }] });
    }
    return json(404, { error: "not found" });
  });
  return { calls, fetchMock, expire: () => (valid = "none") };
}

describe("theseus client", () => {
  let fake: ReturnType<typeof fakeTheseus>;

  beforeEach(() => {
    vi.resetModules();
    for (const [k, v] of Object.entries(ENV)) vi.stubEnv(k, v);
    fake = fakeTheseus();
    vi.stubGlobal("fetch", fake.fetchMock);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("is off until every setting is present", async () => {
    vi.stubEnv("THESEUS_USER_ID", "");
    const { theseusConfig } = await import("../client");
    expect(theseusConfig()).toBeNull();
  });

  it("opens one session and reuses it", async () => {
    const { theseusConfig, listFeatures } = await import("../client");
    const cfg = theseusConfig()!;
    const list = await listFeatures(cfg);
    await listFeatures(cfg);
    expect(list[0]).toMatchObject({ id: "f1", prompt: "Totals row", awaiting: "answer" });
    expect(fake.calls.filter((c) => c.url.endsWith("/auth/customer/session"))).toHaveLength(1);
    const grant = fake.calls[0];
    expect(grant.url).toBe("http://api.test/integrations/launch-grants");
    expect(new Headers(grant.init.headers).get("Authorization")).toBe("Bearer key");
    expect(JSON.parse(String(grant.init.body))).toEqual({ productId: "product-1", tenantId: "vendor:v1", userId: "identity:i1", entitlement: "customize" });
  });

  it("sends the cookie, CSRF token and trusted origin on a request", async () => {
    const { theseusConfig, createFeature } = await import("../client");
    const res = await createFeature(theseusConfig()!, "Add CSV export", "r1");
    expect(res.featureId).toBe("f-new");
    const post = fake.calls.at(-1)!;
    const h = new Headers(post.init.headers);
    expect(h.get("Cookie")).toBe("theseus_customer=s1; theseus_csrf=c1");
    expect(h.get("X-CSRF-Token")).toBe("t1");
    expect(h.get("Origin")).toBe("https://theseus.test");
  });

  it("opens a fresh session once when Theseus drops the old one", async () => {
    const { theseusConfig, listFeatures } = await import("../client");
    const cfg = theseusConfig()!;
    await listFeatures(cfg);
    fake.expire();
    await expect(listFeatures(cfg)).resolves.toHaveLength(1);
    expect(fake.calls.filter((c) => c.url.endsWith("/auth/customer/session"))).toHaveLength(2);
  });

  it("links to the feature, through the demo login when asked", async () => {
    const { theseusConfig, featureUrl } = await import("../client");
    expect(featureUrl(theseusConfig()!, "f1")).toBe("https://theseus.test/features/f1");
    vi.stubEnv("THESEUS_DEMO_LOGIN", "true");
    expect(featureUrl(theseusConfig()!, "f1")).toBe("https://theseus.test/api/auth/login?mode=demo&next=%2Ffeatures%2Ff1");
  });

  it("words stages the way the dashboard does", async () => {
    const { stageLabel, stageTone } = await import("../client");
    expect(stageLabel({ status: "PLANNING", awaiting: "answer" })).toBe("Waiting for your answer");
    expect(stageTone({ status: "PLANNING", awaiting: "answer" })).toBe("attention");
    expect(stageLabel({ status: "READY", awaiting: "" })).toBe("Preview ready");
    expect(stageTone({ status: "FAILED", awaiting: "" })).toBe("failed");
  });
});
