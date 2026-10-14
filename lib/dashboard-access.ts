import { canAccessModuleRoute } from "@/lib/module-route-access";
import { canAccessDashboardRoute, type RoutePermissionAccess } from "@/lib/route-permissions";
import { isTenantSession } from "@/lib/runtime-context";

export type DashboardUserAccess = {
  permissions?: unknown;
  roles?: unknown;
  module_access?: {
    statuses?: Record<string, { active?: boolean }>;
    bypass_checks?: boolean;
  } | null;
  central_control_override?: boolean;
  business_type?: string | null;
};

const SUPER_ADMIN_ROLE = "Super Admin";
const CENTRAL_ADMIN_ROLE = "Admin";

export const normalizeStringList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (value && typeof value === "object") {
    return Object.values(value).filter((item): item is string => typeof item === "string");
  }

  return [];
};

export const hasUnrestrictedDashboardAccess = (user: DashboardUserAccess): boolean => {
  const roles = normalizeStringList(user.roles);

  if (roles.includes(SUPER_ADMIN_ROLE)) {
    return true;
  }

  if (!isTenantSession() && roles.includes(CENTRAL_ADMIN_ROLE)) {
    return true;
  }

  return false;
};

export const buildRoutePermissionAccess = (user: DashboardUserAccess): RoutePermissionAccess => {
  const permissions = normalizeStringList(user.permissions);
  const privileged = hasUnrestrictedDashboardAccess(user);

  return {
    hasPermission: (permission) => privileged || permissions.includes(permission),
    hasAnyPermission: (requestedPermissions) =>
      privileged || requestedPermissions.some((permission) => permissions.includes(permission)),
    hasModule: (slug) => Boolean(user.module_access?.statuses?.[slug]?.active),
    canBypassModuleSubscriptions: Boolean(
      user.central_control_override || user.module_access?.bypass_checks
    ),
  };
};

export const canAccessDashboardPath = (pathname: string, user: DashboardUserAccess): boolean => {
  const access = buildRoutePermissionAccess(user);
  return canAccessDashboardRoute(pathname, access, (path) =>
    canAccessModuleRoute(path, access, { businessType: user.business_type ?? null }),
  );
};
