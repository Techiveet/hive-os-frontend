import type { Step } from "react-joyride";
import { prepareNavForTour } from "./tour-events";
import { buildSidebarTourSteps } from "./tour-steps";

type Translate = (key: string, fallback: string) => string;

export interface MasterTourParams {
  startTour: (steps: Step[], type?: "welcome" | "system") => void;
  t: Translate;
}

export const startMasterSystemTour = async ({
  startTour,
  t,
}: MasterTourParams): Promise<void> => {
  console.log('[Tour] startMasterSystemTour triggered');
  // 1. Expand all collapsible groups in the sidebar and allow layout to settle
  await prepareNavForTour();
  console.log('[Tour] prepareNavForTour completed');

  // 2. Build complete list of steps covering every button, dropdown, and sub-dropdown
  const possibleSteps: Step[] = [
    // =========================================================================
    // PHASE 1: SIDEBAR HUB & NAVIGATION
    // =========================================================================
    {
      target: "#tour-sidebar-brand",
      title: t("tour.sidebar_brand_title", "HIVE.OS Control Hub"),
      content: t(
        "tour.sidebar_brand_desc",
        "Your central operations console. Switch between node workspaces or view global system status.",
      ),
      placement: "right",
    },
    {
      target: "#tour-sidebar-search",
      title: t("tour.sidebar_search_title", "Sidebar Search"),
      content: t(
        "tour.sidebar_search_desc",
        "Quickly filter through hundreds of pages, modules, and sub-dropdown options across the platform.",
      ),
      placement: "right",
    },

    // All sidebar navigation items: top links, master modules dropdown,
    // all sub-dropdowns, child registry pages, apps suite, and secondary links.
    ...buildSidebarTourSteps(t),

    // =========================================================================
    // PHASE 2: TOPBAR GLOBAL CONTROLS & DROPDOWNS
    // =========================================================================
    {
      target: "#tour-topbar-search",
      title: t("tour.topbar_search_title", "Global Command Search"),
      content: t(
        "tour.topbar_search_desc",
        "Instant omni-search for tenants, orders, users, inventory items, and system logs across your instance.",
      ),
      placement: "bottom",
    },
    {
      target: "#tour-topbar-help",
      title: t("tour.topbar_help_title", "Guided System Tours"),
      content: t(
        "tour.topbar_help_desc",
        "Launch interactive step-by-step walkthroughs of the whole system or specific workspace pages anytime.",
      ),
      placement: "bottom",
    },
    {
      target: "#tour-topbar-language",
      title: `${t("tour.topbar_language_title", "Interface Language")} (${t("tour.dropdown", "Dropdown")})`,
      content: t(
        "tour.topbar_language_desc",
        "Switch the entire UI matrix between English, Amharic, Oromo, French, Arabic, and other supported locales.",
      ),
      placement: "bottom",
    },
    {
      target: "#tour-topbar-theme",
      title: t("tour.topbar_theme_title", "Interface Theme"),
      content: t(
        "tour.topbar_theme_desc",
        "Toggle between optimized Dark Mode, Light Mode, and system-adaptive themes.",
      ),
      placement: "bottom",
    },
    {
      target: "#tour-topbar-fullscreen",
      title: t("tour.topbar_fullscreen_title", "Focus Mode"),
      content: t(
        "tour.topbar_fullscreen_desc",
        "Toggle browser full screen for distraction-free monitoring and operations.",
      ),
      placement: "bottom",
    },
    {
      target: "#tour-topbar-chat",
      title: t("tour.topbar_chat_title", "Team Messaging"),
      content: t(
        "tour.topbar_chat_desc",
        "Real-time operator messaging, channels, direct messages, and team notifications.",
      ),
      placement: "bottom",
    },
    {
      target: "#tour-topbar-notifications",
      title: t("tour.topbar_notifications_title", "System Alerts"),
      content: t(
        "tour.topbar_notifications_desc",
        "Live security notifications, task completions, and cluster event updates.",
      ),
      placement: "bottom",
    },
    {
      target: "#tour-topbar-mail",
      title: t("tour.topbar_mail_title", "Internal Mailbox"),
      content: t(
        "tour.topbar_mail_desc",
        "Encrypted internal mailbox for communications between system operators and nodes.",
      ),
      placement: "bottom",
    },
    {
      target: "#tour-topbar-profile",
      title: `${t("tour.topbar_profile_title", "Operator Profile")} (${t("tour.dropdown", "Dropdown")})`,
      content: t(
        "tour.topbar_profile_desc",
        "Clearance tier, tenant security parameters, profile preferences, and session termination.",
      ),
      placement: "bottom-end",
    },

    // Contextual Page Tour (active on workspaces that supply a page tour trigger)
    {
      target: "[id$='-page-tour-trigger']",
      title: t("tour.page_tour_title", "Workspace Deep Tour"),
      content: t(
        "tour.page_tour_desc",
        "Click this button anytime to take a deep, dedicated tour of this workspace.",
      ),
      placement: "bottom",
    },

    // =========================================================================
    // PHASE 3: DASHBOARD COMMAND CENTER ELEMENTS
    // =========================================================================
    {
      target: "#tour-dashboard-node-badge",
      title: t("tour.node_badge_title", "Cluster Node"),
      content: t(
        "tour.node_badge_desc",
        "Identifies your active tenant node, deployment shard, and database partition.",
      ),
      placement: "bottom",
    },
    {
      target: "#tour-dashboard-provision-btn",
      title: t("tour.provision_btn_title", "Provision Node"),
      content: t(
        "tour.provision_btn_desc",
        "Create, isolate, and bootstrap a new tenant enterprise instance.",
      ),
      placement: "bottom",
    },
    {
      target: "#tour-dashboard-monitor-btn",
      title: t("tour.monitor_btn_title", "System Monitor"),
      content: t(
        "tour.monitor_btn_desc",
        "Open the external high-availability cluster monitor and server diagnostics.",
      ),
      placement: "bottom",
    },
    {
      target: "#tour-dashboard-invite-btn",
      title: t("tour.invite_btn_title", "Invite Operator"),
      content: t(
        "tour.invite_btn_desc",
        "Invite operators and configure role-based access control clearances.",
      ),
      placement: "bottom",
    },
    {
      target: "#tour-dashboard-cache-btn",
      title: t("tour.cache_btn_title", "Flush Cache"),
      content: t(
        "tour.cache_btn_desc",
        "Instantly flush redis memory cache and re-index active tenant metadata.",
      ),
      placement: "bottom",
    },
    {
      target: "#tour-dashboard-backup-btn",
      title: t("tour.backup_btn_title", "Trigger Backup"),
      content: t(
        "tour.backup_btn_desc",
        "Execute an immediate PITR snapshot and off-site cloud storage backup.",
      ),
      placement: "bottom",
    },
    {
      target: "#tour-dashboard-plan-badge",
      title: t("tour.plan_badge_title", "License Tier & Security"),
      content: t(
        "tour.plan_badge_desc",
        "Current subscription tier with active cryptographic verification.",
      ),
      placement: "bottom",
    },
    {
      target: "#tour-body-stats",
      title: t("tour.body_stats_title", "System Metrics"),
      content: t(
        "tour.body_stats_desc",
        "Instant overview of active nodes, users, roles, and core capabilities.",
      ),
      placement: "bottom",
    },
    {
      target: "#tour-body-telemetry",
      title: t("tour.body_telemetry_title", "Live Telemetry"),
      content: t(
        "tour.body_telemetry_desc",
        "Real-time performance graph tracking system requests and overall network health.",
      ),
      placement: "right",
    },
    {
      target: "#tour-body-modules",
      title: t("tour.body_modules_title", "Module Health & Traffic"),
      content: t(
        "tour.body_modules_desc",
        "Status, latency, and throughput metrics for active microservices.",
      ),
      placement: "left",
    },
    {
      target: "#tour-body-hourly",
      title: t("tour.body_hourly_title", "24H Activity & Throughput Flow"),
      content: t(
        "tour.body_hourly_desc",
        "Continuous timeline of cluster actions, operational executions, and active operator sessions.",
      ),
      placement: "top",
    },
    {
      target: "#tour-body-storage-dist",
      title: t("tour.body_storage_title", "Resource & Task Distribution"),
      content: t(
        "tour.body_storage_desc",
        "Live breakdown of storage allocation, database cache, and task queue processing status.",
      ),
      placement: "top",
    },
    {
      target: "#tour-body-cluster",
      title: t("tour.body_cluster_title", "Cluster Health"),
      content: t(
        "tour.body_cluster_desc",
        "Real-time indicators for PostgreSQL database size, Redis cache hit ratio, and active WebSocket connections.",
      ),
      placement: "top",
    },
    {
      target: "#tour-body-traffic",
      title: t("tour.body_traffic_title", "Traffic Origins"),
      content: t(
        "tour.body_traffic_desc",
        "Geographic traffic distribution showing active operator locations and request concentrations.",
      ),
      placement: "top",
    },
    {
      target: "#tour-body-alerts",
      title: t("tour.body_alerts_title", "System Alerts & Anomalies"),
      content: t(
        "tour.body_alerts_desc",
        "Critical alerts and warnings flagged by autonomous monitoring watchdogs.",
      ),
      placement: "top",
    },
    {
      target: "#tour-body-audit",
      title: t("tour.body_audit_title", "Audit Ledger"),
      content: t(
        "tour.body_audit_desc",
        "Live stream of cryptographically sealed actions performed across the network.",
      ),
      placement: "top",
    },
  ];

  // Filter only elements that exist and are visible in DOM right now
  const activeSteps = possibleSteps.filter((step) => {
    const { target } = step;
    if (typeof target === "string") {
      const el = document.querySelector(target);
      if (!el || !(el instanceof HTMLElement) || !el.isConnected) return false;
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return false;
      return (
        el.offsetWidth > 0 ||
        el.offsetHeight > 0 ||
        el.getClientRects().length > 0
      );
    }
    return target instanceof HTMLElement && target.isConnected;
  });

  console.log('[Tour] activeSteps count:', activeSteps.length, 'targets:', activeSteps.map(s => s.target));

  startTour(
    activeSteps.map((step) => ({
      ...step,
      skipBeacon: true,
    })),
    "system",
  );
};

