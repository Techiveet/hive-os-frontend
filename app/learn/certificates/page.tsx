"use client";

import Link from "next/link";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, Loader2, Printer, ShieldCheck, ShieldX } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { learningApi, type LmsCertificate } from "@/modules/Lms/api";
import { LMS_TOKENS, useLmsPublicBrand } from "@/modules/Lms/components/lms-site";
import { LmsDashboardShell, LmsPanel, useLmsCopy } from "@/modules/Lms/components/lms-dashboard-shell";
import { useLmsRole } from "@/modules/Lms/hooks/use-lms-role";

const errorText = (error: unknown): string =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Something went wrong.";

const formatDate = (value: string) => new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

/** Learners see and print their own certificates; staff see every one and can withdraw them. */
export default function CertificatesPage() {
  const { brandSettings, brandName } = useLmsPublicBrand();
  const lms = useLmsCopy();
  const { role, isStaff } = useLmsRole();
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState("");

  const mine = useQuery({
    queryKey: ["lms", "certificates", "mine"],
    queryFn: learningApi.getMyCertificates,
    enabled: !isStaff,
  });
  const all = useQuery({
    queryKey: ["lms", "certificates", "all", search],
    queryFn: () => learningApi.listCertificates({ search: search.trim() || undefined }),
    enabled: isStaff,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["lms", "certificates"] });

  const revoke = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => learningApi.revokeCertificate(id, reason),
    onSuccess: () => {
      toast.success("Certificate withdrawn.");
      refresh();
    },
    onError: (error) => toast.error(errorText(error)),
  });
  const reinstate = useMutation({
    mutationFn: (id: string) => learningApi.reinstateCertificate(id),
    onSuccess: () => {
      toast.success("Certificate reinstated.");
      refresh();
    },
    onError: (error) => toast.error(errorText(error)),
  });

  const certificates: LmsCertificate[] = (isStaff ? all.data?.data : mine.data) ?? [];
  const loading = isStaff ? all.isPending : mine.isPending;

  const onRevoke = (certificate: LmsCertificate) => {
    const reason = window.prompt(`Withdraw ${certificate.learner_name}'s certificate for "${certificate.course_title}"? Why?`, "");
    if (reason && reason.trim().length >= 3) revoke.mutate({ id: certificate.id, reason: reason.trim() });
  };

  return (
    <LmsDashboardShell
      role={role}
      brandSettings={brandSettings}
      brandName={brandName}
      title={lms("page.certificates.title", "Certificates")}
      subtitle={
        isStaff
          ? lms("page.certificates.subtitle_staff", "Every certificate issued. Anyone can verify one with its code.")
          : lms("page.certificates.subtitle_learner", "Proof of the courses you have completed.")
      }
      breadcrumbs={[{ label: lms("common.dashboard", "Dashboard"), href: "/learn" }, { label: lms("nav.certificates", "Certificates") }]}
    >
      <LmsPanel
        title={isStaff ? "All certificates" : "My certificates"}
        action={
          isStaff ? (
            <Input
              className="h-9 w-64"
              placeholder="Search name, course or code"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search certificates"
            />
          ) : undefined
        }
      >
        {loading ? (
          <p className="py-6" style={{ color: LMS_TOKENS.muted }}>
            <Loader2 className="mr-2 inline size-4 animate-spin" aria-hidden="true" />
            Loading certificates…
          </p>
        ) : certificates.length === 0 ? (
          <div className="py-10 text-center">
            <Award className="mx-auto size-10" style={{ color: LMS_TOKENS.muted }} aria-hidden="true" />
            <p className="mt-3" style={{ color: LMS_TOKENS.muted }}>
              {isStaff
                ? "No certificates have been issued yet."
                : "No certificates yet. Finish a course - its lessons and any required quizzes - and your certificate appears here."}
            </p>
          </div>
        ) : (
          <ul className="divide-y" style={{ borderColor: "#E9EAF3" }}>
            {certificates.map((certificate) => (
              <li key={certificate.id} className="flex flex-wrap items-center gap-4 py-4">
                <span
                  className="grid size-11 shrink-0 place-items-center rounded-full"
                  style={{ backgroundColor: certificate.valid ? `${LMS_TOKENS.green}26` : "#FEE2E2", color: certificate.valid ? LMS_TOKENS.greenDark : "#DC2626" }}
                >
                  {certificate.valid ? <ShieldCheck className="size-5" aria-hidden="true" /> : <ShieldX className="size-5" aria-hidden="true" />}
                </span>
                <div className="min-w-[200px] flex-1">
                  <p className="text-[16px] font-bold" style={{ color: LMS_TOKENS.navy }}>{certificate.course_title}</p>
                  <p className="text-sm" style={{ color: LMS_TOKENS.muted }}>
                    {isStaff ? `${certificate.learner_name} · ` : ""}
                    {formatDate(certificate.issued_at)}
                    {certificate.score !== null ? ` · score ${certificate.score}%` : ""} · {certificate.code}
                  </p>
                  {!certificate.valid ? (
                    <p className="text-sm text-red-600">Withdrawn{certificate.revoked_reason ? `: ${certificate.revoked_reason}` : ""}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {certificate.valid ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/learn/certificates/${certificate.id}`}>
                        <Printer className="size-4" aria-hidden="true" /> View / print
                      </Link>
                    </Button>
                  ) : null}
                  {isStaff && certificate.valid ? (
                    <Button size="sm" variant="outline" disabled={revoke.isPending} onClick={() => onRevoke(certificate)}>
                      Withdraw
                    </Button>
                  ) : null}
                  {isStaff && !certificate.valid ? (
                    <Button size="sm" variant="outline" disabled={reinstate.isPending} onClick={() => reinstate.mutate(certificate.id)}>
                      Reinstate
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </LmsPanel>
    </LmsDashboardShell>
  );
}
