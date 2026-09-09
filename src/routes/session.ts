import type { ResolvedConfig } from "./config.js";
import type { SessionPlaintext } from "../seal/index.js";
import { seal, unseal } from "../seal/index.js";
import { COOKIES, parseCookies } from "./cookies.js";
import { upstream } from "./upstream.js";
import { maskProfile } from "./profile.js";
import type { RefreshResult } from "./refresh.js";
import { json, jsonClearing, appendSetSession, shouldClearSession, unwrapEnvelope, NO_STORE_HEADERS } from "./http.js";

/**
 * GET /api/auth/session  — the only route that knows whether this browser is signed in.
 *
 *  - No cw_session cookie                -> 200 {signedIn:false}, private,no-store, no network.
 *  - Cookie present but does not unseal  -> 200 {signedIn:false}, and the junk cookie is cleared.
 *  - Access token within 60s of expiry   -> single-flight refresh first.
 *  - Backend answers 401                  -> clear cw_session + hints, {signedIn:false}.
 *  - Backend answers 5xx / connection err -> DO NOT touch a cookie; return known state
 *                                            from the seal (W-9: failure never signs out).
 *  - Backend answers 200                  -> {signedIn:true, initials, profile[, upcoming]}.
 */
export function makeSession(cfg: ResolvedConfig, refresh: (sid: string, rt: string) => Promise<RefreshResult>) {
  return async function session(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const includeUpcoming = url.searchParams.get("include") === "upcoming";
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

    if (includeUpcoming) {
      const appts = await upstream(cfg, "/client/booking/appointments?upcoming=1", "GET", at, null);
      body.upcoming = appts.status === 200 && Array.isArray(appts.body) ? appts.body : [];
    }

    const headers = new Headers(NO_STORE_HEADERS);
    if (reseal) {
      const sealed = seal({ ...sess, at, atExp, rt }, cfg.sessionSecret, cfg.rpId);
      appendSetSession(headers, cfg, sealed, sess.initials, Boolean(sess.keep));
    }
    return new Response(JSON.stringify(body), { status: 200, headers });
  };
}
