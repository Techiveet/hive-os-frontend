"use client";

import ChatLayout from "@/components/chat/chat-layout";
import { useChatAccess } from "@/hooks/use-chat-access";
import { LMS_TOKENS, useLmsPublicBrand } from "@/modules/Lms/components/lms-site";
import { LmsDashboardShell, LmsPanel, useLmsCopy } from "@/modules/Lms/components/lms-dashboard-shell";
import { useLmsRole } from "@/modules/Lms/hooks/use-lms-role";

/**
 * Messages inside the LMS shell.
 *
 * The tenant already has a working chat stack; learners just could not reach it
 * any more once /dashboard became Super-Admin-only. Rather than build a second
 * messaging system, the existing ChatLayout is mounted here on the LMS surface.
 */
export default function LearnMessagesPage() {
  const { brandSettings, brandName } = useLmsPublicBrand();
  const lms = useLmsCopy();
  const { role } = useLmsRole();
  const { hasChatWorkspace, isLoaded } = useChatAccess();

  return (
    <LmsDashboardShell
      role={role}
      brandSettings={brandSettings}
      brandName={brandName}
      title={lms("page.messages.title", "Messages")}
      subtitle={lms("page.messages.subtitle", "Talk to your instructors and classmates.")}
      breadcrumbs={[{ label: lms("common.dashboard", "Dashboard"), href: "/learn" }, { label: lms("nav.messages", "Messages") }]}
    >
      {!isLoaded ? (
        <LmsPanel>
          <p style={{ color: LMS_TOKENS.muted }}>Loading messages…</p>
        </LmsPanel>
      ) : !hasChatWorkspace ? (
        <LmsPanel>
          <p style={{ color: LMS_TOKENS.muted }}>
            Messaging is not enabled for your account. Ask an administrator if you need access.
          </p>
        </LmsPanel>
      ) : (
        <div className="h-[calc(100vh-16rem)] min-h-[32rem] overflow-hidden rounded-2xl bg-white shadow-[0_6px_24px_rgba(20,3,66,0.06)]">
          <ChatLayout />
        </div>
      )}
    </LmsDashboardShell>
  );
}
