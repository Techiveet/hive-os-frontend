/**
 * Pre-hydration gate for the landing intro curtain (modules/landing/components/hive-intro.tsx).
 *
 * Rendered by the root layout — a Server Component — rather than by HiveIntro
 * itself: React warns about any <script> it has to create on the client, and a
 * client component's script is re-created on every client navigation or
 * hydration retry. The layout's markup is only ever hydrated, never re-created.
 *
 * It sets html[data-hive-intro="seen"] (which hides the curtain in CSS) for:
 * tenant hosts — the platform landing is server-rendered there before the
 * client swaps in the tenant template, so the Hive intro must not flash —
 * returning visitors in this tab session, and reduced-motion users. It never
 * marks the session itself — HiveIntro does that once it is actually playing.
 */
export const HIVE_INTRO_SEEN_KEY = "hive-intro-seen";

export function buildHiveIntroGate(centralHost: boolean): string {
  return `(function(){try{var d=document.documentElement,k=${JSON.stringify(HIVE_INTRO_SEEN_KEY)};if(${centralHost ? "false" : "true"}||sessionStorage.getItem(k)||matchMedia("(prefers-reduced-motion: reduce)").matches){d.setAttribute("data-hive-intro","seen")}}catch(e){}})();`;
}
