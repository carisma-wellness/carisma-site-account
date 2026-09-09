import type { ResolvedConfig } from "./config.js";

export interface UpstreamResult {
  /** Backend HTTP status, or 0 for a connection error / timeout (NOT a 401). */
  status: number;
  body: unknown;
  raw: string;
  contentType: string | null;
}

/**
 * Call the CarismaSoft API with a bearer token. A network failure is reported as
 * status 0, deliberately distinct from every real HTTP status — the whole point is
 * that a connection error is NOT a 401 and must never be treated as one (W-9).
 */
export async function upstream(
  cfg: ResolvedConfig,
  subPath: string,
  method: string,
  bearer: string | null,
  body?: string | null,
): Promise<UpstreamResult> {
  const headers: Record<string, string> = {};
  if (bearer) headers["authorization"] = `Bearer ${bearer}`;
  if (body != null) headers["content-type"] = "application/json";
  let res: Response;
  try {
    res = await cfg.fetchImpl(cfg.carismasoftApiUrl + subPath, {
      method,
      headers,
      body: body ?? undefined,
    });
  } catch {
    return { status: 0, body: null, raw: "", contentType: null };
  }
  const raw = await res.text();
  let parsed: unknown = null;
  const ct = res.headers.get("content-type");
  if (ct && ct.includes("application/json")) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  }
  return { status: res.status, body: parsed, raw, contentType: ct };
}
