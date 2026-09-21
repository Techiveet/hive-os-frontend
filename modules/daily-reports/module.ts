import { FileText, PlusCircle, Users } from "lucide-react";
import type { FrontendModuleDefinition } from "@/modules/types";

const common = {
  moduleId: "daily-reports" as const,
  placement: "primary" as const,
};

export const dailyReportsModule: FrontendModuleDefinition = {
  id: "daily-reports",
  name: "Daily Reports",
  description:
    "Employee daily work submissions, work breakdowns, blockers, tomorrow plans, team compliance, and supervisor reviews.",
  backendModule: "Modules\\DailyReport",
  routePrefixes: ["/dashboard/daily-reports"],
  navItems: [
    {
      ...common,
      translationKey: "nav.daily_reports",
      fallbackLabel: "Daily Reports",
      href: "/dashboard/daily-reports",
      icon: FileText,
      permissions: [
        "view_own_daily_reports",
        "view_team_daily_reports",
        "manage_daily_reports",
      ],
    },
    {
      ...common,
      translationKey: "nav.new_daily_report",
      fallbackLabel: "Submit Daily Report",
      href: "/dashboard/daily-reports/new",
      icon: PlusCircle,
      permissions: ["submit_daily_reports", "manage_daily_reports"],
    },
  ],
};