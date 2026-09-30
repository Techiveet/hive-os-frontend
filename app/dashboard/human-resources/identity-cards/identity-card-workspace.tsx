"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import {
  BadgeCheck,
  Ban,
  CheckCircle2,
  Copy,
  FileClock,
  History,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  getAuthHeaders,
  getBackendApiRoot,
  getBackendOrigin,
  getBackendStorageUrl,
  getWorkspaceScopeKey,
} from "@/lib/runtime-context";
import { SecureAssetImage } from "@/components/ui/secure-asset-image";
import {
  deleteIdentityCardTemplate,
  duplicateIdentityCardTemplate,
  fetchEligibleIdentityEmployees,
  fetchIdentityCards,
  fetchIdentityCardTemplates,
  fetchIdentityCardWorkspace,
  IDENTITY_CARD_FIELDS,
  issueIdentityCards,
  renewIdentityCard,
  revokeIdentityCard,
  saveIdentityCardTemplate,
  verifyIdentityCard,
  type EmployeeIdentityCard,
  type IdentityCardField,
  type IdentityCardTemplate,
  type IdentityCardTemplatePayload,
  type IdentityCardVerification,
} from "@/modules/humanresources/identity-cards";

const today = () => new Date().toISOString().slice(0, 10);
const fieldLabel = (field: string) =>
  field.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const emptyTemplate: IdentityCardTemplatePayload = {
  code: "",
  name: "",
  description: "",
  card_type: "employee",
  orientation: "landscape",
  width_mm: 85.6,
  height_mm: 53.98,
  primary_color: "#0F172A",
  accent_color: "#D97706",
  text_color: "#FFFFFF",
  front_fields: [
    "organization_name",
    "photo",
    "primary_name",
    "employee_number",
    "position",
    "organization_unit",
    "expires_on",
    "qr_code",
  ],
  back_fields: [
    "card_number",
    "issued_on",
    "expires_on",
    "work_email",
    "verification_instructions",
    "qr_code",
  ],
  validity_months: 24,
  is_default: false,
  is_active: true,
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The request could not be completed.";
}

