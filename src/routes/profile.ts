/**
 * Minimisation applied in the site route handler, on the server, never in the browser
 * (40- 5.2, 6.3). The full email address never reaches page JavaScript; the panel and
 * the header see a masked address and the initials only.
 */
export interface MaskedProfile {
  firstName: string;
  lastName: string;
  emailMasked: string;
  countryCode: string | null;
  phone: string | null;
  initials: string;
  /**
   * The member's own profile photo (CarismaSoft `profilePicture`), https only — the
   * one they uploaded in the Customer App, or the Google picture stored on a first
   * social sign-in. It is their own face on their own screen, so it is not masked;
   * it is also the ONE profile field the header paints, and it never enters a cookie.
   */
  avatarUrl: string | null;
}

export function initialsFrom(firstName?: string, lastName?: string, email?: string): string {
  const a = (firstName ?? "").trim();
  const b = (lastName ?? "").trim();
  let ini = ((a[0] ?? "") + (b[0] ?? "")).toUpperCase();
  if (!ini && email) ini = (email.trim()[0] ?? "").toUpperCase();
  return ini.replace(/[^A-Z]/g, "").slice(0, 2);
}

export function maskEmail(email?: string): string {
  if (!email || !email.includes("@")) return "";
  const [local, domain] = email.split("@");
  const head = local.slice(0, 1);
  return `${head}***@${domain}`;
}

export function maskProfile(raw: unknown): MaskedProfile {
  const p = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
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
    avatarUrl: avatarFrom(p.profilePicture ?? p.avatarUrl ?? p.photoUrl),
  };
}

/**
 * Absolute https only. A relative path, `javascript:`, `data:` or any other string is
 * treated as no photo, so a compromised upstream field cannot put a URL the browser
 * would follow into the header.
 */
function avatarFrom(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const url = raw.trim();
  if (!url || url.length > 2000) return null;
  return /^https:\/\/[^\s"'<>]+$/i.test(url) ? url : null;
}
