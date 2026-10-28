import type { LucideIcon } from "lucide-react";

export type ModuleId =
  | "core" | "identity" | "tenancy" | "subscription" | "hospitality"
  | "inventory" | "warehouse" | "production" | "workflow"
  | "projectmanagement" | "humanresources" | "identitycards" | "attendance"
  | "payroll" | "finance" | "performance" | "procurement" | "supplychain"
  | "logistics" | "sales" | "crm" | "fleet" | "service" | "internal-audit"
  | "strategy" | "vantage" | "agriculture" | "lms" | "b2b-marketplace"
  | "landing-templates" | "video-conferencing" | "support_bot" | "daily-reports" | "property" | "parking";
export type DashboardNavPlacement = "primary" | "secondary";

export interface ModuleNavItem {
  moduleId: ModuleId;
  translationKey: string;
  fallbackLabel: string;
  href: string;
  icon: LucideIcon;
  permissions?: string[];
  subscriptionSlug?: string | string[];
  businessTypes?: string[];
  tourId?: string;
  placement: DashboardNavPlacement;
  audience?: "all" | "central" | "tenant";
}

export interface FrontendModuleDefinition {
  id: ModuleId;
  name: string;
  description: string;
  backendModule: string;
  routePrefixes: string[];
  navItems: ModuleNavItem[];
}

export const MODULE_ID_TO_SUBSCRIPTION_SLUG: Partial<Record<ModuleId, string | string[]>> = {
  hospitality: "hospitality",
  inventory: "inventory_control",
  warehouse: "warehouse_management",
  production: "production_management",
  workflow: "workflow_automation",
  projectmanagement: "project_management",
  humanresources: "human_resources",
  identitycards: ["employee_id_management", "human_resources"],
  attendance: ["attendance_management", "human_resources"],
  payroll: ["payroll_management", "human_resources"],
  finance: "financial_management",
  performance: "performance_management",
  procurement: "procurement_management",
  supplychain: "supply_chain_management",
  logistics: "logistics_freight_forwarding",
  sales: "sales_management",
  crm: "crm",
  fleet: "fleet_management",
  service: "service_management",
  "internal-audit": "internal_audit",
  strategy: "strategic_planning",
  vantage: "vantage_bi",
  agriculture: "agriculture",
  lms: "learning_management",
  "b2b-marketplace": "b2b_marketplace",
  "landing-templates": "premium_landing_templates",
  "video-conferencing": "video_conferencing",
  support_bot: "support_bot",
  "daily-reports": ["daily_reports", "human_resources"],
  property: "property_management",
  parking: "car_parking_management",
};
