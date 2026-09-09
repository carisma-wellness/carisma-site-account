/**
 * src/booking/claim.ts — the in-overlay post-booking account claim (section 10).
 *
 * One rule: a booking is never the proof of a mailbox. Two paths reach the same
 * primitive:
 *   via "email"       -> the address is live in the kit (gift-covered / free, in
 *                        the overlay). start = POST /auth/code/start purpose
 *                        "claim"; finish = POST /auth/code/finish with the code
 *                        AND a chosen password, which returns the token pair.
 *   via "guest-token" -> Stripe-paid on /book/confirmed, same device; the guest
 *                        token is attached as the Bearer and the address is never
 *                        typed, so start answers {maskedEmail} (10, W-13).
 *
 * In the shipped site the browser calls the site's own /api/auth/claim/* BFF,
 * which forwards to these CarismaSoft endpoints server-side so no token pair
 * enters page JavaScript. This module IS that server-side call, so it is handed
 * the API base and a fetch and never names an identity host (urls.ts owns those).
 *
 * Live shapes verified against http://localhost:5001/api/v1 (2026-09-09):
 *   POST /auth/code/start  {email,purpose:"claim"}
 *     -> 200 {success:true,data:{message},message}
 *   POST /auth/code/finish {email,code,purpose:"claim",password}
 *     -> 200 {success:true,data:{user:{id,email,...},tokens:{accessToken,refreshToken}}}
 *     -> 400 {error,code:"CODE_INVALID"} on a wrong / expired code
 */
import type {
  ClaimFinishInput,
  ClaimFinishResult,
  ClaimStartInput,
  ClaimStartResult,
} from "./types.js";

export interface GuestClaimDeps {
  /** CarismaSoft API base, e.g. http://localhost:5001/api/v1. Never an identity host. */
  apiBaseUrl: string;
  fetchImpl?: typeof fetch;
}

export interface GuestClaim {
  start(input: ClaimStartInput): Promise<ClaimStartResult>;
  finish(input: ClaimFinishInput): Promise<ClaimFinishResult>;
}

interface CodeFinishBody {
  data?: {
    user?: { id?: string; email?: string };
    tokens?: { accessToken?: string; refreshToken?: string };
  };
  error?: string;
  code?: string;
}

export function makeGuestClaim(deps: GuestClaimDeps): GuestClaim {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const base = deps.apiBaseUrl.replace(/\/+$/, "");

  const postJson = (path: string, body: unknown, bearer?: string): Promise<Response> => {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (bearer) headers["authorization"] = `Bearer ${bearer}`;
    return fetchImpl(`${base}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  };

  return {
    async start(input: ClaimStartInput): Promise<ClaimStartResult> {
      if (input.via === "email") {
        // Enumeration-safe: the same 200 whether or not the address exists (W-13).
        const res = await postJson("/auth/code/start", { email: input.email, purpose: "claim" });
        return { ok: res.ok };
      }
      // guest-token path: the token is the Bearer, the address is never typed, so
      // the API answers which inbox to open without the device holder learning it.
      const res = await postJson("/client/booking/guest/claim/start", {}, input.guestToken);
      let maskedEmail: string | undefined;
      try {
        const body = (await res.json()) as { data?: { maskedEmail?: string }; maskedEmail?: string };
        maskedEmail = body?.data?.maskedEmail ?? body?.maskedEmail;
      } catch {
        maskedEmail = undefined;
      }
      return { ok: res.ok, maskedEmail };
    },

    async finish(input: ClaimFinishInput): Promise<ClaimFinishResult> {
      const res =
        input.via === "email"
          ? await postJson("/auth/code/finish", {
              email: input.email,
              code: input.code,
              purpose: "claim",
              password: input.password,
            })
          : await postJson(
              "/client/booking/guest/claim/finish",
              { code: input.code, password: input.password },
              input.guestToken,
            );

      let body: CodeFinishBody = {};
      try {
        body = (await res.json()) as CodeFinishBody;
      } catch {
        body = {};
      }

      const tokens = body.data?.tokens;
      if (res.ok && tokens?.accessToken && tokens?.refreshToken) {
        return {
          signedIn: true,
          tokens: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken },
          user: { id: body.data?.user?.id ?? "", email: body.data?.user?.email ?? "" },
        };
      }
      return { signedIn: false, error: body.error ?? body.code ?? `claim finish failed (${res.status})` };
    },
  };
}
