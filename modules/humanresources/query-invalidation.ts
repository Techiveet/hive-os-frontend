import type { QueryClient } from "@tanstack/react-query";

type InvalidateOptions = {
  scope?: string;
};

export type HrWorkflowSurfaceHints = {
  module_slug?: string | null;
  submodule_slug?: string | null;
  functionality?: string | null;
  target_url?: string | null;
  approvable_type?: string | null;
  target_type?: string | null;
  subject?: string | null;
};

/** Employee directory, pickers, dashboards, and organigram after create/update/transfer. */
export async function invalidateHrEmployeeQueries(
  queryClient: QueryClient,
  options?: InvalidateOptions,
) {
  const { scope } = options ?? {};

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["hr-employees"] }),
    queryClient.invalidateQueries({ queryKey: ["hr-employees-table"] }),
    queryClient.invalidateQueries({ queryKey: ["all-employees-list"] }),
    queryClient.invalidateQueries({ queryKey: ["hr-employees-profile"] }),
    queryClient.invalidateQueries({ queryKey: ["hr-employees-list-transfers"] }),
    queryClient.invalidateQueries({ queryKey: ["hr-employee-profile"] }),
    queryClient.invalidateQueries({ queryKey: ["hr-summary"] }),
    queryClient.invalidateQueries({ queryKey: ["hr-dashboard"] }),
    queryClient.invalidateQueries({ queryKey: ["hr-organigram"] }),
    queryClient.invalidateQueries({ queryKey: ["hr-positions"] }),
    queryClient.invalidateQueries({ queryKey: ["hr-positions-table"] }),
    scope
      ? queryClient.invalidateQueries({ queryKey: ["hr-unassigned-users", scope] })
      : queryClient.invalidateQueries({ queryKey: ["hr-unassigned-users"] }),
  ]);
}

/** Organization units table and organigram after unit changes. */
export async function invalidateHrOrganizationQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["hr-units"] }),
    queryClient.invalidateQueries({ queryKey: ["hr-organization-table"] }),
    queryClient.invalidateQueries({ queryKey: ["hr-organigram"] }),
    queryClient.invalidateQueries({ queryKey: ["hr-summary"] }),
    queryClient.invalidateQueries({ queryKey: ["hr-dashboard"] }),
  ]);
}

/** Positions table and summary after position changes. */
export async function invalidateHrPositionQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["hr-positions"] }),
    queryClient.invalidateQueries({ queryKey: ["hr-positions-table"] }),
    queryClient.invalidateQueries({ queryKey: ["hr-summary"] }),
    queryClient.invalidateQueries({ queryKey: ["hr-dashboard"] }),
  ]);
}

/** Leave lists, balances, and related pickers after leave mutations. */
export async function invalidateHrLeaveQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["hr-leave"] }),
    queryClient.invalidateQueries({ queryKey: ["hr-leave-balances"] }),
    queryClient.invalidateQueries({ queryKey: ["hr-leave-employees"] }),
    queryClient.invalidateQueries({ queryKey: ["hr-leave-types"] }),
    queryClient.invalidateQueries({ queryKey: ["hr-leave-request"] }),
    queryClient.invalidateQueries({ queryKey: ["hr-leave-preview"] }),
    queryClient.invalidateQueries({ queryKey: ["hr-leave-plans"] }),
    queryClient.invalidateQueries({ queryKey: ["hr-leave-allocations"] }),
    queryClient.invalidateQueries({ queryKey: ["hr-leave-ledger"] }),
    queryClient.invalidateQueries({ queryKey: ["hr-leave-plan-assignments"] }),
    queryClient.invalidateQueries({ queryKey: ["hr-leave-accrual-runs"] }),
    queryClient.invalidateQueries({ queryKey: ["hr-holidays"] }),
    queryClient.invalidateQueries({ queryKey: ["hr-summary"] }),
    queryClient.invalidateQueries({ queryKey: ["hr-dashboard"] }),
  ]);
}

/** Transfer history and employee assignment data. */
export async function invalidateHrTransferQueries(
  queryClient: QueryClient,
  scope?: string,
) {
  await Promise.all([
    invalidateHrEmployeeQueries(queryClient, { scope }),
    queryClient.invalidateQueries({ queryKey: ["hr-transfers-list"] }),
    scope
      ? queryClient.invalidateQueries({ queryKey: ["hr-units-transfers", scope] })
      : queryClient.invalidateQueries({ queryKey: ["hr-units-transfers"] }),
    scope
      ? queryClient.invalidateQueries({ queryKey: ["hr-positions-transfers", scope] })
      : queryClient.invalidateQueries({ queryKey: ["hr-positions-transfers"] }),
  ]);
}

export async function invalidateHrRecruitmentQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["hr-job-postings"] }),
    queryClient.invalidateQueries({ queryKey: ["hr-applicants"] }),
  ]);
}

export async function invalidateHrPoliciesQueries(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: ["hr-policies"] });
}

export async function invalidateHrPunishmentQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["hr-administrative-punishments"] }),
    queryClient.invalidateQueries({ queryKey: ["hr-judiciary-punishments"] }),
    invalidateHrEmployeeQueries(queryClient),
  ]);
}

const includesAny = (haystack: string, needles: string[]) =>
  needles.some((needle) => haystack.includes(needle));

/**
 * Refresh the HR UI surfaces that correspond to an approved/rejected workflow.
 * Used by realtime workflow sync so deferred creates appear without a manual reload.
 */
export async function invalidateHrWorkflowSurfaces(
  queryClient: QueryClient,
  hints: HrWorkflowSurfaceHints = {},
): Promise<boolean> {
  const type = hints.target_type || hints.approvable_type || "";
  const functionality = (hints.functionality || "").toLowerCase();
  const submodule = (hints.submodule_slug || "").toLowerCase();
  const targetUrl = (hints.target_url || "").toLowerCase();
  const subject = (hints.subject || "").toLowerCase();
  const haystack = [
    hints.module_slug,
    submodule,
    functionality,
    targetUrl,
    type,
    hints.approvable_type,
    subject,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const isHrModule =
    hints.module_slug === "human_resources"
    || haystack.includes("human_resources")
    || haystack.includes("human-resources")
    || type.includes("HumanResources\\Models\\");

  if (!isHrModule && !targetUrl.includes("/human-resources")) {
    return false;
  }

  const tasks: Array<Promise<unknown>> = [];

  const isEmployeeRecord =
    functionality === "employee_record"
    || submodule === "employees"
    || (type.includes("HumanResources\\Models\\Employee") && !type.includes("EmployeeAssignment"))
    || targetUrl.includes("/human-resources/employees")
    || includesAny(subject, ["create employee", "update employee", "employee record"]);

  const isAssignmentOrTransfer =
    functionality === "employee_assignment"
    || type.includes("HumanResources\\Models\\EmployeeAssignment")
    || targetUrl.includes("/human-resources/transfers")
    || targetUrl.includes("tab=organigram")
    || includesAny(subject, ["assignment", "transfer", "reassign"]);

  const isOrganizationUnit =
    functionality === "organization_unit"
    || type.includes("HumanResources\\Models\\OrganizationUnit")
    || targetUrl.includes("tab=organization")
    || includesAny(subject, ["organization unit", "org unit"]);

  const isPosition =
    functionality === "position"
    || submodule === "positions"
    || type.includes("HumanResources\\Models\\Position")
    || targetUrl.includes("tab=positions")
    || includesAny(subject, ["hr position", "create position", "update position"]);

  const isLeaveSurface =
    submodule === "leave"
    || functionality.startsWith("leave_")
    || functionality === "holiday"
    || type.includes("LeaveRequest")
    || type.includes("LeaveCancellation")
    || type.includes("LeaveReturn")
    || type.includes("LeaveType")
    || type.includes("\\Holiday")
    || targetUrl.includes("/human-resources/leave")
    || targetUrl.includes("tab=leave")
    || includesAny(subject, [
      "leave request",
      "leave cancellation",
      "early leave",
      "leave return",
      "leave policy",
      "hr holiday",
      "holiday",
    ]);

  if (isEmployeeRecord) {
    tasks.push(invalidateHrEmployeeQueries(queryClient));
  }

  if (isAssignmentOrTransfer) {
    tasks.push(invalidateHrTransferQueries(queryClient));
  }

  if (isOrganizationUnit) {
    tasks.push(invalidateHrOrganizationQueries(queryClient));
  }

  if (isPosition) {
    tasks.push(invalidateHrPositionQueries(queryClient));
  }

  if (isLeaveSurface) {
    tasks.push(invalidateHrLeaveQueries(queryClient));
  }

  // Unknown HR approval: refresh common workspace surfaces rather than missing one.
  if (tasks.length === 0 && isHrModule) {
    tasks.push(
      invalidateHrEmployeeQueries(queryClient),
      invalidateHrTransferQueries(queryClient),
      invalidateHrOrganizationQueries(queryClient),
      invalidateHrPositionQueries(queryClient),
      invalidateHrLeaveQueries(queryClient),
    );
  }

  if (tasks.length === 0) {
    return false;
  }

  await Promise.all(tasks);
  return true;
}
