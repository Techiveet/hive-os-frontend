import { getBackendApiRoot, getAuthHeaders, getTenantHeaders, handleAuthFailureResponse } from "@/lib/runtime-context";

export type WorkflowDashboardData = {
  totals: {
    approvals: number;
    pending: number;
    approved: number;
    rejected: number;
    signed: number;
    active_definitions: number;
    active_roles: number;
    my_pending: number;
  };
  status_distribution: Record<"pending" | "approved" | "rejected", number>;
  daily_trend: Array<{
    date: string;
    label: string;
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  }>;
  model_breakdown: Array<{
    type: string;
    label: string;
    total: number;
  }>;
  step_backlog: Array<{
    sequence: number;
    label: string;
    total: number;
  }>;
  definition_triggers: Array<{
    trigger_event: string;
    label: string;
    total: number;
    active: number;
  }>;
  role_backlog: Array<{
    role: string;
    total: number;
  }>;
};

export async function fetchWorkflowDashboard(): Promise<WorkflowDashboardData | null> {
  const res = await fetch(`${getBackendApiRoot()}/workflow-dashboard`, {
    headers: {
      ...getAuthHeaders(),
      ...getTenantHeaders(),
    },
  });

  if (await handleAuthFailureResponse(res)) return null;
  if (!res.ok) throw new Error("Failed to fetch workflow dashboard");

  return res.json();
}

export async function fetchWorkflowApprovals(params: {
  page?: number;
  per_page?: number;
  status?: string;
  type?: "inbox" | "requested";
  approvable_type?: string;
  approvable_id?: number;
} = {}) {
  const query = new URLSearchParams();
  if (params.page) query.append("page", params.page.toString());
  if (params.per_page) query.append("per_page", params.per_page.toString());
  if (params.status) query.append("status", params.status);
  if (params.type) query.append("type", params.type);
  if (params.approvable_type) query.append("approvable_type", params.approvable_type);
  if (params.approvable_id) query.append("approvable_id", params.approvable_id.toString());

  const res = await fetch(`${getBackendApiRoot()}/workflow-approvals?${query.toString()}`, {
    headers: {
      ...getAuthHeaders(),
      ...getTenantHeaders(),
    },
  });

  if (await handleAuthFailureResponse(res)) return null;
  if (!res.ok) throw new Error("Failed to fetch approvals");

  return res.json();
}

export async function actionWorkflowApproval(
  id: number,
  status: "approved" | "rejected",
  payload: {
    notes?: string;
    signature_data: string;
    action_metadata?: Record<string, unknown>;
  }
) {
  const res = await fetch(`${getBackendApiRoot()}/workflow-approvals/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...getTenantHeaders(),
    },
    body: JSON.stringify({ status, ...payload }),
  });

  if (await handleAuthFailureResponse(res)) return null;

  const json = await res.json();
  if (!res.ok) {
    const validationMessage = json.errors
      ? Object.values(json.errors).flat().join(" ")
      : null;

    throw new Error(validationMessage || json.message || "Failed to action approval");
  }

  return json;
}

export async function assignApprovers(data: {
  approvable_type: string;
  approvable_id: number;
  trigger_event?: string;
  module_slug?: string;
  submodule_slug?: string;
  functionality?: string;
  target_url?: string;
  context?: Record<string, unknown>;
  approvers?: Array<{ 
    user_id?: number; 
    role_id?: number; 
    sequence?: number; 
    department?: string 
  }>;
}) {
  return createWorkflowApproval(data);
}

export async function fetchApprovalRoles(params?: { 
  page?: number; 
  per_page?: number;
  search?: string;
  status?: string;
  sort_by?: string;
  sort_direction?: "asc" | "desc";
}) {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.per_page) queryParams.append("per_page", params.per_page.toString());
  if (params?.search) queryParams.append("search", params.search);
  if (params?.status) queryParams.append("status", params.status);
  if (params?.sort_by) queryParams.append("sort_by", params.sort_by);
  if (params?.sort_direction) queryParams.append("sort_direction", params.sort_direction);

  const res = await fetch(`${getBackendApiRoot()}/approval-roles?${queryParams.toString()}`, {
    headers: {
      ...getAuthHeaders(),
      ...getTenantHeaders(),
    },
  });

  if (await handleAuthFailureResponse(res)) return null;
  if (!res.ok) throw new Error("Failed to fetch approval roles");

  return res.json();
}

export async function createApprovalRole(data: {
  name: string;
  description?: string;
  user_ids?: number[];
}) {
  const res = await fetch(`${getBackendApiRoot()}/approval-roles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...getTenantHeaders(),
    },
    body: JSON.stringify(data),
  });

  if (await handleAuthFailureResponse(res)) return null;
  
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || json.error || "Failed to create approval role");
  }

  return json;
}

