"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowUpDown,
  BadgeCheck,
  Bell,
  Boxes,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  DollarSign,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  Filter,
  Grid,
  Info,
  Layers,
  LayoutGrid,
  List,
  Loader2,
  Percent,
  RefreshCw,
  RotateCcw,
  Route,
  Search,
  ShieldCheck,
  Sliders,
  Sparkles,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  assignTenantSubscription,
  fetchSubscriptionAdmin,
  updateSubscriptionAdminPlans,
  updateSubscriptionAdminPricing,
} from "@/modules/subscription/api";
import { SubscriptionBillingControls } from "@/modules/subscription/components/subscription-billing-controls";
import type {
  SubscriptionAdminFeature,
  SubscriptionAdminModule,
  SubscriptionAdminPlan,
  SubscriptionAdminTenant,
  SubscriptionBillingPolicy,
  SubscriptionCoupon,
  TenantCatalogModule,
} from "@/modules/subscription/types";

// ============================================================================
// CONSTANTS & HELPERS
// ============================================================================

const STATUSES = [
  "active",
  "trial",
  "pending_activation",
  "expired",
  "suspended",
  "cancelled",
  "inactive",
];

const BACKEND_MODULE_MAP: Record<string, string> = {
  image_editor: "Modules\\Core",
  video_player: "Modules\\Core",
  audio_player: "Modules\\Core",
  media_library: "Modules\\Core",
  document_converter: "Modules\\Core",
  file_manager: "Modules\\Core",
  audit_logs: "Modules\\Core",
  alerts_center: "Modules\\Core",
  desktop_sync: "Modules\\DesktopSync",
  workflow_automation: "Modules\\Workflow",
  project_management: "Modules\\ProjectManagement",
  human_resources: "Modules\\HumanResources",
  vacancy_management: "Modules\\HumanResources",
  employee_id_management: "Modules\\HumanResources",
  attendance_management: "Modules\\Attendance",
  payroll_management: "Modules\\Payroll",
  performance_management: "Modules\\PerformanceManagement",
  daily_reports: "Modules\\DailyReport",
  advanced_analytics: "Modules\\Vantage",
  api_access: "Modules\\Identity",
  security_management: "Modules\\Identity",
  api_docs: "App\\Http\\Controllers\\ApiDocumentationController",
  invoice_billing: "Modules\\Finance",
  financial_management: "Modules\\Finance",
  procurement_management: "Modules\\ProcurementManagement",
  supply_chain_management: "Modules\\SupplyChain",
  logistics_freight_forwarding: "Modules\\Logistics",
  sales_management: "Modules\\Sales",
  agriculture: "Modules\\Agriculture",
  vantage_bi: "Modules\\Vantage",
  strategic_planning: "Modules\\StrategicPlanning",
  internal_audit: "Modules\\InternalAudit",
  service_management: "Modules\\ServiceManagement",
  fleet_management: "Modules\\Fleet",
  crm: "Modules\\Crm",
  inventory_control: "Modules\\Inventory",
  warehouse_management: "Modules\\Warehouse",
  car_parking_management: "Modules\\CarParking",
  property_management: "Modules\\PropertyManagement",
  production_management: "Modules\\Production",
  hospitality: "Modules\\Hospitality",
  b2b_marketplace: "Modules\\B2BMarketplace",
  learning_management: "Modules\\LearningManagement",
  premium_landing_templates: "Modules\\LandingTemplates",
  support_bot: "Modules\\SupportBot",
  mailbox: "Modules\\MailBox",
  chat: "Modules\\Chat",
  video_conferencing: "Modules\\Chat",
};

const FRONTEND_ROUTE_MAP: Record<string, string> = {
  chat: "/dashboard/chat",
  daily_reports: "/dashboard/daily-reports",
  video_conferencing: "/dashboard/video-conferencing",
  human_resources: "/dashboard/human-resources",
  employee_id_management: "/dashboard/identity-cards",
  attendance_management: "/dashboard/attendance",
  payroll_management: "/dashboard/payroll",
  financial_management: "/dashboard/finance",
  invoice_billing: "/dashboard/finance/invoices",
  procurement_management: "/dashboard/procurement",
  supply_chain_management: "/dashboard/supply-chain",
  logistics_freight_forwarding: "/dashboard/logistics",
  sales_management: "/dashboard/sales",
  crm: "/dashboard/crm",
  fleet_management: "/dashboard/fleet",
  service_management: "/dashboard/service",
  property_management: "/dashboard/property",
  car_parking_management: "/dashboard/parking",
  internal_audit: "/dashboard/internal-audit",
  strategic_planning: "/dashboard/strategy",
  vantage_bi: "/dashboard/vantage",
  agriculture: "/dashboard/agriculture",
  hospitality: "/dashboard/hospitality",
  b2b_marketplace: "/dashboard/b2b-marketplace",
  learning_management: "/dashboard/lms",
  premium_landing_templates: "/dashboard/landing-templates",
  support_bot: "/dashboard/support-bot",
  workflow_automation: "/dashboard/workflow",
  project_management: "/dashboard/project-management",
  inventory_control: "/dashboard/inventory",
  warehouse_management: "/dashboard/warehouse",
  production_management: "/dashboard/production",
  file_manager: "/dashboard/storage",
  media_library: "/dashboard/storage",
  video_player: "/dashboard/storage",
  audio_player: "/dashboard/storage",
  image_editor: "/dashboard/storage",
  document_converter: "/dashboard/tools/converter",
  desktop_sync: "/dashboard/storage",
  mailbox: "/dashboard/mail",
  audit_logs: "/dashboard/audit-logs",
  alerts_center: "/dashboard/alerts",
  security_management: "/dashboard/security",
  api_docs: "/docs",
};

const TONE_BADGE_CLASSES: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
  amber: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
  rose: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800",
  violet: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800",
  purple: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800",
  cyan: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-300 dark:border-cyan-800",
  sky: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800",
  pink: "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/50 dark:text-pink-300 dark:border-pink-800",
  slate: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

const PLAN_BADGE_CLASSES: Record<string, string> = {
  larva: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300",
  startup: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300",
  business: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300",
  enterprise: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300",
  overlord: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300",
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300",
  trial: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300",
  pending_activation: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300",
  expired: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300",
  suspended: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300",
  cancelled: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300",
  inactive: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300",
};

type PlanDraft = {
  name: string;
  description: string;
  monthly_price_etb: number;
  mail_storage_quota_mb: number;
  trial_days: number;
  status: "active" | "inactive";
  enabled_modules: string[];
};

type PlanUpdatePayload = {
  plans: Record<string, PlanDraft>;
};

type TenantAssignmentPayload = {
  plan: string;
  status: string;
  billing_mode: "standard" | "hybrid";
  billing_cycle: "monthly" | "yearly";
  reset_billing_window: boolean;
  module_subscriptions: {
    enabled_modules: string[];
    custom_modules: [];
  };
};

type PriceDraft = {
  monthly_price_etb: number;
};

type PricingUpdatePayload = {
  modules: Record<string, PriceDraft>;
  submodules: Record<string, PriceDraft>;
  features: Record<string, PriceDraft>;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message || fallback;
  }
  return fallback;
};

const toPrice = (value: unknown): number => {
  const next = Number(value ?? 0);
  return Number.isFinite(next) && next >= 0 ? next : 0;
};

