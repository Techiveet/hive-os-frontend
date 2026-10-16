export type TenantActivityEvent = {
  id: number;
  tenant_id: string;
  module: string;
  action: string | null;
  description: string;
  actor: string;
  created_at: string;
};

export type TenantOverview = {
  total: number;
  active: number;
  active_workspaces_24h: number;
  events_24h: number;
  logins_24h: number;
  failed_logins_24h: number;
  recent_activity: TenantActivityEvent[];
  checked_at: string;
};

export type TenantActivity = {
  tenant_id: string;
  provisioning_status: string;
  administrator: { admin_email: string; admin_name: string | null; admin_exists: boolean; admin_active: boolean; workspace_available: boolean; admin_registry_mismatch: boolean };
  workspace: {
    available: boolean;
    users_total: number | null;
    users_active: number | null;
    last_login_at: string | null;
    users: { id: number; name: string; email: string; is_active: boolean; roles: string[]; must_change_password: boolean; last_login_at: string | null }[];
  };
  events_24h: number;
  logins_24h: number;
  failed_logins_24h: number;
  daily_activity: { date: string; total: number }[];
  activity: TenantActivityEvent[];
  meta: { total: number; current_page: number; last_page: number };
  checked_at: string;
};
