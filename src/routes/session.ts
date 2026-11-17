import type { ResolvedConfig } from "./config.js";
import type { SessionPlaintext } from "../seal/index.js";
import { seal, unseal } from "../seal/index.js";
import { COOKIES, parseCookies } from "./cookies.js";
import { upstream } from "./upstream.js";
import { maskProfile } from "./profile.js";
import type { RefreshResult } from "./refresh.js";
import { json, jsonClearing, appendSetSession, shouldClearSession, unwrapEnvelope, NO_STORE_HEADERS } from "./http.js";
import { extractAppointmentList } from "../ui/appointments.js";

/**
 * GET /api/auth/session  — the only route that knows whether this browser is signed in.
 *
 *  - No cw_session cookie                -> 200 {signedIn:false}, private,no-store, no network.
 *  - Cookie present but does not unseal  -> 200 {signedIn:false}, and the junk cookie is cleared.
 *  - Access token within 60s of expiry   -> single-flight refresh first.
 *  - Backend answers 401                  -> clear cw_session + hints, {signedIn:false}.
 *  - Backend answers 5xx / connection err -> DO NOT touch a cookie; return known state
 *                                            from the seal (W-9: failure never signs out).
 *  - Backend answers 200                  -> {signedIn:true, initials, profile[, upcoming][, loyalty]}.
 *
 * `include` is a comma list: `upcoming` (the panel's visits) and `loyalty`
 * (Carisma Circle: the summary read). `loyalty` is folded in ONLY when that read answers
 * 200 with `enabled: true`; off, 404, 5xx or a timeout leave the field out and
 * never touch the rest of the answer (the panel then draws what it always did).
 */
/** The most the panel waits for Carisma Circle before opening without it. */
export const LOYALTY_READ_BUDGET_MS = 2500;
/**
 * Circle v2 (carisma-circle-v2-20261117): the panel folds the member's nav
 * SUMMARY (BE-1 §9.2: the read-model row, no ledger replay), never the full
 * `/client/loyalty/me` (the account pages read that themselves).
 */
export const LOYALTY_SUMMARY_PATH = "/client/loyalty/summary";

function withinMs<T>(p: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    p.catch(() => null),
    new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), ms);
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export function makeSession(cfg: ResolvedConfig, refresh: (sid: string, rt: string) => Promise<RefreshResult>) {
  return async function session(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const include = new Set(
      (url.searchParams.get("include") || "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    );
    const includeUpcoming = include.has("upcoming");
    const includeLoyalty = include.has("loyalty");
    const cookies = parseCookies(req);
    const raw = cookies[COOKIES.session];

    if (!raw) {
      return json({ signedIn: false }, 200);
    }

    const sess = unseal<SessionPlaintext>(raw, cfg.unsealKeys, cfg.rpId);
    if (!sess) {
      // An unsealable cookie is rejected: signed out, and the junk is cleared.
      return jsonClearing({ signedIn: false }, cfg, 200);
    }

    let at = sess.at;
    let atExp = sess.atExp;
    let rt = sess.rt;
    let reseal = false;

    const nowSec = cfg.now() / 1000;
    if (typeof atExp === "number" && atExp - nowSec < 60) {
      const r = await refresh(sess.sid, rt);
      if (shouldClearSession(r.status)) {
        return jsonClearing({ signedIn: false }, cfg, 200);
      }
      if (r.status === 200 && r.tokens) {
        at = r.tokens.accessToken;
        atExp = r.tokens.atExp;
        if (r.tokens.refreshToken) rt = r.tokens.refreshToken;
        reseal = true;
      }
      // transient (0/5xx): fall through with the stale access token, clear nothing.
    }

    const prof = await upstream(cfg, "/profile", "GET", at, null);
    if (shouldClearSession(prof.status)) {
      return jsonClearing({ signedIn: false }, cfg, 200);
    }
    if (prof.status !== 200) {
      // 5xx or connection error: never sign out; render known state from the seal.
      return json({ signedIn: true, initials: sess.initials ?? null, stale: true }, 200);
    }

    // The backend answers /profile as {success,data:{firstName,...}}; maskProfile reads
    // the fields flat, so unwrap the house envelope first or the card shows empty initials.
    const profile = maskProfile(unwrapEnvelope(prof.body));
    const body: Record<string, unknown> = {
      signedIn: true,
      initials: sess.initials ?? profile.initials ?? null,
      profile,
    };

    // The two optional reads run side by side, so Circle never adds a round trip.
    const [appts, loyalty] = await Promise.all([
      // The live list door is filter=upcoming (Joi). The house envelope is
      // {success,data:{data: AppointmentCard[]}} — an array check on the raw
      // body was always [] and the panel rendered "no upcoming visits" for
      // people with a diary.
      includeUpcoming
        ? upstream(cfg, "/client/booking/appointments?filter=upcoming&limit=20", "GET", at, null)
        : Promise.resolve(null),
      // Bounded: a slow loyalty read must never hold the panel up.
      includeLoyalty ? withinMs(upstream(cfg, LOYALTY_SUMMARY_PATH, "GET", at, null), LOYALTY_READ_BUDGET_MS) : Promise.resolve(null),
    ]);
    if (includeUpcoming) {
      body.upcoming = appts && appts.status === 200 ? extractAppointmentList(appts.body) : [];
    }
    if (loyalty && loyalty.status === 200) {
      const inner = unwrapEnvelope(loyalty.body);
      if (inner && typeof inner === "object" && (inner as Record<string, unknown>).enabled === true) {
        body.loyalty = inner;
      }
    }

    const headers = new Headers(NO_STORE_HEADERS);
    if (reseal) {
      const sealed = seal({ ...sess, at, atExp, rt }, cfg.sessionSecret, cfg.rpId);
      appendSetSession(headers, cfg, sealed, sess.initials, Boolean(sess.keep));
    }
    return new Response(JSON.stringify(body), { status: 200, headers });
  };
}