export async function updateApprovalRole(id: number, data: {
  name?: string;
  description?: string;
  user_ids?: number[];
  is_active?: boolean;
}) {
  const res = await fetch(`${getBackendApiRoot()}/approval-roles/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...getTenantHeaders(),
    },
    body: JSON.stringify(data),
  });

  if (await handleAuthFailureResponse(res)) return null;
  
  const json = await res.json();
  if (!res.ok) {
    console.error("Update approval role failed:", json);
    throw new Error(json.message || json.error || "Failed to update approval role");
  }

  return json;
}

export async function deleteApprovalRole(id: number) {
  const res = await fetch(`${getBackendApiRoot()}/approval-roles/${id}`, {
    method: "DELETE",
    headers: {
      ...getAuthHeaders(),
      ...getTenantHeaders(),
    },
  });

  if (await handleAuthFailureResponse(res)) return null;
  if (!res.ok) throw new Error("Failed to delete approval role");

  return res.json();
}

export async function fetchWorkflowDefinitions() {
  const res = await fetch(`${getBackendApiRoot()}/workflow-definitions`, {
    headers: {
      ...getAuthHeaders(),
      ...getTenantHeaders(),
    },
  });

  if (await handleAuthFailureResponse(res)) return null;
  if (!res.ok) throw new Error("Failed to fetch workflow definitions");

  return res.json();
}

export type WorkflowTarget = {
  label: string;
  value: string;
  model_type: string;
  module_slug?: string;
  submodule_slug?: string;
  events: string[];
};

export async function fetchWorkflowTargets(): Promise<WorkflowTarget[] | null> {
  const res = await fetch(`${getBackendApiRoot()}/workflow-targets`, {
    headers: {
      ...getAuthHeaders(),
      ...getTenantHeaders(),
    },
  });

  if (await handleAuthFailureResponse(res)) return null;
  if (!res.ok) throw new Error("Failed to fetch workflow targets");

  return res.json();
}

export async function createWorkflowDefinition(data: {
  name: string;
  model_type: string;
  approver_ids?: number[];
  approval_role_ids?: number[];
  required_approvals: number;
  trigger_event: string;
  conditions?: Record<string, unknown>;
  actions?: Record<string, unknown>;
  signature_required?: boolean;
  prevent_duplicate_pending?: boolean;
  is_active?: boolean;
}) {
  const res = await fetch(`${getBackendApiRoot()}/workflow-definitions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...getTenantHeaders(),
    },
    body: JSON.stringify(data),
  });

  if (await handleAuthFailureResponse(res)) return null;
  if (!res.ok) throw new Error("Failed to create workflow definition");

  return res.json();
}

export async function deleteWorkflowDefinition(id: number) {
  const res = await fetch(`${getBackendApiRoot()}/workflow-definitions/${id}`, {
    method: "DELETE",
    headers: {
      ...getAuthHeaders(),
      ...getTenantHeaders(),
    },
  });

  if (await handleAuthFailureResponse(res)) return null;
  if (!res.ok) throw new Error("Failed to delete workflow definition");

  return res.json();
}

export async function createWorkflowApproval(data: {
  approvable_type: string;
  approvable_id: number;
  trigger_event?: string;
  module_slug?: string;
  submodule_slug?: string;
  functionality?: string;
  target_url?: string;
  context?: Record<string, unknown>;
  approvers?: Array<{
    user_id?: number;
    role_id?: number;
    sequence?: number;
    department?: string
  }>;
}) {
  const res = await fetch(`${getBackendApiRoot()}/workflow-approvals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...getTenantHeaders(),
    },
    body: JSON.stringify(data),
  });

  if (await handleAuthFailureResponse(res)) return null;
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || json.error || "Failed to create workflow approval");

  return json;
}
