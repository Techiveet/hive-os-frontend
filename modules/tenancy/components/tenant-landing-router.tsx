"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useTranslation } from "@/store/use-translation";
import { resolveLandingTemplate } from "@/modules/tenancy/landing-template";

const TenantBusinessLanding = dynamic(
  () =>
    import("@/modules/tenancy/components/tenant-business-landing").then(
      (m) => m.TenantBusinessLanding,
    ),
  { ssr: false, loading: () => null },
);
const RestaurantLandingTemplate = dynamic(
  () =>
    import("@/modules/tenancy/components/restaurant-landing-template").then(
      (m) => m.RestaurantLandingTemplate,
    ),
  { ssr: false, loading: () => null },
);
const LmsLandingTemplate = dynamic(
  () => import("@/modules/tenancy/components/lms-landing-template"),
  { ssr: false, loading: () => null },
);
const MarketplacePreloader = dynamic(
  () =>
    import("@/modules/b2b-marketplace/components/MarketplacePreloader").then(
      (m) => m.MarketplacePreloader,
    ),
  { ssr: false, loading: () => null },
);
const LmsPreloader = dynamic(
  () => import("@/modules/Lms/components/lms-preloader").then((m) => m.LmsPreloader),
  { ssr: false, loading: () => null },
);

export interface TenantLandingRouterProps {
  isLoadingTenantLanding: boolean;
  tenantLandingPayload: any;
  brandSettings: any;
  detectedTenantSlug: string;
}

export function TenantLandingRouter({
  isLoadingTenantLanding,
  tenantLandingPayload,
  brandSettings,
  detectedTenantSlug,
}: TenantLandingRouterProps) {
  const { t } = useTranslation();

  if (isLoadingTenantLanding) {
    const looksLikeLms =
      tenantLandingPayload?.business_type === "lms" ||
      detectedTenantSlug === "lms-demo" ||
      (detectedTenantSlug?.includes("lms") ?? false);

    if (looksLikeLms) {
      return <LmsPreloader brandName={brandSettings?.app_title || detectedTenantSlug} />;
    }

    if (detectedTenantSlug === "savory-lounge") {
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-[#080510]">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#FF1A43] border-t-transparent" />
            <p className="text-white/60 font-black tracking-widest text-xs uppercase">
              Loading {brandSettings?.app_title || "Savory Lounge"}...
            </p>
          </div>
        </div>
      );
    }
    return <MarketplacePreloader brandName={brandSettings?.app_title || detectedTenantSlug} />;
  }

  const businessType = tenantLandingPayload?.business_type;
  const resolvedTemplate = resolveLandingTemplate(tenantLandingPayload?.landing_page_template);
  const selectedTemplateKey = resolvedTemplate.meta?.template_key ?? "";
  const selectedTemplateBusinessType = resolvedTemplate.meta?.business_type ?? businessType;
  const hasCustomCode =
    (resolvedTemplate.rendering.mode === "custom_code" ||
      resolvedTemplate.rendering.mode === "raw_package") &&
    Boolean(resolvedTemplate.rendering.html?.trim());
  const isSavoryLounge =
    selectedTemplateKey === "savory-lounge-nightclub" ||
    selectedTemplateKey === "savory-lounge" ||
    detectedTenantSlug === "savory-lounge" ||
    (["nightclub", "restaurant", "lounge"].includes(businessType) &&
      selectedTemplateKey === "signature");
  const isLmsTemplate =
    selectedTemplateKey === "lms-academy" ||
    selectedTemplateKey === "lms" ||
    detectedTenantSlug === "lms-demo" ||
    (selectedTemplateBusinessType === "lms" &&
      (!selectedTemplateKey || selectedTemplateKey === "signature"));
  const isB2BTemplate =
    selectedTemplateKey === "b2b-marketplace" ||
    selectedTemplateKey === "b2b" ||
    detectedTenantSlug === "global-b2b" ||
    (selectedTemplateBusinessType === "b2b" &&
      (!selectedTemplateKey || selectedTemplateKey === "signature"));

  const hasAssignedTemplate = Boolean(
    (tenantLandingPayload?.has_template && tenantLandingPayload?.landing_page_template) ||
      isSavoryLounge ||
      isLmsTemplate ||
      isB2BTemplate ||
      hasCustomCode ||
      [
        "lms-academy",
        "savory-lounge-nightclub",
        "b2b-marketplace",
        "restaurant-modern",
        "water-beverage",
        "technology-company",
        "lms",
        "savory-lounge",
        "b2b",
        "restaurant",
        "water-bottling",
        "software-development",
      ].includes(selectedTemplateKey) ||
      [
        "lanouveil",
        "global-b2b",
        "savory-lounge",
        "aquauno",
        "aquavivo",
        "techive",
        "lms-demo",
      ].includes(detectedTenantSlug),
  );

  if (!hasAssignedTemplate) {
    if (typeof window !== "undefined") {
      window.location.replace("/sign-in");
    }
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-slate-400 font-medium">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (isLmsTemplate) {
    return (
      <LmsLandingTemplate
        brandSettings={brandSettings}
        template={resolvedTemplate}
        tenantName={
          tenantLandingPayload?.tenant?.name ||
          brandSettings?.app_title ||
          detectedTenantSlug ||
          t("landing.common.tenant_workspace", "Tenant Workspace")
        }
      />
    );
  }

  if (hasCustomCode) {
    return (
      <TenantBusinessLanding
        brandSettings={brandSettings}
        businessLabel={
          tenantLandingPayload?.business_type_meta?.label ||
          tenantLandingPayload?.business_type ||
          t("landing.common.general_business", "General Business")
        }
        template={resolvedTemplate}
        tenantName={
          tenantLandingPayload?.tenant?.name ||
          brandSettings?.app_title ||
          detectedTenantSlug ||
          t("landing.common.tenant_workspace", "Tenant Workspace")
        }
        tenantData={tenantLandingPayload?.tenant_data || tenantLandingPayload?.tenant}
        collections={tenantLandingPayload?.collections}
      />
    );
  }

  if (isSavoryLounge) {
    return (
      <RestaurantLandingTemplate
        brandSettings={brandSettings}
        template={resolvedTemplate}
        tenantName={
          tenantLandingPayload?.tenant?.name ||
          brandSettings?.app_title ||
          detectedTenantSlug ||
          t("landing.common.tenant_workspace", "Tenant Workspace")
        }
      />
    );
  }

  return (
    <TenantBusinessLanding
      brandSettings={brandSettings}
      businessLabel={
        tenantLandingPayload?.business_type_meta?.label ||
        tenantLandingPayload?.business_type ||
        t("landing.common.general_business", "General Business")
      }
      template={resolvedTemplate}
      tenantName={
        tenantLandingPayload?.tenant?.name ||
        brandSettings?.app_title ||
        detectedTenantSlug ||
        t("landing.common.tenant_workspace", "Tenant Workspace")
      }
      tenantData={tenantLandingPayload?.tenant_data || tenantLandingPayload?.tenant}
      collections={tenantLandingPayload?.collections}
    />
  );
}
