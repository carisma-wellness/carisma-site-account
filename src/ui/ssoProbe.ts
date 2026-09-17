/**
 * The browser half of cross-brand single sign-on: decide whether THIS page view should
 * ask the identity origin who the visitor is, and if so, go.
 *
 * The rules are the CEO's (2026-09-17, "if I log in on any site, every other site connects
 * automatically" — it replaces 2026-09-16's "lazily, plus remember returners"):
 *   · everyone who is not signed in HERE is checked once, on page load — a visitor who
 *     signed in on any other brand arrives recognised, without a click;
 *   · EXCEPT on a paid landing (an `/lp/…` path, or a URL carrying an ad click id /
 *     `utm_*`): ad traffic is never redirected, so paid conversion and attribution are
 *     untouched. There the check waits for the interaction trigger (opening booking);
 *   · the check repeats at most once per SSO_PROBE_TTL_SECONDS per brand (cw-sso-probed),
 *     so a sign-in made on another brand mid-session is still picked up within that window;
 *   · anyone who opens booking (trigger "interaction") is checked, before they type;
 *   · a person signed in HERE by the booking pop-up is carried to the identity origin once
 *     (cw-sso-seed), so the other brands can find them;
 *   · a person who signed out on this brand (cw-sso-off) is never silently signed back in,
 *     and the identity origin's session is ended once on the next page (cw-sso-signout).
 *
 * Every check is a top-level navigation. The identity origin is a different registrable
 * domain from every brand, and a hidden iframe or a credentialed fetch would depend on
 * third-party cookies — blocked in Safari and Firefox — so it would work for some people
 * and not others. A redirect works for everyone.
 *
 * Two copies of the load rule ship on purpose: `runSsoProbe` (this module, used by the
 * site's React probe on every route change) and `earlySsoProbeScript` (an inline <head>
 * script for HARD loads, so the redirect happens before first paint instead of after —
 * no flash of the page). test/sso.test.mjs drives both through the same case table.
 *
 * Loop safety lives HERE, before the navigation, not only on the server: cw-sso-probed is
 * written first and cw-sso-seed is deleted first (one seed attempt), so a server that
 * answers badly still cannot bounce anyone twice. Cookies blocked ⇒ never navigate.
 */
import { seedDoorUrl, signoutHopDoorUrl, silentStartUrl } from "../urls.js";

export type SsoProbeTrigger = "load" | "interaction";
export type SsoProbeAction = "probe" | "seed" | "signout" | null;

const has = (cookie: string, name: string, value = "1") =>
  new RegExp(`(?:^|;\\s*)${name}=${value}(?:;|$)`).test(cookie);

/** Paths where a page-load redirect would disturb a payment in progress. */
export const SSO_PROBE_SKIP_PREFIXES: readonly string[] = ["/api/", "/book/checkout", "/book/confirmed"];

/**
 * Paid landing paths: never checked on page load (interaction still checks). Every brand
 * site keeps its campaign twins under /lp/; a site with more passes them in `paidPrefixes`.
 */
export const SSO_PAID_LANDING_PREFIXES: readonly string[] = ["/lp/"];

/**
 * How long one silent "nobody" answer is trusted on this brand. Short enough that a sign-in
 * made on another brand mid-session is picked up on the next hard load after it; long
 * enough that a cold visitor pays the hop once, not on every page.
 */
export const SSO_PROBE_TTL_SECONDS = 15 * 60;

/** An ad click id or a `utm_*` in the query marks paid traffic, whatever the path. */
export const PAID_CLICK_PARAM = /(?:^\?|[?&])(?:fbclid|gclid|gbraid|wbraid|dclid|msclkid|ttclid|twclid|utm_[a-z]+)=/i;

const BOT_UA = /bot|crawl|spider|slurp|preview|lighthouse|headless(?!chrome)/i;

export function isPaidLanding(path: string, search: string, paidPrefixes: readonly string[] = SSO_PAID_LANDING_PREFIXES): boolean {
  if (paidPrefixes.some((p) => path.startsWith(p))) return true;
  return PAID_CLICK_PARAM.test(search || "");
}

/** Pure decision, unit-tested. No DOM. */
export function ssoProbeDecision(input: {
  cookie: string;
  trigger: SsoProbeTrigger;
  path: string;
  search?: string;
  userAgent?: string;
  paidPrefixes?: readonly string[];
}): SsoProbeAction {
  const { cookie, trigger, path } = input;
  if (input.userAgent && BOT_UA.test(input.userAgent)) return null;
  if (SSO_PROBE_SKIP_PREFIXES.some((p) => path.startsWith(p))) return null;
  // Finishing a sign-out outranks everything: the next person on this browser must
  // not inherit the session the identity origin still holds.
  if (has(cookie, "cw-sso-signout")) return trigger === "load" ? "signout" : null;
  if (has(cookie, "cw-sso-off")) return null;

  if (has(cookie, "cw-signed-in")) {
    return has(cookie, "cw-sso-seed") ? "seed" : null;
  }
  if (has(cookie, "cw-sso-probed")) return null;
  if (trigger === "load" && isPaidLanding(path, input.search ?? "", input.paidPrefixes)) return null;
  return "probe";
}

