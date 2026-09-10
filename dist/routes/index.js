import { resolveConfig } from "./config.js";
import { createRefresher } from "./refresh.js";
import { makeSession } from "./session.js";
import { makeProxy } from "./proxy.js";
import { makeLogout } from "./logout.js";
import { makeStart, makeCallback, makeEstablish } from "./authorize.js";
/**
 * The factory a Next brand site mounts under app/api/auth/**. One call per site,
 * fed the per-site config object (config.ts). Returns Fetch-API handlers so they run
 * unchanged as App Router route handlers and are unit-testable with `node --test`
 * against a plain Request. Single-flight refresh state is held per factory instance.
 */
export function createAccountRoutes(config) {
    const cfg = resolveConfig(config);
    const refresh = createRefresher(cfg);
    return {
        session: makeSession(cfg, refresh),
        proxy: makeProxy(cfg),
        logout: makeLogout(cfg),
        start: makeStart(cfg),
        callback: makeCallback(cfg),
        establish: makeEstablish(cfg),
    };
}
//# sourceMappingURL=index.js.map