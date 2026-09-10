export function initialsFrom(firstName, lastName, email) {
    const a = (firstName ?? "").trim();
    const b = (lastName ?? "").trim();
    let ini = ((a[0] ?? "") + (b[0] ?? "")).toUpperCase();
    if (!ini && email)
        ini = (email.trim()[0] ?? "").toUpperCase();
    return ini.replace(/[^A-Z]/g, "").slice(0, 2);
}
export function maskEmail(email) {
    if (!email || !email.includes("@"))
        return "";
    const [local, domain] = email.split("@");
    const head = local.slice(0, 1);
    return `${head}***@${domain}`;
}
export function maskProfile(raw) {
    const p = (raw && typeof raw === "object" ? raw : {});
    const firstName = typeof p.firstName === "string" ? p.firstName : "";
    const lastName = typeof p.lastName === "string" ? p.lastName : "";
    const email = typeof p.email === "string" ? p.email : "";
    return {
        firstName,
        lastName,
        emailMasked: maskEmail(email),
        countryCode: typeof p.countryCode === "string" ? p.countryCode : null,
        phone: typeof p.phone === "string" ? p.phone : null,
        initials: initialsFrom(firstName, lastName, email),
    };
}
//# sourceMappingURL=profile.js.map