const featureSummary = (module: SubscriptionAdminModule): string => {
  const submoduleCount = module.submodules?.length ?? 0;
  const featureCount = module.features?.length ?? 0;
  return `${submoduleCount} submodules • ${featureCount} features`;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SubscriptionAdminClient() {
  const queryClient = useQueryClient();
  const [globalSearch, setGlobalSearch] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("overview");
  const [selectedTenantId, setSelectedTenantId] = React.useState<string | null>(null);

  // Initialize activeTab & selectedTenantId from URL params or localStorage
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const validTabs = ["overview", "plans", "pricing", "tenants", "billing"];
    const tabParam = params.get("tab");
    const localTab = localStorage.getItem("hive_subscription_admin_tab");
    const initialTab = tabParam && validTabs.includes(tabParam)
      ? tabParam
      : localTab && validTabs.includes(localTab)
      ? localTab
      : null;

    if (initialTab) {
      setActiveTab(initialTab);
    }

    const tenantParam = params.get("tenant");
    const localTenant = localStorage.getItem("hive_subscription_admin_tenant");
    const initialTenant = tenantParam || localTenant;
    if (initialTenant) {
      setSelectedTenantId(initialTenant);
    }
  }, []);

  const handleTabChange = React.useCallback((nextTab: string) => {
    setActiveTab(nextTab);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("hive_subscription_admin_tab", nextTab);
        const url = new URL(window.location.href);
        url.searchParams.set("tab", nextTab);
        window.history.replaceState(null, "", url.toString());
      } catch {
        // ignore
      }
    }
  }, []);

  const handleSelectTenant = React.useCallback((tenantId: string) => {
    setSelectedTenantId(tenantId);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("hive_subscription_admin_tenant", tenantId);
        const url = new URL(window.location.href);
        url.searchParams.set("tenant", tenantId);
        window.history.replaceState(null, "", url.toString());
      } catch {
        // ignore
      }
    }
  }, []);

  const { data, error, isError, isLoading, refetch } = useQuery({
    queryKey: ["subscription-admin", globalSearch],
    queryFn: () => fetchSubscriptionAdmin({ search: globalSearch }),
  });

  const plans: SubscriptionAdminPlan[] = React.useMemo(() => data?.data?.plans ?? [], [data]);
  const tenants: SubscriptionAdminTenant[] = React.useMemo(() => data?.data?.tenants ?? [], [data]);
  const catalog: TenantCatalogModule[] = React.useMemo(() => data?.data?.catalog ?? [], [data]);
  const registryModules: SubscriptionAdminModule[] = React.useMemo(() => data?.data?.modules ?? [], [data]);
  const planDefaults: Record<string, string[]> = React.useMemo(() => data?.data?.plan_defaults ?? {}, [data]);
  const billingPolicy: SubscriptionBillingPolicy | undefined = data?.data?.billing_policy;
  const coupons: SubscriptionCoupon[] = data?.data?.coupons ?? [];

  // Merge catalog with registry modules so every one of the 48 modules has full attributes
  const allModules: SubscriptionAdminModule[] = React.useMemo(() => {
    const registryMap = new Map(registryModules.map((m) => [m.slug, m]));
    const catalogMap = new Map(catalog.map((m) => [m.slug, m]));
    const mergedSlugs = Array.from(new Set([...catalog.map((m) => m.slug), ...registryModules.map((m) => m.slug)]));

    return mergedSlugs.map((slug, index) => {
      const reg = registryMap.get(slug);
      const cat = catalogMap.get(slug);

      return {
        id: reg?.id ?? index + 1,
        slug,
        name: cat?.name ?? reg?.name ?? slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        description: cat?.description ?? reg?.description ?? "",
        category: cat?.category ?? reg?.category ?? "General",
        tone: cat?.tone ?? reg?.tone ?? "blue",
        recommended_plans: cat?.recommended_plans ?? reg?.recommended_plans ?? ["business", "enterprise", "overlord"],
        monthly_price_etb: toPrice(cat?.monthly_price_etb ?? reg?.monthly_price_etb ?? 0),
        billing_type: cat?.billing_type ?? reg?.billing_type ?? (cat?.is_addon ? "addon" : "module"),
        is_addon: cat?.is_addon ?? reg?.is_addon ?? false,
        backend_module: reg?.backend_module ?? BACKEND_MODULE_MAP[slug] ?? null,
        frontend_module: reg?.frontend_module ?? FRONTEND_ROUTE_MAP[slug] ?? null,
        submodules: reg?.submodules ?? [],
        features: reg?.features ?? [],
      };
    });
  }, [catalog, registryModules]);

  // Distinct categories across all 48 modules
  const categories = React.useMemo(() => {
    const set = new Set<string>();
    allModules.forEach((m) => {
      if (m.category) set.add(m.category);
    });
    return Array.from(set).sort();
  }, [allModules]);

  const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId) ?? tenants[0];

  React.useEffect(() => {
    if (tenants.length === 0) return;
    if (typeof window !== "undefined") {
      const paramTenant = new URLSearchParams(window.location.search).get("tenant");
      const localTenant = localStorage.getItem("hive_subscription_admin_tenant");
      const targetTenant = paramTenant || localTenant;
      if (targetTenant && tenants.some((t) => t.id === targetTenant)) {
        if (selectedTenantId !== targetTenant) {
          setSelectedTenantId(targetTenant);
        }
        return;
      }
    }
    if (!selectedTenantId && tenants[0]) {
      setSelectedTenantId(tenants[0].id);
    }
  }, [selectedTenantId, tenants]);

  // Projected MRR calculation across active/trial tenants
  const projectedMrr = React.useMemo(() => {
    const planPriceMap = new Map(plans.map((p) => [p.slug, p.monthly_price_etb]));
    const modulePriceMap = new Map(allModules.map((m) => [m.slug, m.monthly_price_etb ?? 0]));

    return tenants.reduce((total, tenant) => {
      const status = tenant.subscription?.status ?? "active";
      if (status !== "active" && status !== "trial") return total;

      const planSlug = tenant.subscription?.plan ?? tenant.plan ?? "business";
      const basePrice = planPriceMap.get(planSlug) ?? 0;
      const enabled = tenant.subscription?.module_subscriptions?.enabled_modules ?? [];
      const defaults = planDefaults[planSlug] ?? [];
      const extraAddons = enabled.filter((slug) => !defaults.includes(slug));
      const addonsPrice = extraAddons.reduce((sum, slug) => sum + (modulePriceMap.get(slug) ?? 0), 0);

      return total + basePrice + addonsPrice;
    }, 0);
  }, [allModules, planDefaults, plans, tenants]);

  // Mutations
  const planMutation = useMutation({
    mutationFn: (payload: PlanUpdatePayload) => updateSubscriptionAdminPlans(payload),
    onSuccess: async () => {
      toast.success("Subscription plans updated successfully.");
      await queryClient.invalidateQueries({ queryKey: ["subscription-admin"] });
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Could not save plans.")),
  });

  const tenantMutation = useMutation({
    mutationFn: ({ tenantId, payload }: { tenantId: string; payload: TenantAssignmentPayload }) =>
      assignTenantSubscription(tenantId, payload),
    onSuccess: async () => {
      toast.success("Tenant subscription assigned successfully.");
      await queryClient.invalidateQueries({ queryKey: ["subscription-admin"] });
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Could not update tenant subscription.")),
  });

  const pricingMutation = useMutation({
    mutationFn: (payload: PricingUpdatePayload) => updateSubscriptionAdminPricing(payload),
    onSuccess: async () => {
      toast.success("Module and feature pricing saved.");
      await queryClient.invalidateQueries({ queryKey: ["subscription-admin"] });
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Could not save module pricing.")),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-semibold text-muted-foreground">Loading system module catalog & subscriptions...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <section
        role="alert"
        className="rounded-2xl border border-red-700 bg-red-50 p-6 text-red-950 shadow-sm dark:border-red-300 dark:bg-red-950 dark:text-red-100"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0" />
          <div>
            <h2 className="text-xl font-black">Subscription catalog unavailable</h2>
            <p className="mt-2 text-sm leading-6">
              {getErrorMessage(
                error,
                "The subscription registry could not be loaded. No plan or tenant data has been changed.",
              )}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => void refetch()}
              className="mt-4 min-h-11 border-red-700 bg-white text-red-950 hover:bg-red-100 dark:border-red-300 dark:bg-red-950 dark:text-red-100 dark:hover:bg-red-900"
            >
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Try again
            </Button>
          </div>
        </div>
      </section>
    );
  }

  const activeTenantsCount = tenants.filter((t) => (t.subscription?.status ?? "active") === "active").length;
  const trialTenantsCount = tenants.filter((t) => t.subscription?.status === "trial").length;
  const majorModulesCount = allModules.filter((m) => !m.is_addon).length;
  const addonModulesCount = allModules.filter((m) => m.is_addon).length;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* EXECUTIVE KPI STRIP */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Tenants Portfolio */}
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tenants</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2 text-3xl font-black tracking-tight text-foreground">{tenants.length}</div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
              <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {activeTenantsCount} Active
              </Badge>
              <Badge variant="outline" className="border-sky-300 bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                {trialTenantsCount} Trial
              </Badge>
              {tenants.length - activeTenantsCount - trialTenantsCount > 0 ? (
                <Badge variant="outline" className="text-muted-foreground">
                  {tenants.length - activeTenantsCount - trialTenantsCount} Other
                </Badge>
              ) : null}
            </div>
          </div>

          {/* Card 2: System Module Catalog */}
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">System Modules</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Boxes className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight text-foreground">{allModules.length}</span>
              <span className="text-xs font-semibold text-muted-foreground">Complete Catalog</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <span>{majorModulesCount} Major</span>
              <span>•</span>
              <span>{addonModulesCount} Add-ons</span>
              <span>•</span>
              <span>{categories.length} Categories</span>
            </div>
          </div>

          {/* Card 3: Projected Monthly MRR */}
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Projected MRR</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2 text-3xl font-black tracking-tight text-foreground">
              ETB {projectedMrr.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Monthly run-rate across base tiers & active add-ons
            </div>
          </div>

          {/* Card 4: Tiers & Promos */}
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tiers & Inbound</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight text-foreground">{plans.length}</span>
              <span className="text-xs font-semibold text-muted-foreground">Active Plans</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{coupons.filter((c) => c.is_active).length} active coupons</span>
              <Link href="/dashboard/subscriptions/demo-requests" className="inline-flex items-center font-bold text-primary hover:underline">
                <Bell className="mr-1 h-3.5 w-3.5" />
                Demos
              </Link>
            </div>
          </div>
        </section>

        {/* HEADER CONTROL BAR */}
        <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-black tracking-tight">
                <Sliders className="h-5 w-5 text-primary" />
                Central Subscription Hub
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage all 48 system modules, configure plan feature matrices, price overrides, and tenant entitlements.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={globalSearch}
                  onChange={(event) => setGlobalSearch(event.target.value)}
                  placeholder="Global search (modules, tenants)..."
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void refetch()}
                className="h-10 rounded-full font-bold"
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Refresh
              </Button>
              <Link href="/dashboard/subscriptions/demo-requests">
                <Button variant="default" size="sm" className="h-10 rounded-full font-bold">
                  <Bell className="mr-1.5 h-3.5 w-3.5" />
                  Inbound Demos
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* MAIN NAVIGATION TABS */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="gap-5">
          <TabsList className="h-auto max-w-full justify-start overflow-x-auto p-1.5" aria-label="Subscription administration tabs">
            <TabsTrigger value="overview" className="flex items-center gap-2 px-4 py-2 text-sm font-bold">
              <Boxes className="h-4 w-4" />
              System Catalog ({allModules.length})
            </TabsTrigger>
            <TabsTrigger value="plans" className="flex items-center gap-2 px-4 py-2 text-sm font-bold">
              <Sliders className="h-4 w-4" />
              Plan Feature Matrix
            </TabsTrigger>
            <TabsTrigger value="pricing" className="flex items-center gap-2 px-4 py-2 text-sm font-bold">
              <DollarSign className="h-4 w-4" />
              Module Pricing
            </TabsTrigger>
            <TabsTrigger value="tenants" className="flex items-center gap-2 px-4 py-2 text-sm font-bold">
              <Users className="h-4 w-4" />
              Tenant Subscriptions ({tenants.length})
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2 px-4 py-2 text-sm font-bold">
              <ShieldCheck className="h-4 w-4" />
              Billing Controls & Coupons
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: FULL SYSTEM CATALOG */}
          <TabsContent value="overview">
            <CatalogExplorer
              modules={allModules}
              categories={categories}
              plans={plans}
              globalSearch={globalSearch}
            />
          </TabsContent>

          {/* TAB 2: PLAN FEATURE MATRIX */}
          <TabsContent value="plans">
            <PlanMatrix
              plans={plans}
              modules={allModules}
              categories={categories}
              planDefaults={planDefaults}
              saving={planMutation.isPending}
              onSave={(payload) => planMutation.mutate(payload)}
            />
          </TabsContent>

          {/* TAB 3: MODULE PRICING MATRIX */}
          <TabsContent value="pricing">
            <PricingMatrix
              modules={allModules}
              categories={categories}
              saving={pricingMutation.isPending}
              onSave={(payload) => pricingMutation.mutate(payload)}
            />
          </TabsContent>

          {/* TAB 4: TENANT ASSIGNMENT */}
          <TabsContent value="tenants">
            <TenantAssignment
              tenants={tenants}
              selectedTenant={selectedTenant}
              modules={allModules}
              categories={categories}
              plans={plans}
              planDefaults={planDefaults}
              onSelectTenant={handleSelectTenant}
              saving={tenantMutation.isPending}
              onSave={(tenantId, payload) => tenantMutation.mutate({ tenantId, payload })}
            />
          </TabsContent>

          {/* TAB 5: BILLING & COUPONS */}
          <TabsContent value="billing">
            {billingPolicy ? (
              <SubscriptionBillingControls policy={billingPolicy} coupons={coupons} plans={plans} />
            ) : null}
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

