import type { Step } from "react-joyride";

type Translate = (key: string, fallback: string) => string;
const NAV_ROOTS = ["#tour-sidebar-nav", "#tour-sidebar-secondary"] as const;
const CURATED_DESC: Record<string, { key: string; fallback: string }> = {
  "/dashboard": { key: "tour.overview_desc", fallback: "View real-time telemetry, revenue, and active staff metrics." },
  "/dashboard/audit-logs": { key: "tour.audit_desc", fallback: "Every system action is cryptographically sealed here." },
  "/dashboard/security": { key: "tour.security_desc", fallback: "Manage operator clearances, roles, and granular security." },
  "/dashboard/subscriptions": { key: "tour.subscriptions_desc", fallback: "Review which feature modules each tenant has licensed, and activate or suspend their access." },
  "/dashboard/tenants": { key: "tour.tenants_desc", fallback: "Provision, monitor, and configure active tenant databases." },
  "/dashboard/landing-templates": { key: "tour.landing_templates_desc", fallback: "Configure global landing templates and themes for tenants." },
  "/dashboard/inventory": { key: "tour.inventory_desc", fallback: "Manage assets, products, and warehouse logistics with tenant-aware precision." },
  "/dashboard/inventory/catalog/products": { key: "tour.inventory_products_desc", fallback: "Full product catalogue with advanced multi-filter attributes, 3D assets, and soft-delete protection." },
  "/dashboard/inventory/overview": { key: "tour.inventory_overview_desc", fallback: "High-level inventory operations overview, stock movements, and performance metrics." },
  "/dashboard/inventory/shelves": { key: "tour.inventory_shelves_desc", fallback: "Physical storage layout, shelf zones, bin capacities, and QR location tracking." },
  "/dashboard/inventory/catalog/product-detail": { key: "tour.inventory_detail_desc", fallback: "Detailed product inspection, batch records, supplier tags, and audit history." },
  "/dashboard/inventory/qa": { key: "tour.inventory_qa_desc", fallback: "Quality control inspection, compliance checks, defect reports, and pass/fail workflows." },
  "/dashboard/logistics": { key: "tour.logistics_desc", fallback: "Plan tenant-safe forwarding jobs, cargo, shipment parties, and revisioned multimodal routes." },
  "/dashboard/hospitality": { key: "tour.hospitality_desc", fallback: "Real-time table management, reservations, and service orders for lounges and restaurants." },
  "/dashboard/warehouse": { key: "tour.warehouse_desc", fallback: "Central warehouse facilities, loading docks, and zone storage allocation." },
  "/dashboard/human-resources": { key: "tour.hr_desc", fallback: "Human capital management, employee profiles, attendance tracking, and payroll." },
  "/dashboard/project-management": { key: "tour.pm_desc", fallback: "Project milestones, Kanban task boards, sprint tracking, and team deliverables." },
  "/dashboard/workflow": { key: "tour.approvals_desc", fallback: "Review and action automated workflows and authorization requests waiting on your clearance level." },
  "/dashboard/learning-management": { key: "tour.lms_desc", fallback: "Operator training modules, onboarding certification, and technical compliance." },
  "/dashboard/b2b-marketplace": { key: "tour.b2b_desc", fallback: "Inter-node trade, supplier procurement, and verified wholesale network exchange." },
  "/dashboard/storage": { key: "tour.storage_desc", fallback: "Monitor tenant-aware file systems and volume capacities." },
  "/dashboard/settings": { key: "tour.settings_desc", fallback: "Configure deep system parameters, brand themes, backups, and security policies." },
  "/dashboard/trash": { key: "tour.trash_desc", fallback: "Safe recycle bin for soft-deleted records, products, and workspaces with restore capability." },
  "/dashboard/api-docs": { key: "tour.api_docs_desc", fallback: "Explore the live API schema to integrate external applications and nodes." },
};

const isVisible = (el: Element): boolean => {
  if (!(el instanceof HTMLElement)) return false;
  if (!el.isConnected) return false;
  const style = window.getComputedStyle(el);
  if (style.visibility === "hidden" || style.display === "none") return false;
  return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
};

const readLabel = (el: HTMLElement): string => {
  const directText = (el.innerText || el.textContent || "")
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (directText) return directText;
  return el.getAttribute("aria-label") || el.getAttribute("title") || "";
};

