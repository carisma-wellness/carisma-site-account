/**
 * The /member door (design 4.3). The header is a client component and the kill
 * switch (ACCOUNT_LOGIN) and IDENTITY_CLIENT_SECRET are server-only, so the mark
 * links at this FIRST-PARTY server route, which decides on the server where both
 * variables actually exist. A kill switch evaluated in the browser bundle would
 * silently read as "not killed".
 *
 *   ACCOUNT_LOGIN off -> a fallback page ("your account is opening soon" + phone +
 *                        WhatsApp), never a 404: a member who cannot find the door
 *                        must not assume the record was lost.
 *   ACCOUNT_LOGIN on  -> 307 to /api/auth/start?next=<validated>.
 *
 * memberDoor() is the framework-agnostic decision the site's app/member/page.tsx
 * calls; it returns either a redirect location or the fallback HTML + status.
 */
import { startUrl } from "../urls.js";
import { escapeHtml } from "./html.js";

export interface MemberDoorConfig {
  /** ACCOUNT_LOGIN === "on" */
  accountLogin: boolean;
  brandName: string;
  /** e.g. "tel:+35621234567" and its display label */
  phoneHref?: string;
  phoneLabel?: string;
  /** e.g. "https://wa.me/35699000000" and its display label */
  whatsappHref?: string;
  whatsappLabel?: string;
}

export type MemberDoorResult =
  | { kind: "redirect"; status: 307; location: string }
  | { kind: "fallback"; status: 200; html: string };

export function memberDoor(cfg: MemberDoorConfig, next: string | null | undefined): MemberDoorResult {
  if (cfg.accountLogin) {
    return { kind: "redirect", status: 307, location: startUrl(next ?? "/", "login") };
  }
  return { kind: "fallback", status: 200, html: memberFallbackHTML(cfg) };
}

/** The "opening soon" page. Never a 404. Points at the channel that always works. */
export function memberFallbackHTML(cfg: MemberDoorConfig): string {
  const brand = escapeHtml(cfg.brandName);
  const contactBits: string[] = [];
  if (cfg.phoneHref) {
    contactBits.push(
      `<a href="${escapeHtml(cfg.phoneHref)}">${escapeHtml(cfg.phoneLabel || cfg.phoneHref)}</a>`,
    );
  }
  if (cfg.whatsappHref) {
    contactBits.push(
      `<a href="${escapeHtml(cfg.whatsappHref)}">${escapeHtml(cfg.whatsappLabel || "WhatsApp")}</a>`,
    );
  }
  const contact = contactBits.length
    ? `<p class="carisma-member-fallback__contact">You can reach us on ${contactBits.join(" or ")}.</p>`
    : "";
  return (
    `<main class="carisma-member-fallback">` +
    `<h1>Your account is opening soon</h1>` +
    `<p>The ${brand} member area is not available from this page yet. ` +
    `Nothing about your bookings has changed.</p>` +
    contact +
    `<p><a class="carisma-member-fallback__back" href="/">Back to ${brand}</a></p>` +
    `</main>`
  );
}
