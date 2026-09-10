import type { AccountRoutesConfig } from "./config.js";
export interface AccountRoutes {
    /** GET  /api/auth/session          — signed-in probe (the only identity read) */
    session: (req: Request) => Promise<Response>;
    /** ALL  /api/auth/proxy/[...path]  — the allowlisted member proxy */
    proxy: (req: Request) => Promise<Response>;
    /** POST /api/auth/logout           — revoke + clear */
    logout: (req: Request) => Promise<Response>;
    /** GET  /api/auth/start            — begin the authorize redirect */
    start: (req: Request) => Promise<Response>;
    /** GET  /api/auth/callback         — finish the authorize redirect */
    callback: (req: Request) => Promise<Response>;
    /** POST /api/auth/establish        — the popup exchange */
    establish: (req: Request) => Promise<Response>;
}
/**
 * The factory a Next brand site mounts under app/api/auth/**. One call per site,
 * fed the per-site config object (config.ts). Returns Fetch-API handlers so they run
 * unchanged as App Router route handlers and are unit-testable with `node --test`
 * against a plain Request. Single-flight refresh state is held per factory instance.
 */
export declare function createAccountRoutes(config: AccountRoutesConfig): AccountRoutes;
//# sourceMappingURL=index.d.ts.map