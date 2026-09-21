"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";

import LearningManagementPage from "@/modules/Lms/pages/LearningManagementPage";
import { useLmsPublicBrand } from "@/modules/Lms/components/lms-site";
import {
  LmsDashboardShell,
  LmsPanel,
  useLmsCopy,
} from "@/modules/Lms/components/lms-dashboard-shell";
import { useLmsRole } from "@/modules/Lms/hooks/use-lms-role";

/** Mirrors LearningManagementPage's own tab union. */
type Tab = "overview" | "courses" | "learners" | "reports" | "my-learning";

/** English fallbacks; the Amharic comes from the lms.page.manage.* keys. */
const TITLES: Record<Tab, { key: string; label: string }> = {
  overview: { key: "page.manage.overview", label: "Course administration" },
  courses: { key: "page.manage.courses", label: "Courses" },
  learners: { key: "page.manage.learners", label: "Participants" },
  reports: { key: "page.manage.reports", label: "Reports" },
  "my-learning": { key: "page.manage.my_learning", label: "My learning" },
};

/**
 * Course administration inside the LMS shell.
 *
 * On an LMS tenant only the Super Admin may use the ERP dashboard, so the
 * authoring UI cannot live at /dashboard/learning-management for instructors
 * any more. Rather than rebuild it, the existing page is mounted here inside
 * the course-site chrome — instructors keep every capability, on their own
 * surface.
 */
function ManageContent() {
  const searchParams = useSearchParams();
  const { brandSettings, brandName } = useLmsPublicBrand();
  const lms = useLmsCopy();
  const { role, isStaff } = useLmsRole();

  const requested = (searchParams.get("tab") ?? "overview") as Tab;
  const tab: Tab = requested in TITLES ? requested : "overview";
  const heading = lms(TITLES[tab].key, TITLES[tab].label);

  return (
    <LmsDashboardShell
      role={role}
      brandSettings={brandSettings}
      brandName={brandName}
      title={heading}
      subtitle={lms(
        "page.manage.subtitle",
        "Create courses and lessons, enrol learners, and follow their progress.",
      )}
      breadcrumbs={[
        { label: lms("common.dashboard", "Dashboard"), href: "/learn" },
        { label: heading },
      ]}
    >
      {isStaff ? (
        // The inner page carries its own cards and spacing, so it sits directly
        // in the content well rather than inside another panel.
        <LearningManagementPage initialTab={tab} />
      ) : (
        <LmsPanel>
          <p>You do not have permission to administer courses.</p>
        </LmsPanel>
      )}
    </LmsDashboardShell>
  );
}

export default function LearnManagePage() {
  return (
    <React.Suspense fallback={null}>
      <ManageContent />
    </React.Suspense>
  );
}
