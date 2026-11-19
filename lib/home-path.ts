/**
 * Where a signed-in user belongs.
 *
 * On an LMS tenant the ERP dashboard is reserved for the tenant's Super Admin.
 * Instructors and learners live at /learn, the course-site interface built from
 * the tenant's own template — so signing in takes them there, and /dashboard
 * bounces them back. Every other tenant behaves as it always has.
 *
 * The backend sends `home_path` on the auth payload and is the authority. The
 * local derivation below is only a fallback for sessions that were established
 * before that field existed, so an already-signed-in user is not stranded.
 */

const DASHBOARD = "/dashboard";
const LMS_HOME = "/learn";
const MARKETPLACE_HOME = "/dashboard/b2b-marketplace";

type HomePathUser = {
  home_path?: string | null;
  business_type?: string | null;
  roles?: unknown;
  permissions?: unknown;
};

function permissionNames(user: HomePathUser): string[] {
  const permissions = user.permissions;
  if (!Array.isArray(permissions)) return [];
  return permissions
    .map((permission) => (typeof permission === "string" ? permission : (permission as { name?: string })?.name))
    .filter((name): name is string => typeof name === "string");
}

/**
 * A B2B marketplace buyer or supplier cannot open the main dashboard (they lack its permission), so
 * landing them there shows Access Denied. Their home is the marketplace; anyone who can open the
 * dashboard keeps it.
 */
export function isMarketplaceOnlyUser(user: HomePathUser | null | undefined): boolean {
  if (!user) return false;
  const permissions = permissionNames(user);
  return !permissions.includes("view_system_dashboard") && permissions.includes("view_b2b_marketplace");
}

function roleNames(user: HomePathUser): string[] {
  const roles = user.roles;
  if (!Array.isArray(roles)) return [];
  return roles
    .map((role) => (typeof role === "string" ? role : (role as { name?: string })?.name))
    .filter((name): name is string => typeof name === "string");
}

export function resolveHomePath(user: HomePathUser | null | undefined): string {
  if (!user) return DASHBOARD;
  if (typeof user.home_path === "string" && user.home_path.startsWith("/")) {
    return user.home_path;
  }
  if (user.business_type !== "lms") return isMarketplaceOnlyUser(user) ? MARKETPLACE_HOME : DASHBOARD;
  return roleNames(user).includes("Super Admin") ? DASHBOARD : LMS_HOME;
}

/** True when this user must not be shown the ERP dashboard at all. */
export function isLmsOnlyUser(user: HomePathUser | null | undefined): boolean {
  return resolveHomePath(user) === LMS_HOME;
}

/** Reads the stored session user, for callers outside React. */
export function readStoredUser(): HomePathUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("hive_user");
    return raw ? (JSON.parse(raw) as HomePathUser) : null;
  } catch {
    return null;
  }
}
