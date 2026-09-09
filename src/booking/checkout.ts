/**
 * src/booking/checkout.ts — the pure half of "tap pay", for both doors.
 *
 * `buildCheckoutPayload` returns null without a submitted guest (W-10), exactly
 * as the kit's checkout-flow.ts:56@87e2670 does. The member path differs in two
 * measured ways (8.5): it NEVER carries a turnstileToken (the session is the
 * proof of a person), and its wire body drops the top-level `guest{}` block and
 * carries `countryCode` + `phone` split instead (W-18). `startClientCheckout`
 * POSTs to the site's OWN origin proxy — the bearer is attached server-side, so
 * no CarismaSoft token is ever in page JavaScript.
 */
import type {
  CheckoutEssentials,
  CheckoutResult,
  ClientCheckoutPayload,
  GuestCheckoutPayload,
  Step3State,
} from "./types.js";
import { splitE164 } from "./prefill.js";

export interface BuildPayloadInput {
  state: Pick<Step3State, "guest" | "secondGuest" | "notes" | "marketingConsent" | "session">;
  essentials: CheckoutEssentials;
  /** Host-supplied Turnstile token; ignored entirely on the member path (8.5). */
  turnstileToken?: string | null;
  origin?: string;
  attribution?: Record<string, string | undefined>;
  giftCardCode?: string | null;
  promoCode?: string | null;
}

/**
 * The shared payload. `state.guest` is required and this returns null rather
 * than inventing an empty guest if the caller forgets (W-10, the negative
 * control). On the MEMBER path a turnstileToken is never attached, even if one
 * is passed — the field cannot reach the wire from a signed-in checkout.
 */
export function buildCheckoutPayload(input: BuildPayloadInput): GuestCheckoutPayload | null {
  const { state, essentials } = input;
  if (!state.guest) return null;

  const payload: GuestCheckoutPayload = {
    serviceId: essentials.serviceId,
    optionId: essentials.optionId ?? null,
    locationId: essentials.locationId,
    date: essentials.date,
    time: essentials.time,
    timeZone: essentials.timeZone,
    durationMinutes: essentials.durationMinutes,
    staffIds: essentials.staffIds,
    participants: essentials.participants,
    guest: state.guest,
    secondGuest: state.secondGuest,
    notes: state.notes,
    marketingConsent: state.marketingConsent,
  };

  const isMember = state.session.signedIn;
  // Turnstile only exists on the guest door; a member checkout can never send it.
  if (!isMember && input.turnstileToken) payload.turnstileToken = input.turnstileToken;
  if (input.origin) payload.origin = input.origin;
  if (input.attribution && Object.keys(input.attribution).length > 0) {
    payload.attribution = input.attribution;
  }
  if (input.giftCardCode) payload.giftCardCode = input.giftCardCode;
  if (input.promoCode) payload.promoCode = input.promoCode;
  return payload;
}

/**
 * Transform the shared payload into the MEMBER wire body (8.5): drop the
 * top-level `guest{}` block (the session is the identity), split the phone into
 * `countryCode` + national `phone` (W-18), and carry `origin`. There is no
 * `turnstileToken` field on ClientCheckoutPayload, so it cannot ride along even
 * by accident. `marketingConsent` is dropped: a member has no tick to read.
 */
export function toClientCheckoutBody(
  payload: GuestCheckoutPayload,
  fallbackCountryCode = "",
): ClientCheckoutPayload {
  const { countryCode, phone } = splitE164(payload.guest.phone, fallbackCountryCode);
  const body: ClientCheckoutPayload = {
    serviceId: payload.serviceId,
    optionId: payload.optionId ?? null,
    locationId: payload.locationId,
    date: payload.date,
    time: payload.time,
    timeZone: payload.timeZone,
    durationMinutes: payload.durationMinutes,
    staffIds: payload.staffIds,
    participants: payload.participants,
    secondGuest: payload.secondGuest,
    notes: payload.notes,
  };
  if (countryCode) body.countryCode = countryCode;
  if (phone) body.phone = phone;
  if (payload.origin) body.origin = payload.origin;
  if (payload.giftCardCode) body.giftCardCode = payload.giftCardCode;
  if (payload.promoCode) body.promoCode = payload.promoCode;
  return body;
}

/* ── The member SDK method: sdk.startClientCheckout ─────────────────────── */

export interface ClientCheckoutDeps {
  /** The site's OWN origin, e.g. http://localhost:3100 — never the API host. */
  siteOrigin: string;
  /** Defaults to /api/auth/proxy (the BFF proxy mount, 7.1/7.3). */
  proxyBasePath?: string;
  fetchImpl?: typeof fetch;
}

/**
 * Build `sdk.startClientCheckout`. It POSTs the member wire body to the site's
 * own `/api/auth/proxy/client/booking/checkout` (an allowlisted path, 7.3); the
 * site's BFF attaches the bearer server-side. No Authorization header is set
 * here and no token is ever in the browser. The response is `{appointments,
 * checkoutUrl}` — no guest token (8.5).
 */
export function makeClientCheckout(
  deps: ClientCheckoutDeps,
): (payload: ClientCheckoutPayload) => Promise<CheckoutResult> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const base = deps.proxyBasePath ?? "/api/auth/proxy";
  const origin = deps.siteOrigin.replace(/\/+$/, "");
  const url = `${origin}${base}/client/booking/checkout`;

  return async function startClientCheckout(payload: ClientCheckoutPayload): Promise<CheckoutResult> {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`startClientCheckout: proxy answered ${res.status}`);
    }
    const data = (await res.json()) as {
      appointments?: CheckoutResult["appointments"];
      checkoutUrl?: string | null;
    };
    return {
      appointments: data.appointments ?? [],
      checkoutUrl: data.checkoutUrl ?? null,
    };
  };
}
