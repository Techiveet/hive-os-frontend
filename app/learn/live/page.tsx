"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useTenantModuleAccess } from "@/hooks/use-tenant-module-access";
import { LMS_TOKENS, useLmsPublicBrand } from "@/modules/Lms/components/lms-site";
import { LmsDashboardShell, LmsPanel, useLmsCopy } from "@/modules/Lms/components/lms-dashboard-shell";
import { useLmsRole } from "@/modules/Lms/hooks/use-lms-role";
import { VideoConferencingPage } from "@/modules/video-conferencing/pages/video-conferencing-page";

/**
 * Live classes inside the learning space.
 *
 * Video Conferencing is a plan module with its own ERP screen, which only the
 * tenant Super Admin can reach. This mounts that same screen on the LMS
 * surface so a teacher can schedule a class and a learner can find and join
 * it, with joins routed through /learn/messages instead of the dashboard.
 */
export default function LearnLivePage() {
  const { brandSettings, brandName } = useLmsPublicBrand();
  const lms = useLmsCopy();
  const { role } = useLmsRole();
  const { hasModule } = useTenantModuleAccess();

  const title = lms("page.live.title", "Live classes");

  return (
    <LmsDashboardShell
      role={role}
      brandSettings={brandSettings}
      brandName={brandName}
      title={title}
      subtitle={lms("page.live.subtitle", "Schedule and join online classes.")}
      breadcrumbs={[{ label: lms("common.dashboard", "Dashboard"), href: "/learn" }, { label: title }]}
    >
      {hasModule("video_conferencing") ? (
        <VideoConferencingPage basePath="/learn/live" chatPath="/learn/messages" />
      ) : (
        <LmsPanel>
          <p style={{ color: LMS_TOKENS.muted }}>
            {lms("page.live.unavailable", "Live classes are not part of this school's plan. Ask an administrator to add Video Conferencing.")}
          </p>
          <Button asChild className="mt-5" variant="outline">
            <Link href="/learn">{lms("admin.staff.back", "Back to dashboard")}</Link>
          </Button>
        </LmsPanel>
      )}
    </LmsDashboardShell>
  );
}
