/**
 * Appointment-list unwrapping. The CarismaSoft house envelope is {success,data};
 * filter=upcoming is {data: AppointmentCard[]}; filter=all is
 * {upcoming:{data:[]}, past:{data:[]}}. The panel, the session route and the
 * /account portal all go through here so a shape change cannot silently empty
 * one surface and not the others.
 */
export function unwrapEnvelope(body: unknown): unknown {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const o = body as Record<string, unknown>;
    if (o.success === true && "data" in o) return o.data;
  }
  return body;
}

function asRows(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === "object");
}

/** Pull the appointment cards out of any of the three live reply shapes. */
export function extractAppointmentList(body: unknown): Array<Record<string, unknown>> {
  const inner = unwrapEnvelope(body);
  const direct = asRows(inner);
  if (direct.length || Array.isArray(inner)) return direct;
  if (!inner || typeof inner !== "object") return [];
  const o = inner as Record<string, unknown>;
  const fromData = asRows(o.data);
  if (fromData.length || Array.isArray(o.data)) return fromData;
  const upcoming = o.upcoming;
  if (Array.isArray(upcoming)) return asRows(upcoming);
  if (upcoming && typeof upcoming === "object") return asRows((upcoming as Record<string, unknown>).data);
  return [];
}

export function extractAppointmentBucket(
  body: unknown,
  bucket: "upcoming" | "past" | "canceled",
): Array<Record<string, unknown>> {
  const inner = unwrapEnvelope(body);
  if (!inner || typeof inner !== "object" || Array.isArray(inner)) {
    return bucket === "upcoming" ? extractAppointmentList(body) : [];
  }
  const o = inner as Record<string, unknown>;
  const slot = o[bucket];
  if (Array.isArray(slot)) return asRows(slot);
  if (slot && typeof slot === "object") return asRows((slot as Record<string, unknown>).data);
  if (bucket === "upcoming") return extractAppointmentList(inner);
  return [];
}

/** A row is Medical if its brand slug or name says so (W-15 belt-and-braces). */
export function isMedicalAppointment(row: Record<string, unknown>): boolean {
  const brand = (row.brand ??
    (row.brandLocation as Record<string, unknown> | undefined)?.brand ??
    {}) as Record<string, unknown>;
  const slug = String(brand.slug ?? row.brandSlug ?? "").toLowerCase();
  const nestedName = String(brand.name ?? "").toLowerCase();
  const flatName = String(row.brandName ?? "").toLowerCase();
  return (
    slug === "carisma-medical" ||
    slug === "medical" ||
    nestedName.includes("medical") ||
    flatName.includes("medical")
  );
}

/** Europe/Malta, en-GB. An already-human string (the panel test fixture) is kept. */
export function formatWhen(raw: string): string {
  if (!raw) return "";
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) return raw;
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
  } catch {
    return raw;
  }
}
