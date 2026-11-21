/**
 * Shared React Query settings for the public subscription catalog.
 *
 * The landing page and /auth/signup read the same `["public-catalog"]` cache
 * entry; giving them different staleTime values made whichever page mounted
 * first decide how fresh the other page's prices were. Signup additionally
 * forces a refetch on mount so checkout always confirms current pricing.
 */
export const PUBLIC_CATALOG_QUERY_KEY = ["public-catalog"] as const;

export const PUBLIC_CATALOG_STALE_TIME_MS = 60_000;
