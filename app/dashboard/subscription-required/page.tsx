"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LockKeyhole, Layers, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/use-permissions";
import { isTenantSession } from "@/lib/runtime-context";

export default function SubscriptionRequiredPage() {
  const searchParams = useSearchParams();
  const reasonParam = searchParams.get("reason");
  const isPermissionDenial = reasonParam === "permission";

  const { hasPermission, hasAnyPermission } = usePermissions();
  const canOpenDashboard = hasPermission("view_system_dashboard");
  const canManageSubscriptions =
    isTenantSession() &&
    hasAnyPermission(["manage_module_subscriptions", "view_module_subscriptions"]);
  const canOpenProfile = hasAnyPermission(["view_profile", "edit_profile"]);

  const title = isPermissionDenial ? "Access Denied" : "Subscription Required";
  const description = isPermissionDenial
    ? "You do not have permission to open that page. Ask an administrator to grant the right clearance for your role."
    : "This workspace does not currently include the module or feature needed for that page. Ask a tenant administrator to activate it, or renew the tenant subscription if it has expired.";

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4">
      <section className="w-full max-w-xl rounded-2xl border border-border/60 bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {isPermissionDenial ? (
            <ShieldAlert className="h-7 w-7" />
          ) : (
            <LockKeyhole className="h-7 w-7" />
          )}
        </div>
        <h1 className="mt-5 text-2xl font-black tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          {canOpenDashboard ? (
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          ) : canOpenProfile ? (
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/dashboard/profile">Go to Profile</Link>
            </Button>
          ) : (
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/sign-in">Sign in again</Link>
            </Button>
          )}
          {!isPermissionDenial && canManageSubscriptions ? (
            <Button asChild className="rounded-full">
              <Link href="/dashboard/subscriptions">
                <Layers className="mr-2 h-4 w-4" />
                Manage Subscription
              </Link>
            </Button>
          ) : null}
        </div>
      </section>
    </main>
  );
}
