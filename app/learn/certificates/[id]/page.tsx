"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { learningApi } from "@/modules/Lms/api";
import { LMS_TOKENS, useLmsPublicBrand } from "@/modules/Lms/components/lms-site";


export default function CertificatePrintPage() {
  const params = useParams<{ id: string }>();
  const { brandName } = useLmsPublicBrand();

  const certificate = useQuery({
    queryKey: ["lms", "certificate", params.id],
    queryFn: () => learningApi.getCertificate(params.id),
    enabled: Boolean(params.id),
  });

  const data = certificate.data;
  const verifyUrl = data && typeof window !== "undefined" ? `${window.location.origin}/verify-certificate/${data.code}` : "";

  return (
    <main className="min-h-screen bg-[#F7F8FB] px-4 py-8 print:bg-white print:p-0">
      <style>{`@media print { @page { size: A4 landscape; margin: 0; } }`}</style>

      <div className="mx-auto mb-6 flex max-w-4xl items-center justify-between print:hidden">
        <Button asChild variant="ghost">
          <Link href="/learn/certificates">
            <ArrowLeft className="size-4" aria-hidden="true" /> Back
          </Link>
        </Button>
        <Button onClick={() => window.print()} disabled={!data?.valid}>
          <Printer className="size-4" aria-hidden="true" /> Print / save as PDF
        </Button>
      </div>

      {certificate.isPending ? (
        <p className="text-center" style={{ color: LMS_TOKENS.muted }}>Loading certificate…</p>
      ) : !data ? (
        <p className="text-center text-red-600">This certificate could not be opened.</p>
      ) : !data.valid ? (
        <p className="text-center text-red-600">This certificate was withdrawn{data.revoked_reason ? `: ${data.revoked_reason}` : "."}</p>
      ) : (
        <section
          className="mx-auto flex aspect-[1.414/1] max-w-4xl flex-col items-center justify-center rounded-3xl border-[10px] bg-white p-10 text-center shadow-xl print:max-w-none print:rounded-none print:shadow-none"
          style={{ borderColor: LMS_TOKENS.navy }}
        >
          <p className="text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: LMS_TOKENS.muted }}>{brandName}</p>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl" style={{ color: LMS_TOKENS.navy }}>Certificate of Completion</h1>
          <p className="mt-8 text-base" style={{ color: LMS_TOKENS.muted }}>This certifies that</p>
          <p className="mt-3 text-3xl font-bold sm:text-4xl" style={{ color: LMS_TOKENS.navy }}>{data.learner_name}</p>
          <p className="mt-6 text-base" style={{ color: LMS_TOKENS.muted }}>has successfully completed</p>
          <p className="mt-3 max-w-2xl text-2xl font-semibold sm:text-3xl" style={{ color: LMS_TOKENS.navy }}>{data.course_title}</p>
          <p className="mt-8 text-sm" style={{ color: LMS_TOKENS.muted }}>
            {new Date(data.issued_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
            {data.score !== null ? ` · score ${data.score}%` : ""}
          </p>
          <p className="mt-6 text-xs" style={{ color: LMS_TOKENS.muted }}>
            Certificate {data.code}
            {verifyUrl ? <> · verify at <span className="break-all">{verifyUrl}</span></> : null}
          </p>
        </section>
      )}
    </main>
  );
}
