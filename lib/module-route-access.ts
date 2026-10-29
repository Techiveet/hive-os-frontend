import { FEATURE_MODULES } from "@/modules/index";
import { MODULE_ID_TO_SUBSCRIPTION_SLUG, type ModuleNavItem } from "@/modules/types";
import type { RoutePermissionAccess } from "@/lib/route-permissions";
import { isTenantSession } from "@/lib/runtime-context";
import { requiredSubscriptionModules } from "@/lib/subscription-module-scope";

/**
 * Access for dashboard routes that lib/route-permissions has no explicit rule
 * for, derived from the module manifests (modules/<name>/module.ts).
 *
 * canAccessDashboardRoute() ends in `return true`, so any module route nobody
 * remembered to add there was open to everyone — /dashboard/finance loaded
 * for tenants without the finance module or a single finance permission.
 * Every manifest nav item already declares what the sidebar needs to show it
 * (subscription module, permissions, audience, business types); a route is
 * now openable exactly when the sidebar would show its item, so the page and
 * its menu entry can no longer disagree, and new modules are covered by
 * default.
 */

type Extra = {
  /** The tenant's business type, when known (from the /user payload). */
  businessType?: string | null;
};

const normalize = (path: string) => {
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, "");
  return clean === "" ? "/" : clean;
};

const covers = (base: string, path: string) => path === base || path.startsWith(`${base}/`);

let cachedAllItems: ModuleNavItem[] | null = null;
function getAllItems(): ModuleNavItem[] {
  if (!cachedAllItems) {
    cachedAllItems = (FEATURE_MODULES || []).flatMap((module) => module.navItems || []);
  }
  return cachedAllItems;
}

/** The most specific manifest nav item for a path, if any. */
function navItemFor(path: string): ModuleNavItem | null {
  let best: ModuleNavItem | null = null;
  for (const item of getAllItems()) {
    const href = normalize(item.href);
    if (href === "/dashboard") continue; // the dashboard root has its own explicit rule
    if (covers(href, path) && (!best || href.length > normalize(best.href).length)) {
      best = item;
    }
  }
  return best;
}

/**
 * A route under a module's routePrefixes with no nav item of its own (a deep
 * page): require what the module's items require, combined.
 */
function moduleRequirementFor(path: string): ModuleNavItem | null {
  // The bare "/dashboard" prefix (core module) would claim every page; the
  // dashboard root has its own explicit rule.
  const modules = FEATURE_MODULES || [];
  const module = modules.find((candidate) =>
    candidate.routePrefixes.some((prefix) => normalize(prefix) !== "/dashboard" && covers(normalize(prefix), path)),
  );
  if (!module || !module.navItems?.length) return null;

  const slugs = new Set<string>();
  const permissions = new Set<string>();
  let anyUnrestricted = false;
  for (const item of module.navItems) {
    const rawSlugs = item.subscriptionSlug ?? MODULE_ID_TO_SUBSCRIPTION_SLUG[item.moduleId];
    const itemSlugs = rawSlugs ? ([] as string[]).concat(rawSlugs) : [];
    itemSlugs.forEach((slug) => slugs.add(slug));
    if (!item.permissions?.length) anyUnrestricted = true;
    item.permissions?.forEach((permission) => permissions.add(permission));
  }

  return {
    ...module.navItems[0],
    subscriptionSlug: slugs.size ? [...slugs] : undefined,
    permissions: anyUnrestricted ? undefined : [...permissions],
    businessTypes: undefined,
    audience: undefined,
  };
}

/**
 * true / false for a route a manifest describes; null when no manifest
 * describes it (the caller keeps its existing default).
 */
export function canAccessModuleRoute(
  rawPath: string,
  access: RoutePermissionAccess,
  extra: Extra = {},
): boolean | null {
  const path = normalize(rawPath);
  const item = navItemFor(path) ?? moduleRequirementFor(path);
  if (!item) return null;

  const tenant = isTenantSession();

  if (item.audience === "central" && tenant) return false;
  if (item.audience === "tenant" && !tenant) return false;

  if (item.businessTypes?.length && extra.businessType && !item.businessTypes.includes(extra.businessType)) {
    return false;
  }

  const rawSlugs = item.subscriptionSlug ?? MODULE_ID_TO_SUBSCRIPTION_SLUG[item.moduleId];
  if (tenant && rawSlugs && !access.canBypassModuleSubscriptions && access.hasModule) {
    const required = requiredSubscriptionModules(rawSlugs, Boolean(access.exactModuleScope));
    if (!required.some((slug) => access.hasModule?.(slug))) return false;
  }

  if (!item.permissions?.length) return true;

  return access.hasAnyPermission(item.permissions);
}