/** The structural slice of `window` the probe needs (the package has no DOM lib). */
export interface SsoProbeEnv {
  document: { cookie: string };
  location: { pathname: string; search: string; protocol: string; assign(url: string): void };
  navigator?: { userAgent?: string };
}

/**
 * Run the check. Pass `window` (it satisfies SsoProbeEnv). Returns true when the page is
 * navigating away — the caller should stop what it was about to do (for booking,
 * snapshot first so the pop-up can resume on return).
 */
export function runSsoProbe(
  env: SsoProbeEnv | undefined,
  trigger: SsoProbeTrigger,
  opts: { next?: string; paidPrefixes?: readonly string[] } = {},
): boolean {
  if (!env || !env.document || !env.location) return false;
  const doc = env.document;
  const loc = env.location;
  const action = ssoProbeDecision({
    cookie: doc.cookie || "",
    trigger,
    path: loc.pathname,
    search: loc.search,
    userAgent: env.navigator?.userAgent ?? "",
    paidPrefixes: opts.paidPrefixes,
  });
  if (!action) return false;

  const next = opts.next ?? `${loc.pathname}${loc.search}`;
  const secure = loc.protocol === "https:" ? "; Secure" : "";
  try {
    if (action === "probe") {
      doc.cookie = `cw-sso-probed=1; Path=/; Max-Age=${SSO_PROBE_TTL_SECONDS}; SameSite=Lax${secure}`;
      if (!has(doc.cookie, "cw-sso-probed")) return false; // cookies blocked: never loop
      loc.assign(silentStartUrl(next));
    } else if (action === "seed") {
      doc.cookie = `cw-sso-seed=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
      if (has(doc.cookie, "cw-sso-seed")) return false;
      loc.assign(seedDoorUrl(next));
    } else {
      doc.cookie = `cw-sso-signout=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
      if (has(doc.cookie, "cw-sso-signout")) return false;
      loc.assign(signoutHopDoorUrl(next));
    }
  } catch {
    return false;
  }
  return true;
}

/* ── the pre-paint copy ─────────────────────────────────────────────────── */

/** `<` never reaches the HTML parser inside an inline script. */
const jsonForInlineScript = (v: unknown): string => JSON.stringify(v).replace(/</g, "\\u003c");

/**
 * The same load rule as `runSsoProbe(window, "load")`, as a self-contained inline script
 * for the document <head>. It runs before anything is painted, so a visitor who needs
 * the round-trip never sees the page flash away and back; and it runs only on the hosts
 * the identity origin is known to accept this site from (`hosts`), because a silent
 * check on an unregistered host strands the visitor on the identity origin's 400.
 *
 * `location.replace`, not `assign`: the hop must not leave a duplicate history entry,
 * or Back would return to this same page instead of where the visitor came from.
 *
 * Inject with `<script dangerouslySetInnerHTML={{ __html: earlySsoProbeScript(...) }} />`
 * (before the app's own scripts), only when member login is on. No dependencies, ES5.
 */
export function earlySsoProbeScript(opts: {
  hosts: readonly string[];
  paidPrefixes?: readonly string[];
}): string {
  const hosts = opts.hosts.map((h) => h.toLowerCase());
  const paid = opts.paidPrefixes ?? SSO_PAID_LANDING_PREFIXES;
  return (
    "(function(){try{" +
    "var d=document,l=location,n=navigator,H=" + jsonForInlineScript(hosts) +
    ",S=" + jsonForInlineScript(SSO_PROBE_SKIP_PREFIXES) +
    ",P=" + jsonForInlineScript(paid) +
    ",T=" + String(SSO_PROBE_TTL_SECONDS) + ";" +
    "if(H.indexOf(String(l.hostname).toLowerCase())<0)return;" +
    "if(" + BOT_UA.toString() + ".test(String(n&&n.userAgent||'')))return;" +
    "var p=l.pathname,q=l.search||'',i;" +
    "for(i=0;i<S.length;i++)if(p.indexOf(S[i])===0)return;" +
    "function has(k){return new RegExp('(?:^|;\\\\s*)'+k+'=1(?:;|$)').test(d.cookie||'')}" +
    "var sec=l.protocol==='https:'?'; Secure':'';" +
    "function door(path){var u=new URLSearchParams();u.set('next',p+q);return path+'?'+u.toString()}" +
    "function drop(k){d.cookie=k+'=; Path=/; Max-Age=0; SameSite=Lax'+sec;return !has(k)}" +
    "if(has('cw-sso-signout')){if(drop('cw-sso-signout'))l.replace(door('/api/auth/signout-hop'));return}" +
    "if(has('cw-sso-off'))return;" +
    "if(has('cw-signed-in')){if(has('cw-sso-seed')&&drop('cw-sso-seed'))l.replace(door('/api/auth/seed'));return}" +
    "if(has('cw-sso-probed'))return;" +
    "for(i=0;i<P.length;i++)if(p.indexOf(P[i])===0)return;" +
    "if(" + PAID_CLICK_PARAM.toString() + ".test(q))return;" +
    "d.cookie='cw-sso-probed=1; Path=/; Max-Age='+T+'; SameSite=Lax'+sec;" +
    "if(!has('cw-sso-probed'))return;" +
    "l.replace(door('/api/auth/start')+'&prompt=none');" +
    "}catch(e){}})();"
  );
}
