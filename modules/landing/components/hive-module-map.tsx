"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BadgeDollarSign,
  Boxes,
  Building2,
  Code2,
  FileText,
  GraduationCap,
  KanbanSquare,
  PieChart,
  ShieldCheck,
  ShoppingCart,
  Truck,
  UsersRound,
  UtensilsCrossed,
  Wallet,
  Warehouse,
  Workflow,
  Factory,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useTranslation } from "@/store/use-translation";

import { EASE } from "../motion";
import { HiveMark } from "./hive-mark";

type Module = {
  key: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  tags: string[];
};

/** Row lengths of the comb. 3-4-5-4-3 = 19 cells; the middle one is the core. */
const ROWS = [3, 4, 5, 4, 3];
const CORE_INDEX = 9;
const WIDEST = Math.max(...ROWS);
const AUTOPLAY_MS = 3200;

// Pointy-top hexagon geometry in "cell widths": a cell is 1 wide and 2/√3 tall,
// rows step by 3/4 of the height.
const CELL_H = 2 / Math.sqrt(3);
const ROW_STEP = CELL_H * 0.75;
const FIELD_W = WIDEST;
const FIELD_H = CELL_H + ROW_STEP * (ROWS.length - 1);

const POSITIONS = ROWS.flatMap((count, row) =>
  Array.from({ length: count }, (_, col) => ({
    left: ((WIDEST - count) / 2 + col) / FIELD_W,
    top: (row * ROW_STEP) / FIELD_H,
    row,
    col,
  })),
);

function useModules(): Module[] {
  const { t } = useTranslation();
  return [
    {
      key: "finance",
      icon: Wallet,
      title: t("landing.hive_map.finance", "Finance & Ledger"),
      desc: t("landing.hive_map.finance_desc", "Double-entry general ledger with ERCA-ready VAT, multi-currency ETB/USD books and automatic bank reconciliation."),
      tags: ["VAT 15%", "CBE recon", "ETB / USD"],
    },
    {
      key: "hr",
      icon: UsersRound,
      title: t("landing.hive_map.hr", "HR & Payroll"),
      desc: t("landing.hive_map.hr_desc", "Employee records, attendance, leave and Ethiopian payroll with progressive income tax and 7% / 11% pension splits."),
      tags: ["Payroll", "Pension", "Attendance"],
    },
    {
      key: "inventory",
      icon: Boxes,
      title: t("landing.hive_map.inventory", "Inventory"),
      desc: t("landing.hive_map.inventory_desc", "Multi-branch stock with reorder points, batch and expiry tracking, and branch-to-branch transfers."),
      tags: ["Reorder", "Batches", "Transfers"],
    },
    {
      key: "warehouse",
      icon: Warehouse,
      title: t("landing.hive_map.warehouse", "Warehousing"),
      desc: t("landing.hive_map.warehouse_desc", "Bins, put-away and pick lists across every warehouse, synced to inventory in real time."),
      tags: ["Bins", "Pick lists", "Cycle count"],
    },
    {
      key: "procurement",
      icon: ShoppingCart,
      title: t("landing.hive_map.procurement", "Procurement"),
      desc: t("landing.hive_map.procurement_desc", "Requisitions, RFQs and purchase orders with approval chains and supplier scorecards."),
      tags: ["RFQ", "PO approvals", "Suppliers"],
    },
    {
      key: "sales",
      icon: BadgeDollarSign,
      title: t("landing.hive_map.sales", "Sales & CRM"),
      desc: t("landing.hive_map.sales_desc", "Pipeline, quotations and invoicing in one flow, with Telebirr and Chapa payment links on every invoice."),
      tags: ["Pipeline", "Quotes", "Pay links"],
    },
    {
      key: "fleet",
      icon: Truck,
      title: t("landing.hive_map.fleet", "Fleet & Logistics"),
      desc: t("landing.hive_map.fleet_desc", "GPS dispatch, freight forwarding, waybills and fuel logs — offline-first for the road."),
      tags: ["Dispatch", "Waybills", "Offline"],
    },
    {
      key: "projects",
      icon: KanbanSquare,
      title: t("landing.hive_map.projects", "Projects"),
      desc: t("landing.hive_map.projects_desc", "Boards, timelines and timesheets that roll straight into costing and payroll."),
      tags: ["Kanban", "Gantt", "Timesheets"],
    },
    {
      key: "production",
      icon: Factory,
      title: t("landing.hive_map.production", "Production"),
      desc: t("landing.hive_map.production_desc", "Bills of materials, work orders and yield tracking for manufacturers and bottling plants."),
      tags: ["BOM", "Work orders", "Yield"],
    },
    // index 9 is the core — never rendered from this list
    {
      key: "core",
      icon: Workflow,
      title: "",
      desc: "",
      tags: [],
    },
    {
      key: "bi",
      icon: PieChart,
      title: t("landing.hive_map.bi", "Analytics & BI"),
      desc: t("landing.hive_map.bi_desc", "Live dashboards across every module, with drill-down from a KPI to the transaction behind it."),
      tags: ["Dashboards", "KPIs", "Drill-down"],
    },
    {
      key: "workflow",
      icon: Workflow,
      title: t("landing.hive_map.workflow", "Automation"),
      desc: t("landing.hive_map.workflow_desc", "No-code approval flows and triggers that move work between departments without email chains."),
      tags: ["Approvals", "Triggers", "SLAs"],
    },
    {
      key: "compliance",
      icon: ShieldCheck,
      title: t("landing.hive_map.compliance", "Audit & Compliance"),
      desc: t("landing.hive_map.compliance_desc", "Immutable audit logs, internal audit workflows and INSA / NBE aligned reporting."),
      tags: ["Audit log", "INSA", "NBE"],
    },
    {
      key: "hospitality",
      icon: UtensilsCrossed,
      title: t("landing.hive_map.hospitality", "Hospitality & POS"),
      desc: t("landing.hive_map.hospitality_desc", "Restaurant and lounge POS, waiter tablets, kitchen tickets and front desk — linked to stock."),
      tags: ["POS", "KDS", "Front desk"],
    },
    {
      key: "property",
      icon: Building2,
      title: t("landing.hive_map.property", "Property & Parking"),
      desc: t("landing.hive_map.property_desc", "Leases, tenants and maintenance, plus metered parking with automatic billing."),
      tags: ["Leases", "Maintenance", "Parking"],
    },
    {
      key: "lms",
      icon: GraduationCap,
      title: t("landing.hive_map.lms", "Learning"),
      desc: t("landing.hive_map.lms_desc", "Courses, enrolments and certificates for staff training or a public academy."),
      tags: ["Courses", "Quizzes", "Certificates"],
    },
    {
      key: "docs",
      icon: FileText,
      title: t("landing.hive_map.docs", "Docs & Mail"),
      desc: t("landing.hive_map.docs_desc", "Internal mailbox, file manager and document converter with per-plan storage quotas."),
      tags: ["Mailbox", "Files", "Converter"],
    },
    {
      key: "api",
      icon: Code2,
      title: t("landing.hive_map.api", "API & Webhooks"),
      desc: t("landing.hive_map.api_desc", "REST API and webhooks to bridge legacy systems, banks and your own apps."),
      tags: ["REST", "Webhooks", "API keys"],
    },
    {
      key: "b2b",
      icon: ShoppingCart,
      title: t("landing.hive_map.b2b", "B2B Marketplace"),
      desc: t("landing.hive_map.b2b_desc", "Publish your catalogue to buyers, take orders and settle them through the same ledger."),
      tags: ["Catalogue", "Orders", "Settlement"],
    },
  ];
}