function StatusBadge({ status }: { status: EmployeeIdentityCard["effective_status"] }) {
  const styles = {
    active: "border-emerald-300 bg-emerald-50 text-emerald-800",
    expired: "border-amber-300 bg-amber-50 text-amber-900",
    revoked: "border-red-300 bg-red-50 text-red-800",
    replaced: "border-slate-300 bg-slate-100 text-slate-700",
  };
  return (
    <Badge variant="outline" className={styles[status]}>
      {fieldLabel(status)}
    </Badge>
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

type CardPreviewModel = {
  template: Pick<
    IdentityCardTemplate,
    | "orientation"
    | "width_mm"
    | "height_mm"
    | "primary_color"
    | "accent_color"
    | "text_color"
    | "front_fields"
    | "back_fields"
    | "card_type"
  >;
  organizationName: string;
  organizationLogoUrl: string | null;
  name: string;
  preferredName: string | null;
  number: string;
  role: string;
  unit: string;
  workEmail: string | null;
  phone: string | null;
  hiredOn: string | null;
  cardNumber: string;
  issuedOn: string;
  expiresOn: string;
  verificationValue: string;
  initials: string;
  photoUrl: string | null;
};

function resolveMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const trimmed = path.trim();
  if (!trimmed) return null;

  // Already a usable absolute/relative serve URL (including signed shared-serve).
  if (
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:") ||
    trimmed.includes("/api/v1/files/") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    if (trimmed.includes("/api/v1/files/")) {
      const idx = trimmed.indexOf("/api/v1/files/");
      return trimmed.substring(idx);
    }
    return trimmed;
  }

  return getBackendStorageUrl(trimmed) ?? trimmed;
}

async function resolvePrintableImageUrl(
  path: string | null | undefined,
): Promise<string | null> {
  const resolved = resolveMediaUrl(path);
  if (!resolved) return null;
  if (resolved.startsWith("data:") || resolved.startsWith("blob:")) return resolved;

  const fetchUrl = resolved.startsWith("http")
    ? resolved
    : resolved.startsWith("/")
      ? `${typeof window !== "undefined" ? window.location.origin : getBackendOrigin()}${resolved}`
      : resolved;

  try {
    const response = await fetch(fetchUrl, {
      headers: getAuthHeaders(),
      credentials: "include",
    });
    if (!response.ok) return resolved;
    const blob = await response.blob();
    if (!blob.type.startsWith("image/")) return resolved;
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return resolved;
  }
}

function resolveCardPreviewModel({
  card,
  template,
  employeeName,
  employeeNumber,
  position,
  organizationUnit,
  preferredName,
  workEmail,
  phone,
  photoPath,
  hiredOn,
  organizationLogoUrl,
  organizationName,
}: {
  card?: EmployeeIdentityCard | null;
  template?: IdentityCardTemplate | null;
  employeeName?: string;
  employeeNumber?: string;
  position?: string | null;
  organizationUnit?: string | null;
  preferredName?: string | null;
  workEmail?: string | null;
  phone?: string | null;
  photoPath?: string | null;
  hiredOn?: string | null;
  organizationLogoUrl?: string | null;
  organizationName?: string | null;
}): CardPreviewModel {
  const selectedTemplate = template ?? card?.template;
  const name =
    employeeName ??
    card?.employee?.primary_name ??
    card?.snapshot?.primary_name ??
    "Employee name";
  const number =
    employeeNumber ??
    card?.employee?.employee_number ??
    card?.snapshot?.employee_number ??
    "EMP-000";
  const role =
    position ??
    card?.employee?.primary_assignment?.position?.title ??
    card?.snapshot?.position ??
    "Not assigned";
  const unit =
    organizationUnit ??
    card?.employee?.primary_assignment?.organization_unit?.name ??
    card?.snapshot?.organization_unit ??
    "Not assigned";
  const verificationValue =
    typeof window === "undefined"
      ? card?.verification_path ?? "HIVE.OS employee identity card"
      : card
        ? `${window.location.origin}${card.verification_path}`
        : window.location.href;
  const rawPhoto =
    photoPath ??
    card?.employee?.profile_photo_path ??
    (typeof card?.snapshot?.profile_photo_path === "string"
      ? card.snapshot.profile_photo_path
      : null);

  return {
    template: {
      orientation: selectedTemplate?.orientation ?? "landscape",
      width_mm: selectedTemplate?.width_mm ?? 85.6,
      height_mm: selectedTemplate?.height_mm ?? 53.98,
      primary_color: selectedTemplate?.primary_color ?? "#0F172A",
      accent_color: selectedTemplate?.accent_color ?? "#D97706",
      text_color: selectedTemplate?.text_color ?? "#FFFFFF",
      front_fields: selectedTemplate?.front_fields ?? emptyTemplate.front_fields,
      back_fields: selectedTemplate?.back_fields ?? emptyTemplate.back_fields,
      card_type: selectedTemplate?.card_type ?? "employee",
    },
    organizationName: String(
      card?.snapshot?.organization_name ?? organizationName ?? "HIVE.OS",
    ),
    organizationLogoUrl: organizationLogoUrl ?? null,
    name,
    preferredName:
      preferredName ??
      card?.employee?.preferred_name ??
      (typeof card?.snapshot?.preferred_name === "string"
        ? card.snapshot.preferred_name
        : null),
    number,
    role,
    unit,
    workEmail:
      workEmail ??
      card?.employee?.work_email ??
      (typeof card?.snapshot?.work_email === "string"
        ? card.snapshot.work_email
        : null),
    phone:
      phone ??
      (typeof card?.snapshot?.phone === "string" ? card.snapshot.phone : null),
    hiredOn:
      hiredOn ??
      (typeof card?.snapshot?.hired_on === "string" ? card.snapshot.hired_on : null),
    cardNumber: card?.card_number ?? "Generated when issued",
    issuedOn: card?.issued_on ?? "Issue date pending",
    expiresOn: card?.expires_on ?? "per template policy",
    verificationValue,
    initials: name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    photoUrl: resolveMediaUrl(rawPhoto),
  };
}

function showsField(fields: IdentityCardField[], field: IdentityCardField) {
  return fields.includes(field);
}

async function printIdentityCard(model: CardPreviewModel) {
  const width = model.template.width_mm;
  const height = model.template.height_mm;
  const primary = model.template.primary_color;
  const accent = model.template.accent_color;
  const text = model.template.text_color;
  const printablePhotoUrl = await resolvePrintableImageUrl(model.photoUrl);
  const printableLogoUrl = await resolvePrintableImageUrl(model.organizationLogoUrl);
  const qrSvg = renderToStaticMarkup(
    <QRCodeSVG value={model.verificationValue} size={120} level="M" includeMargin />,
  );
  const front = model.template.front_fields;
  const back = model.template.back_fields;
  const pageWidth =
    model.template.orientation === "portrait" ? height : width;
  const pageHeight =
    model.template.orientation === "portrait" ? width : height;

  const frontMeta = [
    showsField(front, "position") ? `<p class="role">${escapeHtml(model.role)}</p>` : "",
    showsField(front, "organization_unit")
      ? `<p class="unit">${escapeHtml(model.unit)}</p>`
      : "",
    showsField(front, "employee_number")
      ? `<p class="mono">${escapeHtml(model.number)}</p>`
      : "",
    showsField(front, "preferred_name") && model.preferredName
      ? `<p class="unit">Preferred: ${escapeHtml(model.preferredName)}</p>`
      : "",
    showsField(front, "phone") && model.phone
      ? `<p class="unit">${escapeHtml(model.phone)}</p>`
      : "",
    showsField(front, "work_email") && model.workEmail
      ? `<p class="unit">${escapeHtml(model.workEmail)}</p>`
      : "",
    showsField(front, "hired_on") && model.hiredOn
      ? `<p class="unit">Hired ${escapeHtml(model.hiredOn)}</p>`
      : "",
  ].join("");

  const backRows = [
    showsField(back, "card_number")
      ? `<div class="field"><span class="label">Card number</span><span class="value mono">${escapeHtml(model.cardNumber)}</span></div>`
      : "",
    showsField(back, "issued_on")
      ? `<div class="field"><span class="label">Issued</span><span class="value">${escapeHtml(model.issuedOn)}</span></div>`
      : "",
    showsField(back, "expires_on")
      ? `<div class="field"><span class="label">Expires</span><span class="value">${escapeHtml(model.expiresOn)}</span></div>`
      : "",
    showsField(back, "work_email") && model.workEmail
      ? `<div class="field"><span class="label">Work email</span><span class="value">${escapeHtml(model.workEmail)}</span></div>`
      : "",
    showsField(back, "phone") && model.phone
      ? `<div class="field"><span class="label">Phone</span><span class="value">${escapeHtml(model.phone)}</span></div>`
      : "",
    showsField(back, "hired_on") && model.hiredOn
      ? `<div class="field"><span class="label">Hired</span><span class="value">${escapeHtml(model.hiredOn)}</span></div>`
      : "",
    showsField(back, "employee_number")
      ? `<div class="field"><span class="label">Employee number</span><span class="value mono">${escapeHtml(model.number)}</span></div>`
      : "",
    showsField(back, "position")
      ? `<div class="field"><span class="label">Position</span><span class="value">${escapeHtml(model.role)}</span></div>`
      : "",
    showsField(back, "organization_unit")
      ? `<div class="field"><span class="label">Unit</span><span class="value">${escapeHtml(model.unit)}</span></div>`
      : "",
  ].join("");

  const qrBlock = `<div class="qr">${qrSvg}</div>`;
  const hasBack = back.length > 0;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(model.cardNumber)} · Employee ID</title>
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #0f172a;
      font-family: "Segoe UI", Helvetica, Arial, sans-serif;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    @page {
      size: ${pageWidth}mm ${pageHeight}mm;
      margin: 0;
    }
    .card {
      position: relative;
      width: ${pageWidth}mm;
      height: ${pageHeight}mm;
      overflow: hidden;
      color: ${text};
      background: ${primary};
      padding: 3.2mm 3.6mm;
      page-break-after: always;
      break-after: page;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .card:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .card.back { background: #0b1220; color: #f8fafc; }
    .accent {
      position: absolute;
      inset: 0 auto 0 58%;
      width: 55%;
      transform: skewX(-12deg);
      background: ${accent};
      opacity: 0.92;
    }
    .grid-overlay {
      position: absolute;
      inset: 0;
      opacity: 0.12;
      background-image:
        linear-gradient(rgba(255,255,255,.55) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,.55) 1px, transparent 1px);
      background-size: 18px 18px;
    }
    .content {
      position: relative;
      z-index: 1;
      height: 100%;
      display: grid;
      grid-template-rows: auto 1fr auto;
      gap: 2mm;
    }
    .eyebrow {
      margin: 0;
      font-size: 7px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      opacity: 0.75;
      font-weight: 700;
      line-height: 1.2;
    }
    .org {
      margin: 1mm 0 0;
      font-size: 13px;
      font-weight: 900;
      letter-spacing: -0.03em;
      line-height: 1.1;
    }
    .brand-row {
      display: flex;
      align-items: center;
      gap: 2mm;
      min-width: 0;
    }
    .brand-logo {
      width: 9mm;
      height: 9mm;
      object-fit: contain;
      flex-shrink: 0;
      background: rgba(255,255,255,.92);
      border-radius: 1.5mm;
      padding: 0.6mm;
    }
    .identity {
      display: flex;
      align-items: flex-end;
      gap: 2.5mm;
      min-height: 0;
    }
    .photo {
      width: 14mm;
      height: 14mm;
      flex-shrink: 0;
      border-radius: 2.5mm;
      border: 0.4mm solid rgba(255,255,255,.65);
      background: rgba(255,255,255,.16);
      display: grid;
      place-items: center;
      font-size: 14px;
      font-weight: 900;
      overflow: hidden;
    }
    .photo img { width: 100%; height: 100%; object-fit: cover; }
    .name { margin: 0; font-size: 14px; font-weight: 900; line-height: 1.1; }
    .role { margin: 0.6mm 0 0; font-size: 9px; font-weight: 700; opacity: 0.9; line-height: 1.15; }
    .unit { margin: 0.4mm 0 0; font-size: 8px; opacity: 0.75; line-height: 1.15; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: 0.04em; }
    .identity .mono { margin: 1mm 0 0; font-size: 8px; }
    .qr {
      background: #fff;
      border-radius: 2mm;
      padding: 1mm;
      flex-shrink: 0;
      display: grid;
      place-items: center;
      align-self: flex-end;
    }
    .qr svg { display: block; width: 12mm; height: 12mm; }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 2mm;
      font-size: 8px;
      opacity: 0.9;
      line-height: 1.15;
    }
    .back-head { min-width: 0; }
    .back-title { margin: 0; font-size: 12px; font-weight: 900; line-height: 1.1; }
    .back-copy { margin: 1mm 0 0; font-size: 7.5px; line-height: 1.25; opacity: 0.8; max-width: 68%; }
    .fields {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.6mm 3mm;
      align-content: start;
      min-height: 0;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 0.4mm;
      min-width: 0;
    }
    .label {
      font-size: 7px;
      opacity: 0.65;
      line-height: 1.1;
    }
    .value {
      font-size: 9px;
      font-weight: 700;
      line-height: 1.2;
      word-break: break-word;
    }
  </style>
</head>
<body>
  <section class="card" aria-label="Identity card front">
    <div class="accent" aria-hidden="true"></div>
    <div class="grid-overlay" aria-hidden="true"></div>
    <div class="content">
      <div style="display:flex;justify-content:space-between;gap:2mm;align-items:flex-start;">
        <div class="brand-row">
          ${
            showsField(front, "organization_logo") && printableLogoUrl
              ? `<img class="brand-logo" src="${escapeHtml(printableLogoUrl)}" alt="" />`
              : showsField(front, "organization_logo")
                ? `<div class="brand-logo" style="display:grid;place-items:center;font-size:8px;font-weight:700;">LOGO</div>`
                : ""
          }
          <div>
            <p class="eyebrow">Verified ${escapeHtml(model.template.card_type)} credential</p>
            ${
              showsField(front, "organization_name")
                ? `<p class="org">${escapeHtml(model.organizationName)}</p>`
                : ""
            }
          </div>
        </div>
      </div>
      <div class="identity">
        ${
          showsField(front, "photo")
            ? `<div class="photo">${
                printablePhotoUrl
                  ? `<img src="${escapeHtml(printablePhotoUrl)}" alt="" />`
                  : escapeHtml(model.initials)
              }</div>`
            : ""
        }
        <div style="min-width:0;flex:1;">
          ${
            showsField(front, "primary_name")
              ? `<p class="name">${escapeHtml(model.name)}</p>`
              : ""
          }
          ${frontMeta}
        </div>
        ${showsField(front, "qr_code") ? qrBlock : ""}
      </div>
      <div class="footer">
        <span>${
          showsField(front, "card_number")
            ? escapeHtml(model.cardNumber)
            : escapeHtml(model.number)
        }</span>
        <span>${
          showsField(front, "expires_on")
            ? `Expires ${escapeHtml(model.expiresOn)}`
            : showsField(front, "issued_on")
              ? `Issued ${escapeHtml(model.issuedOn)}`
              : ""
        }</span>
      </div>
    </div>
  </section>
  ${
    hasBack
      ? `<section class="card back" aria-label="Identity card back">
    <div class="accent" aria-hidden="true"></div>
    <div class="grid-overlay" aria-hidden="true"></div>
    <div class="content">
      <div class="back-head">
        <p class="back-title">${escapeHtml(model.organizationName)}</p>
        ${
          showsField(back, "verification_instructions")
            ? `<p class="back-copy">Scan the QR code to verify this credential with authorized HR staff.</p>`
            : ""
        }
      </div>
      <div class="fields">${backRows}</div>
      <div class="footer">
        <span>${escapeHtml(model.name)}</span>
        ${showsField(back, "qr_code") ? qrBlock : ""}
      </div>
    </div>
  </section>`
      : ""
  }
</body>
</html>`;

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.title = "Identity card print";
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  frame.style.opacity = "0";
  frame.style.pointerEvents = "none";
  document.body.appendChild(frame);

  const frameWindow = frame.contentWindow;
  const frameDocument = frame.contentDocument ?? frameWindow?.document;
  if (!frameWindow || !frameDocument) {
    frame.remove();
    toast.error("Unable to prepare the identity card for printing.");
    return;
  }

  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();

  const cleanup = () => {
    frame.remove();
  };

  const triggerPrint = () => {
    try {
      frameWindow.focus();
      frameWindow.print();
    } finally {
      window.setTimeout(cleanup, 1000);
    }
  };

  const images = Array.from(frameDocument.images);
  if (images.length === 0) {
    window.setTimeout(triggerPrint, 150);
    return;
  }

  let remaining = images.length;
  const done = () => {
    remaining -= 1;
    if (remaining <= 0) triggerPrint();
  };
  images.forEach((img) => {
    if (img.complete) done();
    else {
      img.onload = done;
      img.onerror = done;
    }
  });
}

const DEMO_CARD_VALUES = {
  organizationName: "Your Organization",
  name: "Abebe Bikila",
  preferredName: "Abebe",
  number: "EMP-001",
  role: "Operations Lead",
  unit: "Head Office",
  workEmail: "abebe.bikila@example.com",
  phone: "+251 911 000 000",
  hiredOn: "2024-01-15",
  cardNumber: "HID-2026-SAMPLE01",
  issuedOn: "2026-01-01",
  expiresOn: "2028-01-01",
};

function withDemoCardValues(
  model: CardPreviewModel,
  enabled: boolean,
): CardPreviewModel {
  if (!enabled) return model;
  return {
    ...model,
    organizationName:
      model.organizationName === "HIVE.OS" || !model.organizationName
        ? DEMO_CARD_VALUES.organizationName
        : model.organizationName,
    name:
      model.name === "Employee name" ? DEMO_CARD_VALUES.name : model.name,
    preferredName: model.preferredName ?? DEMO_CARD_VALUES.preferredName,
    number: model.number === "EMP-000" ? DEMO_CARD_VALUES.number : model.number,
    role: model.role === "Not assigned" || model.role === "Position"
      ? DEMO_CARD_VALUES.role
      : model.role,
    unit:
      model.unit === "Not assigned" || model.unit === "Organization unit"
        ? DEMO_CARD_VALUES.unit
        : model.unit,
    workEmail: model.workEmail ?? DEMO_CARD_VALUES.workEmail,
    phone: model.phone ?? DEMO_CARD_VALUES.phone,
    hiredOn: model.hiredOn ?? DEMO_CARD_VALUES.hiredOn,
    cardNumber:
      model.cardNumber === "Generated when issued"
        ? DEMO_CARD_VALUES.cardNumber
        : model.cardNumber,
    issuedOn:
      model.issuedOn === "Issue date pending"
        ? DEMO_CARD_VALUES.issuedOn
        : model.issuedOn,
    expiresOn:
      model.expiresOn === "per template policy"
        ? DEMO_CARD_VALUES.expiresOn
        : model.expiresOn,
    initials: (model.name === "Employee name"
      ? DEMO_CARD_VALUES.name
      : model.name
    )
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
  };
}

function IdentityCardPreview({
  card,
  template,
  employeeName,
  employeeNumber,
  position,
  organizationUnit,
  preferredName,
  workEmail,
  phone,
  photoPath,
  hiredOn,
  organizationLogoUrl,
  organizationName,
  showBack = false,
  demo = false,
}: {
  card?: EmployeeIdentityCard | null;
  template?: IdentityCardTemplate | null;
  employeeName?: string;
  employeeNumber?: string;
  position?: string | null;
  organizationUnit?: string | null;
  preferredName?: string | null;
  workEmail?: string | null;
  phone?: string | null;
  photoPath?: string | null;
  hiredOn?: string | null;
  organizationLogoUrl?: string | null;
  organizationName?: string | null;
  showBack?: boolean;
  demo?: boolean;
}) {
  const model = withDemoCardValues(
    resolveCardPreviewModel({
      card,
      template,
      employeeName,
      employeeNumber,
      position,
      organizationUnit,
      preferredName,
      workEmail,
      phone,
      photoPath,
      hiredOn,
      organizationLogoUrl,
      organizationName,
    }),
    demo || !card,
  );
  const front = model.template.front_fields;
  const back = model.template.back_fields;
  const aspect =
    model.template.orientation === "portrait"
      ? `${model.template.height_mm} / ${model.template.width_mm}`
      : `${model.template.width_mm} / ${model.template.height_mm}`;

  const renderFieldBlock = (fields: IdentityCardField[], compact = false) => (
    <div className={compact ? "min-w-0 flex-1 space-y-0.5" : "min-w-0 flex-1 space-y-1"}>
      {showsField(fields, "primary_name") && (
        <p className={`truncate font-black ${compact ? "text-base" : "text-xl"}`}>
          {model.name}
        </p>
      )}
      {showsField(fields, "preferred_name") && (
        <p className="truncate text-xs text-white/70">
          Preferred: {model.preferredName}
        </p>
      )}
      {showsField(fields, "position") && (
        <p className="truncate text-sm font-semibold text-white/85">{model.role}</p>
      )}
      {showsField(fields, "organization_unit") && (
        <p className="truncate text-xs text-white/70">{model.unit}</p>
      )}
      {showsField(fields, "employee_number") && (
        <p className="font-mono text-xs tracking-wider">{model.number}</p>
      )}
      {showsField(fields, "phone") && (
        <p className="truncate text-xs text-white/70">{model.phone}</p>
      )}
      {showsField(fields, "work_email") && (
        <p className="truncate text-xs text-white/70">{model.workEmail}</p>
      )}
      {showsField(fields, "hired_on") && (
        <p className="truncate text-xs text-white/70">Hired {model.hiredOn}</p>
      )}
      {showsField(fields, "issued_on") && (
        <p className="truncate text-xs text-white/70">Issued {model.issuedOn}</p>
      )}
      {showsField(fields, "expires_on") && (
        <p className="truncate text-xs text-white/70">Expires {model.expiresOn}</p>
      )}
      {showsField(fields, "card_number") && (
        <p className="font-mono text-[10px] tracking-wider text-white/80">
          {model.cardNumber}
        </p>
      )}
    </div>
  );

  const face = (side: "front" | "back") => {
    const fields = side === "front" ? front : back;
    const isBack = side === "back";
    return (
      <div
        className="relative mx-auto w-full max-w-[540px] overflow-hidden rounded-[1.4rem] border border-white/20 p-4 shadow-2xl sm:p-5"
        style={{
          aspectRatio: aspect,
          backgroundColor: isBack ? "#0B1220" : model.template.primary_color,
          color: model.template.text_color,
        }}
        aria-label={`Employee ID card ${side} preview for ${model.name}`}
      >
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-2/5 skew-x-[-12deg] translate-x-10 opacity-90"
          style={{ backgroundColor: model.template.accent_color }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)",
            backgroundSize: "22px 22px",
          }}
          aria-hidden="true"
        />
        <div className="relative flex h-full flex-col justify-between gap-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2.5">
              {showsField(fields, "organization_logo") && (
                model.organizationLogoUrl ? (
                  <SecureAssetImage
                    src={model.organizationLogoUrl}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-lg bg-white/95 object-contain p-1"
                    loadingClassName="h-10 w-10 shrink-0 rounded-lg bg-white/20"
                  />
                ) : (
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-dashed border-white/50 bg-white/10 text-[9px] font-bold uppercase tracking-wide text-white/80">
                    Logo
                  </div>
                )
              )}
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/70">
                  {isBack ? "Credential reverse" : `Verified ${model.template.card_type}`}
                </p>
                {showsField(fields, "organization_name") && (
                  <p className="mt-1 truncate text-base font-black tracking-tight sm:text-lg">
                    {model.organizationName}
                  </p>
                )}
              </div>
            </div>
            {!isBack && <ShieldCheck className="h-7 w-7 shrink-0" aria-hidden="true" />}
          </div>

          {isBack ? (
            <>
              {showsField(fields, "verification_instructions") && (
                <p className="max-w-[75%] text-[11px] leading-4 text-white/75">
                  Scan the QR code or open the verification link to confirm this
                  credential with authorized HR staff.
                </p>
              )}
              <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-x-3 gap-y-2 overflow-hidden text-xs">
                {(
                  [
                    ["card_number", "Card number", model.cardNumber, true],
                    ["issued_on", "Issued", model.issuedOn, false],
                    ["expires_on", "Expires", model.expiresOn, false],
                    ["work_email", "Work email", model.workEmail, false],
                    ["phone", "Phone", model.phone, false],
                    ["hired_on", "Hired", model.hiredOn, false],
                    ["employee_number", "Employee number", model.number, true],
                    ["primary_name", "Name", model.name, false],
                    ["preferred_name", "Preferred", model.preferredName, false],
                    ["position", "Position", model.role, false],
                    ["organization_unit", "Unit", model.unit, false],
                  ] as const
                )
                  .filter(([field]) => showsField(fields, field))
                  .map(([field, label, value, mono]) => (
                    <div key={field} className="min-w-0">
                      <p className="text-[10px] text-white/60">{label}</p>
                      <p
                        className={`truncate font-semibold ${mono ? "font-mono text-[11px]" : ""}`}
                      >
                        {value}
                      </p>
                    </div>
                  ))}
              </div>
              <div className="flex items-end justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  {showsField(fields, "photo") && (
                    <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/50 bg-white/15 text-sm font-black">
                      {model.photoUrl ? (
                        <SecureAssetImage
                          src={model.photoUrl}
                          alt=""
                          className="h-full w-full object-cover"
                          loadingClassName="h-full w-full bg-white/20"
                        />
                      ) : (
                        model.initials
                      )}
                    </div>
                  )}
                  <span className="truncate text-xs text-white/75">{model.name}</span>
                </div>
                {showsField(fields, "qr_code") && (
                  <div className="rounded-xl bg-white p-1.5 text-slate-950">
                    <QRCodeSVG value={model.verificationValue} size={52} level="M" />
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex min-h-0 flex-1 items-end gap-3">
                {showsField(fields, "photo") && (
                  <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-white/60 bg-white/15 text-2xl font-black">
                    {model.photoUrl ? (
                      <SecureAssetImage
                        src={model.photoUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        loadingClassName="h-full w-full bg-white/20"
                      />
                    ) : (
                      model.initials
                    )}
                  </div>
                )}
                {renderFieldBlock(fields)}
                {showsField(fields, "qr_code") && (
                  <div className="rounded-xl bg-white p-1.5 text-slate-950">
                    <QRCodeSVG value={model.verificationValue} size={58} level="M" />
                  </div>
                )}
              </div>
              {(showsField(fields, "card_number") ||
                showsField(fields, "issued_on") ||
                showsField(fields, "expires_on") ||
                showsField(fields, "verification_instructions")) && (
                <div className="flex flex-wrap items-end justify-between gap-2 text-[10px] text-white/75">
                  <span>
                    {showsField(fields, "card_number")
                      ? model.cardNumber
                      : showsField(fields, "employee_number")
                        ? model.number
                        : ""}
                  </span>
                  <span className="text-right">
                    {[
                      showsField(fields, "issued_on")
                        ? `Issued ${model.issuedOn}`
                        : null,
                      showsField(fields, "expires_on")
                        ? `Expires ${model.expiresOn}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Front
        </p>
        {face("front")}
      </div>
      {showBack ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Back {back.length === 0 ? "(no fields selected)" : ""}
          </p>
          {back.length > 0 ? (
            face("back")
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-muted-foreground">
              Toggle back fields to preview the reverse side.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

const identityCardTabs = new Set(["cards", "issue", "templates", "verify"]);

const identityCardTabRoutes: Record<string, string> = {
  cards: "/dashboard/identity-cards",
  issue: "/dashboard/identity-cards/issue",
  templates: "/dashboard/identity-cards/templates",
  verify: "/dashboard/identity-cards/verify",
};

function tabFromPathname(pathname: string | null | undefined): string {
  if (!pathname) return "cards";
  if (pathname.startsWith("/dashboard/identity-cards/issue")) return "issue";
  if (pathname.startsWith("/dashboard/identity-cards/templates")) return "templates";
  if (pathname.startsWith("/dashboard/identity-cards/verify")) return "verify";
  return "cards";
}

export function IdentityCardWorkspace({ initialTab = "cards" }: { initialTab?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const scope = getWorkspaceScopeKey();
  const queryClient = useQueryClient();
  const templateTriggerRef = useRef<HTMLElement | null>(null);
  const [tab, setTab] = useState(() => {
    const fromRoute = tabFromPathname(pathname);
    if (identityCardTabs.has(fromRoute)) return fromRoute;
    return identityCardTabs.has(initialTab) ? initialTab : "cards";
  });

  const navigateToTab = (nextTab: string) => {
    if (!identityCardTabs.has(nextTab)) return;
    setTab(nextTab);
    const href = identityCardTabRoutes[nextTab] ?? identityCardTabRoutes.cards;
    if (pathname !== href) {
      router.push(href, { scroll: false });
    }
  };

  useEffect(() => {
    const fromRoute = tabFromPathname(pathname);
    if (identityCardTabs.has(fromRoute) && fromRoute !== tab) {
      setTab(fromRoute);
    }
  }, [pathname, tab]);
  const [cardSearch, setCardSearch] = useState("");
  const [cardStatus, setCardStatus] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [previewCard, setPreviewCard] = useState<EmployeeIdentityCard | null>(null);
  const [revokeCard, setRevokeCard] = useState<EmployeeIdentityCard | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [renewCard, setRenewCard] = useState<EmployeeIdentityCard | null>(null);
  const [renewForm, setRenewForm] = useState({
    template_id: "",
    issued_on: today(),
    expires_on: "",
    reason: "",
    notes: "",
  });
  const [verifyValue, setVerifyValue] = useState("");
  const [verification, setVerification] = useState<IdentityCardVerification | null>(null);
  const [templateEditor, setTemplateEditor] = useState<IdentityCardTemplate | "new" | null>(null);
  const [templateForm, setTemplateForm] =
    useState<IdentityCardTemplatePayload>(emptyTemplate);
  const [deleteTemplate, setDeleteTemplate] = useState<IdentityCardTemplate | null>(null);
  const [issueForm, setIssueForm] = useState({
    template_id: "",
    issued_on: today(),
    expires_on: "",
    notes: "",
  });

  const workspaceQuery = useQuery({
    queryKey: ["hr-identity-card-workspace", scope],
    queryFn: fetchIdentityCardWorkspace,
  });
  const cardsQuery = useQuery({
    queryKey: ["hr-identity-cards", scope, cardSearch, cardStatus],
    queryFn: () => fetchIdentityCards({ search: cardSearch, status: cardStatus }),
  });
  const employeesQuery = useQuery({
    queryKey: ["hr-identity-card-employees", scope, employeeSearch],
    queryFn: () => fetchEligibleIdentityEmployees(employeeSearch),
  });
  const templatesQuery = useQuery({
    queryKey: ["hr-identity-card-templates", scope],
    queryFn: fetchIdentityCardTemplates,
  });
  const brandQuery = useQuery({
    queryKey: ["hr-identity-card-brand", scope],
    queryFn: async () => {
      const response = await fetch(`${getBackendApiRoot()}/settings/brand/public`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) return null;
      const payload = await response.json();
      return (payload?.data ?? payload ?? null) as {
        app_title?: string;
        pdf_logo?: string | null;
        logo_light?: string | null;
        logo_dark?: string | null;
        logo?: string | null;
      } | null;
    },
    staleTime: 5 * 60_000,
  });

  const workspace = workspaceQuery.data?.data;
  const templates = templatesQuery.data?.data ?? workspace?.templates ?? [];
  const employees = employeesQuery.data?.data ?? [];
  const availableEmployees = employees.filter((employee) => !employee.active_card);
  const selectedEmployee = employees.find((employee) =>
    selectedEmployees.includes(employee.id),
  );
  const selectedTemplate = templates.find(
    (template) => String(template.id) === issueForm.template_id,
  );
  const organizationLogoUrl = resolveMediaUrl(
    brandQuery.data?.pdf_logo ||
      brandQuery.data?.logo_light ||
      brandQuery.data?.logo_dark ||
      brandQuery.data?.logo ||
      null,
  );
  const organizationNameFromBrand = brandQuery.data?.app_title?.trim() || null;

  useEffect(() => {
    if (!issueForm.template_id && templates.length > 0) {
      const defaultTemplate = templates.find((item) => item.is_default) ?? templates[0];
      setIssueForm((current) => ({
        ...current,
        template_id: String(defaultTemplate.id),
      }));
    }
  }, [issueForm.template_id, templates]);

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["hr-identity-card-workspace"] }),
      queryClient.invalidateQueries({ queryKey: ["hr-identity-cards"] }),
      queryClient.invalidateQueries({ queryKey: ["hr-identity-card-employees"] }),
      queryClient.invalidateQueries({ queryKey: ["hr-identity-card-templates"] }),
    ]);
  };

  const issueMutation = useMutation({
    mutationFn: () =>
      issueIdentityCards({
        employee_ids: selectedEmployees,
        template_id: Number(issueForm.template_id),
        issued_on: issueForm.issued_on,
        expires_on: issueForm.expires_on || undefined,
        notes: issueForm.notes || undefined,
      }),
    onSuccess: async (result) => {
      toast.success(result.message ?? "Employee ID card issued.");
      setPreviewCard(result.data[0] ?? null);
      setSelectedEmployees([]);
      await invalidate();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const revokeMutation = useMutation({
    mutationFn: () => revokeIdentityCard(revokeCard!.id, revokeReason),
    onSuccess: async (card) => {
      toast.success("Employee ID card revoked.");
      setRevokeCard(null);
      setRevokeReason("");
      setPreviewCard(card);
      await invalidate();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const renewMutation = useMutation({
    mutationFn: () =>
      renewIdentityCard(renewCard!.id, {
        template_id: renewForm.template_id
          ? Number(renewForm.template_id)
          : undefined,
        issued_on: renewForm.issued_on,
        expires_on: renewForm.expires_on || undefined,
        reason: renewForm.reason || undefined,
        notes: renewForm.notes || undefined,
      }),
    onSuccess: async (card) => {
      toast.success("A renewed employee ID card was created.");
      setRenewCard(null);
      setPreviewCard(card);
      await invalidate();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const verifyMutation = useMutation({
    mutationFn: verifyIdentityCard,
    onSuccess: (result) => setVerification(result.data),
    onError: (error) => {
      setVerification(null);
      toast.error(errorMessage(error));
    },
  });
  const templateMutation = useMutation({
    mutationFn: () =>
      saveIdentityCardTemplate(
        templateForm,
        templateEditor === "new" ? undefined : templateEditor?.id,
      ),
    onSuccess: async () => {
      toast.success(templateEditor === "new" ? "Template created." : "Template updated.");
      setTemplateEditor(null);
      await invalidate();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const duplicateMutation = useMutation({
    mutationFn: (template: IdentityCardTemplate) =>
      duplicateIdentityCardTemplate(template.id, {
        code: `${template.code}-COPY-${String(Date.now()).slice(-4)}`,
        name: `${template.name} Copy`,
      }),
    onSuccess: async () => {
      toast.success("Template duplicated and ready to edit.");
      await invalidate();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteIdentityCardTemplate(deleteTemplate!.id),
    onSuccess: async () => {
      toast.success("Unused template deleted.");
      setDeleteTemplate(null);
      await invalidate();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("verify");
    if (!value) return;
    navigateToTab("verify");
    setVerifyValue(value);
    verifyMutation.mutate(value);
    // Run only for the initial QR route.
  }, []);

  const summaryCards = useMemo(
    () => [
      { label: "Active cards", value: workspace?.summary.active ?? 0, icon: BadgeCheck },
      {
        label: "Expiring in 30 days",
        value: workspace?.summary.expiring_soon ?? 0,
        icon: FileClock,
      },
      {
        label: "Employees without cards",
        value: workspace?.summary.unissued_employees ?? 0,
        icon: UsersRound,
      },
      {
        label: "Card history",
        value: workspace?.summary.total_history ?? 0,
        icon: History,
      },
    ],
    [workspace],
  );

  const openTemplateEditor = (
    template?: IdentityCardTemplate,
    trigger?: HTMLElement,
  ) => {
    templateTriggerRef.current = trigger ?? null;
    setTemplateEditor(template ?? "new");
    setTemplateForm(
      template
        ? {
            code: template.code,
            name: template.name,
            description: template.description ?? "",
            card_type: template.card_type,
            orientation: template.orientation,
            width_mm: template.width_mm,
            height_mm: template.height_mm,
            primary_color: template.primary_color,
            accent_color: template.accent_color,
            text_color: template.text_color,
            front_fields: template.front_fields,
            back_fields: template.back_fields,
            validity_months: template.validity_months,
            is_default: template.is_default,
            is_active: template.is_active,
          }
        : { ...emptyTemplate, front_fields: [...emptyTemplate.front_fields], back_fields: [...emptyTemplate.back_fields] },
    );
  };

  const toggleTemplateField = (
    side: "front_fields" | "back_fields",
    field: IdentityCardField,
    checked: boolean,
  ) => {
    setTemplateForm((current) => ({
      ...current,
      [side]: checked
        ? [...current[side], field]
        : current[side].filter((item) => item !== field),
    }));
  };

  const submitVerification = (event: FormEvent) => {
    event.preventDefault();
    const raw = verifyValue.trim();
    const publicId =
      raw.match(
        /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
      )?.[0] ??
      raw.match(/\bHID-\d{4}-[A-Z0-9]+\b/i)?.[0] ??
      raw;
    if (publicId) verifyMutation.mutate(publicId);
  };

  const buildPreviewModel = (
    card?: EmployeeIdentityCard | null,
    extras?: {
      template?: IdentityCardTemplate | null;
      employeeName?: string;
      employeeNumber?: string;
      position?: string | null;
      organizationUnit?: string | null;
      preferredName?: string | null;
      workEmail?: string | null;
      phone?: string | null;
      photoPath?: string | null;
    },
  ) =>
    resolveCardPreviewModel({
      card,
      template: extras?.template,
      employeeName: extras?.employeeName,
      employeeNumber: extras?.employeeNumber,
      position: extras?.position,
      organizationUnit: extras?.organizationUnit,
      preferredName: extras?.preferredName,
      workEmail: extras?.workEmail,
      phone: extras?.phone,
      photoPath: extras?.photoPath,
      organizationLogoUrl,
      organizationName: organizationNameFromBrand,
    });

  return (
    <main className="min-w-0 space-y-6 pb-12">
      <header className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 px-5 py-7 text-white shadow-xl sm:px-8">
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
            backgroundSize: "28px 28px",
          }}
          aria-hidden="true"
        />
        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-400">
              Human Resources · Secure credentials
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Employee ID Management
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Design, issue, verify, renew, revoke, and print employee credentials
              directly from the authoritative HR directory.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => {
              navigateToTab("issue");
              document.getElementById("identity-card-tabs")?.focus();
            }}
            className="min-h-11 bg-amber-700 font-bold text-white hover:bg-amber-800"
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Issue employee cards
          </Button>
        </div>
      </header>

      <section aria-labelledby="credential-summary-heading">
        <h2 id="credential-summary-heading" className="sr-only">
          Credential summary
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((item) => (
            <Card key={item.label} className="border-slate-200 shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-950 text-amber-400">
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-2xl font-black tabular-nums">
                    {workspaceQuery.isLoading ? "—" : item.value}
                  </p>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Tabs value={tab} onValueChange={navigateToTab}>
        <div className="overflow-x-auto pb-1">
          <TabsList
            id="identity-card-tabs"
            aria-label="Employee ID management views"
            className="h-auto min-w-max p-1"
          >
            <TabsTrigger value="cards" className="min-h-10 px-4">
              Cards & history
            </TabsTrigger>
            <TabsTrigger value="issue" className="min-h-10 px-4">
              Issue cards
            </TabsTrigger>
            <TabsTrigger value="templates" className="min-h-10 px-4">
              Templates
            </TabsTrigger>
            <TabsTrigger value="verify" className="min-h-10 px-4">
              Verify a card
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="cards" className="space-y-4">
          <Card>
            <CardHeader className="gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <CardTitle>Issued card register</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Search the full audit history, including revoked and replaced credentials.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_180px]">
                <div>
                  <Label htmlFor="card-search">Search cards</Label>
                  <div className="relative mt-1">
                    <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <Input
                      id="card-search"
                      value={cardSearch}
                      onChange={(event) => setCardSearch(event.target.value)}
                      placeholder="Card number or verification ID"
                      className="pl-9"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="card-status">Card status</Label>
                  <NativeSelect
                    id="card-status"
                    value={cardStatus}
                    onChange={(event) => setCardStatus(event.target.value)}
                    className="mt-1 w-full"
                  >
                    <NativeSelectOption value="">All statuses</NativeSelectOption>
                    <NativeSelectOption value="active">Active</NativeSelectOption>
                    <NativeSelectOption value="expired">Expired</NativeSelectOption>
                    <NativeSelectOption value="revoked">Revoked</NativeSelectOption>
                    <NativeSelectOption value="replaced">Replaced</NativeSelectOption>
                  </NativeSelect>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <caption className="sr-only">
                    Employee identity cards and available actions
                  </caption>
                  <thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                    <tr>
                      <th scope="col" className="px-4 py-3">Employee</th>
                      <th scope="col" className="px-4 py-3">Card number</th>
                      <th scope="col" className="px-4 py-3">Issued</th>
                      <th scope="col" className="px-4 py-3">Expires</th>
                      <th scope="col" className="px-4 py-3">Status</th>
                      <th scope="col" className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {cardsQuery.isLoading ? (
                      <tr><td colSpan={6} className="p-5"><Skeleton className="h-14 w-full" /></td></tr>
                    ) : (cardsQuery.data?.data.length ?? 0) === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          No identity cards match this view.
                        </td>
                      </tr>
                    ) : (
                      cardsQuery.data?.data.map((card) => (
                        <tr key={card.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3">
                            <p className="font-bold">{card.employee?.primary_name ?? card.snapshot.primary_name}</p>
                            <p className="text-xs text-muted-foreground">{card.employee?.employee_number ?? card.snapshot.employee_number}</p>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">{card.card_number}</td>
                          <td className="px-4 py-3">{card.issued_on}</td>
                          <td className="px-4 py-3">{card.expires_on ?? "No expiry"}</td>
                          <td className="px-4 py-3"><StatusBadge status={card.effective_status} /></td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button type="button" size="sm" variant="outline" onClick={() => setPreviewCard(card)}>
                                View
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  void printIdentityCard(buildPreviewModel(card))
                                }
                              >
                                <Printer className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                                Print
                              </Button>
                              {card.effective_status === "active" && (
                                <>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setRenewCard(card);
                                      setRenewForm({
                                        template_id: String(card.template_id),
                                        issued_on: today(),
                                        expires_on: "",
                                        reason: "",
                                        notes: "",
                                      });
                                    }}
                                  >
                                    Renew
                                  </Button>
                                  <Button type="button" size="sm" variant="destructive" onClick={() => setRevokeCard(card)}>
                                    Revoke
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {cardsQuery.isError && (
                <p role="alert" className="mt-3 text-sm text-destructive">
                  {errorMessage(cardsQuery.error)}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issue" className="space-y-4">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,.8fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Select eligible employees</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Active cards cannot be duplicated. Use Renew from the register when a replacement is needed.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="employee-card-search">Search HR employees</Label>
                  <Input
                    id="employee-card-search"
                    value={employeeSearch}
                    onChange={(event) => setEmployeeSearch(event.target.value)}
                    placeholder="Name, employee number, or work email"
                    className="mt-1"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedEmployees(availableEmployees.map((employee) => employee.id))}
                    disabled={availableEmployees.length === 0}
                  >
                    Select all available
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedEmployees([])}>
                    Clear selection
                  </Button>
                  <span className="self-center text-sm font-semibold" aria-live="polite">
                    {selectedEmployees.length} selected
                  </span>
                </div>
                <div className="max-h-[430px] overflow-auto rounded-xl border">
                  <table className="w-full min-w-[620px] text-left text-sm">
                    <caption className="sr-only">Employees eligible for an identity card</caption>
                    <thead className="sticky top-0 border-b bg-slate-50">
                      <tr>
                        <th scope="col" className="w-12 p-3">Select</th>
                        <th scope="col" className="p-3">Employee</th>
                        <th scope="col" className="p-3">Assignment</th>
                        <th scope="col" className="p-3">Card eligibility</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {employees.map((employee) => (
                        <tr key={employee.id}>
                          <td className="p-3">
                            <Checkbox
                              checked={selectedEmployees.includes(employee.id)}
                              disabled={Boolean(employee.active_card)}
                              onCheckedChange={(checked) =>
                                setSelectedEmployees((current) =>
                                  checked
                                    ? [...new Set([...current, employee.id])]
                                    : current.filter((id) => id !== employee.id),
                                )
                              }
                              aria-label={`Select ${employee.primary_name}`}
                            />
                          </td>
                          <td className="p-3">
                            <p className="font-bold">{employee.primary_name}</p>
                            <p className="text-xs text-muted-foreground">{employee.employee_number}</p>
                          </td>
                          <td className="p-3">
                            <p>{employee.position ?? "No position"}</p>
                            <p className="text-xs text-muted-foreground">{employee.organization_unit ?? "No unit"}</p>
                          </td>
                          <td className="p-3">
                            {employee.active_card ? (
                              <span className="text-xs font-semibold text-amber-800">
                                Active card {employee.active_card.card_number}
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-emerald-700">Ready to issue</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-5">
              <Card>
                <CardHeader><CardTitle>Issue details</CardTitle></CardHeader>
                <CardContent>
                  <form
                    className="space-y-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (selectedEmployees.length === 0) {
                        toast.error("Select at least one eligible employee.");
                        return;
                      }
                      issueMutation.mutate();
                    }}
                  >
                    <div>
                      <Label htmlFor="issue-template">Card template</Label>
                      <NativeSelect
                        id="issue-template"
                        required
                        value={issueForm.template_id}
                        onChange={(event) => setIssueForm({ ...issueForm, template_id: event.target.value })}
                        className="mt-1 w-full"
                      >
                        <NativeSelectOption value="">Select a template</NativeSelectOption>
                        {templates.filter((template) => template.is_active).map((template) => (
                          <NativeSelectOption key={template.id} value={template.id}>
                            {template.name} · {template.validity_months} months
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="issued-on">Issue date</Label>
                        <Input id="issued-on" type="date" required value={issueForm.issued_on} onChange={(event) => setIssueForm({ ...issueForm, issued_on: event.target.value })} className="mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="expires-on">Custom expiry date</Label>
                        <Input id="expires-on" type="date" min={issueForm.issued_on} value={issueForm.expires_on} onChange={(event) => setIssueForm({ ...issueForm, expires_on: event.target.value })} className="mt-1" />
                        <p className="mt-1 text-xs text-muted-foreground">Leave blank to use the template policy.</p>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="issue-notes">Issuance notes</Label>
                      <Textarea id="issue-notes" value={issueForm.notes} onChange={(event) => setIssueForm({ ...issueForm, notes: event.target.value })} className="mt-1" maxLength={2000} />
                    </div>
                    <Button type="submit" className="min-h-11 w-full" disabled={issueMutation.isPending || selectedEmployees.length === 0}>
                      {issueMutation.isPending ? "Issuing securely…" : `Issue ${selectedEmployees.length || ""} card${selectedEmployees.length === 1 ? "" : "s"}`}
                    </Button>
                  </form>
                </CardContent>
              </Card>
              <IdentityCardPreview
                template={selectedTemplate}
                employeeName={selectedEmployee?.primary_name}
                employeeNumber={selectedEmployee?.employee_number}
                position={selectedEmployee?.position}
                organizationUnit={selectedEmployee?.organization_unit}
                preferredName={selectedEmployee?.preferred_name}
                workEmail={selectedEmployee?.work_email}
                phone={selectedEmployee?.phone}
                photoPath={selectedEmployee?.profile_photo_path}
                organizationLogoUrl={organizationLogoUrl}
                organizationName={organizationNameFromBrand}
                demo={!selectedEmployee}
              />
              {selectedEmployee && !selectedEmployee.profile_photo_path && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  No photo found for {selectedEmployee.primary_name}. ID cards pull the avatar
                  from the linked security user. Edit this employee in HR and confirm a User is
                  linked, then make sure that user has a photo on Security → Users (or Profile).
                </p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-black">Credential templates</h2>
              <p className="text-sm text-muted-foreground">
                Configure card dimensions, identity fields, colors, validity, and default policy.
              </p>
            </div>
            <Button
              type="button"
              onClick={(event) => openTemplateEditor(undefined, event.currentTarget)}
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              New template
            </Button>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader className="flex-row items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle>{template.name}</CardTitle>
                      {template.is_default && <Badge>Default</Badge>}
                      {!template.is_active && <Badge variant="outline">Inactive</Badge>}
                    </div>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{template.code}</p>
                  </div>
                  <div className="flex gap-1" aria-label={`Actions for ${template.name}`}>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={(event) =>
                        openTemplateEditor(template, event.currentTarget)
                      }
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">Edit {template.name}</span>
                    </Button>
                    <Button type="button" size="icon" variant="ghost" onClick={() => duplicateMutation.mutate(template)}>
                      <Copy className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">Duplicate {template.name}</span>
                    </Button>
                    <Button type="button" size="icon" variant="ghost" onClick={() => setDeleteTemplate(template)}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">Delete {template.name}</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <IdentityCardPreview
                    template={template}
                    demo
                    showBack
                    organizationLogoUrl={organizationLogoUrl}
                    organizationName={organizationNameFromBrand}
                  />
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div><p className="font-bold">{template.validity_months}</p><p className="text-xs text-muted-foreground">Months valid</p></div>
                    <div><p className="font-bold">{template.front_fields.length}</p><p className="text-xs text-muted-foreground">Front fields</p></div>
                    <div><p className="font-bold">{template.cards_count ?? 0}</p><p className="text-xs text-muted-foreground">Cards issued</p></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="verify">
          <Card className="mx-auto max-w-3xl">
            <CardHeader>
              <CardTitle>Verify an employee credential</CardTitle>
              <p className="text-sm text-muted-foreground">
                Paste a card QR link, public verification UUID, or card number (for example HID-2026-XXXXXXXX). Results are restricted to authorized HR users.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <form onSubmit={submitVerification} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <Label htmlFor="verification-id">QR link or verification ID</Label>
                  <Input id="verification-id" value={verifyValue} onChange={(event) => setVerifyValue(event.target.value)} required className="mt-1 font-mono" placeholder="UUID, HID-2026-XXXXXXXX, or QR verification link" />
                </div>
                <Button type="submit" className="min-h-10" disabled={verifyMutation.isPending}>
                  <Search className="mr-2 h-4 w-4" aria-hidden="true" />
                  {verifyMutation.isPending ? "Checking…" : "Verify card"}
                </Button>
              </form>
              <div aria-live="polite">
                {verification && (
                  <div
                    className={`rounded-2xl border p-5 ${
                      verification.is_valid
                        ? "border-emerald-300 bg-emerald-50 text-emerald-950"
                        : "border-red-300 bg-red-50 text-red-950"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {verification.is_valid ? (
                        <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" aria-hidden="true" />
                      ) : (
                        <Ban className="mt-0.5 h-6 w-6 shrink-0 text-red-700" aria-hidden="true" />
                      )}
                      <div className="min-w-0">
                        <h3 className="font-black text-current">
                          {verification.is_valid
                            ? "Valid active credential"
                            : "Credential is not valid"}
                        </h3>
                        <p className="mt-1 text-sm text-current/90">
                          {verification.card.employee.primary_name} ·{" "}
                          {verification.card.employee.employee_number}
                        </p>
                        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                          <div>
                            <dt className="text-current/65">Card number</dt>
                            <dd className="font-mono font-semibold text-current">
                              {verification.card.card_number}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-current/65">Status</dt>
                            <dd className="font-semibold text-current">
                              {fieldLabel(verification.card.effective_status)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-current/65">Assignment</dt>
                            <dd className="font-semibold text-current">
                              {verification.card.employee.position ??
                                verification.card.employee.organization_unit ??
                                "Not assigned"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-current/65">Expires</dt>
                            <dd className="font-semibold text-current">
                              {verification.card.expires_on ?? "No expiry"}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(previewCard)} onOpenChange={(open) => !open && setPreviewCard(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Employee ID card</DialogTitle>
            <DialogDescription>
              {previewCard?.card_number} · {previewCard?.employee?.primary_name ?? previewCard?.snapshot.primary_name}
            </DialogDescription>
          </DialogHeader>
          <IdentityCardPreview
            card={previewCard}
            showBack
            organizationLogoUrl={organizationLogoUrl}
            organizationName={organizationNameFromBrand}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPreviewCard(null)}>Close</Button>
            <Button
              type="button"
              onClick={() => {
                if (!previewCard) return;
                void printIdentityCard(buildPreviewModel(previewCard));
              }}
            >
              <Printer className="mr-2 h-4 w-4" aria-hidden="true" />
              Print card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(revokeCard)} onOpenChange={(open) => !open && setRevokeCard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke this credential?</DialogTitle>
            <DialogDescription>
              Revocation is retained in the audit history and immediately makes the QR verification invalid.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="revoke-reason">Reason for revocation</Label>
            <Textarea id="revoke-reason" required value={revokeReason} onChange={(event) => setRevokeReason(event.target.value)} className="mt-1" maxLength={1000} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRevokeCard(null)}>Cancel</Button>
            <Button type="button" variant="destructive" disabled={revokeMutation.isPending || revokeReason.trim().length < 5} onClick={() => revokeMutation.mutate()}>
              Revoke credential
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(renewCard)} onOpenChange={(open) => !open && setRenewCard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renew employee credential</DialogTitle>
            <DialogDescription>
              The current card becomes Replaced and remains linked to the new card for audit history.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="renew-template">Template</Label>
              <NativeSelect id="renew-template" value={renewForm.template_id} onChange={(event) => setRenewForm({ ...renewForm, template_id: event.target.value })} className="mt-1 w-full">
                {templates.filter((template) => template.is_active).map((template) => (
                  <NativeSelectOption key={template.id} value={template.id}>{template.name}</NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label htmlFor="renew-issued-on">New issue date</Label><Input id="renew-issued-on" type="date" required value={renewForm.issued_on} onChange={(event) => setRenewForm({ ...renewForm, issued_on: event.target.value })} className="mt-1" /></div>
              <div><Label htmlFor="renew-expires-on">Custom expiry</Label><Input id="renew-expires-on" type="date" min={renewForm.issued_on} value={renewForm.expires_on} onChange={(event) => setRenewForm({ ...renewForm, expires_on: event.target.value })} className="mt-1" /></div>
            </div>
            <div><Label htmlFor="renew-reason">Renewal reason</Label><Input id="renew-reason" value={renewForm.reason} onChange={(event) => setRenewForm({ ...renewForm, reason: event.target.value })} className="mt-1" /></div>
            <div>
              <Label htmlFor="renew-notes">Notes</Label>
              <Textarea
                id="renew-notes"
                value={renewForm.notes}
                onChange={(event) => setRenewForm({ ...renewForm, notes: event.target.value })}
                className="mt-1"
                maxLength={2000}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRenewCard(null)}>Cancel</Button>
            <Button type="button" disabled={renewMutation.isPending} onClick={() => renewMutation.mutate()}>
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Create renewed card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(templateEditor)} onOpenChange={(open) => !open && setTemplateEditor(null)}>
        <DialogContent
          className="max-h-[94vh] overflow-y-auto sm:max-w-4xl"
          onCloseAutoFocus={(event) => {
            if (!templateTriggerRef.current) return;
            event.preventDefault();
            templateTriggerRef.current.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>{templateEditor === "new" ? "Create credential template" : "Edit credential template"}</DialogTitle>
            <DialogDescription>
              Choose only fields staff need. The preview updates with your brand colors.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,.9fr)]"
            onSubmit={(event) => {
              event.preventDefault();
              templateMutation.mutate();
            }}
          >
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label htmlFor="template-name">Template name</Label><Input id="template-name" required value={templateForm.name} onChange={(event) => setTemplateForm({ ...templateForm, name: event.target.value })} className="mt-1" /></div>
                <div><Label htmlFor="template-code">Template code</Label><Input id="template-code" required pattern="[A-Za-z0-9][A-Za-z0-9_-]*" value={templateForm.code} onChange={(event) => setTemplateForm({ ...templateForm, code: event.target.value.toUpperCase() })} className="mt-1 font-mono" /></div>
              </div>
              <div><Label htmlFor="template-description">Description</Label><Textarea id="template-description" value={templateForm.description ?? ""} onChange={(event) => setTemplateForm({ ...templateForm, description: event.target.value })} className="mt-1" maxLength={2000} /></div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div><Label htmlFor="template-orientation">Orientation</Label><NativeSelect id="template-orientation" value={templateForm.orientation} onChange={(event) => setTemplateForm({ ...templateForm, orientation: event.target.value as "landscape" | "portrait" })} className="mt-1 w-full"><NativeSelectOption value="landscape">Landscape</NativeSelectOption><NativeSelectOption value="portrait">Portrait</NativeSelectOption></NativeSelect></div>
                <div><Label htmlFor="template-validity">Validity (months)</Label><Input id="template-validity" type="number" min={1} max={120} required value={templateForm.validity_months} onChange={(event) => setTemplateForm({ ...templateForm, validity_months: Number(event.target.value) })} className="mt-1" /></div>
                <div><Label htmlFor="template-type">Credential type</Label><NativeSelect id="template-type" value={templateForm.card_type} onChange={(event) => setTemplateForm({ ...templateForm, card_type: event.target.value as IdentityCardTemplatePayload["card_type"] })} className="mt-1 w-full"><NativeSelectOption value="employee">Employee</NativeSelectOption><NativeSelectOption value="contractor">Contractor</NativeSelectOption><NativeSelectOption value="visitor">Visitor</NativeSelectOption><NativeSelectOption value="badge">Badge</NativeSelectOption></NativeSelect></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="template-width">Card width (mm)</Label>
                  <Input
                    id="template-width"
                    type="number"
                    min={40}
                    max={150}
                    step="0.01"
                    required
                    value={templateForm.width_mm}
                    onChange={(event) =>
                      setTemplateForm({
                        ...templateForm,
                        width_mm: Number(event.target.value),
                      })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="template-height">Card height (mm)</Label>
                  <Input
                    id="template-height"
                    type="number"
                    min={40}
                    max={150}
                    step="0.01"
                    required
                    value={templateForm.height_mm}
                    onChange={(event) =>
                      setTemplateForm({
                        ...templateForm,
                        height_mm: Number(event.target.value),
                      })
                    }
                    className="mt-1"
                  />
                </div>
              </div>
              <fieldset>
                <legend className="text-sm font-semibold">Brand colors</legend>
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  {(["primary_color", "accent_color", "text_color"] as const).map((key) => (
                    <div key={key}>
                      <Label htmlFor={key}>{fieldLabel(key)}</Label>
                      <div className="mt-1 flex gap-2">
                        <Input id={key} type="color" value={templateForm[key]} onChange={(event) => setTemplateForm({ ...templateForm, [key]: event.target.value.toUpperCase() })} className="h-10 w-14 p-1" />
                        <Input aria-label={`${fieldLabel(key)} hexadecimal value`} value={templateForm[key]} pattern="#[0-9A-Fa-f]{6}" onChange={(event) => setTemplateForm({ ...templateForm, [key]: event.target.value.toUpperCase() })} className="font-mono" />
                      </div>
                    </div>
                  ))}
                </div>
              </fieldset>
              {(["front_fields", "back_fields"] as const).map((side) => (
                <fieldset key={side} className="rounded-xl border p-4">
                  <legend className="px-1 text-sm font-bold">{side === "front_fields" ? "Front fields" : "Back fields"}</legend>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Toggled fields appear immediately in the live preview with sample employee data.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {IDENTITY_CARD_FIELDS.map((field) => (
                      <label key={field} className="flex min-h-10 items-center gap-2 rounded-lg px-2 hover:bg-slate-50">
                        <Checkbox checked={templateForm[side].includes(field)} onCheckedChange={(checked) => toggleTemplateField(side, field, checked === true)} />
                        <span className="text-sm">{fieldLabel(field)}</span>
                      </label>
                    ))}
                  </div>
                  {(templateForm[side].includes("photo") ||
                    templateForm[side].includes("organization_logo")) && (
                    <div className="mt-3 space-y-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      {templateForm[side].includes("photo") && (
                        <p>
                          <span className="font-semibold text-slate-800">Photo:</span>{" "}
                          there is no separate HR photo upload. The card uses the avatar from the
                          security user linked to that employee (Users / Profile). Open the
                          employee in HR and confirm a User is linked, and that user has a photo.
                        </p>
                      )}
                      {templateForm[side].includes("organization_logo") && (
                        <p>
                          <span className="font-semibold text-slate-800">Organization logo:</span>{" "}
                          uses the logo from{" "}
                          <a
                            href="/dashboard/settings?tab=brand"
                            className="font-semibold text-amber-800 underline underline-offset-2"
                          >
                            Settings → Brand
                          </a>
                          . Set PDF logo or light logo there.
                        </p>
                      )}
                    </div>
                  )}
                </fieldset>
              ))}
              <div className="flex flex-wrap gap-5">
                <label className="flex min-h-10 items-center gap-2"><Checkbox checked={templateForm.is_default} onCheckedChange={(checked) => setTemplateForm({ ...templateForm, is_default: checked === true })} /><span className="text-sm font-semibold">Default template</span></label>
                <label className="flex min-h-10 items-center gap-2"><Checkbox checked={templateForm.is_active} onCheckedChange={(checked) => setTemplateForm({ ...templateForm, is_active: checked === true })} /><span className="text-sm font-semibold">Active for issuing</span></label>
              </div>
            </div>
            <div className="space-y-4 lg:sticky lg:top-0 lg:self-start">
              <IdentityCardPreview
                template={{ ...templateForm, id: 0 }}
                showBack
                demo
                organizationLogoUrl={organizationLogoUrl}
                organizationName={organizationNameFromBrand}
              />
              <p className="text-xs text-muted-foreground">
                Preview uses sample employee data so every toggled field is visible.
                Real cards fill from the employee record and brand settings.
              </p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setTemplateEditor(null)}>Cancel</Button>
                <Button type="submit" disabled={templateMutation.isPending || templateForm.front_fields.length === 0}>
                  {templateMutation.isPending ? "Saving…" : "Save template"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTemplate)} onOpenChange={(open) => !open && setDeleteTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete unused template?</DialogTitle>
            <DialogDescription>
              Templates linked to issued cards or marked as default cannot be deleted. You can edit the template and make it inactive instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTemplate(null)}>Cancel</Button>
            <Button type="button" variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
              Delete template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
