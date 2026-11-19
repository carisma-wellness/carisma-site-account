/**
 * `node:assert/strict`, comparing words with the design's no-break spaces (U+00A0) read as plain spaces and the curly
 * apostrophe (U+2019) as a straight one. The suites written before ADDENDUM X11 assert WHAT the kit says; the exact
 * characters are pinned byte for byte by test/circle-words.test.mjs against the design's own fixture. Not a test file
 * (node --test runs test/*.test.mjs only).
 */
import strict from "node:assert/strict";

/** The words as the older suites wrote them: no-break spaces → spaces, ’ → '. */
export function plain(v) {
  if (typeof v === "string") return v.replace(/ /g, " ").replace(/’/g, "'");
  if (Array.isArray(v)) return v.map(plain);
  if (v && typeof v === "object" && Object.getPrototypeOf(v) === Object.prototype) {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]));
  }
  return v;
}

function wrapped() {
  const a = (value, message) => strict(value, message);
  for (const k of Object.keys(strict)) a[k] = strict[k];
  a.equal = (actual, expected, message) => strict.equal(plain(actual), plain(expected), message);
  a.notEqual = (actual, expected, message) => strict.notEqual(plain(actual), plain(expected), message);
  a.deepEqual = (actual, expected, message) => strict.deepEqual(plain(actual), plain(expected), message);
  a.notDeepEqual = (actual, expected, message) => strict.notDeepEqual(plain(actual), plain(expected), message);
  a.strictEqual = a.equal;
  a.deepStrictEqual = a.deepEqual;
  a.match = (actual, re, message) => strict.match(plain(actual), re, message);
  a.doesNotMatch = (actual, re, message) => strict.doesNotMatch(plain(actual), re, message);
  a.strict = a;
  return a;
}

const assert = wrapped();
export default assert;
