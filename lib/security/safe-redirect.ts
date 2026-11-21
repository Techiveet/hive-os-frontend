const CONTROL_CHARACTERS_REGEX = /[\u0000-\u001f\u007f]/;
const FALLBACK_PARSE_ORIGIN = "https://hive.local";

/**
 * Validate that a post-login redirect candidate stays strictly on the same origin.
 * Rejects protocol-relative paths (//evil.com), backslashes (/\evil.com), and
 * ASCII control characters (e.g. /\t/evil.com) that browsers strip during URL resolution.
 */
export function sanitizeRelativeRedirect(
  candidate: string | null | undefined,
  baseOrigin?: string,
): string | null {
  if (typeof candidate !== "string") {
    return null;
  }

  const trimmed = candidate.trim();
  if (
    !trimmed ||
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.includes("\\") ||
    CONTROL_CHARACTERS_REGEX.test(trimmed)
  ) {
    return null;
  }

  const rawOrigin =
    baseOrigin ?? (typeof window !== "undefined" ? window.location.origin : FALLBACK_PARSE_ORIGIN);

  // Normalize ("https://Example.com/" -> "https://example.com") so a base
  // passed with a trailing slash, path or upper-case host still compares equal
  // to URL.origin below.
  let origin: string;
  try {
    origin = new URL(rawOrigin).origin;
  } catch {
    return null;
  }

  try {
    const resolved = new URL(trimmed, origin);
    if (
      resolved.origin !== origin ||
      !resolved.pathname.startsWith("/") ||
      resolved.pathname.startsWith("//")
    ) {
      return null;
    }

    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return null;
  }
}

/**
 * Resolve an internal redirect path from untrusted input, falling back when unsafe.
 */
export function resolveSafeRedirectPath(
  candidate: string | null | undefined,
  fallback: string,
  baseOrigin?: string,
): string {
  return (
    sanitizeRelativeRedirect(candidate, baseOrigin) ??
    sanitizeRelativeRedirect(fallback, baseOrigin) ??
    "/dashboard"
  );
}
