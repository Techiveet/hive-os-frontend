import { CheckCircle, LayoutDashboard, Shield, Zap } from "lucide-react";
import type { FrontendModuleDefinition } from "@/modules/types";
import {
  WORKFLOW_ROLE_ROUTE_PERMISSIONS,
  WORKFLOW_ROUTE_PERMISSIONS,
  WORKFLOW_RULE_ROUTE_PERMISSIONS,
} from "@/lib/route-permissions";

export const workflowModule: FrontendModuleDefinition = {
  id: "workflow",
  name: "Workflow",
  description: "Dynamic approval systems and process automation.",
  backendModule: "Modules\\Workflow",
  routePrefixes: [
    "/dashboard/workflow",
  ],
  navItems: [
    {
      moduleId: "workflow",
      translationKey: "nav.workflow_dashboard",
      fallbackLabel: "Workflow Dashboard",
      href: "/dashboard/workflow",
      icon: LayoutDashboard,
      subscriptionSlug: "workflow_automation",
      permissions: [...WORKFLOW_ROUTE_PERMISSIONS],
      placement: "primary",
    },
    {
      moduleId: "workflow",
      translationKey: "nav.approvals",
      fallbackLabel: "My Approvals",
      href: "/dashboard/workflow/approvals",
      icon: CheckCircle,
      subscriptionSlug: "workflow_automation",
      permissions: [...WORKFLOW_ROUTE_PERMISSIONS],
      placement: "primary",
      tourId: "tour-nav-approvals",
    },
    {
      moduleId: "workflow",
      translationKey: "nav.workflow_rules",
      fallbackLabel: "Workflow Rules",
      href: "/dashboard/workflow/rules",
      icon: Zap,
      subscriptionSlug: "workflow_automation",
      permissions: [...WORKFLOW_RULE_ROUTE_PERMISSIONS],
      placement: "primary",
    },
    {
      moduleId: "workflow",
      translationKey: "nav.approval_roles",
      fallbackLabel: "Approval Roles",
      href: "/dashboard/workflow/roles",
      icon: Shield,
      subscriptionSlug: "workflow_automation",
      permissions: [...WORKFLOW_ROLE_ROUTE_PERMISSIONS],
      placement: "secondary",
    },
  ],
};
