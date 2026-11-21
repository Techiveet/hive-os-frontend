/**
 * Mirrors the backend `App\Rules\SafePlainText` validation rule so forms fail fast
 * with accessible feedback before sending raw HTML/XML or scriptable URIs.
 */
const CONTROL_CHAR_REGEX = /[\u0000-\u001F\u007F]/;
const HTML_MARKUP_REGEX = /(?:<\/?[a-zA-Z]|<!|<\?)/;
/**
 * Keep in sync with `SafePlainText::SCRIPTABLE_URI_PATTERN` (backend).
 * A scriptable URI is the scheme glued to its colon, then either directly
 * followed by a payload or by whitespace and something code-like
 * (punctuation or a call such as `alert(`). So "JavaScript: Basics" passes,
 * while `javascript:alert(1)`, `javascript: alert(1)`, `vbscript:msgbox` and
 * `data:text/html,...` are rejected.
 */
const SCRIPTABLE_URI_REGEX =
  /(?<![a-z0-9+.\-])(?:(?:javascript|vbscript):(?:(?!\s)|\s*(?:[^\s\w]|[a-z_$][\w$.]*\())|data:\s*text\/html)/i;

export function hasUnsafePlainText(value: string): boolean {
  if (!value) return false;
  return (
    CONTROL_CHAR_REGEX.test(value) ||
    HTML_MARKUP_REGEX.test(value) ||
    SCRIPTABLE_URI_REGEX.test(value)
  );
}

export const UNSAFE_PLAIN_TEXT_MESSAGE =
  "Plain text only — HTML markup, script tags, and executable URIs are not permitted.";
