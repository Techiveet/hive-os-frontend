/** A selected lease names its modules explicitly; legacy leases retain HR compatibility. */
export function requiredSubscriptionModules(
  module: string | string[],
  exactScope: boolean,
): string[] {
  const slugs = Array.isArray(module) ? module : [module];
  if (exactScope && slugs.length > 1 && slugs[1] === "human_resources") {
    return [slugs[0]];
  }
  return slugs;
}
