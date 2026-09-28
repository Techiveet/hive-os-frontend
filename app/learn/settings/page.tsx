"use client";

import { safeLocalStorageSetItem } from '@/lib/safe-storage';


import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/modules/shared/api/http";
import { isTenantSession } from "@/lib/runtime-context";
import { LMS_TOKENS, useLmsPublicBrand } from "@/modules/Lms/components/lms-site";
import { LmsDashboardShell, LmsPanel, useLmsCopy } from "@/modules/Lms/components/lms-dashboard-shell";
import { useLmsRole } from "@/modules/Lms/hooks/use-lms-role";

type Tab = "profile" | "password";

function apiMessage(error: unknown, fallback: string) {
  const response = (error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })
    ?.response?.data;
  const firstFieldError = response?.errors ? Object.values(response.errors)[0]?.[0] : undefined;
  return firstFieldError ?? response?.message ?? fallback;
}

export default function LearnSettingsPage() {
  const { brandSettings, brandName } = useLmsPublicBrand();
  const lms = useLmsCopy();
  const { role } = useLmsRole();

  const [tab, setTab] = React.useState<Tab>("profile");

  // Seeded from the session the guard already keeps fresh.
  const stored = React.useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      return JSON.parse(window.localStorage.getItem("hive_user") ?? "null") as
        | { name?: string; email?: string; phone_number?: string | null }
        | null;
    } catch {
      return null;
    }
  }, []);

  const [name, setName] = React.useState(stored?.name ?? "");
  const [phone, setPhone] = React.useState(stored?.phone_number ?? "");

  const [currentPassword, setCurrentPassword] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [passwordConfirmation, setPasswordConfirmation] = React.useState("");

  const saveProfile = useMutation({
    mutationFn: () =>
      api.post("/profile/update", { name: name.trim(), phone_number: phone || null }),
    onSuccess: () => {
      // Keep the header/avatar in step without a reload.
      try {
        const raw = window.localStorage.getItem("hive_user");
        if (raw) {
          const next = { ...JSON.parse(raw), name: name.trim(), phone_number: phone || null };
          safeLocalStorageSetItem("hive_user", JSON.stringify(next));
          window.dispatchEvent(new Event("hive_session_changed"));
        }
      } catch {
        /* a stale header is not worth failing the save over */
      }
      toast.success("Profile updated.");
    },
    onError: (error) => toast.error(apiMessage(error, "Your profile could not be saved.")),
  });

  const changePassword = useMutation({
    mutationFn: () =>
      api.post(isTenantSession() ? "/tenant/change-password" : "/change-password", {
        current_password: currentPassword,
        password,
        password_confirmation: passwordConfirmation,
      }),
    onSuccess: () => {
      setCurrentPassword("");
      setPassword("");
      setPasswordConfirmation("");
      toast.success("Password changed.");
    },
    onError: (error) => toast.error(apiMessage(error, "Your password could not be changed.")),
  });

  /**
   * The same rule the server enforces (min 8, mixed case, a number, a symbol).
   * Kept in step deliberately: gating only on length enabled the button for
   * passwords the API then rejected, so the form promised a save it could not
   * make. The server remains the authority — this only decides when to offer
   * the button.
   */
  const passwordMeetsPolicy =
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password);

  const passwordsMatch = password.length > 0 && password === passwordConfirmation;

  const passwordReady = currentPassword.length > 0 && passwordMeetsPolicy && passwordsMatch;

  return (
    <LmsDashboardShell
      role={role}
      brandSettings={brandSettings}
      brandName={brandName}
      title={lms("page.settings.title", "Settings")}
      subtitle={lms("page.settings.subtitle", "Your details and your sign-in password.")}
      breadcrumbs={[{ label: lms("common.dashboard", "Dashboard"), href: "/learn" }, { label: lms("nav.settings", "Settings") }]}
    >
      <LmsPanel bodyClassName="px-0 py-0">
        <div
          className="flex items-center gap-8 px-7 pt-5"
          style={{ borderBottom: `1px solid ${LMS_TOKENS.border}` }}
          role="tablist"
        >
          {([
            { key: "profile", label: "Profile" },
            { key: "password", label: "Password" },
          ] as const).map((entry) => {
            const active = entry.key === tab;
            return (
              <button
                key={entry.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(entry.key)}
                className="relative pb-4 text-[15px] transition"
                style={{ color: active ? LMS_TOKENS.purple : LMS_TOKENS.muted }}
              >
                {entry.label}
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-px h-0.5 rounded-full"
                    style={{ backgroundColor: LMS_TOKENS.purple }}
                  />
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="max-w-xl px-7 py-8">
          {tab === "profile" ? (
            <form
              className="flex flex-col gap-5"
              onSubmit={(event) => {
                event.preventDefault();
                saveProfile.mutate();
              }}
            >
              <div>
                <Label htmlFor="settings-name">Full name</Label>
                <Input
                  id="settings-name"
                  className="mt-2"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="settings-email">Email address</Label>
                <Input id="settings-email" className="mt-2" value={stored?.email ?? ""} disabled />
                <p className="mt-1.5 text-[13px]" style={{ color: LMS_TOKENS.muted }}>
                  Ask an administrator to change the address your account signs in with.
                </p>
              </div>

              <div>
                <Label htmlFor="settings-phone">Phone</Label>
                <Input
                  id="settings-phone"
                  className="mt-2"
                  value={phone ?? ""}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </div>

              <Button
                type="submit"
                className="mt-2 self-start"
                disabled={saveProfile.isPending || !name.trim()}
                style={{ backgroundColor: LMS_TOKENS.purple }}
              >
                {saveProfile.isPending ? "Saving…" : "Save changes"}
              </Button>
            </form>
          ) : (
            <form
              className="flex flex-col gap-5"
              onSubmit={(event) => {
                event.preventDefault();
                changePassword.mutate();
              }}
            >
              <div>
                <Label htmlFor="settings-current">Current password</Label>
                <Input
                  id="settings-current"
                  type="password"
                  className="mt-2"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="settings-new">New password</Label>
                <Input
                  id="settings-new"
                  type="password"
                  className="mt-2"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                {/* Turns red once what is typed falls short, so a disabled
                    button always has a visible reason next to it. */}
                <p
                  className="mt-1.5 text-[13px]"
                  style={{
                    color: password && !passwordMeetsPolicy ? "#DC2626" : LMS_TOKENS.muted,
                  }}
                >
                  At least 8 characters, with upper and lower case, a number and a symbol.
                </p>
              </div>

              <div>
                <Label htmlFor="settings-confirm">Confirm new password</Label>
                <Input
                  id="settings-confirm"
                  type="password"
                  className="mt-2"
                  autoComplete="new-password"
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                />
                {passwordConfirmation && password !== passwordConfirmation ? (
                  <p className="mt-1.5 text-[13px]" style={{ color: "#DC2626" }}>
                    Both entries must match.
                  </p>
                ) : null}
              </div>

              <Button
                type="submit"
                className="mt-2 self-start"
                disabled={changePassword.isPending || !passwordReady}
                style={{ backgroundColor: LMS_TOKENS.purple }}
              >
                {changePassword.isPending ? "Saving…" : "Change password"}
              </Button>
            </form>
          )}
        </div>
      </LmsPanel>
    </LmsDashboardShell>
  );
}
