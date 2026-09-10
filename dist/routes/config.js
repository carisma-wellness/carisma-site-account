export function resolveConfig(cfg) {
    if (!cfg.rpId)
        throw new Error("createAccountRoutes: rpId is required");
    if (!cfg.sessionSecret)
        throw new Error("createAccountRoutes: sessionSecret is required");
    if (!cfg.carismasoftApiUrl)
        throw new Error("createAccountRoutes: carismasoftApiUrl is required");
    return {
        rpId: cfg.rpId,
        clientId: cfg.clientId ?? cfg.rpId,
        clientSecret: cfg.clientSecret ?? "",
        keyVersion: cfg.keyVersion ?? 1,
        identityOrigin: cfg.identityOrigin ?? "",
        carismasoftApiUrl: cfg.carismasoftApiUrl.replace(/\/+$/, ""),
        sessionSecret: cfg.sessionSecret,
        sessionSecretPrev: cfg.sessionSecretPrev,
        allowedOrigins: cfg.allowedOrigins ?? [],
        cookieSecure: cfg.cookieSecure ?? true,
        proxyBasePath: cfg.proxyBasePath ?? "/api/auth/proxy",
        fetchImpl: cfg.fetchImpl ?? fetch,
        now: cfg.now ?? Date.now,
        unsealKeys: { primary: cfg.sessionSecret, prev: cfg.sessionSecretPrev },
    };
}
//# sourceMappingURL=config.js.map