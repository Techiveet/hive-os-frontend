"use client";

import Link from "next/link";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, KeyRound, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { learningApi, type LmsCreatedStaff, type LmsStaffRole } from "@/modules/Lms/api";
import { LMS_TOKENS, useLmsPublicBrand } from "@/modules/Lms/components/lms-site";
import {
  LmsDashboardShell,
  LmsPanel,
  useLmsCopy,
} from "@/modules/Lms/components/lms-dashboard-shell";
import { useLmsRole } from "@/modules/Lms/hooks/use-lms-role";

function apiMessage(error: unknown, fallback: string) {
  const response = (error as { response?: { data?: { message?: string } } })?.response?.data;
  return response?.message ?? fallback;
}

/**
 * Where an LMS tenant staffs itself.
 *
 * Teachers and teaching assistants used to be created from the ERP Security
 * screen, which only the tenant Super Admin could open — so a Learning
 * Administrator had no way to add the people who teach. This is the same
 * action, inside the LMS, limited to the two teaching roles.
 */
export default function StaffPage() {
  const { brandSettings, brandName } = useLmsPublicBrand();
  const lms = useLmsCopy();
  const { role, canManageStaff } = useLmsRole();
  const queryClient = useQueryClient();

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [staffRole, setStaffRole] = React.useState<LmsStaffRole>("Teacher");
  const [created, setCreated] = React.useState<LmsCreatedStaff | null>(null);

  const staff = useQuery({
    queryKey: ["lms", "staff"],
    queryFn: () => learningApi.getStaff(),
    enabled: canManageStaff,
  });

  const create = useMutation({
    mutationFn: () => learningApi.createStaff({ name: name.trim(), email: email.trim(), role: staffRole }),
    onSuccess: (result) => {
      setCreated(result.data);
      setName("");
      setEmail("");
      queryClient.invalidateQueries({ queryKey: ["lms", "staff"] });
    },
    onError: (error) =>
      toast.error(apiMessage(error, lms("admin.staff.toast.create_failed", "The account could not be created."))),
  });

  const title = lms("admin.staff.title", "Staff");
  const breadcrumbs = [
    { label: lms("common.dashboard", "Dashboard"), href: "/learn" },
    { label: title },
  ];

  if (!canManageStaff) {
    return (
      <LmsDashboardShell role={role} brandSettings={brandSettings} brandName={brandName} title={title} breadcrumbs={breadcrumbs}>
        <LmsPanel>
          <p style={{ color: LMS_TOKENS.muted }}>
            {lms("admin.staff.no_permission", "You do not have permission to manage staff.")}
          </p>
          <Button asChild className="mt-5" variant="outline">
            <Link href="/learn">{lms("admin.staff.back", "Back to dashboard")}</Link>
          </Button>
        </LmsPanel>
      </LmsDashboardShell>
    );
  }

  const copyPassword = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.temporary_password);
      toast.success(lms("admin.staff.copied", "Temporary password copied."));
    } catch {
      toast.error(lms("admin.staff.copy_failed", "Could not copy. Select the password and copy it by hand."));
    }
  };

  const rows = staff.data ?? [];

  return (
    <LmsDashboardShell
      role={role}
      brandSettings={brandSettings}
      brandName={brandName}
      title={title}
      subtitle={lms("admin.staff.subtitle", "Add the teachers and teaching assistants who run your courses.")}
      breadcrumbs={breadcrumbs}
    >
      <div className="grid gap-7 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <LmsPanel title={lms("admin.staff.add", "Add a staff member")}>
          {created ? (
            <div className="space-y-4">
              <p className="text-sm" style={{ color: LMS_TOKENS.navy }}>
                {lms("admin.staff.created_for", "Account created for")} <strong>{created.name}</strong> ({created.role}).
              </p>
              <div className="rounded-xl border p-4" style={{ borderColor: LMS_TOKENS.border }}>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: LMS_TOKENS.muted }}>
                  <KeyRound className="size-3.5" aria-hidden="true" />
                  {lms("admin.staff.temp_password", "Temporary password")}
                </p>
                <p className="mt-2 break-all font-mono text-base font-semibold" style={{ color: LMS_TOKENS.navy }}>
                  {created.temporary_password}
                </p>
                <Button type="button" variant="outline" size="sm" className="mt-3" onClick={copyPassword}>
                  <Copy className="mr-2 size-4" aria-hidden="true" />
                  {lms("admin.staff.copy", "Copy")}
                </Button>
              </div>
              <p className="text-xs" style={{ color: LMS_TOKENS.muted }}>
                {lms(
                  "admin.staff.once",
                  "This is shown once. Give it to them securely — they will be asked to choose their own password the first time they sign in.",
                )}
              </p>
              <Button type="button" onClick={() => setCreated(null)}>
                {lms("admin.staff.add_another", "Add another")}
              </Button>
            </div>
          ) : (
            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                create.mutate();
              }}
            >
              <div className="grid gap-2">
                <Label htmlFor="staff-name">{lms("admin.staff.name", "Full name")}</Label>
                <Input id="staff-name" required value={name} onChange={(e) => setName(e.target.value)} disabled={create.isPending} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="staff-email">{lms("admin.staff.email", "Email")}</Label>
                <Input id="staff-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={create.isPending} />
              </div>
              <div className="grid gap-2">
                <Label>{lms("admin.staff.role", "Role")}</Label>
                <Select value={staffRole} onValueChange={(value) => setStaffRole(value as LmsStaffRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Teacher">{lms("admin.staff.role_teacher", "Teacher — builds and runs courses")}</SelectItem>
                    <SelectItem value="Teaching Assistant">{lms("admin.staff.role_assistant", "Teaching Assistant — marks work, watches the cohort")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={create.isPending} className="w-full">
                <UserPlus className="mr-2 size-4" aria-hidden="true" />
                {create.isPending ? lms("admin.staff.creating", "Creating…") : lms("admin.staff.create", "Create account")}
              </Button>
            </form>
          )}
        </LmsPanel>

        <LmsPanel title={lms("admin.staff.current", "Current staff")} bodyClassName="p-0">
          {staff.isLoading ? (
            <p className="p-7 text-sm" style={{ color: LMS_TOKENS.muted }}>{lms("common.loading", "Loading…")}</p>
          ) : rows.length === 0 ? (
            <p className="p-7 text-sm" style={{ color: LMS_TOKENS.muted }}>
              {lms("admin.staff.empty", "No teachers or assistants yet. Add the first one.")}
            </p>
          ) : (
            <ul>
              {rows.map((member) => (
                <li key={member.id} className="flex flex-wrap items-center justify-between gap-2 px-7 py-4" style={{ borderTop: `1px solid ${LMS_TOKENS.border}` }}>
                  <div>
                    <p className="font-medium" style={{ color: LMS_TOKENS.navy }}>{member.name}</p>
                    <p className="text-sm" style={{ color: LMS_TOKENS.muted }}>{member.email}</p>
                  </div>
                  <div className="text-right text-xs" style={{ color: LMS_TOKENS.muted }}>
                    <p className="font-semibold" style={{ color: LMS_TOKENS.navy }}>{member.role}</p>
                    <p>
                      {!member.is_active
                        ? lms("admin.staff.inactive", "Inactive")
                        : member.must_change_password
                          ? lms("admin.staff.invited", "Hasn't signed in yet")
                          : lms("admin.staff.active", "Active")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </LmsPanel>
      </div>
    </LmsDashboardShell>
  );
}