/**
 * The "Unified Ecosystem" section as an actual hive: every module is a cell in
 * one comb around the Hive core. It tours itself while on screen; hovering,
 * focusing or tapping a cell takes over and the tour stops.
 */
export function HiveModuleMap() {
  const { t } = useTranslation();
  const modules = useModules();
  const reduced = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  // One observer for the whole comb: per-cell whileInView on these absolutely
  // positioned, pre-scaled cells never fired and left them stuck at 40%.
  const entered = useInView(ref, { once: true, amount: 0.2 });

  const firstModule = 0;
  const [active, setActive] = React.useState(firstModule);
  const [touched, setTouched] = React.useState(false);

  const moduleOrder = React.useMemo(
    () => modules.map((_, index) => index).filter((index) => index !== CORE_INDEX),
    [modules],
  );

  React.useEffect(() => {
    if (touched || !inView || reduced) return;
    const timer = window.setInterval(() => {
      setActive((current) => {
        const at = moduleOrder.indexOf(current);
        return moduleOrder[(at + 1) % moduleOrder.length];
      });
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [touched, inView, reduced, moduleOrder]);

  const select = (index: number) => {
    setTouched(true);
    setActive(index);
  };

  const current = modules[active];
  const CurrentIcon = current.icon;
  const core = POSITIONS[CORE_INDEX];
  const target = POSITIONS[active];

  return (
    <div ref={ref} className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
      {/* ── The comb ───────────────────────────────────────────────────── */}
      <div className="relative mx-auto w-full max-w-[34rem]">
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 h-3/4 w-3/4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-[90px]"
        />
        <div className="relative" style={{ aspectRatio: `${FIELD_W} / ${FIELD_H}` }}>
          {/* Nectar line from the core to the active cell */}
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible"
            viewBox={`0 0 ${FIELD_W * 100} ${FIELD_H * 100}`}
            preserveAspectRatio="none"
          >
            <motion.line
              x1={(core.left * FIELD_W + 0.5) * 100}
              y1={(core.top * FIELD_H + CELL_H / 2) * 100}
              initial={false}
              animate={{
                x2: (target.left * FIELD_W + 0.5) * 100,
                y2: (target.top * FIELD_H + CELL_H / 2) * 100,
              }}
              transition={{ duration: 0.6, ease: EASE }}
              stroke="hsl(var(--honey))"
              strokeWidth={3}
              strokeDasharray="6 4"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              className="[animation:dash-flow_1s_linear_infinite]"
            />
          </svg>

          <div role="tablist" aria-label={t("landing.hive_map.label", "Hive OS modules")} className="absolute inset-0">
            {POSITIONS.map((pos, index) => {
              const isCore = index === CORE_INDEX;
              const module = modules[index];
              const Icon = module.icon;
              const isActive = index === active;
              // Ripple outward from the core on entrance.
              const ring = Math.max(Math.abs(pos.row - 2), Math.abs(pos.left - core.left) * FIELD_W);

              return (
                <motion.div
                  key={module.key}
                  className="absolute p-[3%]"
                  style={{
                    left: `${pos.left * 100}%`,
                    top: `${pos.top * 100}%`,
                    width: `${100 / FIELD_W}%`,
                    height: `${(CELL_H / FIELD_H) * 100}%`,
                    zIndex: isActive || isCore ? 2 : 1,
                  }}
                  initial={reduced ? false : { opacity: 0, scale: 0.4 }}
                  animate={entered || reduced ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.4 }}
                  transition={{ duration: 0.6, ease: EASE, delay: 0.1 + ring * 0.12 }}
                >
                  {isCore ? (
                    <div className="hex-clip relative flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 via-blue-700 to-blue-950 shadow-2xl">
                      <div className="hex-clip absolute inset-[4%] bg-[#060b1f]" />
                      <HiveMark className="relative h-[62%] w-[62%] [animation:hex-float_5s_ease-in-out_infinite]" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-controls="hive-module-panel"
                      aria-label={module.title}
                      onClick={() => select(index)}
                      onPointerEnter={(event) => event.pointerType === "mouse" && select(index)}
                      onFocus={() => select(index)}
                      className={cn(
                        "hex-clip group relative flex h-full w-full items-center justify-center transition-all duration-300 focus-visible:outline-none",
                        isActive
                          ? "scale-[1.06] bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500"
                          : "bg-border hover:bg-primary/60 focus-visible:bg-primary",
                      )}
                    >
                      <span
                        className={cn(
                          "hex-clip absolute inset-[3%] flex flex-col items-center justify-center gap-1 transition-colors duration-300",
                          isActive ? "bg-[#1a1203]" : "bg-card group-hover:bg-primary/10",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-[30%] w-[30%] transition-colors",
                            isActive ? "text-amber-300" : "text-muted-foreground group-hover:text-primary",
                          )}
                        />
                        <span
                          className={cn(
                            "hidden max-w-[86%] truncate text-center font-mono text-[8.5px] font-bold uppercase leading-tight tracking-wide md:block",
                            isActive ? "text-amber-200" : "text-muted-foreground",
                          )}
                        >
                          {module.title.split(" ")[0]}
                        </span>
                      </span>
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Detail panel ───────────────────────────────────────────────── */}
      <div
        id="hive-module-panel"
        role="tabpanel"
        aria-live="polite"
        className="relative overflow-hidden rounded-3xl border border-border/70 bg-card/60 p-7 backdrop-blur-sm md:p-9"
      >
        <div aria-hidden className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative mb-6 flex items-center justify-between gap-4">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            {t("landing.hive_map.cell", "Cell")} {String(moduleOrder.indexOf(active) + 1).padStart(2, "0")} /{" "}
            {String(moduleOrder.length).padStart(2, "0")}
          </span>
          {!touched && !reduced && (
            <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-honey">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
              {t("landing.hive_map.touring", "Auto tour")}
            </span>
          )}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.key}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -10, filter: "blur(4px)" }}
            transition={{ duration: 0.35, ease: EASE }}
            className="relative"
          >
            <span className="hex-clip mb-5 inline-flex h-14 w-12 items-center justify-center bg-gradient-to-br from-amber-300 to-orange-500">
              <span className="hex-clip absolute inset-[3px] bg-[#1a1203]" />
              <CurrentIcon className="relative h-6 w-6 text-amber-300" />
            </span>
            <h3 className="font-space text-2xl font-bold tracking-tight md:text-3xl">{current.title}</h3>
            <p className="mt-3 min-h-[4.5rem] text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
              {current.desc}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {current.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border/70 bg-background/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="relative mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-6">
          <p className="max-w-[16rem] text-xs leading-relaxed text-muted-foreground">
            {t(
              "landing.hive_map.footnote",
              "Every cell shares one database, one login and one audit trail — switch modules on as you grow.",
            )}
          </p>
          <Link
            href="/auth/signup"
            className="group inline-flex items-center gap-1.5 font-space text-xs font-bold uppercase tracking-wider text-primary"
          >
            {t("landing.hive_map.cta", "Build your hive")}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  );
}
