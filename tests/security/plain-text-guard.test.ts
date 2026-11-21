import assert from "node:assert/strict";
import { hasUnsafePlainText } from "../../lib/plain-text-guard";

for (const unsafe of [
  "<script>alert(1)</script>",
  "<img src=x onerror=alert(1)>",
  "<svg onload=alert(1)>",
  "<!-- comment -->",
  "javascript:alert(1)",
  "vbscript:msgbox(1)",
  "data:text/html,<script>alert(1)</script>",
  "data: text/html;base64,PHNjcmlwdD4=",
  "JavaScript:alert(document.cookie)",
  "javascript: alert(1)",
  "click javascript:void(0)",
  "Elena\x00Vance",
]) {
  assert.equal(hasUnsafePlainText(unsafe), true, `expected rejection for ${unsafe}`);
}

for (const safe of [
  "",
  "Elena Vance",
  "Acme & Sons Ltd",
  "Ops Team < 10 members",
  "Regional Auditor (East)",
  "JavaScript: Basics",
  "JavaScript: Basics (part 1)",
  "Learn VBScript: the guide",
  "Data: text and numbers",
]) {
  assert.equal(hasUnsafePlainText(safe), false, `expected safe text to pass: ${safe}`);
}

console.log("Plain-text XSS guard security checks passed.");
