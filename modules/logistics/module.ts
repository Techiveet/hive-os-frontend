import { AlertOctagon, BarChart3, Boxes, CalendarCheck, Combine, Container, FileCheck2, FileText, Gauge, Landmark, LineChart, MonitorDot, PlusCircle, RadioTower, ReceiptText, Settings2, Warehouse } from "lucide-react";
import type { FrontendModuleDefinition } from "@/modules/types";

const common = { moduleId: "logistics" as const, subscriptionSlug: "logistics_freight_forwarding", placement: "primary" as const };
export const logisticsModule: FrontendModuleDefinition = {
  id: "logistics", name: "Logistics & Freight Forwarding",
  description: "Tenant-safe freight rates, quotations, bookings, forwarding jobs, and revisioned multimodal routes.",
  backendModule: "Modules\\Logistics", routePrefixes: ["/dashboard/logistics"],
  navItems: [
    { ...common, translationKey: "nav.logistics_overview", fallbackLabel: "Logistics", href: "/dashboard/logistics", icon: Gauge, permissions: ["view_logistics_dashboard", "view_logistics_jobs", "manage_logistics"], tourId: "tour-nav-logistics" },
    { ...common, translationKey: "nav.logistics_jobs", fallbackLabel: "Forwarding jobs", href: "/dashboard/logistics/jobs", icon: Boxes, permissions: ["view_logistics_jobs", "manage_logistics"] },
    { ...common, translationKey: "nav.logistics_control_tower", fallbackLabel: "Control Tower", href: "/dashboard/logistics/control-tower", icon: RadioTower, permissions: ["view_logistics_control_tower", "manage_logistics"] },
    { ...common, translationKey: "nav.logistics_command_center", fallbackLabel: "Command Center", href: "/dashboard/logistics/command-center", icon: MonitorDot, permissions: ["view_logistics_command_center", "manage_logistics"] },
    { ...common, translationKey: "nav.logistics_exceptions", fallbackLabel: "Operational exceptions", href: "/dashboard/logistics/exceptions", icon: AlertOctagon, permissions: ["view_logistics_exceptions", "manage_logistics"] },
    { ...common, translationKey: "nav.logistics_operational_reports", fallbackLabel: "Operational reports", href: "/dashboard/logistics/operational-reports", icon: LineChart, permissions: ["view_logistics_operational_reports", "manage_logistics"] },
    { ...common, translationKey: "nav.logistics_rates", fallbackLabel: "Rate sheets", href: "/dashboard/logistics/rates", icon: ReceiptText, permissions: ["view_logistics_rates", "manage_logistics"] },
    { ...common, translationKey: "nav.logistics_quotations", fallbackLabel: "Freight quotations", href: "/dashboard/logistics/quotations", icon: FileText, permissions: ["view_logistics_quotations", "manage_logistics"] },
    { ...common, translationKey: "nav.logistics_bookings", fallbackLabel: "Bookings", href: "/dashboard/logistics/bookings", icon: CalendarCheck, permissions: ["view_logistics_bookings", "manage_logistics"] },
    { ...common, translationKey: "nav.logistics_equipment", fallbackLabel: "Equipment", href: "/dashboard/logistics/equipment", icon: Container, permissions: ["view_logistics_equipment", "manage_logistics"] },
    { ...common, translationKey: "nav.logistics_consolidations", fallbackLabel: "Consolidations", href: "/dashboard/logistics/consolidations", icon: Combine, permissions: ["view_logistics_consolidations", "manage_logistics"] },
    { ...common, translationKey: "nav.logistics_customs", fallbackLabel: "Customs", href: "/dashboard/logistics/customs", icon: Landmark, permissions: ["view_logistics_customs", "manage_logistics"] },
    { ...common, translationKey: "nav.logistics_documents", fallbackLabel: "Freight documents", href: "/dashboard/logistics/documents", icon: FileCheck2, permissions: ["view_logistics_documents", "manage_logistics"] },
    { ...common, translationKey: "nav.logistics_warehouse_handoffs", fallbackLabel: "Warehouse handoffs", href: "/dashboard/logistics/warehouse-handoffs", icon: Warehouse, permissions: ["view_logistics_warehouse_handoffs", "manage_logistics"] },
    { ...common, translationKey: "nav.logistics_financial_reports", fallbackLabel: "Financial reports", href: "/dashboard/logistics/financial-reports", icon: BarChart3, permissions: ["view_logistics_financial_reports", "manage_logistics"] },
    { ...common, translationKey: "nav.logistics_tracking_settings", fallbackLabel: "Tracking rules", href: "/dashboard/logistics/tracking-settings", icon: Settings2, permissions: ["manage_logistics_alert_rules", "manage_logistics_exception_rules", "manage_logistics"], placement: "secondary" },
    { ...common, translationKey: "nav.logistics_create_job", fallbackLabel: "New forwarding job", href: "/dashboard/logistics/jobs/create", icon: PlusCircle, permissions: ["create_logistics_jobs", "manage_logistics"], placement: "secondary" },
  ],
};
