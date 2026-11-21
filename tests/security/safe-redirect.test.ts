import assert from "node:assert/strict";
import { resolveSafeRedirectPath, sanitizeRelativeRedirect } from "../../lib/security/safe-redirect";

const ORIGIN = "http://localhost:3001";

// Valid internal relative redirects preserve path, query, and hash.
assert.equal(sanitizeRelativeRedirect("/dashboard", ORIGIN), "/dashboard");
assert.equal(
  sanitizeRelativeRedirect("/dashboard/subscriptions/demo-requests?search=qa#top", ORIGIN),
  "/dashboard/subscriptions/demo-requests?search=qa#top",
);
assert.equal(resolveSafeRedirectPath("  /learn?course=101  ", "/dashboard", ORIGIN), "/learn?course=101");

// Off-origin, scheme-relative, backslash, and control-character bypass vectors are rejected.
for (const unsafe of [
  null,
  undefined,
  "",
  "   ",
  "https://evil.com",
  "http://evil.com/dashboard",
  "//evil.com",
  "///evil.com",
  "/\\evil.com",
  "\\/evil.com",
  "/\t/evil.com",
  "/\n/evil.com",
  "/\r/evil.com",
  "/dashboard\x00evil",
  "/dashboard\x7fevil",
  "javascript:alert(1)",
  "data:text/html,<script>alert(1)</script>",
]) {
  assert.equal(sanitizeRelativeRedirect(unsafe, ORIGIN), null, `expected rejection for ${JSON.stringify(unsafe)}`);
  assert.equal(resolveSafeRedirectPath(unsafe, "/dashboard", ORIGIN), "/dashboard");
}

// F-L3: a base origin given with a trailing slash, path or upper-case host is
// normalized before comparison instead of rejecting every same-origin path.
for (const base of [`${ORIGIN}/`, `${ORIGIN}/dashboard/settings`, ORIGIN.toUpperCase()]) {
  assert.equal(sanitizeRelativeRedirect("/dashboard/users?tab=roles", base), "/dashboard/users?tab=roles");
  assert.equal(sanitizeRelativeRedirect("//evil.com", base), null);
}
assert.equal(sanitizeRelativeRedirect("/dashboard", "not a url"), null, "an unparseable base origin must fail closed");

console.log("Safe post-login redirect security checks passed.");