// ============================================================================
// TAB 1: SYSTEM CATALOG EXPLORER (All 48 modules view)
// ============================================================================

function CatalogExplorer({
  modules,
  categories,
  plans,
  globalSearch,
}: {
  modules: SubscriptionAdminModule[];
  categories: string[];
  plans: SubscriptionAdminPlan[];
  globalSearch: string;
}) {
  const [search, setSearch] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("all");
  const [selectedType, setSelectedType] = React.useState<"all" | "major" | "addon">("all");
  const [selectedPricing, setSelectedPricing] = React.useState<"all" | "paid" | "free">("all");
  const [selectedPlan, setSelectedPlan] = React.useState<string>("all");
  const [viewMode, setViewMode] = React.useState<"grid" | "table">("grid");
  const [inspectModule, setInspectModule] = React.useState<SubscriptionAdminModule | null>(null);

  // Synchronize local search with global search if entered
  React.useEffect(() => {
    setSearch(globalSearch);
  }, [globalSearch]);

  const filteredModules = React.useMemo(() => {
    return modules.filter((mod) => {
      // Search filter
      const q = search.trim().toLowerCase();
      if (q) {
        const matchesName = mod.name.toLowerCase().includes(q);
        const matchesSlug = mod.slug.toLowerCase().includes(q);
        const matchesDesc = (mod.description ?? "").toLowerCase().includes(q);
        const matchesCat = (mod.category ?? "").toLowerCase().includes(q);
        const matchesRoute = (mod.frontend_module ?? "").toLowerCase().includes(q);
        const matchesBackend = (mod.backend_module ?? "").toLowerCase().includes(q);
        if (!matchesName && !matchesSlug && !matchesDesc && !matchesCat && !matchesRoute && !matchesBackend) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== "all" && mod.category !== selectedCategory) {
        return false;
      }

      // Type filter
      if (selectedType === "major" && mod.is_addon) return false;
      if (selectedType === "addon" && !mod.is_addon) return false;

      // Pricing filter
      if (selectedPricing === "paid" && (mod.monthly_price_etb ?? 0) <= 0) return false;
      if (selectedPricing === "free" && (mod.monthly_price_etb ?? 0) > 0) return false;

      // Plan filter
      if (selectedPlan !== "all") {
        if (!mod.recommended_plans?.includes(selectedPlan)) return false;
      }

      return true;
    });
  }, [modules, search, selectedCategory, selectedType, selectedPricing, selectedPlan]);

  return (
    <section className="space-y-4 rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      {/* FILTER CONTROLS */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-black tracking-tight text-foreground">
              <Boxes className="h-5 w-5 text-primary" />
              System Modules Catalog Directory
            </h3>
            <p className="text-sm text-muted-foreground">
              Showing {filteredModules.length} of {modules.length} modules across the platform.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border/70 p-1 bg-muted/30">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold transition",
                  viewMode === "grid" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Grid className="h-3.5 w-3.5" />
                Cards
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold transition",
                  viewMode === "table" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="h-3.5 w-3.5" />
                Table
              </button>
            </div>
          </div>
        </div>

        {/* SEARCH AND QUICK SELECTORS */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by name, route, namespace..."
              className="pl-9"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as "all" | "major" | "addon")}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm font-medium"
          >
            <option value="all">All Module Types</option>
            <option value="major">Major Modules Only</option>
            <option value="addon">Add-on Modules Only</option>
          </select>

          <select
            value={selectedPricing}
            onChange={(e) => setSelectedPricing(e.target.value as "all" | "paid" | "free")}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm font-medium"
          >
            <option value="all">All Pricing Tiers</option>
            <option value="paid">Paid Modules (&gt; 0 ETB)</option>
            <option value="free">Free / Core Modules (0 ETB)</option>
          </select>

          <select
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm font-medium"
          >
            <option value="all">All Plan Tiers</option>
            {plans.map((p) => (
              <option key={p.slug} value={p.slug}>
                Included in {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* CATEGORY FILTER PILLS */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border/40 pt-3">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-bold transition",
              selectedCategory === "all"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted"
            )}
          >
            All Categories ({modules.length})
          </button>
          {categories.map((cat) => {
            const count = modules.filter((m) => m.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-bold transition",
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "border border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted"
                )}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* NO RESULTS VIEW */}
      {filteredModules.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-border/70 p-8 text-center">
          <Info className="h-8 w-8 text-muted-foreground" />
          <h4 className="mt-2 text-base font-bold text-foreground">No modules match your filters</h4>
          <p className="mt-1 text-xs text-muted-foreground">Try clearing search or picking a different category.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch("");
              setSelectedCategory("all");
              setSelectedType("all");
              setSelectedPricing("all");
              setSelectedPlan("all");
            }}
            className="mt-3 rounded-full"
          >
            Reset Filters
          </Button>
        </div>
      ) : null}

      {/* GRID VIEW */}
      {viewMode === "grid" && filteredModules.length > 0 ? (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredModules.map((module) => {
            const toneClass = TONE_BADGE_CLASSES[module.tone] ?? TONE_BADGE_CLASSES.blue;

            return (
              <div
                key={module.slug}
                className="flex flex-col justify-between rounded-xl border border-border/60 bg-background/70 p-4 transition hover:border-primary/50 hover:shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-foreground leading-snug">{module.name}</span>
                    <Badge variant={module.is_addon ? "outline" : "secondary"} className="shrink-0 text-[10px] uppercase">
                      {module.is_addon ? "Add-on" : "Major"}
                    </Badge>
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-muted-foreground">{module.slug}</div>

                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {module.description || "Core platform module offering dedicated tenant capabilities."}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className={cn("inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase", toneClass)}>
                      {module.category}
                    </span>
                    <Badge variant="outline" className="border-border text-[11px] font-semibold">
                      {(module.monthly_price_etb ?? 0) > 0 ? `ETB ${module.monthly_price_etb}/mo` : "Free"}
                    </Badge>
                  </div>

                  {/* Route hints & namespaces */}
                  <div className="mt-3 space-y-1 text-[11px] text-muted-foreground">
                    {module.frontend_module ? (
                      <div className="flex items-center gap-1 truncate font-mono">
                        <Route className="h-3 w-3 shrink-0 text-primary" />
                        <span className="truncate">{module.frontend_module}</span>
                      </div>
                    ) : null}
                    {module.backend_module ? (
                      <div className="truncate font-mono text-[10px] opacity-80">
                        {module.backend_module}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
                  <div className="text-[11px] font-semibold text-muted-foreground">
                    {featureSummary(module)}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setInspectModule(module)}
                    className="h-7 px-2 text-xs font-bold text-primary hover:bg-primary/10"
                  >
                    <Eye className="mr-1 h-3 w-3" />
                    Inspect
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* TABLE VIEW */}
      {viewMode === "table" && filteredModules.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full min-w-[840px] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Module / Slug</th>
                <th className="p-3">Category</th>
                <th className="p-3">Type</th>
                <th className="p-3">Monthly Price</th>
                <th className="p-3">Recommended Plans</th>
                <th className="p-3">Submodules / Features</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredModules.map((module) => (
                <tr key={module.slug} className="hover:bg-muted/20">
                  <td className="p-3">
                    <div className="font-bold text-foreground">{module.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">{module.slug}</div>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-xs">
                      {module.category}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Badge variant={module.is_addon ? "outline" : "secondary"} className="text-xs uppercase">
                      {module.is_addon ? "Addon" : "Major"}
                    </Badge>
                  </td>
                  <td className="p-3 font-semibold text-foreground">
                    {(module.monthly_price_etb ?? 0) > 0 ? `ETB ${module.monthly_price_etb}` : "Free"}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {module.recommended_plans?.map((planKey) => (
                        <span key={planKey} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                          {planKey}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{featureSummary(module)}</td>
                  <td className="p-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInspectModule(module)}
                      className="h-8 rounded-full text-xs font-bold"
                    >
                      <Eye className="mr-1 h-3 w-3" />
                      Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* INSPECT MODAL */}
      {inspectModule ? (
        <Dialog open={Boolean(inspectModule)} onOpenChange={(open) => !open && setInspectModule(null)}>
          <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Badge variant={inspectModule.is_addon ? "outline" : "secondary"}>
                  {inspectModule.is_addon ? "Add-on Module" : "Major System Module"}
                </Badge>
                <span className="text-xs font-semibold text-muted-foreground">{inspectModule.category}</span>
              </div>
              <DialogTitle className="text-xl font-black">{inspectModule.name}</DialogTitle>
              <DialogDescription className="font-mono text-xs text-muted-foreground">
                slug: {inspectModule.slug}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-sm">
                <p className="leading-relaxed text-foreground">{inspectModule.description}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border/50 p-3">
                  <div className="text-[11px] font-bold uppercase text-muted-foreground">Monthly Price</div>
                  <div className="mt-1 text-lg font-black text-foreground">
                    {(inspectModule.monthly_price_etb ?? 0) > 0 ? `ETB ${inspectModule.monthly_price_etb} / mo` : "Free"}
                  </div>
                </div>
                <div className="rounded-xl border border-border/50 p-3">
                  <div className="text-[11px] font-bold uppercase text-muted-foreground">Frontend Route</div>
                  <div className="mt-1 font-mono text-sm font-semibold text-primary">
                    {inspectModule.frontend_module || "Shared Workspace"}
                  </div>
                </div>
              </div>

              {inspectModule.backend_module ? (
                <div className="rounded-xl border border-border/50 p-3">
                  <div className="text-[11px] font-bold uppercase text-muted-foreground">Backend Architecture Namespace</div>
                  <div className="mt-1 font-mono text-xs font-semibold text-foreground">{inspectModule.backend_module}</div>
                </div>
              ) : null}

              <div>
                <h4 className="mb-2 text-sm font-bold text-foreground">Submodules & Functionalities ({inspectModule.submodules?.length ?? 0})</h4>
                <FeatureInventory module={inspectModule} />
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setInspectModule(null)} className="rounded-full">
                Close Inspector
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </section>
  );
}

// ============================================================================
// TAB 2: PLAN FEATURE MATRIX
// ============================================================================

function PlanMatrix({
  plans,
  modules,
  categories,
  planDefaults,
  saving,
  onSave,
}: {
  plans: SubscriptionAdminPlan[];
  modules: SubscriptionAdminModule[];
  categories: string[];
  planDefaults: Record<string, string[]>;
  saving: boolean;
  onSave: (payload: PlanUpdatePayload) => void;
}) {
  const [drafts, setDrafts] = React.useState<Record<string, PlanDraft>>({});
  const [expandedModules, setExpandedModules] = React.useState<Record<string, boolean>>({});
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState<"all" | "major" | "addon">("all");
  const [editingPlan, setEditingPlan] = React.useState<SubscriptionAdminPlan | null>(null);

  React.useEffect(() => {
    const next = Object.fromEntries(
      plans.map((plan) => [
        plan.slug,
        {
          name: plan.name,
          description: plan.description ?? "",
          monthly_price_etb: plan.monthly_price_etb,
          mail_storage_quota_mb: plan.mail_storage_quota_mb,
          trial_days: plan.trial_days ?? 0,
          status: plan.status,
          enabled_modules: planDefaults[plan.slug] ?? [],
        },
      ])
    );
    setDrafts(next);
  }, [planDefaults, plans]);

  const toggleModule = (plan: string, module: string) => {
    setDrafts((current) => {
      const enabled = new Set(current[plan]?.enabled_modules ?? []);
      if (enabled.has(module)) {
        enabled.delete(module);
      } else {
        enabled.add(module);
      }

      return {
        ...current,
        [plan]: {
          ...current[plan],
          enabled_modules: Array.from(enabled),
        },
      };
    });
  };

  const handleBulkPlanAction = (planSlug: string, action: "enable_all" | "disable_all" | "reset_defaults") => {
    if (action === "reset_defaults") {
      setDrafts((curr) => ({
        ...curr,
        [planSlug]: {
          ...curr[planSlug],
          enabled_modules: planDefaults[planSlug] ?? [],
        },
      }));
      toast.info(`Reset ${planSlug} to recommended defaults.`);
      return;
    }

    const targetModuleSlugs = filteredModules.map((m) => m.slug);
    setDrafts((curr) => {
      const existing = new Set(curr[planSlug]?.enabled_modules ?? []);
      if (action === "enable_all") {
        targetModuleSlugs.forEach((s) => existing.add(s));
        toast.info(`Enabled ${targetModuleSlugs.length} modules for ${planSlug}.`);
      } else {
        targetModuleSlugs.forEach((s) => existing.delete(s));
        toast.info(`Disabled ${targetModuleSlugs.length} modules for ${planSlug}.`);
      }
      return {
        ...curr,
        [planSlug]: {
          ...curr[planSlug],
          enabled_modules: Array.from(existing),
        },
      };
    });
  };

  const expandAll = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    modules.forEach((m) => {
      next[m.slug] = expand;
    });
    setExpandedModules(next);
  };

  const filteredModules = React.useMemo(() => {
    return modules.filter((m) => {
      const q = search.trim().toLowerCase();
      if (q) {
        const matchName = m.name.toLowerCase().includes(q);
        const matchSlug = m.slug.toLowerCase().includes(q);
        const matchCat = (m.category ?? "").toLowerCase().includes(q);
        if (!matchName && !matchSlug && !matchCat) return false;
      }
      if (categoryFilter !== "all" && m.category !== categoryFilter) return false;
      if (typeFilter === "major" && m.is_addon) return false;
      if (typeFilter === "addon" && !m.is_addon) return false;
      return true;
    });
  }, [modules, search, categoryFilter, typeFilter]);

  return (
    <section className="space-y-4 rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      {/* HEADER & ACTIONS */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-black tracking-tight text-foreground">Plan Feature Matrix</h3>
            <p className="text-sm text-muted-foreground">
              Define which modules and submodules are bundled into each subscription tier by default.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => expandAll(true)}
              className="rounded-full text-xs font-bold"
            >
              Expand All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => expandAll(false)}
              className="rounded-full text-xs font-bold"
            >
              Collapse All
            </Button>
            <Button onClick={() => onSave({ plans: drafts })} disabled={saving} className="rounded-full font-bold">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Save All Plans
            </Button>
          </div>
        </div>

        {/* FILTERS TOOLBAR */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search matrix modules..."
              className="pl-9"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as "all" | "major" | "addon")}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm font-medium"
          >
            <option value="all">All Module Types</option>
            <option value="major">Major Modules</option>
            <option value="addon">Add-on Modules</option>
          </select>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Showing {filteredModules.length} of {modules.length} modules</span>
          </div>
        </div>

        {/* CATEGORY FILTER PILLS */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border/40 pt-3">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-bold transition",
              categoryFilter === "all"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted"
            )}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-bold transition",
                categoryFilter === cat
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "border border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* MATRIX TABLE */}
      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Feature Module</th>
              {plans.map((plan) => {
                const count = drafts[plan.slug]?.enabled_modules?.length ?? 0;
                return (
                  <th key={plan.slug} className="p-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-foreground">{plan.name}</span>
                        <button
                          type="button"
                          onClick={() => setEditingPlan(plan)}
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          title={`Edit ${plan.name} quotas & price`}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1 font-mono text-[11px] font-semibold text-muted-foreground">
                        <span>ETB {drafts[plan.slug]?.monthly_price_etb ?? plan.monthly_price_etb}</span>
                        <span>•</span>
                        <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                          {count} / {modules.length}
                        </Badge>
                      </div>
                      {/* Bulk actions */}
                      <div className="mt-1 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleBulkPlanAction(plan.slug, "enable_all")}
                          className="text-[10px] font-bold text-primary hover:underline"
                        >
                          + All
                        </button>
                        <span className="text-[10px] text-muted-foreground">•</span>
                        <button
                          type="button"
                          onClick={() => handleBulkPlanAction(plan.slug, "disable_all")}
                          className="text-[10px] font-bold text-muted-foreground hover:underline"
                        >
                          - All
                        </button>
                        <span className="text-[10px] text-muted-foreground">•</span>
                        <button
                          type="button"
                          onClick={() => handleBulkPlanAction(plan.slug, "reset_defaults")}
                          className="text-[10px] font-bold text-amber-600 hover:underline dark:text-amber-400"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {filteredModules.map((module) => {
              const expanded = Boolean(expandedModules[module.slug]);

              return (
                <React.Fragment key={module.slug}>
                  <tr className="hover:bg-muted/15">
                    <td className="p-3 align-top">
                      <button
                        type="button"
                        onClick={() => setExpandedModules((current) => ({ ...current, [module.slug]: !expanded }))}
                        className="flex w-full items-start gap-2 text-left"
                      >
                        {expanded ? (
                          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{module.name}</span>
                            <Badge variant={module.is_addon ? "outline" : "secondary"} className="text-[10px]">
                              {module.is_addon ? "Add-on" : "Major"}
                            </Badge>
                          </div>
                          <span className="block text-xs text-muted-foreground">
                            {module.category} • {featureSummary(module)}
                          </span>
                        </div>
                      </button>
                    </td>

                    {plans.map((plan) => {
                      const active = drafts[plan.slug]?.enabled_modules?.includes(module.slug);
                      return (
                        <td key={`${plan.slug}-${module.slug}`} className="p-3 align-middle">
                          <button
                            type="button"
                            onClick={() => toggleModule(plan.slug, module.slug)}
                            className={cn(
                              "flex h-8 w-14 items-center justify-center rounded-lg border text-xs font-bold transition shadow-2xs",
                              active
                                ? "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500"
                                : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50"
                            )}
                            aria-label={`${active ? "Remove" : "Add"} ${module.name} on ${plan.name}`}
                          >
                            {active ? "ON" : "OFF"}
                          </button>
                        </td>
                      );
                    })}
                  </tr>

                  {expanded ? (
                    <tr className="border-t border-border/30 bg-muted/20">
                      <td colSpan={plans.length + 1} className="p-4">
                        <FeatureInventory module={module} />
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* EDIT PLAN MODAL */}
      {editingPlan ? (
        <Dialog open={Boolean(editingPlan)} onOpenChange={(open) => !open && setEditingPlan(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-black">Edit Plan: {editingPlan.name}</DialogTitle>
              <DialogDescription>Update pricing, storage quotas, and trial policies.</DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-sm">
              <label className="block space-y-1">
                <span className="font-semibold text-foreground">Plan Name</span>
                <Input
                  value={drafts[editingPlan.slug]?.name ?? editingPlan.name}
                  onChange={(e) =>
                    setDrafts((curr) => ({
                      ...curr,
                      [editingPlan.slug]: { ...curr[editingPlan.slug], name: e.target.value },
                    }))
                  }
                />
              </label>

              <label className="block space-y-1">
                <span className="font-semibold text-foreground">Monthly Price (ETB)</span>
                <Input
                  type="number"
                  min={0}
                  value={drafts[editingPlan.slug]?.monthly_price_etb ?? editingPlan.monthly_price_etb}
                  onChange={(e) =>
                    setDrafts((curr) => ({
                      ...curr,
                      [editingPlan.slug]: { ...curr[editingPlan.slug], monthly_price_etb: toPrice(e.target.value) },
                    }))
                  }
                />
              </label>

              <label className="block space-y-1">
                <span className="font-semibold text-foreground">Mail & Cloud Storage Quota (MB)</span>
                <Input
                  type="number"
                  min={100}
                  value={drafts[editingPlan.slug]?.mail_storage_quota_mb ?? editingPlan.mail_storage_quota_mb}
                  onChange={(e) =>
                    setDrafts((curr) => ({
                      ...curr,
                      [editingPlan.slug]: {
                        ...curr[editingPlan.slug],
                        mail_storage_quota_mb: parseInt(e.target.value, 10) || 5000,
                      },
                    }))
                  }
                />
              </label>

              <label className="block space-y-1">
                <span className="font-semibold text-foreground">Trial Days</span>
                <Input
                  type="number"
                  min={0}
                  max={365}
                  value={drafts[editingPlan.slug]?.trial_days ?? editingPlan.trial_days}
                  onChange={(e) =>
                    setDrafts((curr) => ({
                      ...curr,
                      [editingPlan.slug]: { ...curr[editingPlan.slug], trial_days: parseInt(e.target.value, 10) || 0 },
                    }))
                  }
                />
              </label>

              <label className="block space-y-1">
                <span className="font-semibold text-foreground">Status</span>
                <select
                  value={drafts[editingPlan.slug]?.status ?? editingPlan.status}
                  onChange={(e) =>
                    setDrafts((curr) => ({
                      ...curr,
                      [editingPlan.slug]: {
                        ...curr[editingPlan.slug],
                        status: e.target.value as "active" | "inactive",
                      },
                    }))
                  }
                  className="h-10 w-full rounded-lg border border-input bg-background px-3"
                >
                  <option value="active">Active (Available for Signups & Upgrades)</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>

            <DialogFooter>
              <Button onClick={() => setEditingPlan(null)} className="rounded-full">
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </section>
  );
}

// ============================================================================
// TAB 3: MODULE & FEATURE PRICING
// ============================================================================

function PricingMatrix({
  modules,
  categories,
  saving,
  onSave,
}: {
  modules: SubscriptionAdminModule[];
  categories: string[];
  saving: boolean;
  onSave: (payload: PricingUpdatePayload) => void;
}) {
  const [drafts, setDrafts] = React.useState<PricingUpdatePayload>({
    modules: {},
    submodules: {},
    features: {},
  });
  const [expandedModules, setExpandedModules] = React.useState<Record<string, boolean>>({});
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [tierFilter, setTierFilter] = React.useState<"all" | "major" | "addon" | "paid" | "free">("all");
  const [sortOrder, setSortOrder] = React.useState<"name" | "price_high" | "price_low">("name");

  React.useEffect(() => {
    const next: PricingUpdatePayload = {
      modules: {},
      submodules: {},
      features: {},
    };

    modules.forEach((module) => {
      next.modules[module.slug] = { monthly_price_etb: toPrice(module.monthly_price_etb) };

      (module.submodules ?? []).forEach((submodule) => {
        const submoduleKey = `${module.slug}:${submodule.slug}`;
        next.submodules[submoduleKey] = { monthly_price_etb: toPrice(submodule.monthly_price_etb) };

        (submodule.features ?? []).forEach((feature) => {
          next.features[feature.slug] = { monthly_price_etb: toPrice(feature.monthly_price_etb) };
        });
      });

      (module.features ?? []).forEach((feature) => {
        next.features[feature.slug] = { monthly_price_etb: toPrice(feature.monthly_price_etb) };
      });
    });

    setDrafts(next);
  }, [modules]);

  const updatePrice = (scope: keyof PricingUpdatePayload, key: string, value: string) => {
    setDrafts((current) => ({
      ...current,
      [scope]: {
        ...current[scope],
        [key]: { monthly_price_etb: toPrice(value) },
      },
    }));
  };

  const applyMarkup = (factor: number) => {
    setDrafts((curr) => {
      const nextModules: Record<string, PriceDraft> = {};
      Object.entries(curr.modules).forEach(([slug, item]) => {
        nextModules[slug] = { monthly_price_etb: Math.round(item.monthly_price_etb * factor) };
      });
      return { ...curr, modules: nextModules };
    });
    toast.success(`Applied ${factor > 1 ? "+" : ""}${Math.round((factor - 1) * 100)}% adjustment to modules.`);
  };

  const expandAll = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    modules.forEach((m) => {
      next[m.slug] = expand;
    });
    setExpandedModules(next);
  };

  const filteredModules = React.useMemo(() => {
    let result = modules.filter((m) => {
      const q = search.trim().toLowerCase();
      if (q) {
        const matchName = m.name.toLowerCase().includes(q);
        const matchSlug = m.slug.toLowerCase().includes(q);
        const matchCat = (m.category ?? "").toLowerCase().includes(q);
        if (!matchName && !matchSlug && !matchCat) return false;
      }
      if (categoryFilter !== "all" && m.category !== categoryFilter) return false;
      if (tierFilter === "major" && m.is_addon) return false;
      if (tierFilter === "addon" && !m.is_addon) return false;
      const price = drafts.modules[m.slug]?.monthly_price_etb ?? m.monthly_price_etb ?? 0;
      if (tierFilter === "paid" && price <= 0) return false;
      if (tierFilter === "free" && price > 0) return false;
      return true;
    });

    if (sortOrder === "price_high") {
      result = [...result].sort(
        (a, b) =>
          (drafts.modules[b.slug]?.monthly_price_etb ?? b.monthly_price_etb ?? 0) -
          (drafts.modules[a.slug]?.monthly_price_etb ?? a.monthly_price_etb ?? 0)
      );
    } else if (sortOrder === "price_low") {
      result = [...result].sort(
        (a, b) =>
          (drafts.modules[a.slug]?.monthly_price_etb ?? a.monthly_price_etb ?? 0) -
          (drafts.modules[b.slug]?.monthly_price_etb ?? b.monthly_price_etb ?? 0)
      );
    } else {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [modules, search, categoryFilter, tierFilter, sortOrder, drafts.modules]);

  const renderPriceInput = (scope: keyof PricingUpdatePayload, key: string, label: string) => (
    <label className="block min-w-[140px] space-y-1">
      <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
          ETB
        </span>
        <Input
          type="number"
          min={0}
          step="1"
          value={drafts[scope][key]?.monthly_price_etb ?? 0}
          onChange={(event) => updatePrice(scope, key, event.target.value)}
          className="h-10 bg-background pl-11 text-sm font-semibold"
          aria-label={`${label} price for ${key}`}
        />
      </div>
    </label>
  );

  return (
    <section className="space-y-4 rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      {/* HEADER & BULK TOOLS */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-black tracking-tight text-foreground">Module & Feature Pricing</h3>
            <p className="text-sm text-muted-foreground">
              Configure per-module monthly pricing used by tenant upgrade checkouts, addon unlocks, and invoice line-items.
            </p>
          </div>
          <Button onClick={() => onSave(drafts)} disabled={saving} className="rounded-full font-bold">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Save All Prices
          </Button>
        </div>

        {/* BULK TOOLS STRIP */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/20 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Bulk Adjustment:</span>
            <Button variant="outline" size="sm" onClick={() => applyMarkup(1.1)} className="h-8 rounded-full text-xs font-bold">
              +10%
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyMarkup(1.2)} className="h-8 rounded-full text-xs font-bold">
              +20%
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyMarkup(0.9)} className="h-8 rounded-full text-xs font-bold">
              -10%
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => expandAll(true)} className="h-8 text-xs font-bold">
              Expand All
            </Button>
            <Button variant="ghost" size="sm" onClick={() => expandAll(false)} className="h-8 text-xs font-bold">
              Collapse All
            </Button>
          </div>
        </div>

        {/* FILTERS & SEARCH */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search module to price..."
              className="pl-9"
            />
          </div>

          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value as "all" | "major" | "addon" | "paid" | "free")}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm font-medium"
          >
            <option value="all">All Pricing Tiers</option>
            <option value="major">Major Modules</option>
            <option value="addon">Add-ons Only</option>
            <option value="paid">Paid Modules (&gt; 0 ETB)</option>
            <option value="free">Free Modules (0 ETB)</option>
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as "name" | "price_high" | "price_low")}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm font-medium"
          >
            <option value="name">Sort by Name (A-Z)</option>
            <option value="price_high">Price: High to Low</option>
            <option value="price_low">Price: Low to High</option>
          </select>
        </div>

        {/* CATEGORIES */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border/40 pt-3">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-bold transition",
              categoryFilter === "all"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted"
            )}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-bold transition",
                categoryFilter === cat
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "border border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* MODULE LISTING WITH PRICING */}
      <div className="space-y-3">
        {filteredModules.map((module) => {
          const expanded = Boolean(expandedModules[module.slug]);
          const submoduleCount = module.submodules?.length ?? 0;
          const featureCount = module.features?.length ?? 0;

          return (
            <div key={module.slug} className="rounded-xl border border-border/50 bg-background/60 shadow-2xs">
              <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                <button
                  type="button"
                  onClick={() => setExpandedModules((current) => ({ ...current, [module.slug]: !expanded }))}
                  className="flex min-w-0 items-start gap-2 text-left"
                >
                  {expanded ? (
                    <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2 font-semibold text-foreground">
                      {module.name}
                      <Badge
                        variant={module.is_addon ? "outline" : "secondary"}
                        className="rounded-full px-2 py-0.5 text-[11px] uppercase tracking-widest"
                      >
                        {module.is_addon ? "Addon" : "Major"}
                      </Badge>
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {module.category} • {submoduleCount} submodules • {featureCount} features
                    </span>
                  </span>
                </button>
                {renderPriceInput("modules", module.slug, "Module Price")}
              </div>

              {expanded ? (
                <div className="border-t border-border/50 p-4">
                  <div className="grid gap-3 xl:grid-cols-2">
                    {(module.submodules ?? []).map((submodule) => {
                      const submoduleKey = `${module.slug}:${submodule.slug}`;

                      return (
                        <div key={submodule.id} className="rounded-xl border border-border/50 bg-card/60 p-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="font-semibold text-foreground">{submodule.name}</div>
                              <div className="mt-1 truncate text-[11px] font-mono text-muted-foreground">
                                {submodule.slug}
                              </div>
                            </div>
                            {renderPriceInput("submodules", submoduleKey, "Submodule")}
                          </div>
                          <div className="mt-3 space-y-2">
                            {(submodule.features ?? []).map((feature) => (
                              <div
                                key={feature.id}
                                className="flex flex-col gap-2 rounded-lg border border-border/40 bg-background/70 p-2 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <FeaturePill feature={feature} />
                                {renderPriceInput("features", feature.slug, "Feature")}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {(module.features ?? []).filter((feature) => !feature.subscription_submodule_id).length > 0 ? (
                      <div className="rounded-xl border border-border/50 bg-card/60 p-3">
                        <div className="font-semibold text-foreground">General Features</div>
                        <div className="mt-3 space-y-2">
                          {(module.features ?? [])
                            .filter((feature) => !feature.subscription_submodule_id)
                            .map((feature) => (
                              <div
                                key={feature.id}
                                className="flex flex-col gap-2 rounded-lg border border-border/40 bg-background/70 p-2 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <FeaturePill feature={feature} />
                                {renderPriceInput("features", feature.slug, "Feature")}
                              </div>
                            ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ============================================================================
// TAB 4: TENANT SUBSCRIPTION ASSIGNMENTS
// ============================================================================

function TenantAssignment({
  tenants,
  selectedTenant,
  modules,
  categories,
  plans,
  planDefaults,
  saving,
  onSelectTenant,
  onSave,
}: {
  tenants: SubscriptionAdminTenant[];
  selectedTenant?: SubscriptionAdminTenant;
  modules: SubscriptionAdminModule[];
  categories: string[];
  plans: SubscriptionAdminPlan[];
  planDefaults: Record<string, string[]>;
  saving: boolean;
  onSelectTenant: (tenantId: string) => void;
  onSave: (tenantId: string, payload: TenantAssignmentPayload) => void;
}) {
  const [tenantSearch, setTenantSearch] = React.useState("");
  const [tenantStatusFilter, setTenantStatusFilter] = React.useState("all");
  const [tenantPlanFilter, setTenantPlanFilter] = React.useState("all");

  const [plan, setPlan] = React.useState("business");
  const [status, setStatus] = React.useState("active");
  const [billingMode, setBillingMode] = React.useState<"standard" | "hybrid">("standard");
  const [billingCycle, setBillingCycle] = React.useState<"monthly" | "yearly">("monthly");
  const [enabledModules, setEnabledModules] = React.useState<string[]>([]);

  // Module filter state within the tenant workspace
  const [moduleSearch, setModuleSearch] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("all");
  const [stateFilter, setStateFilter] = React.useState<"all" | "enabled" | "disabled" | "plan_defaults">("all");

  React.useEffect(() => {
    if (!selectedTenant) return;
    setPlan(selectedTenant.subscription?.plan ?? selectedTenant.plan ?? "business");
    setStatus(selectedTenant.subscription?.status ?? "active");
    setBillingMode(selectedTenant.subscription?.billing_mode ?? "standard");
    setBillingCycle(selectedTenant.subscription?.billing_cycle ?? "monthly");
    setEnabledModules(selectedTenant.subscription?.module_subscriptions?.enabled_modules ?? []);
  }, [selectedTenant]);

  const filteredTenants = React.useMemo(() => {
    return tenants.filter((t) => {
      const q = tenantSearch.trim().toLowerCase();
      if (q) {
        const matchesName = t.name.toLowerCase().includes(q);
        const matchesId = t.id.toLowerCase().includes(q);
        const matchesEmail = (t.admin_email ?? "").toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesEmail) return false;
      }
      const currentStatus = t.subscription?.status ?? "active";
      if (tenantStatusFilter !== "all" && currentStatus !== tenantStatusFilter) return false;
      const currentPlan = t.subscription?.plan ?? t.plan ?? "business";
      if (tenantPlanFilter !== "all" && currentPlan !== tenantPlanFilter) return false;
      return true;
    });
  }, [tenants, tenantSearch, tenantStatusFilter, tenantPlanFilter]);

  const currentPlanDefaults = React.useMemo(() => planDefaults[plan] ?? [], [planDefaults, plan]);

  const setModuleActive = (slug: string, active: boolean) => {
    setEnabledModules((current) => {
      const exists = current.includes(slug);
      if (active && !exists) return [...current, slug];
      if (!active && exists) return current.filter((item) => item !== slug);
      return current;
    });
  };

  const toggleModule = (slug: string) => {
    setEnabledModules((current) =>
      current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]
    );
  };

  const handleSelectAllFiltered = () => {
    const toAdd = filteredAssignmentModules.map((m) => m.slug);
    setEnabledModules((curr) => Array.from(new Set([...curr, ...toAdd])));
    toast.info(`Enabled ${toAdd.length} filtered modules.`);
  };

  const handleDeselectAllFiltered = () => {
    const toRemove = new Set(filteredAssignmentModules.map((m) => m.slug));
    setEnabledModules((curr) => curr.filter((slug) => !toRemove.has(slug)));
    toast.info(`Disabled ${toRemove.size} filtered modules.`);
  };

  const handleResetToPlanDefaults = () => {
    setEnabledModules(currentPlanDefaults);
    toast.info(`Reset tenant modules to defaults for "${plan}".`);
  };

  // Live estimated cost calculation
  const liveCost = React.useMemo(() => {
    const currentPlanObj = plans.find((p) => p.slug === plan);
    const basePrice = currentPlanObj?.monthly_price_etb ?? 0;
    const modulePriceMap = new Map(modules.map((m) => [m.slug, m.monthly_price_etb ?? 0]));

    const extraAddons = enabledModules.filter((slug) => !currentPlanDefaults.includes(slug));
    const addonsPrice = extraAddons.reduce((sum, slug) => sum + (modulePriceMap.get(slug) ?? 0), 0);

    return {
      basePrice,
      addonsPrice,
      totalMonthly: basePrice + addonsPrice,
      addonCount: extraAddons.length,
    };
  }, [plans, plan, modules, enabledModules, currentPlanDefaults]);

  // Filter modules inside tenant assignment
  const filteredAssignmentModules = React.useMemo(() => {
    return modules.filter((m) => {
      const q = moduleSearch.trim().toLowerCase();
      if (q) {
        const matchesName = m.name.toLowerCase().includes(q);
        const matchesSlug = m.slug.toLowerCase().includes(q);
        if (!matchesName && !matchesSlug) return false;
      }
      if (selectedCategory !== "all" && m.category !== selectedCategory) return false;

      const isEnabled = enabledModules.includes(m.slug);
      const isDefault = currentPlanDefaults.includes(m.slug);

      if (stateFilter === "enabled" && !isEnabled) return false;
      if (stateFilter === "disabled" && isEnabled) return false;
      if (stateFilter === "plan_defaults" && !isDefault) return false;

      return true;
    });
  }, [modules, moduleSearch, selectedCategory, stateFilter, enabledModules, currentPlanDefaults]);

  if (!selectedTenant) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-border/70 p-8 text-center">
        <div>
          <Users className="mx-auto h-8 w-8 text-muted-foreground" />
          <h4 className="mt-2 text-base font-bold text-foreground">No tenants available</h4>
          <p className="mt-1 text-xs text-muted-foreground">Provision a tenant first to manage subscriptions.</p>
        </div>
      </div>
    );
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[300px_1fr]">
      {/* LEFT: TENANT DIRECTORY */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground">Tenants Directory</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{filteredTenants.length} of {tenants.length} tenants</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={tenantSearch}
            onChange={(e) => setTenantSearch(e.target.value)}
            placeholder="Search tenant..."
            className="h-9 pl-8 text-xs"
          />
        </div>

        {/* Status filter */}
        <select
          value={tenantStatusFilter}
          onChange={(e) => setTenantStatusFilter(e.target.value)}
          className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-semibold"
        >
          <option value="all">All Statuses</option>
          {STATUSES.map((st) => (
            <option key={st} value={st}>
              {st.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </option>
          ))}
        </select>

        {/* Plan filter */}
        <select
          value={tenantPlanFilter}
          onChange={(e) => setTenantPlanFilter(e.target.value)}
          className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-semibold"
        >
          <option value="all">All Plans</option>
          {plans.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Tenant list */}
        <div className="max-h-[620px] space-y-1.5 overflow-y-auto pr-1">
          {filteredTenants.map((tenant) => {
            const isSelected = selectedTenant.id === tenant.id;
            const currentPlan = tenant.subscription?.plan ?? tenant.plan ?? "business";
            const currentStatus = tenant.subscription?.status ?? "active";
            const enabledCount = tenant.subscription?.module_subscriptions?.enabled_modules?.length ?? 0;
            const statusClass = STATUS_BADGE_CLASSES[currentStatus] ?? STATUS_BADGE_CLASSES.active;

            return (
              <button
                key={tenant.id}
                onClick={() => onSelectTenant(tenant.id)}
                className={cn(
                  "w-full rounded-xl border p-3 text-left transition shadow-2xs",
                  isSelected
                    ? "border-primary bg-primary/10 shadow-xs"
                    : "border-border/50 hover:border-primary/50 hover:bg-muted/30"
                )}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="font-bold text-foreground text-sm truncate">{tenant.name}</div>
                  <span className={cn("shrink-0 rounded-md border px-1.5 py-0.2 text-[10px] font-bold uppercase", statusClass)}>
                    {currentStatus.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="font-mono text-xs">{tenant.id}</span>
                  <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                    {currentPlan}
                  </Badge>
                </div>
                <div className="mt-1 text-[11px] font-medium text-muted-foreground">
                  {enabledCount} of {modules.length} modules enabled
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT: TENANT SUBSCRIPTION WORKSPACE */}
      <div className="space-y-5 rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
        {/* TENANT HEADER & MRR BADGE */}
        <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-black tracking-tight text-foreground">{selectedTenant.name}</h3>
              <Badge variant="outline" className="font-mono text-xs font-bold">
                {selectedTenant.id}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {selectedTenant.admin_email || "No admin email"} • Type: {selectedTenant.business_type || "general"}
            </p>
          </div>

          {/* LIVE BILLING BADGE */}
          <div className="flex flex-col items-start rounded-xl border border-primary/30 bg-primary/5 p-3 text-right sm:items-end">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Estimated Monthly Total</span>
            <div className="text-xl font-black text-primary">
              ETB {liveCost.totalMonthly.toLocaleString()} <span className="text-xs font-semibold text-muted-foreground">/ mo</span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              Base ETB {liveCost.basePrice} + Addons ETB {liveCost.addonsPrice} ({liveCost.addonCount} custom)
            </span>
          </div>
        </div>

        {/* TENANT SUBSCRIPTION PLAN SETTINGS */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1.5 text-xs font-bold uppercase text-muted-foreground">
            Subscription Plan
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-semibold normal-case text-foreground"
            >
              {plans.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name} (ETB {p.monthly_price_etb}/mo)
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5 text-xs font-bold uppercase text-muted-foreground">
            Account Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-semibold normal-case text-foreground"
            >
              {STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5 text-xs font-bold uppercase text-muted-foreground">
            Billing Model
            <select
              value={billingMode}
              onChange={(e) => setBillingMode(e.target.value as "standard" | "hybrid")}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-semibold normal-case text-foreground"
            >
              <option value="standard">Standard Subscription</option>
              <option value="hybrid">Hybrid Activation</option>
            </select>
          </label>

          <label className="space-y-1.5 text-xs font-bold uppercase text-muted-foreground">
            Billing Cycle
            <select
              value={billingCycle}
              onChange={(e) => setBillingCycle(e.target.value as "monthly" | "yearly")}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-semibold normal-case text-foreground"
            >
              <option value="monthly">Monthly Recurring</option>
              <option value="yearly">Yearly (Annual Term)</option>
            </select>
          </label>
        </div>

        {/* MODULE ASSIGNMENT SECTION */}
        <div className="space-y-3 border-t border-border/50 pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-base font-black text-foreground">Enabled Modules & Entitlements</h4>
              <p className="text-xs text-muted-foreground">
                {enabledModules.length} of {modules.length} modules active for this tenant workspace.
              </p>
            </div>

            {/* Quick module action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAllFiltered}
                className="h-8 rounded-full text-xs font-bold"
              >
                + Enable Filtered
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeselectAllFiltered}
                className="h-8 rounded-full text-xs font-bold"
              >
                - Disable Filtered
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetToPlanDefaults}
                className="h-8 rounded-full text-xs font-bold text-amber-600 dark:text-amber-400"
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                Plan Defaults
              </Button>
            </div>
          </div>

          {/* Module search & filters */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={moduleSearch}
                onChange={(e) => setModuleSearch(e.target.value)}
                placeholder="Search modules..."
                className="h-9 pl-8 text-xs"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs font-semibold"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value as "all" | "enabled" | "disabled" | "plan_defaults")}
              className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs font-semibold"
            >
              <option value="all">All States ({modules.length})</option>
              <option value="enabled">Subscribed Only ({enabledModules.length})</option>
              <option value="disabled">Disabled Only ({modules.length - enabledModules.length})</option>
              <option value="plan_defaults">Plan Included ({currentPlanDefaults.length})</option>
            </select>
          </div>

          {/* MODULE GRID CARDS */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredAssignmentModules.map((module) => {
              const active = enabledModules.includes(module.slug);
              const isPlanDefault = currentPlanDefaults.includes(module.slug);
              const toneClass = TONE_BADGE_CLASSES[module.tone] ?? TONE_BADGE_CLASSES.blue;

              return (
                <div
                  key={module.slug}
                  onClick={() => toggleModule(module.slug)}
                  className={cn(
                    "cursor-pointer rounded-xl border p-3.5 transition select-none flex flex-col justify-between shadow-2xs",
                    active
                      ? "border-primary bg-primary/10 shadow-xs"
                      : "border-border/60 bg-background hover:border-primary/50"
                  )}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-bold text-foreground text-sm block truncate">{module.name}</span>
                        <span className="font-mono text-[10px] text-muted-foreground block truncate">{module.slug}</span>
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={active}
                          onCheckedChange={(checked) => setModuleActive(module.slug, checked)}
                          size="sm"
                          aria-label={`Toggle ${module.name}`}
                        />
                      </div>
                    </div>

                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {module.description || "Core platform module offering dedicated tenant capabilities."}
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-1 border-t border-border/40 pt-2 text-[11px]">
                    <span className={cn("rounded-md border px-1.5 py-0.2 text-[10px] font-bold uppercase", toneClass)}>
                      {module.category}
                    </span>

                    <div className="flex items-center gap-1 font-semibold text-muted-foreground">
                      {isPlanDefault ? (
                        <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                          Plan Default
                        </Badge>
                      ) : (module.monthly_price_etb ?? 0) > 0 ? (
                        <span className="text-primary font-bold">ETB {module.monthly_price_etb}/mo</span>
                      ) : (
                        <span>Free</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SAVE TENANT BUTTON */}
        <div className="flex items-center justify-between border-t border-border/50 pt-4">
          <div className="text-xs text-muted-foreground font-medium">
            Tenant: <span className="font-bold text-foreground">{selectedTenant.name}</span> ({enabledModules.length} modules)
          </div>
          <Button
            onClick={() =>
              onSave(selectedTenant.id, {
                plan,
                status,
                billing_mode: billingMode,
                billing_cycle: billingCycle,
                reset_billing_window: false,
                module_subscriptions: { enabled_modules: enabledModules, custom_modules: [] },
              })
            }
            disabled={saving}
            className="rounded-full px-6 font-bold"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Save Tenant Subscription
          </Button>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// SHARED FEATURE INVENTORY & PILL
// ============================================================================

function FeatureInventory({ module }: { module: SubscriptionAdminModule }) {
  const submodules = module.submodules ?? [];
  const looseFeatures = (module.features ?? []).filter((feature) => !feature.subscription_submodule_id);

  if (submodules.length === 0 && looseFeatures.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
        No child submodules or loose route features defined for this module yet.
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {submodules.map((submodule) => (
        <div key={submodule.id} className="rounded-xl border border-border/50 bg-background p-3 shadow-2xs">
          <div className="text-sm font-bold text-foreground">{submodule.name}</div>
          <div className="mt-1 font-mono text-[11px] text-muted-foreground">{submodule.slug}</div>
          <div className="mt-2 space-y-1">
            {(submodule.features ?? []).slice(0, 5).map((feature) => (
              <FeaturePill key={feature.id} feature={feature} />
            ))}
            {(submodule.features?.length ?? 0) > 5 ? (
              <div className="text-[11px] font-semibold text-muted-foreground">
                +{(submodule.features?.length ?? 0) - 5} more features
              </div>
            ) : null}
          </div>
        </div>
      ))}

      {looseFeatures.length > 0 ? (
        <div className="rounded-xl border border-border/50 bg-background p-3 shadow-2xs">
          <div className="text-sm font-bold text-foreground">Direct Feature Endpoints</div>
          <div className="mt-2 space-y-1">
            {looseFeatures.slice(0, 8).map((feature) => (
              <FeaturePill key={feature.id} feature={feature} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FeaturePill({ feature }: { feature: SubscriptionAdminFeature }) {
  const methods = Array.isArray(feature.http_methods) ? feature.http_methods.join(",") : feature.feature_type;
  const label = feature.route_uri || feature.permission || feature.name;

  return (
    <div className="rounded-lg border border-border/40 bg-muted/30 px-2 py-1">
      <div className="truncate font-mono text-[11px] font-semibold text-foreground">{label}</div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{methods}</div>
    </div>
  );
}
