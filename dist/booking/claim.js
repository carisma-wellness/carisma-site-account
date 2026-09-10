export function makeGuestClaim(deps) {
    const fetchImpl = deps.fetchImpl ?? fetch;
    const base = deps.apiBaseUrl.replace(/\/+$/, "");
    const postJson = (path, body, bearer) => {
        const headers = { "content-type": "application/json" };
        if (bearer)
            headers["authorization"] = `Bearer ${bearer}`;
        return fetchImpl(`${base}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
    };
    return {
        async start(input) {
            if (input.via === "email") {
                // Enumeration-safe: the same 200 whether or not the address exists (W-13).
                const res = await postJson("/auth/code/start", { email: input.email, purpose: "claim" });
                return { ok: res.ok };
            }
            // guest-token path: the token is the Bearer, the address is never typed, so
            // the API answers which inbox to open without the device holder learning it.
            const res = await postJson("/client/booking/guest/claim/start", {}, input.guestToken);
            let maskedEmail;
            try {
                const body = (await res.json());
                maskedEmail = body?.data?.maskedEmail ?? body?.maskedEmail;
            }
            catch {
                maskedEmail = undefined;
            }
            return { ok: res.ok, maskedEmail };
        },
        async finish(input) {
            const res = input.via === "email"
                ? await postJson("/auth/code/finish", {
                    email: input.email,
                    code: input.code,
                    purpose: "claim",
                    password: input.password,
                })
                : await postJson("/client/booking/guest/claim/finish", { code: input.code, password: input.password }, input.guestToken);
            let body = {};
            try {
                body = (await res.json());
            }
            catch {
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
//# sourceMappingURL=claim.js.map