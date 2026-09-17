/**
 * Appointment-list unwrapping. The CarismaSoft house envelope is {success,data};
 * filter=upcoming is {data: AppointmentCard[]}; filter=all is
 * {upcoming:{data:[]}, past:{data:[]}}. The panel, the session route and the
 * /account portal all go through here so a shape change cannot silently empty
 * one surface and not the others.
 */
export function unwrapEnvelope(body) {
    if (body && typeof body === "object" && !Array.isArray(body)) {
        const o = body;
        if (o.success === true && "data" in o)
            return o.data;
    }
    return body;
}
function asRows(value) {
    if (!Array.isArray(value))
        return [];
    return value.filter((r) => Boolean(r) && typeof r === "object");
}
/** Pull the appointment cards out of any of the three live reply shapes. */
export function extractAppointmentList(body) {
    const inner = unwrapEnvelope(body);
    const direct = asRows(inner);
    if (direct.length || Array.isArray(inner))
        return direct;
    if (!inner || typeof inner !== "object")
        return [];
    const o = inner;
    const fromData = asRows(o.data);
    if (fromData.length || Array.isArray(o.data))
        return fromData;
    const upcoming = o.upcoming;
    if (Array.isArray(upcoming))
        return asRows(upcoming);
    if (upcoming && typeof upcoming === "object")
        return asRows(upcoming.data);
    return [];
}
export function extractAppointmentBucket(body, bucket) {
    const inner = unwrapEnvelope(body);
    if (!inner || typeof inner !== "object" || Array.isArray(inner)) {
        return bucket === "upcoming" ? extractAppointmentList(body) : [];
    }
    const o = inner;
    const slot = o[bucket];
    if (Array.isArray(slot))
        return asRows(slot);
    if (slot && typeof slot === "object")
        return asRows(slot.data);
    if (bucket === "upcoming")
        return extractAppointmentList(inner);
    return [];
}
/** A row is Medical if its brand slug or name says so (W-15 belt-and-braces). */
export function isMedicalAppointment(row) {
    const brand = (row.brand ??
        row.brandLocation?.brand ??
        {});
    const slug = String(brand.slug ?? row.brandSlug ?? "").toLowerCase();
    const nestedName = String(brand.name ?? "").toLowerCase();
    const flatName = String(row.brandName ?? "").toLowerCase();
    return (slug === "carisma-medical" ||
        slug === "medical" ||
        nestedName.includes("medical") ||
        flatName.includes("medical"));
}
/** Europe/Malta, en-GB. An already-human string (the panel test fixture) is kept. */
export function formatWhen(raw) {
    if (!raw)
        return "";
    const ms = Date.parse(raw);
    if (!Number.isFinite(ms))
        return raw;
    try {
        return new Intl.DateTimeFormat("en-GB", {
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "Europe/Malta",
        }).format(new Date(ms));
    }
    catch {
        return raw;
    }
}
//# sourceMappingURL=appointments.js.map