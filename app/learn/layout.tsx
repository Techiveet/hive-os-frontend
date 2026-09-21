import AuthGuard from "@/components/auth/auth-guard";
import { BrandSyncProvider } from "@/components/providers/brand-sync-provider";
import { SessionTimeoutProvider } from "@/components/providers/session-timeout-provider";
import { TranslationProvider } from "@/components/providers/translation-provider";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Learning",
  description: "Courses, progress and assessments",
};

/**
 * Signed-in LMS experience, styled after the lms2 (Educrat) template.
 *
 * Deliberately a sibling of /dashboard rather than a child of it: that layout
 * wraps everything in DashboardShell (the ERP sidebar + header), so nesting the
 * LMS chrome underneath would render two sidebars and two headers. Keeping the
 * routes separate also stops the education theme leaking onto the HR, inventory
 * and hospitality screens, which share /dashboard.
 *
 * The providers that actually matter for an authenticated tenant page are kept:
 * auth gating, tenant branding, translations and the idle-session timeout.
 */
export default function LearnLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <BrandSyncProvider />
      <TranslationProvider>
        <SessionTimeoutProvider>{children}</SessionTimeoutProvider>
      </TranslationProvider>
    </AuthGuard>
  );
}