const TITLE_OVERRIDES: Record<string, string> = {
  "/dashboard/inventory": "Inventory Dashboard",
  "/dashboard/hospitality": "Hospitality Dashboard",
  "/dashboard/warehouse": "Warehouse Dashboard",
  "/dashboard/human-resources": "Human Resources Dashboard",
  "/dashboard/identity-cards": "Identity Cards Dashboard",
  "/dashboard/attendance": "Attendance Dashboard",
  "/dashboard/payroll": "Payroll Dashboard",
  "/dashboard/finance": "Finance Dashboard",
  "/dashboard/procurement": "Procurement Dashboard",
  "/dashboard/supply-chain": "Supply Chain Dashboard",
  "/dashboard/logistics": "Logistics Dashboard",
  "/dashboard/sales": "Sales Dashboard",
  "/dashboard/crm": "CRM Dashboard",
  "/dashboard/fleet": "Fleet Management Dashboard",
  "/dashboard/property": "Property Dashboard",
  "/dashboard/parking": "Parking Dashboard",
  "/dashboard/service": "Service & Maintenance Dashboard",
  "/dashboard/internal-audit": "Internal Audit Dashboard",
  "/dashboard/strategy": "Strategic Planning Dashboard",
  "/dashboard/daily-reports": "Daily Reports Dashboard",
  "/dashboard/vantage": "Vantage Dashboard",
  "/dashboard/agriculture": "Agriculture Dashboard",
  "/dashboard/production": "Production Dashboard",
  "/dashboard/learning-management": "Learning Management Dashboard",
  "/dashboard/b2b-marketplace": "B2B Marketplace Dashboard",
  "/dashboard/project-management": "Project Management Overview",
};

export const buildSidebarTourSteps = (t: Translate): Step[] => {
  if (typeof document === "undefined") return [];
  const steps: Step[] = [];
  const seen = new Set<Element>();

  for (const rootSelector of NAV_ROOTS) {
    const root = document.querySelector(rootSelector);
    if (!root) continue;

    const rows = root.querySelectorAll<HTMLElement>("a[href], button[aria-controls]");
    rows.forEach((el) => {
      if (seen.has(el) || !isVisible(el)) return;
      seen.add(el);

      const label = readLabel(el);
      if (!label) return;

      const href = el.getAttribute("href");
      const isGroup = el.tagName === "BUTTON";
      const ariaControls = el.getAttribute("aria-controls") || "";
      const isMasterModules = el.id === "tour-nav-modules" || ariaControls === "desktop-module-sections";
      const isAppsGroup = ariaControls.includes("apps") || el.id === "tour-nav-apps";
      const curated = href ? CURATED_DESC[href] : undefined;

      let title: string;
      let content: string;

      if (isMasterModules) {
        title = `${label} (${t("tour.dropdown", "Dropdown")})`;
        content = t(
          "tour.modules_dropdown_desc",
          "Main enterprise directory grouping all business subsystems, workflows, and domain registries. Click to expand or collapse.",
        );
      } else if (isAppsGroup) {
        title = `${label} (${t("tour.dropdown", "Dropdown")})`;
        content = t(
          "tour.apps_dropdown_desc",
          "Applications suite grouping document converters, integrations, and workspace utilities.",
        );
      } else if (isGroup) {
        title = `${label} (${t("tour.sub_dropdown", "Sub-Dropdown")})`;
        content = t(
          "tour.sub_dropdown_desc",
          "Expandable operational hub for {label}. Groups all related registry pages, tools, and actions.",
        ).replace("{label}", label);
      } else {
        title = (href && TITLE_OVERRIDES[href]) ? TITLE_OVERRIDES[href] : label;
        content = curated
          ? t(curated.key, curated.fallback)
          : t(
              "tour.nav_item_desc",
              "Opens the {label} workspace where you manage this domain's records and workflows.",
            ).replace("{label}", title);
      }

      // Stable CSS target selector so Joyride queries live elements dynamically across re-renders
      let targetSelector: string | HTMLElement = el;
      if (el.id) {
        targetSelector = `#${el.id}`;
      } else if (href) {
        targetSelector = `${rootSelector} a[href="${href}"]`;
      } else if (ariaControls) {
        targetSelector = `${rootSelector} button[aria-controls="${ariaControls}"]`;
      }

      steps.push({
        target: targetSelector,
        title,
        content,
        placement: "right",
      });
    });
  }

  return steps;
};
