"use client";

import { useLmsPublicBrand } from "@/modules/Lms/components/lms-site";
import { LmsDashboardShell, LmsPanel } from "@/modules/Lms/components/lms-dashboard-shell";
import { useLmsRole } from "@/modules/Lms/hooks/use-lms-role";
import { AssignmentBuilder } from "@/modules/Lms/components/assignment-builder";

export default function NewAssignmentPage() {
  const { brandSettings, brandName } = useLmsPublicBrand();
  const { canAuthor } = useLmsRole();

  return (
    <LmsDashboardShell
      role="instructor"
      brandSettings={brandSettings}
      brandName={brandName}
      title="New assignment"
      subtitle="Write the brief, then save it as a draft or publish it straight away."
      breadcrumbs={[
        { label: "Dashboard", href: "/learn" },
        { label: "Assignments", href: "/learn/assignments" },
        { label: "New" },
      ]}
    >
      {canAuthor ? (
        <AssignmentBuilder />
      ) : (
        <LmsPanel>
          <p>You do not have permission to author assignments.</p>
        </LmsPanel>
      )}
    </LmsDashboardShell>
  );
}
