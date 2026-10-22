import type { ModuleNavItem } from "@/modules";

export {
  DASHBOARD_MODULE_IDS,
  DASHBOARD_NAV,
  DASHBOARD_SECONDARY,
} from "@/modules";
export type { ModuleNavItem as NavItem } from "@/modules";

export const isSubItemActive = (
  item: ModuleNavItem,
  siblingItems: ModuleNavItem[],
  currentPath: string,
): boolean => {
  const itemPath = item.href.split("?")[0];
  const normalizedPath = currentPath.split("?")[0];

  // Specific top-level dashboard or module root overview paths should only match exact
  if (itemPath === "/dashboard" || itemPath === "/dashboard/warehouse") {
    return normalizedPath === itemPath;
  }

  if (normalizedPath === itemPath) {
    return true;
  }

  // If this item is a root/parent path for any other sibling items, it must only match exact
  // so it does not stay active when navigating to dedicated child sub-pages
  const isParentOfSiblings = siblingItems.some((candidate) => {
    const candidatePath = candidate.href.split("?")[0];
    return (
      candidatePath !== itemPath &&
      candidatePath.startsWith(`${itemPath}/`)
    );
  });

  if (isParentOfSiblings) {
    return normalizedPath === itemPath;
  }

  if (normalizedPath.startsWith(`${itemPath}/`)) {
    const hasMoreSpecificMatch = siblingItems.some((candidate) => {
      const candidatePath = candidate.href.split("?")[0];
      return (
        candidatePath !== itemPath &&
        candidatePath.startsWith(`${itemPath}/`) &&
        (normalizedPath === candidatePath ||
          normalizedPath.startsWith(`${candidatePath}/`))
      );
    });

    return !hasMoreSpecificMatch;
  }

  return false;
};
