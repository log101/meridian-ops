// Server-side client for the Theseus workspace this app is connected to.
// Only server actions import this module: the integration key never reaches
// the browser.
//
// Theseus speaks to customers through a cookie session. The host backend (us)
// holds an integration key, asks for a short-lived launch grant for one
// customer scope, and exchanges it for that session. The session and its CSRF
// token are cached in this process and replaced when Theseus stops accepting
// them.

export type TheseusConfig = {
  apiUrl: string;
  webUrl: string;
  key: string;
  productId: string;
  tenantId: string;
  userId: string;
  entitlement: string;
  demoLogin: boolean;
};

export function theseusConfig(): TheseusConfig | null {
  const env = process.env;
  const cfg = {
    apiUrl: (env.THESEUS_API_URL ?? "").replace(/\/+$/, ""),
    webUrl: (env.THESEUS_WEB_URL ?? "").replace(/\/+$/, ""),
    key: env.THESEUS_INTEGRATION_KEY ?? "",
    productId: env.THESEUS_PRODUCT_ID ?? "",
    tenantId: env.THESEUS_TENANT_ID ?? "",
    userId: env.THESEUS_USER_ID ?? "",
    entitlement: env.THESEUS_ENTITLEMENT || "customize",
    demoLogin: env.THESEUS_DEMO_LOGIN === "true",
  };
  if (!cfg.apiUrl || !cfg.webUrl || !cfg.key || !cfg.productId || !cfg.tenantId || !cfg.userId) return null;
  return cfg;
}

export type TheseusFeature = {
  id: string;
  title: string;
  prompt: string;
  status: string;
  awaiting: "" | "answer" | "decision";
  createdAt: string;
};

export class TheseusError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "TheseusError";
    this.status = status;
  }
}

type Session = { jar: Map<string, string>; csrf: string };
let session: Session | null = null;
let opening: Promise<Session> | null = null;

