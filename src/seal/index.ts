/**
 * cw_session seal — AES-256-GCM authenticated encryption for the sealed httpOnly
 * cookie a brand-site BFF holds. Format:
 *
 *   k1:<b64url(iv12)>.<b64url(ciphertext)>.<b64url(tag16)>
 *
 * - `k1` is the key-id prefix (seal format version 1). It selects which secret pair
 *   to try. A future format bump becomes `k2:` etc.
 * - AAD is `cw_session|<rpId>|v1`, so a cookie sealed for one relying party cannot be
 *   replayed against another and a version bump invalidates old blobs.
 * - Decryption tries the primary secret (`SITE_SESSION_SECRET`) first, then the grace
 *   secret (`SITE_SESSION_SECRET_PREV`) when present. That two-secret window is what
 *   makes a key rotation a two-deploy operation instead of a mass sign-out
 *   (design pack 40-brand-website-integration.md section 7.2).
 *
 * The 32-byte key is derived from the secret string with SHA-256 so any secret
 * encoding (base64 32-byte, hex 64-char) yields a valid AES-256 key deterministically.
 */
import crypto from "node:crypto";

export const SEAL_KEY_ID = "k1";
export const SEAL_VERSION = "v1";
const COOKIE_LABEL = "cw_session";

export interface SessionPlaintext {
  v: 1;
  sid: string;
  uid: string;
  at: string;
  atExp: number;
  rt: string;
  initials?: string;
  keep?: boolean;
  iat: number;
  [k: string]: unknown;
}

export interface UnsealKeys {
  primary: string;
  prev?: string;
}

function deriveKey(secret: string): Buffer {
  return crypto.createHash("sha256").update(String(secret), "utf8").digest();
}

function aad(rpId: string): Buffer {
  return Buffer.from(`${COOKIE_LABEL}|${rpId}|${SEAL_VERSION}`, "utf8");
}

/** Seal a payload under the primary secret. Always emits a `k1:` token. */
export function seal(payload: unknown, secret: string, rpId: string): string {
  if (typeof secret !== "string" || secret.length === 0) {
    throw new Error("seal: missing secret");
  }
  const key = deriveKey(secret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(aad(rpId));
  const pt = Buffer.from(JSON.stringify(payload), "utf8");
  const ct = Buffer.concat([cipher.update(pt), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${SEAL_KEY_ID}:${iv.toString("base64url")}.${ct.toString("base64url")}.${tag.toString("base64url")}`;
}

function tryDecrypt(iv: Buffer, ct: Buffer, tag: Buffer, key: Buffer, aadBuf: Buffer): Buffer | null {
  try {
    const d = crypto.createDecipheriv("aes-256-gcm", key, iv);
    d.setAAD(aadBuf);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(ct), d.final()]);
  } catch {
    return null;
  }
}

/**
 * Unseal a token. Returns the parsed payload, or `null` for anything that is not a
 * well-formed token that authenticates under one of the supplied secrets. A `null`
 * return is the ONLY signal: a garbage string, a truncated blob, a wrong-rpId AAD,
 * a tampered ciphertext and a wrong key are all indistinguishable and all rejected.
 */
export function unseal<T = SessionPlaintext>(
  token: string | undefined | null,
  keys: UnsealKeys,
  rpId: string,
): T | null {
  if (typeof token !== "string" || token.length === 0) return null;
  const colon = token.indexOf(":");
  if (colon < 0) return null;
  const keyId = token.slice(0, colon);
  if (keyId !== SEAL_KEY_ID) return null;
  const parts = token.slice(colon + 1).split(".");
  if (parts.length !== 3) return null;

  let iv: Buffer, ct: Buffer, tag: Buffer;
  try {
    iv = Buffer.from(parts[0], "base64url");
    ct = Buffer.from(parts[1], "base64url");
    tag = Buffer.from(parts[2], "base64url");
  } catch {
    return null;
  }
  if (iv.length !== 12 || tag.length !== 16 || ct.length === 0) return null;

  const aadBuf = aad(rpId);
  const secrets = [keys.primary, keys.prev].filter((s): s is string => typeof s === "string" && s.length > 0);
  for (const secret of secrets) {
    const out = tryDecrypt(iv, ct, tag, deriveKey(secret), aadBuf);
    if (out !== null) {
      try {
        return JSON.parse(out.toString("utf8")) as T;
      } catch {
        return null;
      }
    }
  }
  return null;
}
