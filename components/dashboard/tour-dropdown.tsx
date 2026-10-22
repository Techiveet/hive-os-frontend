"use client";

import React, { useState, useMemo } from "react";
import {
  HelpCircle,
  ChevronDown,
  Sparkles,
  Boxes,
  Utensils,
  Warehouse,
  UsersRound,
  BadgeDollarSign,
  ShieldCheck,
  LayoutDashboard,
  Layers,
  HandCoins,
  Network,
  Truck,
  TrendingUp,
  Handshake,
  Car,
  Building2,
  CircleParking,
  LifeBuoy,
  Compass,
  FileText,
  Telescope,
  Sprout,
  ChartNoAxesCombined,
  Factory,
  ListTodo,
  CheckCircle,
  GraduationCap,
  Store,
  LayoutTemplate,
  Bot,
  CreditCard,
  Fingerprint,
  WalletCards,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTour } from "@/components/providers/tour-provider";
import { useTranslation } from "@/store/use-translation";
import { startSelectiveTour, type TourCategory } from "@/lib/master-tour";
import { cn } from "@/lib/utils";

interface TourDropdownProps {
  id?: string;
  className?: string;
  variant?: "ghost" | "outline" | "default";
  size?: "default" | "sm" | "lg";
  showLabel?: boolean;
}

