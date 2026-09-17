export type SsoProbeTrigger = "load" | "interaction";
export type SsoProbeAction = "probe" | "seed" | "signout" | null;
/** Paths where a page-load redirect would disturb a payment in progress. */
export declare const SSO_PROBE_SKIP_PREFIXES: readonly string[];
/**
 * Paid landing paths: never checked on page load (interaction still checks). Every brand
 * site keeps its campaign twins under /lp/; a site with more passes them in `paidPrefixes`.
 */
export declare const SSO_PAID_LANDING_PREFIXES: readonly string[];
/**
 * How long one silent "nobody" answer is trusted on this brand. Short enough that a sign-in
 * made on another brand mid-session is picked up on the next hard load after it; long
 * enough that a cold visitor pays the hop once, not on every page.
 */
export declare const SSO_PROBE_TTL_SECONDS: number;
/** An ad click id or a `utm_*` in the query marks paid traffic, whatever the path. */
export declare const PAID_CLICK_PARAM: RegExp;
export declare function isPaidLanding(path: string, search: string, paidPrefixes?: readonly string[]): boolean;
/** Pure decision, unit-tested. No DOM. */
export declare function ssoProbeDecision(input: {
    cookie: string;
    trigger: SsoProbeTrigger;
    path: string;
    search?: string;
    userAgent?: string;
    paidPrefixes?: readonly string[];
}): SsoProbeAction;
/** The structural slice of `window` the probe needs (the package has no DOM lib). */
export interface SsoProbeEnv {
    document: {
        cookie: string;
    };
    location: {
        pathname: string;
        search: string;
        protocol: string;
        assign(url: string): void;
    };
    navigator?: {
        userAgent?: string;
    };
}
/**
 * Run the check. Pass `window` (it satisfies SsoProbeEnv). Returns true when the page is
 * navigating away — the caller should stop what it was about to do (for booking,
 * snapshot first so the pop-up can resume on return).
 */
export declare function runSsoProbe(env: SsoProbeEnv | undefined, trigger: SsoProbeTrigger, opts?: {
    next?: string;
    paidPrefixes?: readonly string[];
}): boolean;
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
export declare function earlySsoProbeScript(opts: {
    hosts: readonly string[];
    paidPrefixes?: readonly string[];
}): string;
//# sourceMappingURL=ssoProbe.d.ts.map