export type TourCategory =
  | "all"
  | "dashboard"
  | "security"
  | "apps"
  | "inventory"
  | "hospitality"
  | "warehouse"
  | "human-resources"
  | "humanresources"
  | "identitycards"
  | "identity-cards"
  | "attendance"
  | "payroll"
  | "finance"
  | "procurement"
  | "supplychain"
  | "supply-chain"
  | "logistics"
  | "sales"
  | "crm"
  | "fleet"
  | "property"
  | "parking"
  | "service"
  | "internal-audit"
  | "strategy"
  | "daily-reports"
  | "vantage"
  | "agriculture"
  | "performance"
  | "production"
  | "projectmanagement"
  | "project-management"
  | "workflow"
  | "lms"
  | "b2b-marketplace"
  | "landing-templates"
  | "support_bot"
  | "support-bot";

interface ModuleTourMeta {
  subnavId: string;
  prefixes: string[];
  titleKey: string;
  fallbackTitle: string;
  descKey: string;
  fallbackDesc: string;
  contextualSteps?: (t: Translate) => Step[];
}

const MODULE_TOUR_REGISTRY: Record<string, ModuleTourMeta> = {
  inventory: {
    subnavId: "#tour-subnav-inventory",
    prefixes: ["/dashboard/inventory"],
    titleKey: "nav.inventory",
    fallbackTitle: "Inventory Suite",
    descKey: "tour.inventory_hub_desc",
    fallbackDesc:
      "Master hub for enterprise inventory, stock valuations, supplier catalogues, and logistics audit trails.",
    contextualSteps: (t) => [
      {
        target: "#tour-products-header",
        title: t("inventory.tour.products.header_title", "Products Catalog"),
        content: t(
          "inventory.tour.products.header_desc",
          "Central repository for all sellable goods, SKUs, inventory tracking rules, pricing, and packaging specifications.",
        ),
        placement: "bottom",
      },
      {
        target: "#tour-products-kpis",
        title: t("inventory.tour.products.kpis_title", "Catalog Telemetry & Health"),
        content: t(
          "inventory.tour.products.kpis_desc",
          "Real-time catalog metrics tracking total active items, published products, low-stock threshold breaches, and product variants.",
        ),
        placement: "bottom",
      },
      {
        target: "#tour-products-filters",
        title: t("inventory.tour.products.filters_title", "Multi-Dimensional Filters"),
        content: t(
          "inventory.tour.products.filters_desc",
          "Filter products simultaneously by Status, Category, Stock Health, Product Type, and Unit of Measure.",
        ),
        placement: "bottom",
      },
      {
        target: "#tour-products-table",
        title: t("inventory.tour.products.table_title", "Products Master Table"),
        content: t(
          "inventory.tour.products.table_desc",
          "Interactive catalog view with product photos, SKUs, stock levels, unit pricing, QA compliance indicators, and direct actions.",
        ),
        placement: "top",
      },
    ],
  },
  hospitality: {
    subnavId: "#tour-subnav-hospitality",
    prefixes: ["/dashboard/hospitality"],
    titleKey: "nav.hospitality",
    fallbackTitle: "Hospitality Suite",
    descKey: "tour.hospitality_hub_desc",
    fallbackDesc:
      "Real-time guest services, restaurant & lounge POS, kitchen display system, and table reservations.",
  },
  warehouse: {
    subnavId: "#tour-subnav-warehouse",
    prefixes: ["/dashboard/warehouse"],
    titleKey: "nav.warehouse",
    fallbackTitle: "Warehouse Logistics",
    descKey: "tour.warehouse_hub_desc",
    fallbackDesc:
      "Warehouse facility management, loading bays, shelf & box storage layout, and internal goods movements.",
  },
  "human-resources": {
    subnavId: "#tour-subnav-human-resources",
    prefixes: ["/dashboard/human-resources"],
    titleKey: "nav.human_resources",
    fallbackTitle: "Human Resources",
    descKey: "tour.hr_hub_desc",
    fallbackDesc:
      "Human capital directory, personnel records, positions, org chart, transfers, leave, and payroll policies.",
  },
  humanresources: {
    subnavId: "#tour-subnav-human-resources",
    prefixes: ["/dashboard/human-resources"],
    titleKey: "nav.human_resources",
    fallbackTitle: "Human Resources",
    descKey: "tour.hr_hub_desc",
    fallbackDesc:
      "Human capital directory, personnel records, positions, org chart, transfers, leave, and payroll policies.",
  },
  identitycards: {
    subnavId: "#tour-subnav-identitycards",
    prefixes: ["/dashboard/identity-cards"],
    titleKey: "nav.employee_id_management",
    fallbackTitle: "Employee ID Management",
    descKey: "tour.identitycards_hub_desc",
    fallbackDesc:
      "Operator identification cards, credential issuance, badge design, and biometric identity verification.",
  },
  "identity-cards": {
    subnavId: "#tour-subnav-identitycards",
    prefixes: ["/dashboard/identity-cards"],
    titleKey: "nav.employee_id_management",
    fallbackTitle: "Employee ID Management",
    descKey: "tour.identitycards_hub_desc",
    fallbackDesc:
      "Operator identification cards, credential issuance, badge design, and biometric identity verification.",
  },
  attendance: {
    subnavId: "#tour-subnav-attendance",
    prefixes: ["/dashboard/attendance"],
    titleKey: "nav.attendance",
    fallbackTitle: "Attendance Management",
    descKey: "tour.attendance_hub_desc",
    fallbackDesc:
      "Biometric clock-in registers, automated shift rosters, leave reconciliation, and attendance logs.",
  },
  payroll: {
    subnavId: "#tour-subnav-payroll",
    prefixes: ["/dashboard/payroll"],
    titleKey: "nav.payroll",
    fallbackTitle: "Payroll Management",
    descKey: "tour.payroll_hub_desc",
    fallbackDesc:
      "Automated compensation calculations, tax withholdings, deductions, and compliant payslip disbursements.",
  },
  finance: {
    subnavId: "#tour-subnav-finance",
    prefixes: ["/dashboard/finance"],
    titleKey: "nav.finance",
    fallbackTitle: "Financial Management",
    descKey: "tour.finance_hub_desc",
    fallbackDesc:
      "General ledger accounts, double-entry journal records, revenue reconciliation, purchases, and budgets.",
  },
  procurement: {
    subnavId: "#tour-subnav-procurement",
    prefixes: ["/dashboard/procurement"],
    titleKey: "nav.procurement",
    fallbackTitle: "Procurement Management",
    descKey: "tour.procurement_hub_desc",
    fallbackDesc:
      "Purchase requisitions, vendor quotation requests, purchase orders, and supplier contract agreements.",
  },
  supplychain: {
    subnavId: "#tour-subnav-supplychain",
    prefixes: ["/dashboard/supply-chain"],
    titleKey: "nav.supply_chain",
    fallbackTitle: "Supply Chain Management",
    descKey: "tour.supplychain_hub_desc",
    fallbackDesc:
      "End-to-end supply chain visibility, multi-modal distribution pipelines, and inventory fulfillment.",
  },
  "supply-chain": {
    subnavId: "#tour-subnav-supplychain",
    prefixes: ["/dashboard/supply-chain"],
    titleKey: "nav.supply_chain",
    fallbackTitle: "Supply Chain Management",
    descKey: "tour.supplychain_hub_desc",
    fallbackDesc:
      "End-to-end supply chain visibility, multi-modal distribution pipelines, and inventory fulfillment.",
  },
  logistics: {
    subnavId: "#tour-subnav-logistics",
    prefixes: ["/dashboard/logistics"],
    titleKey: "nav.logistics",
    fallbackTitle: "Logistics & Freight Forwarding",
    descKey: "tour.logistics_hub_desc",
    fallbackDesc:
      "Freight forwarding, cargo consignments, customs clearing, route manifests, and carrier tracking.",
  },
  sales: {
    subnavId: "#tour-subnav-sales",
    prefixes: ["/dashboard/sales"],
    titleKey: "nav.sales",
    fallbackTitle: "Sales Management",
    descKey: "tour.sales_hub_desc",
    fallbackDesc:
      "Commercial pipelines, customer quotations, sales contracts, billing schedules, and order dispatch.",
  },
  crm: {
    subnavId: "#tour-subnav-crm",
    prefixes: ["/dashboard/crm"],
    titleKey: "nav.crm",
    fallbackTitle: "Customer Relationships (CRM)",
    descKey: "tour.crm_hub_desc",
    fallbackDesc:
      "Lead management, account pipelines, client touchpoints, deal stages, and customer history.",
  },
  fleet: {
    subnavId: "#tour-subnav-fleet",
    prefixes: ["/dashboard/fleet"],
    titleKey: "nav.fleet",
    fallbackTitle: "Fleet Management",
    descKey: "tour.fleet_hub_desc",
    fallbackDesc:
      "Vehicle registry, driver telemetry, preventative maintenance schedules, and fuel utilization.",
  },
  property: {
    subnavId: "#tour-subnav-property",
    prefixes: ["/dashboard/property"],
    titleKey: "nav.property",
    fallbackTitle: "Property Management",
    descKey: "tour.property_hub_desc",
    fallbackDesc:
      "Real estate units, tenant leases, commercial facilities, rental billing, and property maintenance.",
  },
  parking: {
    subnavId: "#tour-subnav-parking",
    prefixes: ["/dashboard/parking"],
    titleKey: "nav.parking",
    fallbackTitle: "Car Parking Management",
    descKey: "tour.parking_hub_desc",
    fallbackDesc:
      "Automated barrier control, parking bays, ticket issuance, occupancy telemetry, and tariff billing.",
  },
  service: {
    subnavId: "#tour-subnav-service",
    prefixes: ["/dashboard/service"],
    titleKey: "nav.service",
    fallbackTitle: "Service & Maintenance",
    descKey: "tour.service_hub_desc",
    fallbackDesc:
      "Equipment servicing, incident tickets, preventive maintenance cycles, and field engineering.",
  },
  "internal-audit": {
    subnavId: "#tour-subnav-internal-audit",
    prefixes: ["/dashboard/internal-audit"],
    titleKey: "nav.internal_audit",
    fallbackTitle: "Internal Audit",
    descKey: "tour.internalaudit_hub_desc",
    fallbackDesc:
      "Governance audits, compliance checklists, risk control matrices, and forensic review trails.",
  },
  strategy: {
    subnavId: "#tour-subnav-strategy",
    prefixes: ["/dashboard/strategy"],
    titleKey: "nav.strategy",
    fallbackTitle: "Strategic Planning",
    descKey: "tour.strategy_hub_desc",
    fallbackDesc:
      "Corporate OKRs, strategic initiatives, executive milestones, and cross-enterprise roadmaps.",
  },
  "daily-reports": {
    subnavId: "#tour-subnav-daily-reports",
    prefixes: ["/dashboard/daily-reports"],
    titleKey: "nav.daily_reports",
    fallbackTitle: "Daily Operations Reports",
    descKey: "tour.dailyreports_hub_desc",
    fallbackDesc:
      "Shift operational logs, daily incidents, handover notes, and executive status summaries.",
  },
  vantage: {
    subnavId: "#tour-subnav-vantage",
    prefixes: ["/dashboard/vantage"],
    titleKey: "nav.vantage",
    fallbackTitle: "Vantage Analytics",
    descKey: "tour.vantage_hub_desc",
    fallbackDesc:
      "Cross-department business intelligence, predictive telemetry, executive analytics, and KPIs.",
  },
  agriculture: {
    subnavId: "#tour-subnav-agriculture",
    prefixes: ["/dashboard/agriculture"],
    titleKey: "nav.agriculture",
    fallbackTitle: "Agriculture Management",
    descKey: "tour.agriculture_hub_desc",
    fallbackDesc:
      "Crop lifecycle monitoring, soil testing data, field plot management, and harvest yield records.",
  },
  performance: {
    subnavId: "#tour-subnav-performance",
    prefixes: ["/dashboard/performance"],
    titleKey: "nav.performance",
    fallbackTitle: "Performance Management",
    descKey: "tour.performance_hub_desc",
    fallbackDesc:
      "Employee KPI scorecards, periodic evaluations, goal alignment, and 360-degree appraisals.",
  },
  production: {
    subnavId: "#tour-subnav-production",
    prefixes: ["/dashboard/production"],
    titleKey: "nav.production",
    fallbackTitle: "Production Management",
    descKey: "tour.production_hub_desc",
    fallbackDesc:
      "Manufacturing operations, Bill of Materials (BOM), work center routings, and assembly lines.",
  },
  projectmanagement: {
    subnavId: "#tour-subnav-pm",
    prefixes: ["/dashboard/project-management"],
    titleKey: "nav.project_management",
    fallbackTitle: "Project Management",
    descKey: "tour.pm_hub_desc",
    fallbackDesc:
      "Agile Kanban boards, sprint deliverables, project milestones, and cross-team task tracking.",
  },
  "project-management": {
    subnavId: "#tour-subnav-pm",
    prefixes: ["/dashboard/project-management"],
    titleKey: "nav.project_management",
    fallbackTitle: "Project Management",
    descKey: "tour.pm_hub_desc",
    fallbackDesc:
      "Agile Kanban boards, sprint deliverables, project milestones, and cross-team task tracking.",
  },
  workflow: {
    subnavId: "#tour-subnav-workflow",
    prefixes: ["/dashboard/workflow"],
    titleKey: "nav.workflow",
    fallbackTitle: "Workflow & Approvals",
    descKey: "tour.workflow_hub_desc",
    fallbackDesc:
      "Multi-tier authorization workflows, clearance delegations, and automated approval pipelines.",
  },
  lms: {
    subnavId: "#tour-subnav-lms",
    prefixes: ["/dashboard/learning-management"],
    titleKey: "nav.lms",
    fallbackTitle: "Learning Management (LMS)",
    descKey: "tour.lms_hub_desc",
    fallbackDesc:
      "Operator training courses, knowledge assessments, technical certifications, and onboarding.",
  },
  "b2b-marketplace": {
    subnavId: "#tour-subnav-b2b",
    prefixes: ["/dashboard/b2b-marketplace"],
    titleKey: "nav.b2bMarketplace",
    fallbackTitle: "B2B Marketplace",
    descKey: "tour.b2b_hub_desc",
    fallbackDesc:
      "Inter-node wholesale commerce, verified supplier discovery, bulk RFQs, and trading exchanges.",
  },
  "landing-templates": {
    subnavId: "#tour-subnav-landing-templates",
    prefixes: [
      "/dashboard/landing-pages",
      "/dashboard/landing-library",
      "/dashboard/settings/business-types",
    ],
    titleKey: "nav.landing_pages",
    fallbackTitle: "Landing Pages & Themes",
    descKey: "tour.landing_templates_desc",
    fallbackDesc:
      "Configure global landing templates, storefront themes, and branded portals for tenants.",
  },
  support_bot: {
    subnavId: "#tour-subnav-support_bot",
    prefixes: ["/dashboard/support-bot"],
    titleKey: "nav.support_bot",
    fallbackTitle: "AI Support Bot",
    descKey: "tour.supportbot_hub_desc",
    fallbackDesc:
      "Autonomous customer service bot, knowledge-base indexing, and intelligent support escalations.",
  },
  "support-bot": {
    subnavId: "#tour-subnav-support_bot",
    prefixes: ["/dashboard/support-bot"],
    titleKey: "nav.support_bot",
    fallbackTitle: "AI Support Bot",
    descKey: "tour.supportbot_hub_desc",
    fallbackDesc:
      "Autonomous customer service bot, knowledge-base indexing, and intelligent support escalations.",
  },
};

