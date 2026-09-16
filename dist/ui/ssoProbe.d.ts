export type SsoProbeTrigger = "load" | "interaction";
export type SsoProbeAction = "probe" | "seed" | null;
/** Paths where a page-load redirect would disturb a payment in progress. */
export declare const SSO_PROBE_SKIP_PREFIXES: readonly string[];
/** Pure decision, unit-tested. No DOM. */
export declare function ssoProbeDecision(input: {
    cookie: string;
    trigger: SsoProbeTrigger;
    path: string;
    userAgent?: string;
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
}): boolean;
//# sourceMappingURL=ssoProbe.d.ts.map