/** Folds a response's Set-Cookie headers into the session's cookie jar. */
function keepCookies(res: Response, jar: Map<string, string>) {
  for (const line of res.headers.getSetCookie()) {
    const pair = line.split(";", 1)[0];
    const eq = pair.indexOf("=");
    if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}

function cookieHeader(jar: Map<string, string>): string {
  return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function errorOf(res: Response): Promise<TheseusError> {
  let message = `Theseus answered ${res.status}`;
  try {
    const body = (await res.json()) as { error?: string };
    if (body.error) message = body.error;
  } catch {
    // not JSON
  }
  return new TheseusError(res.status, message);
}

async function openSession(cfg: TheseusConfig): Promise<Session> {
  const grantRes = await fetch(`${cfg.apiUrl}/integrations/launch-grants`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ productId: cfg.productId, tenantId: cfg.tenantId, userId: cfg.userId, entitlement: cfg.entitlement }),
    cache: "no-store",
  });
  if (!grantRes.ok) throw await errorOf(grantRes);
  const { grant } = (await grantRes.json()) as { grant: string };

  const jar = new Map<string, string>();
  const sessRes = await fetch(`${cfg.apiUrl}/auth/customer/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grant }),
    cache: "no-store",
  });
  if (!sessRes.ok) throw await errorOf(sessRes);
  keepCookies(sessRes, jar);

  // The exchange is exempt from CSRF checks, so it issues no CSRF cookie. Any
  // ordinary request does: it sets the cookie and echoes the matching token.
  const primeRes = await fetch(`${cfg.apiUrl}/me`, {
    headers: { Accept: "application/json", Cookie: cookieHeader(jar) },
    cache: "no-store",
  });
  if (!primeRes.ok) throw await errorOf(primeRes);
  keepCookies(primeRes, jar);
  const csrf = primeRes.headers.get("X-CSRF-Token") ?? "";
  if (jar.size < 2 || !csrf) throw new TheseusError(502, "Theseus did not start a session");
  return { jar, csrf };
}

async function currentSession(cfg: TheseusConfig): Promise<Session> {
  if (session) return session;
  opening ??= openSession(cfg).finally(() => {
    opening = null;
  });
  session = await opening;
  return session;
}

async function call<T>(cfg: TheseusConfig, method: "GET" | "POST", path: string, body?: unknown, retried = false): Promise<T> {
  const s = await currentSession(cfg);
  const headers: Record<string, string> = { Accept: "application/json", Cookie: cookieHeader(s.jar) };
  if (method !== "GET") {
    // Theseus checks mutations the way it checks a browser: a CSRF token tied
    // to the cookie, and an Origin it trusts (its own dashboard's).
    headers["Content-Type"] = "application/json";
    headers["X-CSRF-Token"] = s.csrf;
    headers.Origin = cfg.webUrl;
    headers.Referer = `${cfg.webUrl}/`;
  }
  const res = await fetch(`${cfg.apiUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  keepCookies(res, s.jar);
  // The session lives in Theseus's memory: a restart or expiry drops it, and
  // a dropped session also invalidates the CSRF token. Open a fresh one once.
  if ((res.status === 401 || res.status === 403) && !retried) {
    if (session === s) session = null;
    return call(cfg, method, path, body, true);
  }
  if (!res.ok) throw await errorOf(res);
  return (await res.json()) as T;
}

export async function listFeatures(cfg: TheseusConfig): Promise<TheseusFeature[]> {
  const res = await call<{ featureRequests: TheseusFeature[] | null }>(cfg, "GET", "/feature-requests");
  return (res.featureRequests ?? []).map((f) => ({ ...f, title: f.title ?? "", prompt: f.prompt ?? "", awaiting: f.awaiting ?? "" }));
}

export async function createFeature(cfg: TheseusConfig, prompt: string, requestId: string): Promise<{ featureId: string }> {
  return call<{ featureId: string }>(cfg, "POST", "/feature-requests", { prompt, requestId });
}

/**
 * Where a request lives in the Theseus dashboard. A demo workspace links
 * through the shared demo login, so a visitor lands on the request in one
 * click whether or not they are signed in.
 */
export function featureUrl(cfg: TheseusConfig, id: string): string {
  const path = `/features/${encodeURIComponent(id)}`;
  if (cfg.demoLogin) return `${cfg.webUrl}/api/auth/login?mode=demo&next=${encodeURIComponent(path)}`;
  return `${cfg.webUrl}${path}`;
}

/** Plain-language stage of a request, as the Theseus dashboard words it. */
export function stageLabel(f: Pick<TheseusFeature, "status" | "awaiting">): string {
  switch (f.status) {
    case "PLANNING":
    case "REVISING":
      if (f.awaiting === "answer") return "Waiting for your answer";
      if (f.awaiting === "decision") return "Proposal ready";
      return f.status === "REVISING" ? "Revising" : "Planning";
    case "NEEDS_ENGINEERING":
      return "With engineering";
    case "QUEUED":
      return "Queued";
    case "PROVISIONING":
      return "Preparing";
    case "IMPLEMENTING":
      return "Building";
    case "PREVIEW_STARTING":
      return "Starting preview";
    case "READY":
      return "Preview ready";
    case "PREVIEW_FAILED":
      return "Preview failed";
    case "PUBLISHING":
      return "Accepted";
    case "SUBMITTED_FOR_REVIEW":
      return "In review";
    case "PUBLICATION_BLOCKED":
      return "Needs attention";
    case "FAILED":
      return "Failed";
    case "BLOCKED":
      return "Blocked";
    case "EXPIRED":
      return "Expired";
    case "DISCARDED":
      return "Discarded";
    default:
      return f.status;
  }
}

export type StageTone = "progress" | "attention" | "done" | "failed" | "muted";

export function stageTone(f: Pick<TheseusFeature, "status" | "awaiting">): StageTone {
  if (f.awaiting) return "attention";
  switch (f.status) {
    case "READY":
    case "PUBLISHING":
    case "SUBMITTED_FOR_REVIEW":
      return "done";
    case "NEEDS_ENGINEERING":
    case "PREVIEW_FAILED":
    case "PUBLICATION_BLOCKED":
      return "attention";
    case "FAILED":
    case "BLOCKED":
      return "failed";
    case "EXPIRED":
    case "DISCARDED":
      return "muted";
    default:
      return "progress";
  }
}