export const startSelectiveTour = async (
  category: TourCategory,
  { startTour, t }: MasterTourParams,
): Promise<void> => {
  if (category === "all") {
    return startMasterSystemTour({ startTour, t });
  }

  // 1. Ensure nav is expanded so the target elements exist
  await prepareNavForTour();

  let candidateSteps: Step[] = [];

  if (category === "dashboard") {
    candidateSteps = [
      {
        target: "#tour-nav-overview",
        title: t("tour.overview_title", "Mission Control Dashboard"),
        content: t(
          "tour.overview_desc",
          "Primary command interface displaying real-time cluster telemetry, active nodes, and health diagnostics.",
        ),
        placement: "right",
      },
      {
        target: "#tour-dashboard-node-badge",
        title: t("tour.node_badge_title", "Cluster Node"),
        content: t(
          "tour.node_badge_desc",
          "Identifies your active tenant node, deployment shard, and database partition.",
        ),
        placement: "bottom",
      },
      {
        target: "#tour-dashboard-provision-btn",
        title: t("tour.provision_btn_title", "Provision Node"),
        content: t(
          "tour.provision_btn_desc",
          "Create, isolate, and bootstrap a new tenant enterprise instance.",
        ),
        placement: "bottom",
      },
      {
        target: "#tour-dashboard-monitor-btn",
        title: t("tour.monitor_btn_title", "System Monitor"),
        content: t(
          "tour.monitor_btn_desc",
          "Open the external high-availability cluster monitor and server diagnostics.",
        ),
        placement: "bottom",
      },
      {
        target: "#tour-dashboard-invite-btn",
        title: t("tour.invite_btn_title", "Invite Operator"),
        content: t(
          "tour.invite_btn_desc",
          "Invite operators and configure role-based access control clearances.",
        ),
        placement: "bottom",
      },
      {
        target: "#tour-dashboard-cache-btn",
        title: t("tour.cache_btn_title", "Flush Cache"),
        content: t(
          "tour.cache_btn_desc",
          "Instantly flush redis memory cache and re-index active tenant metadata.",
        ),
        placement: "bottom",
      },
      {
        target: "#tour-dashboard-backup-btn",
        title: t("tour.backup_btn_title", "Trigger Backup"),
        content: t(
          "tour.backup_btn_desc",
          "Execute an immediate PITR snapshot and off-site cloud storage backup.",
        ),
        placement: "bottom",
      },
      {
        target: "#tour-dashboard-plan-badge",
        title: t("tour.plan_badge_title", "License Tier & Security"),
        content: t(
          "tour.plan_badge_desc",
          "Current subscription tier with active cryptographic verification.",
        ),
        placement: "bottom",
      },
      {
        target: "#tour-body-stats",
        title: t("tour.body_stats_title", "System Metrics"),
        content: t(
          "tour.body_stats_desc",
          "Instant overview of active nodes, users, roles, and core capabilities.",
        ),
        placement: "bottom",
      },
      {
        target: "#tour-body-telemetry",
        title: t("tour.body_telemetry_title", "Live Telemetry"),
        content: t(
          "tour.body_telemetry_desc",
          "Real-time performance graph tracking system requests and overall network health.",
        ),
        placement: "right",
      },
      {
        target: "#tour-body-modules",
        title: t("tour.body_modules_title", "Module Health & Traffic"),
        content: t(
          "tour.body_modules_desc",
          "Status, latency, and throughput metrics for active microservices.",
        ),
        placement: "left",
      },
      {
        target: "#tour-body-hourly",
        title: t("tour.body_hourly_title", "24H Activity & Throughput Flow"),
        content: t(
          "tour.body_hourly_desc",
          "Continuous timeline of cluster actions, operational executions, and active operator sessions.",
        ),
        placement: "top",
      },
      {
        target: "#tour-body-storage-dist",
        title: t("tour.body_storage_title", "Resource & Task Distribution"),
        content: t(
          "tour.body_storage_desc",
          "Live breakdown of storage allocation, database cache, and task queue processing status.",
        ),
        placement: "top",
      },
      {
        target: "#tour-body-cluster",
        title: t("tour.body_cluster_title", "Cluster Health"),
        content: t(
          "tour.body_cluster_desc",
          "Real-time indicators for PostgreSQL database size, Redis cache hit ratio, and active WebSocket connections.",
        ),
        placement: "top",
      },
      {
        target: "#tour-body-traffic",
        title: t("tour.body_traffic_title", "Traffic Origins"),
        content: t(
          "tour.body_traffic_desc",
          "Geographic traffic distribution showing active operator locations and request concentrations.",
        ),
        placement: "top",
      },
      {
        target: "#tour-body-alerts",
        title: t("tour.body_alerts_title", "System Alerts & Anomalies"),
        content: t(
          "tour.body_alerts_desc",
          "Critical alerts and warnings flagged by autonomous monitoring watchdogs.",
        ),
        placement: "top",
      },
      {
        target: "#tour-body-audit",
        title: t("tour.body_audit_title", "Audit Ledger"),
        content: t(
          "tour.body_audit_desc",
          "Live stream of cryptographically sealed actions performed across the network.",
        ),
        placement: "top",
      },
    ];
  } else if (category === "security") {
    candidateSteps = [
      {
        target: "#tour-nav-security",
        title: t("tour.security_title", "Zero-Trust Identity & Access"),
        content: t(
          "tour.security_desc",
          "Manage operator clearances, roles, permission matrices, and cryptographic key parameters.",
        ),
        placement: "right",
      },
      {
        target: "#tour-nav-audit",
        title: t("tour.audit_title", "System Audit Logs"),
        content: t(
          "tour.audit_desc",
          "Immutable, cryptographically verified record of every administrative and node execution.",
        ),
        placement: "right",
      },
      {
        target: "#tour-nav-subscriptions",
        title: t("tour.subscriptions_title", "Tenant Module Subscriptions"),
        content: t(
          "tour.subscriptions_desc",
          "Configure modular access licenses and feature entitlements across all tenant instances.",
        ),
        placement: "right",
      },
      {
        target: "#tour-nav-tenants",
        title: t("tour.tenants_title", "Tenant Accounts"),
        content: t(
          "tour.tenants_desc",
          "Isolated database shards, multi-tenant deployment telemetry, and tenant provisioning.",
        ),
        placement: "right",
      },
    ];
  } else if (category === "apps") {
    candidateSteps = [
      {
        target: "#tour-nav-apps",
        title: `${t("nav.apps_tools", "Apps & Tools")} (${t("tour.dropdown", "Dropdown")})`,
        content: t(
          "tour.apps_dropdown_desc",
          "Applications suite grouping document converters, internal mailbox, and team messaging utilities.",
        ),
        placement: "right",
      },
      ...buildSidebarTourSteps(t).filter((step) => {
        const target = String(step.target);
        return (
          target.includes("/dashboard/tools/converters") ||
          target.includes("/dashboard/mail") ||
          target.includes("/dashboard/chat") ||
          target === "#tour-nav-converters-hub" ||
          target === "#tour-nav-apps"
        );
      }),
    ];
  } else if (MODULE_TOUR_REGISTRY[category]) {
    const cfg = MODULE_TOUR_REGISTRY[category];
    const headerStep: Step = {
      target: cfg.subnavId,
      title: `${t(cfg.titleKey, cfg.fallbackTitle)} (${t("tour.sub_dropdown", "Sub-Dropdown")})`,
      content: t(cfg.descKey, cfg.fallbackDesc),
      placement: "right",
    };

    const matchingSidebarSteps = buildSidebarTourSteps(t).filter((step) => {
      const target = String(step.target);
      return (
        target === cfg.subnavId ||
        cfg.prefixes.some((prefix) => target.includes(prefix))
      );
    });

    candidateSteps = [
      headerStep,
      ...matchingSidebarSteps.filter((s) => String(s.target) !== cfg.subnavId),
      ...(cfg.contextualSteps ? cfg.contextualSteps(t) : []),
    ];
  }

  // Deduplicate and filter visible elements
  const seenTargets = new Set<string>();
  const activeSteps = candidateSteps.filter((step) => {
    const { target } = step;
    const targetKey =
      typeof target === "string" ? target : (target as HTMLElement).tagName;
    if (seenTargets.has(targetKey)) return false;
    seenTargets.add(targetKey);

    if (typeof target === "string") {
      const el = document.querySelector(target);
      if (!el || !(el instanceof HTMLElement) || !el.isConnected) return false;
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return false;
      return (
        el.offsetWidth > 0 ||
        el.offsetHeight > 0 ||
        el.getClientRects().length > 0
      );
    }
    return target instanceof HTMLElement && target.isConnected;
  });

  if (activeSteps.length === 0) return;

  startTour(
    activeSteps.map((step) => ({
      ...step,
      skipBeacon: true,
    })),
    "system",
  );
};
