import { test } from "node:test";
import assert from "node:assert/strict";
import {
  accountMarkServerHTML,
  accountMarkSignedInHTML,
  accountMarkState,
  readInitialsHint,
  readSignedInHint,
  hydrateAccountMark,
} from "../dist/index.js";

test("server HTML is the guest state and never branches on a cookie (W-1)", () => {
  const html = accountMarkServerHTML();
  assert.match(html, /data-cw-session="out"/);
  assert.match(html, /href="\/member"/);
  assert.match(html, /aria-label="Account"/);
  assert.match(html, /data-carisma-account-mark/);
  assert.doesNotMatch(html, /data-cw-initials/); // no identifying data in server HTML
  // deterministic: two renders are byte-identical (the CloudFront-cacheable document)
  assert.equal(accountMarkServerHTML(), html);
});

test("accountMarkState decides signed-in from the host hint cookie", () => {
  const inState = accountMarkState("foo=1; cw-signed-in=1; cw-initials=JD");
  assert.deepEqual(inState, {
    signedIn: true,
    initials: "JD",
    href: "#account-panel",
    ariaLabel: "Your account",
    session: "in",
  });
  const outState = accountMarkState("foo=1");
  assert.equal(outState.signedIn, false);
  assert.equal(outState.href, "/member");
  assert.equal(outState.session, "out");
});

test("initials hint accepts only one or two Latin letters, upper-cased", () => {
  assert.equal(readInitialsHint("cw-initials=JD"), "JD");
  assert.equal(readInitialsHint("cw-initials=jd"), "JD");
  assert.equal(readInitialsHint("cw-initials=J"), "J");
  assert.equal(readInitialsHint("cw-initials=ABC"), ""); // three letters
  assert.equal(readInitialsHint("cw-initials=A1"), ""); // a digit
  assert.equal(readInitialsHint("cw-initials=<b"), ""); // markup
  assert.equal(readInitialsHint("nope=1"), "");
  assert.equal(readSignedInHint("cw-signed-in=1"), true);
  assert.equal(readSignedInHint("cw-signed-in=0"), false);
});

test("signed-in inner markup masks the initials for the session recorder (W-25)", () => {
  const chip = accountMarkSignedInHTML("JD");
  assert.match(chip, /data-clarity-mask="True"/);
  assert.match(chip, />JD</);
  // no valid initials -> the filled silhouette, no attacker text
  const noIni = accountMarkSignedInHTML("###");
  assert.doesNotMatch(noIni, /###/);
  assert.match(noIni, /<svg/);
});

/* A tiny fake element with the MinimalElement shape — no jsdom, no DOM lib. */
function fakeMark() {
  const attrs = { "data-cw-session": "out", href: "/member", "aria-label": "Account" };
  return {
    innerHTML: "<svg>guest</svg>",
    setAttribute(k, v) {
      attrs[k] = v;
    },
    getAttribute(k) {
      return k in attrs ? attrs[k] : null;
    },
    attrs,
  };
}

test("hydrateAccountMark upgrades the guest chip only when the cookie says signed-in", () => {
  const signedOut = fakeMark();
  hydrateAccountMark(signedOut, "foo=1");
  assert.equal(signedOut.getAttribute("data-cw-session"), "out"); // unchanged
  assert.equal(signedOut.innerHTML, "<svg>guest</svg>");

  const signedIn = fakeMark();
  hydrateAccountMark(signedIn, "cw-signed-in=1; cw-initials=JD");
  assert.equal(signedIn.getAttribute("data-cw-session"), "in");
  assert.equal(signedIn.getAttribute("href"), "#account-panel");
  assert.equal(signedIn.getAttribute("aria-label"), "Your account");
  assert.equal(signedIn.getAttribute("data-cw-initials"), "JD");
  assert.match(signedIn.innerHTML, /JD/);
  assert.match(signedIn.innerHTML, /data-clarity-mask="True"/);
});
