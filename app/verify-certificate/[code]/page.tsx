"use client";

import { useParams } from "next/navigation";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ShieldCheck, ShieldX } from "lucide-react";

import { publicLearningApi } from "@/modules/Lms/api";
import { LMS_TOKENS } from "@/modules/Lms/components/lms-site";

/** Public page: confirms whether a certificate code is genuine. No sign-in needed. */
export default function VerifyCertificatePage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params.code ?? "");

  const check = useQuery({
    queryKey: ["lms", "verify-certificate", code],
    queryFn: () => publicLearningApi.verifyCertificate(code),
    enabled: code !== "",
    retry: false,
  });

  const data = check.data;

  return (
    <main className="grid min-h-screen place-items-center bg-[#F7F8FB] px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl border border-black/5 bg-white p-8 text-center shadow-2xl">
        <h1 className="text-2xl font-bold" style={{ color: LMS_TOKENS.navy }}>Certificate check</h1>
        <p className="mt-1 text-sm" style={{ color: LMS_TOKENS.muted }}>{code}</p>

        {check.isPending ? (
          <p className="mt-8" style={{ color: LMS_TOKENS.muted }}>
            <Loader2 className="mr-2 inline size-4 animate-spin" aria-hidden="true" /> Checking…
          </p>
        ) : check.isError || !data ? (
          <div className="mt-8">
            <ShieldX className="mx-auto size-12 text-red-600" aria-hidden="true" />
            <p className="mt-3 font-semibold text-red-600">No certificate matches this code.</p>
            <p className="mt-1 text-sm" style={{ color: LMS_TOKENS.muted }}>Check the code for typing mistakes and try again.</p>
          </div>
        ) : data.valid ? (
          <div className="mt-8">
            <ShieldCheck className="mx-auto size-12" style={{ color: LMS_TOKENS.greenDark }} aria-hidden="true" />
            <p className="mt-3 text-lg font-semibold" style={{ color: LMS_TOKENS.greenDark }}>This certificate is genuine.</p>
            <dl className="mt-6 space-y-3 text-left text-[15px]">
              <div><dt className="text-xs uppercase tracking-wide" style={{ color: LMS_TOKENS.muted }}>Awarded to</dt><dd className="font-semibold" style={{ color: LMS_TOKENS.navy }}>{data.learner_name}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide" style={{ color: LMS_TOKENS.muted }}>Course</dt><dd className="font-semibold" style={{ color: LMS_TOKENS.navy }}>{data.course_title}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide" style={{ color: LMS_TOKENS.muted }}>Issued</dt><dd style={{ color: LMS_TOKENS.navy }}>{new Date(data.issued_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</dd></div>
              {data.score !== null ? (
                <div><dt className="text-xs uppercase tracking-wide" style={{ color: LMS_TOKENS.muted }}>Score</dt><dd style={{ color: LMS_TOKENS.navy }}>{data.score}%</dd></div>
              ) : null}
            </dl>
          </div>
        ) : (
          <div className="mt-8">
            <ShieldX className="mx-auto size-12 text-red-600" aria-hidden="true" />
            <p className="mt-3 text-lg font-semibold text-red-600">This certificate has been withdrawn.</p>
            <p className="mt-1 text-sm" style={{ color: LMS_TOKENS.muted }}>
              It was issued to {data.learner_name} for {data.course_title}, but is no longer valid.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