export function TourDropdown({
  id = "tour-topbar-help",
  className,
  variant = "ghost",
  size = "default",
  showLabel = true,
}: TourDropdownProps) {
  const { startTour, isActive } = useTour();
  const { t } = useTranslation();
  const [selectedTour, setSelectedTour] = useState<TourCategory | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleLaunchTour = async (category: TourCategory) => {
    setSelectedTour(category);
    setIsOpen(false);
    await startSelectiveTour(category, { startTour, t });
  };

  const tours: Array<{
    id: TourCategory;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    categoryGroup: string;
    badge?: string;
  }> = useMemo(
    () => [
      // ==========================================
      // CORE PLATFORM & MISSION CONTROL
      // ==========================================
      {
        id: "all",
        title: t("tour.full_system", "Full System Walkthrough"),
        description: t(
          "tour.full_system_desc",
          "Comprehensive orientation across all 30+ modules, tools & telemetry",
        ),
        icon: Sparkles,
        accentColor: "text-primary bg-primary/10 border-primary/20",
        categoryGroup: "Core",
        badge: t("tour.master", "Master"),
      },
      {
        id: "dashboard",
        title: t("tour.command_center", "Mission Control Dashboard"),
        description: t(
          "tour.command_center_desc",
          "Cluster telemetry, node provisioning, cache controls & live metrics",
        ),
        icon: LayoutDashboard,
        accentColor: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
        categoryGroup: "Core",
        badge: "Telemetry",
      },
      {
        id: "security",
        title: t("tour.security_suite", "Zero-Trust Security & Identity"),
        description: t(
          "tour.security_suite_desc",
          "Operator clearances, permission matrix, tenant shards & audit logs",
        ),
        icon: ShieldCheck,
        accentColor: "text-rose-500 bg-rose-500/10 border-rose-500/20",
        categoryGroup: "Governance",
        badge: "Audit",
      },
      {
        id: "apps",
        title: t("tour.apps_suite", "Apps & Workspace Tools"),
        description: t(
          "tour.apps_suite_desc",
          "Document converters, encrypted internal mailbox & team messaging",
        ),
        icon: Layers,
        accentColor: "text-teal-500 bg-teal-500/10 border-teal-500/20",
        categoryGroup: "Productivity",
      },

      // ==========================================
      // SUPPLY CHAIN & OPERATIONS
      // ==========================================
      {
        id: "inventory",
        title: t("tour.inventory_suite", "Inventory Suite"),
        description: t(
          "tour.inventory_suite_desc",
          "Product catalog, multi-SKU variants, QA compliance, valuation & batch expiry",
        ),
        icon: Boxes,
        accentColor: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
        categoryGroup: "Operations",
        badge: "19 pages",
      },
      {
        id: "warehouse",
        title: t("tour.warehouse_logistics", "Warehouse Logistics"),
        description: t(
          "tour.warehouse_logistics_desc",
          "Physical storage facilities, loading bays, shelf zones & bin storage",
        ),
        icon: Warehouse,
        accentColor: "text-sky-500 bg-sky-500/10 border-sky-500/20",
        categoryGroup: "Operations",
      },
      {
        id: "procurement",
        title: t("tour.procurement", "Procurement Management"),
        description: t(
          "tour.procurement_desc",
          "Purchase requisitions, supplier RFQs, purchase orders & vendor terms",
        ),
        icon: HandCoins,
        accentColor: "text-violet-500 bg-violet-500/10 border-violet-500/20",
        categoryGroup: "Operations",
      },
      {
        id: "supplychain",
        title: t("tour.supply_chain", "Supply Chain Management"),
        description: t(
          "tour.supply_chain_desc",
          "End-to-end supply pipelines, multi-modal freight corridors & distribution",
        ),
        icon: Network,
        accentColor: "text-amber-600 bg-amber-600/10 border-amber-600/20",
        categoryGroup: "Operations",
      },
      {
        id: "logistics",
        title: t("tour.logistics", "Logistics & Freight Forwarding"),
        description: t(
          "tour.logistics_desc",
          "Cargo consignments, customs documents, route manifests & carrier tracking",
        ),
        icon: Truck,
        accentColor: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
        categoryGroup: "Operations",
      },
      {
        id: "production",
        title: t("tour.production", "Production Management"),
        description: t(
          "tour.production_desc",
          "Manufacturing work orders, Bill of Materials (BOM) & factory routings",
        ),
        icon: Factory,
        accentColor: "text-zinc-500 bg-zinc-500/10 border-zinc-500/20",
        categoryGroup: "Operations",
      },
      {
        id: "agriculture",
        title: t("tour.agriculture", "Agriculture Suite"),
        description: t(
          "tour.agriculture_desc",
          "Crop cycles, soil testing telemetry, field plots & harvest yield logs",
        ),
        icon: Sprout,
        accentColor: "text-lime-500 bg-lime-500/10 border-lime-500/20",
        categoryGroup: "Operations",
      },

      // ==========================================
      // HOSPITALITY & SERVICE
      // ==========================================
      {
        id: "hospitality",
        title: t("tour.hospitality_suite", "Hospitality Suite"),
        description: t(
          "tour.hospitality_suite_desc",
          "Front desk, table booking, waiter touch-POS & kitchen display system",
        ),
        icon: Utensils,
        accentColor: "text-amber-500 bg-amber-500/10 border-amber-500/20",
        categoryGroup: "Hospitality",
        badge: "18 pages",
      },
      {
        id: "service",
        title: t("tour.service", "Service & Maintenance"),
        description: t(
          "tour.service_desc",
          "Work orders, field technicians, SLAs, asset servicing & ticket dispatch",
        ),
        icon: LifeBuoy,
        accentColor: "text-sky-600 bg-sky-600/10 border-sky-600/20",
        categoryGroup: "Hospitality",
      },

      // ==========================================
      // COMMERCIAL, SALES & CRM
      // ==========================================
      {
        id: "sales",
        title: t("tour.sales", "Sales Management"),
        description: t(
          "tour.sales_desc",
          "Commercial pipelines, customer quotes, sales orders & contract billing",
        ),
        icon: TrendingUp,
        accentColor: "text-emerald-600 bg-emerald-600/10 border-emerald-600/20",
        categoryGroup: "Commercial",
      },
      {
        id: "crm",
        title: t("tour.crm", "Customer Relationships (CRM)"),
        description: t(
          "tour.crm_desc",
          "Lead capture, opportunity pipeline, client profiles & communication logs",
        ),
        icon: Handshake,
        accentColor: "text-pink-500 bg-pink-500/10 border-pink-500/20",
        categoryGroup: "Commercial",
      },
      {
        id: "b2b-marketplace",
        title: t("tour.b2b_marketplace", "B2B Marketplace"),
        description: t(
          "tour.b2b_marketplace_desc",
          "Inter-node trade, verified wholesale network & supplier catalogue exchange",
        ),
        icon: Store,
        accentColor: "text-orange-500 bg-orange-500/10 border-orange-500/20",
        categoryGroup: "Commercial",
      },
      {
        id: "landing-templates",
        title: t("tour.landing_pages", "Landing Pages & Themes"),
        description: t(
          "tour.landing_pages_desc",
          "Tenant portals, marketing landing pages & storefront branding templates",
        ),
        icon: LayoutTemplate,
        accentColor: "text-fuchsia-500 bg-fuchsia-500/10 border-fuchsia-500/20",
        categoryGroup: "Commercial",
      },

      // ==========================================
      // HUMAN CAPITAL
      // ==========================================
      {
        id: "human-resources",
        title: t("tour.hr_suite", "Human Resources"),
        description: t(
          "tour.hr_suite_desc",
          "Personnel directory, positions, organization chart & leave requests",
        ),
        icon: UsersRound,
        accentColor: "text-purple-500 bg-purple-500/10 border-purple-500/20",
        categoryGroup: "Human Resources",
      },
      {
        id: "attendance",
        title: t("tour.attendance", "Attendance Management"),
        description: t(
          "tour.attendance_desc",
          "Biometric clock-ins, shift rosters, overtime tracking & attendance audit",
        ),
        icon: Fingerprint,
        accentColor: "text-teal-600 bg-teal-600/10 border-teal-600/20",
        categoryGroup: "Human Resources",
      },
      {
        id: "payroll",
        title: t("tour.payroll", "Payroll Management"),
        description: t(
          "tour.payroll_desc",
          "Salary cycles, tax withholding, deductions & automated payslip generation",
        ),
        icon: WalletCards,
        accentColor: "text-green-600 bg-green-600/10 border-green-600/20",
        categoryGroup: "Human Resources",
      },
      {
        id: "identitycards",
        title: t("tour.identitycards", "Employee ID Management"),
        description: t(
          "tour.identitycards_desc",
          "Digital badge designer, smart card issuance & biometric credential verification",
        ),
        icon: CreditCard,
        accentColor: "text-blue-500 bg-blue-500/10 border-blue-500/20",
        categoryGroup: "Human Resources",
      },
      {
        id: "performance",
        title: t("tour.performance", "Performance Management"),
        description: t(
          "tour.performance_desc",
          "Staff KPI scorecards, periodic evaluations & 360-degree appraisal reviews",
        ),
        icon: ChartNoAxesCombined,
        accentColor: "text-fuchsia-600 bg-fuchsia-600/10 border-fuchsia-600/20",
        categoryGroup: "Human Resources",
      },
      {
        id: "lms",
        title: t("tour.lms", "Learning Management (LMS)"),
        description: t(
          "tour.lms_desc",
          "Operator training courses, skill certifications & compliance exams",
        ),
        icon: GraduationCap,
        accentColor: "text-indigo-600 bg-indigo-600/10 border-indigo-600/20",
        categoryGroup: "Human Resources",
      },

      // ==========================================
      // FINANCIAL MANAGEMENT
      // ==========================================
      {
        id: "finance",
        title: t("tour.finance_suite", "Financial Management"),
        description: t(
          "tour.finance_suite_desc",
          "General ledger, journal vouchers, revenue reconciliation & fiscal budgets",
        ),
        icon: BadgeDollarSign,
        accentColor: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
        categoryGroup: "Finance",
      },

      // ==========================================
      // ASSETS, FLEET & FACILITIES
      // ==========================================
      {
        id: "fleet",
        title: t("tour.fleet", "Fleet Management"),
        description: t(
          "tour.fleet_desc",
          "Vehicle registry, driver manifests, maintenance cycles & fuel telemetry",
        ),
        icon: Car,
        accentColor: "text-amber-600 bg-amber-600/10 border-amber-600/20",
        categoryGroup: "Facilities",
      },
      {
        id: "property",
        title: t("tour.property", "Property Management"),
        description: t(
          "tour.property_desc",
          "Real estate units, commercial tenant leases & property maintenance billing",
        ),
        icon: Building2,
        accentColor: "text-slate-500 bg-slate-500/10 border-slate-500/20",
        categoryGroup: "Facilities",
      },
      {
        id: "parking",
        title: t("tour.parking", "Car Parking Management"),
        description: t(
          "tour.parking_desc",
          "Barrier control, slot occupancy, visitor ticketing & automated tariff billing",
        ),
        icon: CircleParking,
        accentColor: "text-blue-600 bg-blue-600/10 border-blue-600/20",
        categoryGroup: "Facilities",
      },

      // ==========================================
      // STRATEGY, AUDIT & GOVERNANCE
      // ==========================================
      {
        id: "projectmanagement",
        title: t("tour.project_management", "Project Management"),
        description: t(
          "tour.project_management_desc",
          "Kanban boards, milestone tracking, sprint deliverables & task assignments",
        ),
        icon: ListTodo,
        accentColor: "text-sky-500 bg-sky-500/10 border-sky-500/20",
        categoryGroup: "Productivity",
      },
      {
        id: "workflow",
        title: t("tour.workflow", "Workflow & Approvals"),
        description: t(
          "tour.workflow_desc",
          "Multi-tier approval chains, request routings & authorization delegations",
        ),
        icon: CheckCircle,
        accentColor: "text-emerald-600 bg-emerald-600/10 border-emerald-600/20",
        categoryGroup: "Governance",
      },
      {
        id: "internal-audit",
        title: t("tour.internal_audit", "Internal Audit"),
        description: t(
          "tour.internal_audit_desc",
          "Compliance audits, risk control matrices & cryptographic ledger reviews",
        ),
        icon: ShieldCheck,
        accentColor: "text-red-500 bg-red-500/10 border-red-500/20",
        categoryGroup: "Governance",
      },
      {
        id: "strategy",
        title: t("tour.strategy", "Strategic Planning"),
        description: t(
          "tour.strategy_desc",
          "Corporate OKRs, strategic initiatives, executive milestones & roadmaps",
        ),
        icon: Compass,
        accentColor: "text-blue-500 bg-blue-500/10 border-blue-500/20",
        categoryGroup: "Governance",
      },
      {
        id: "daily-reports",
        title: t("tour.daily_reports", "Daily Operations Reports"),
        description: t(
          "tour.daily_reports_desc",
          "Shift operations logs, daily incidents, handover notes & executive summaries",
        ),
        icon: FileText,
        accentColor: "text-yellow-600 bg-yellow-600/10 border-yellow-600/20",
        categoryGroup: "Governance",
      },
      {
        id: "vantage",
        title: t("tour.vantage", "Vantage Analytics"),
        description: t(
          "tour.vantage_desc",
          "Cross-departmental BI, executive dashboards & predictive operational telemetry",
        ),
        icon: Telescope,
        accentColor: "text-purple-600 bg-purple-600/10 border-purple-600/20",
        categoryGroup: "Governance",
      },
      {
        id: "support_bot",
        title: t("tour.support_bot", "AI Support Bot"),
        description: t(
          "tour.support_bot_desc",
          "Autonomous customer support agent, knowledge retrieval & ticket escalations",
        ),
        icon: Bot,
        accentColor: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
        categoryGroup: "Productivity",
      },
    ],
    [t],
  );

  const filteredTours = useMemo(() => {
    if (!searchQuery.trim()) return tours;
    const q = searchQuery.toLowerCase().trim();
    return tours.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.categoryGroup.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q),
    );
  }, [tours, searchQuery]);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          id={id}
          variant={variant}
          size={size}
          className={cn(
            "h-10 px-3 rounded-xl shrink-0 font-bold items-center gap-2 transition-all transform active:scale-95 group",
            variant === "ghost" && "text-primary bg-primary/10 hover:bg-primary/20",
            isActive && "ring-2 ring-primary/40 bg-primary/15",
            className,
          )}
          aria-label={t("topbar.system_tour", "System Tour")}
          title={t("topbar.system_tour", "Select System Tour")}
        >
          <HelpCircle className="h-4 w-4 shrink-0 transition-transform group-hover:rotate-12" />
          {showLabel && (
            <span className="truncate">
              {t("topbar.system_tour", "System Tour")}
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 opacity-60 transition-transform duration-200",
              isOpen && "rotate-180 opacity-100",
            )}
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-84 sm:w-96 md:w-[420px] rounded-2xl p-2 bg-card/95 backdrop-blur-2xl border border-border/60 shadow-2xl z-[9999]"
      >
        <div className="px-3 py-2">
          <DropdownMenuLabel className="p-0 text-sm font-extrabold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              {t("tour.dropdown_heading", "Guided Walkthroughs")}
            </span>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted border border-border/50">
              {filteredTours.length} {t("tour.available", "Available")}
            </span>
          </DropdownMenuLabel>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium leading-relaxed">
            {t(
              "tour.dropdown_subheading",
              "Select any enterprise module to take its dedicated interactive tour.",
            )}
          </p>

          {/* Quick search input */}
          <div className="mt-2.5 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder={t("tour.search_placeholder", "Search tour modules (e.g. Fleet, Inventory, HR)...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className="w-full rounded-xl bg-muted/60 pl-8 pr-7 py-1.5 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 border border-border/50 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchQuery("");
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-md"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        <DropdownMenuSeparator className="my-1 border-border/40" />

        <div className="space-y-1 max-h-[440px] overflow-y-auto pr-1 custom-scrollbar">
          {filteredTours.length === 0 ? (
            <div className="py-8 px-4 text-center">
              <p className="text-xs font-semibold text-muted-foreground">
                {t("tour.no_matching_modules", "No tour modules found matching your search.")}
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-2 text-xs font-bold text-primary hover:underline"
              >
                {t("tour.clear_search", "Clear search filter")}
              </button>
            </div>
          ) : (
            filteredTours.map((item, idx) => {
              const Icon = item.icon;
              const isFullSystem = item.id === "all";

              return (
                <React.Fragment key={item.id}>
                  {idx === 1 && !searchQuery && (
                    <DropdownMenuSeparator className="my-1 border-border/40" />
                  )}
                  <DropdownMenuItem
                    onClick={() => handleLaunchTour(item.id)}
                    className={cn(
                      "flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-all outline-none",
                      "hover:bg-primary/10 hover:text-foreground focus:bg-primary/10",
                      isFullSystem && "bg-primary/5 border border-primary/20",
                    )}
                  >
                    <div
                      className={cn(
                        "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 transition-transform group-hover:scale-105",
                        item.accentColor,
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-foreground truncate">
                          {item.title}
                        </span>
                        {item.badge ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-primary/10 text-primary border border-primary/20 shrink-0">
                            {item.badge}
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-muted-foreground/80 px-1 rounded shrink-0">
                            {item.categoryGroup}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5 leading-snug">
                        {item.description}
                      </p>
                    </div>
                  </DropdownMenuItem>
                </React.Fragment>
              );
            })
          )}
        </div>

        <DropdownMenuSeparator className="my-1 border-border/40" />
        <div className="px-3 py-1.5 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {t("tour.shortcut_hint", "Instant module tour on click.")}
          </span>
          <span className="text-[10px] font-semibold text-primary/80">
            {tours.length} {t("tour.total_modules", "Modules")}
          </span>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
