"use client";

import * as React from "react";
import { useParams, useSearchParams } from "next/navigation";

import { getBackendApiRoot } from "@/lib/runtime-context";

/**
 * Public document-verification page. The QR code printed on an inventory
 * document (delivery note, PO, dispatch, …) points here. It is unauthenticated
 * by design — anyone holding the printed document can confirm it is genuine —
 * and shows only the authenticity-safe facts the backend chooses to expose.
 */

type VerifyResult = {
  valid: boolean;
  message?: string;
  type_label?: string;
  document_number?: string;
  title?: string;
  status?: string;
  issued_at?: string;
  approved_at?: string;
  issuer?: string;
};

const fieldLabels: Record<string, string> = {
  type_label: "Document type",
  document_number: "Document number",
  title: "Title",
  status: "Status",
  issued_at: "Issued",
  approved_at: "Approved",
  issuer: "Issued by",
};

export default function InventoryDocumentVerifyPage() {
  const params = useParams<{ resource: string; id: string }>();
  const search = useSearchParams();
  const resource = String(params?.resource ?? "");
  const id = String(params?.id ?? "");

  const [state, setState] = React.useState<"loading" | "valid" | "invalid" | "error">("loading");
  const [data, setData] = React.useState<VerifyResult | null>(null);

  React.useEffect(() => {
    const t = search.get("t") ?? "";
    const signature = search.get("signature") ?? "";
    const url = `${getBackendApiRoot()}/public/inventory/verify/${encodeURIComponent(resource)}/${encodeURIComponent(id)}?t=${encodeURIComponent(t)}&signature=${encodeURIComponent(signature)}`;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        // The endpoint answers with JSON for both success and rejection; only a
        // transport/parse failure lands in catch.
        const body: VerifyResult = await res.json().catch(() => ({ valid: false }));
        if (cancelled) return;
        if (res.ok && body.valid) {
          setData(body);
          setState("valid");
        } else {
          setData(body);
          setState("invalid");
        }
      } catch {
        if (!cancelled) setState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [resource, id, search]);

  const rows: Array<[string, string]> = data
    ? (["type_label", "document_number", "title", "status", "issued_at", "approved_at", "issuer"] as const)
        .filter((k) => data[k])
        .map((k) => [fieldLabels[k], String(data[k])])
    : [];

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "radial-gradient(1200px 600px at 50% -10%, #16321a 0%, #0b0d0a 55%, #07080a 100%)",
        color: "#e9f1e4",
        fontFamily:
          "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          background: "rgba(18,22,15,0.92)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20,
          boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "22px 24px 6px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontWeight: 800, letterSpacing: "-0.02em", fontSize: 18 }}>HIVE</span>
          <span style={{ fontWeight: 800, color: "#c6ff3a", fontSize: 18 }}>OS</span>
          <span style={{ marginLeft: "auto", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8a9683" }}>
            Document check
          </span>
        </div>

        <div style={{ padding: "18px 24px 28px" }}>
          {state === "loading" && (
            <Status icon="…" tint="#8a9683" title="Verifying document…" subtitle="Checking the signature with HIVE.OS." />
          )}

          {state === "valid" && (
            <>
              <Status icon="✓" tint="#8CE99A" title="Document verified" subtitle="This document was issued by HIVE.OS and has not been tampered with." />
              <dl style={{ marginTop: 20, display: "grid", gap: 0 }}>
                {rows.map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 16,
                      padding: "11px 0",
                      borderTop: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <dt style={{ color: "#8a9683", fontSize: 13 }}>{label}</dt>
                    <dd style={{ margin: 0, fontWeight: 600, fontSize: 14, textAlign: "right", wordBreak: "break-word" }}>
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          )}

          {state === "invalid" && (
            <Status
              icon="✕"
              tint="#FF8A8A"
              title="Could not verify this document"
              subtitle={data?.message || "The verification link is invalid, expired, or has been altered. Do not trust this document."}
            />
          )}

          {state === "error" && (
            <Status
              icon="!"
              tint="#FFC86B"
              title="Verification unavailable"
              subtitle="We couldn't reach the verification service. Please check your connection and try again."
            />
          )}
        </div>
      </div>
    </main>
  );
}

function Status({ icon, tint, title, subtitle }: { icon: string; tint: string; title: string; subtitle: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          width: 68,
          height: 68,
          margin: "6px auto 14px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 34,
          fontWeight: 800,
          color: "#0b0d0a",
          background: tint,
          boxShadow: `0 0 0 8px ${tint}22, 0 0 34px ${tint}55`,
        }}
        aria-hidden
      >
        {icon}
      </div>
      <h1 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 800 }}>{title}</h1>
      <p style={{ margin: 0, color: "#a7b29d", fontSize: 13.5, lineHeight: 1.55 }}>{subtitle}</p>
    </div>
  );
}
