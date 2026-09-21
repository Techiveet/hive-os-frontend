import { headers } from "next/headers";

import { FullScreenPlaceholder } from "@/components/ui/loading-states";
import { fetchPublicBrandSettings, tenantSlugFromRequest } from "@/lib/seo";
import { LmsPreloader } from "@/modules/Lms/components/lms-preloader";

/**
 * The shell's boot screen.
 *
 * It used to say "Preparing HIVE.OS" in the operator console's lime green for
 * every tenant, so the first thing a student saw when their course site opened
 * was somebody else's product — and then a second, different loader after it.
 *
 * The tenant is knowable here from the Host header alone, before any client
 * code runs, so an LMS tenant gets the course-site loader from the first frame.
 * Everything else is unchanged.
 */
export default async function RootLoading() {
  const requestHeaders = await headers();
  const slug = tenantSlugFromRequest(requestHeaders);

  if (slug && isLmsSlug(slug)) {
    // The brand title is worth waiting for here: this renders on the server, so
    // there is no flash of the slug being replaced by the real name.
    const brand = await fetchPublicBrandSettings(requestHeaders).catch(
      () => ({}) as Awaited<ReturnType<typeof fetchPublicBrandSettings>>,
    );

    return <LmsPreloader brandName={brand.app_title || slug} />;
  }

  return (
    <FullScreenPlaceholder
      label="Preparing HIVE.OS"
      detail="Booting the application shell and synchronizing your environment."
    />
  );
}

/**
 * Whether this host belongs to a learning tenant.
 *
 * Deliberately a name check rather than a lookup: the business type lives
 * behind an API call this screen exists to cover the latency of, and a boot
 * screen that has to fetch before it can render defeats itself.
 */
function isLmsSlug(slug: string): boolean {
  return slug === "lms-demo" || slug.includes("lms") || slug.includes("academy");
}
