"use client";

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Activity, Users, Server, Home, HelpCircle, ShieldCheck,
    Key, User as UserIcon, Plus, UserPlus, ShieldAlert,
    ActivitySquare, Layers, Clock,
    CreditCard, HardDrive, Globe, Zap, BellRing, Database, RefreshCw, VenetianMask, ChevronRight,
    LineChart as LineChartIcon, Settings, FileText, CheckCircle2,
    Boxes, Warehouse as WarehouseIcon, TrendingUp, HandCoins, Truck,
    CheckCircle, ListTodo, Award, Sparkles, Building2, CircleParking,
    ArrowUpRight, ArrowDownRight, Layers3
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import RetryButton from '@/components/RetryButton';
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { toast } from "sonner";
import { useTour } from "@/components/providers/tour-provider";
import { TourDropdown } from "@/components/dashboard/tour-dropdown";
import { useTranslation } from "@/store/use-translation";
import { cn } from '@/lib/utils';
import { initEcho } from '@/lib/echo';
import { getAccessToken, getBackendApiRoot, getTenantHeaders, getTenantId, isTenantSession } from '@/lib/runtime-context';
import { DashboardOverviewPlaceholder } from "@/components/ui/loading-states";
import { usePermissions } from "@/hooks/use-permissions";
import { useTenantModuleAccess } from "@/hooks/use-tenant-module-access";
import { handleAuthFailureResponse, isImpersonatingSession, stopImpersonation } from "@/lib/auth-sync";
import {
    ALERTS_ROUTE_PERMISSIONS,
    AUDIT_LOG_ROUTE_PERMISSIONS,
    SECURITY_ROUTE_PERMISSIONS,
    TENANTS_ROUTE_PERMISSIONS,
} from "@/lib/route-permissions";
import { EChart } from "@/modules/shared/charts/echarts";
import {
    telemetryAreaChart,
    activityFlowLineChart,
    modulesMatrixBarChart,
    resourceAllocationBarChart,
    stockMovementFlowChart,
    donutChartWithTotal,
    departmentActivityBarChart,
} from "@/components/dashboard/dashboard-chart-builders";

interface DashboardActivity {
    id?: number | string;
    event?: string;
    description?: string;
    causer?: string | { name?: string };
    subject_type?: string;
    properties?: { causer_name?: string };
    node?: string;
    tenant_id?: string;
    time?: string;
    time_ago?: string;
}

interface DashboardData {
    success?: boolean;
    generated_at?: string;
    refresh_interval_seconds?: number;
    dashboard_scope?: 'platform' | 'tenant' | 'personal';
    is_super_admin?: boolean;
    role_title?: string;
    user?: {
        id: number | null;
        name: string;
        email: string;
        role: string;
    };
    company: string;
    plan: string;
    stats: {
        total_users: number;
        active_users: number;
        total_roles: number;
        total_permissions: number;
        total_tenants?: number;
        active_tenants?: number;
        assigned_tasks?: number;
        my_actions_today?: number;
        role_capabilities?: number;
        operational_score?: number;
        catalog_items?: number;
        warehouse_capacity?: string;
    };
    tenant_health?: {
        total_units_on_hand: number;
        total_stock_movements: number;
        published_products: number;
        total_products: number;
        active_staff: number;
    } | null;
    recent_activity: DashboardActivity[];
    business?: {
        currency: string;
        monthly_recurring_revenue: number;
        collected_this_month: number;
        lifetime_collected: number;
        outstanding: number;
        active_subscriptions: number;
        paying_subscriptions: number;
        plan_mix: { plan: string; name: string; count: number; percent: number }[];
    };
    cluster?: {
        db_size: string;
        redis_hits: number;
        ws_connections: number;
        cpu_load?: number;
        memory_usage?: number;
    };
    alerts?: { id?: number; title: string; description: string; level: string; time_ago: string }[];
    traffic_origins?: { city: string; code?: string; flag?: string; percent: number }[];
    hourly_activity?: { hour: string; actions: number; logins: number }[];
    resource_allocation?: { name: string; value: number; unit: string; fill: string }[];
    task_distribution?: { status: string; count: number; fill: string }[];
    inventory_flow?: { period: string; inbound: number; outbound: number; transfers: number }[];
    warehouse_utilization?: { name: string; value: number; color?: string }[];
    department_activity?: { department: string; transactions: number; pendingTasks: number }[];
    module_traffic?: {
        slug: string;
        name: string;
        category: string;
        actions: number;
        subscribed_tenants: number | null;
        monthly_price_etb: number;
        registry_enabled: boolean;
        is_subscription_catalog: boolean;
        fill: string;
    }[];
}

export default function DashboardHome() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const { startTour } = useTour();
    const { permissions, roles, hasPermission, hasAnyPermission, hasRole, isLoaded } = usePermissions();
    const { hasModule } = useTenantModuleAccess();
    const isTenantNode = isTenantSession();
    const hasInventory = !isTenantNode || hasModule("inventory_control");
    const hasWarehouse = !isTenantNode || hasModule("warehouse_management");
    const hasProjectManagement = !isTenantNode || hasModule("project_management");
    const hasAuditLogs = !isTenantNode || hasModule("audit_logs");

    const [tenantName, setTenantName] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [isImpersonating, setIsImpersonating] = useState(false);
    const [isFlushingCache, setIsFlushingCache] = useState(false);

    const canViewDashboard = hasPermission("view_system_dashboard");
    const canProvisionTenants = hasAnyPermission(["manage_tenants", "provision_tenants"]);
    const canViewUsers = hasAnyPermission(["manage_users", "view_users"]);
    const canInviteUsers = hasPermission("manage_users") || (hasPermission("create_users") && canViewUsers);
    const canManageSystemSettings = hasPermission("manage_system_settings");
    const canManageBackups = hasPermission("manage_backups");
    const canAccessSecurity = hasAnyPermission([...SECURITY_ROUTE_PERMISSIONS]);
    const canViewRoles = hasAnyPermission(["manage_roles", "view_roles"]);
    const canViewPermissions = hasPermission("view_permissions");
    const canViewAlerts = hasAnyPermission([...ALERTS_ROUTE_PERMISSIONS]);
    const canViewLogs = hasAnyPermission([...AUDIT_LOG_ROUTE_PERMISSIONS]);
    const canViewTenants = hasAnyPermission([...TENANTS_ROUTE_PERMISSIONS]);

    useEffect(() => {
        const tenantId = getTenantId();

        if (tenantId) {
            setTenantName(tenantId.toUpperCase());
        } else {
            setTenantName('CENTRAL');
        }

        if (isImpersonatingSession()) {
            setIsImpersonating(true);
        }

        setIsMounted(true);
    }, []);

    const handleLeaveImpersonation = () => {
        stopImpersonation('/dashboard');
    };

    const handleFlushCache = async () => {
        if (isFlushingCache) return;
        setIsFlushingCache(true);
        try {
            const token = getAccessToken();
            const res = await fetch(`${getBackendApiRoot()}/system/flush-cache`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    ...getTenantHeaders(),
                },
            });

            if (await handleAuthFailureResponse(res)) {
                return;
            }

            const resData = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast.error(resData?.message || t('dashboard.flush_failed', 'Failed to flush system cache.'));
                return;
            }

            toast.success(resData?.message || t('dashboard.cache_flushed', 'System cache purged successfully.'));
            await queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t('dashboard.flush_failed', 'Failed to flush system cache.'));
        } finally {
            setIsFlushingCache(false);
        }
    };

    const { data: dashboardPayload, error, isLoading, isFetching } = useQuery({
        queryKey: ['dashboardMetrics', tenantName],
        queryFn: async () => {
            const token = getAccessToken();
            const endpoint = `${getBackendApiRoot()}${isTenantSession() ? '/tenant/dashboard' : '/dashboard'}`;

            const res = await fetch(endpoint, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    ...getTenantHeaders(),
                }
            });
            if (await handleAuthFailureResponse(res)) {
                throw new Error('Session invalidated');
            }
            if (!res.ok) throw new Error(`Node Connection Failed: ${res.status}`);
            return res.json();
        },
        enabled: isMounted && tenantName !== null && isLoaded && canViewDashboard,
        staleTime: 10_000,
        refetchInterval: 15_000,
        refetchIntervalInBackground: true,
        refetchOnWindowFocus: true,
    });

    const data: DashboardData = dashboardPayload;

    // WebSocket Real-time Echo Listener
    useEffect(() => {
        if (!isMounted) return;
        const token = getAccessToken();
        if (!token) return;
        const echo = initEcho(token);
        if (!echo) return;

        const channel = echo.channel('admin-metrics');
        channel.listen('.metric.updated', () => {
            queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
        });

        return () => {
            echo.leaveChannel('admin-metrics');
        };
    }, [isMounted, queryClient]);

    if (!isMounted || !isLoaded || isLoading) return <DashboardLoader />;
    if (error || !data) return <DashboardError message={(error as Error)?.message} />;

    // =========================================================================
    // STRICT ROLE & SCOPE RESOLUTION
    // =========================================================================
    const isCentral = tenantName === 'CENTRAL';

    // Central Super Admin: Root platform operator with full central infrastructure access
    const isCentralSuperAdmin = isCentral && (
        data.is_super_admin === true ||
        hasRole('Super Admin') ||
        hasRole('Central Super Admin') ||
        data.user?.email === 'super@hive.os'
    );

    // Tenant Super Admin / Node Manager: Enterprise tenant admin
    const isTenantAdmin = !isCentral && (
        data.is_super_admin === true ||
        hasRole('Super Admin') ||
        hasRole('Tenant Admin') ||
        hasRole('Admin') ||
        hasRole('Enterprise Admin')
    );

    // Regular User / Staff Operator: Created by System Admin, scoped strictly to personal queues
    const isRegularUser = !isCentralSuperAdmin && !isTenantAdmin;

    // Hourly flow data
    const hourlyActivityData = data.hourly_activity ?? [];
    const telemetry = hourlyActivityData.map((point) => ({
        time: point.hour,
        requests: point.actions + point.logins,
    }));
    const moduleTraffic = data.module_traffic ?? [];
    const resourceData = data.resource_allocation ?? [];

    // Tenant stock flow dataset (real movements from backend)
    const tenantStockFlow = data.inventory_flow && data.inventory_flow.length > 0 ? data.inventory_flow : [];

    // Tenant warehouse zones storage capacity
    const tenantWarehouseCapacity = data.warehouse_utilization && data.warehouse_utilization.length > 0
        ? data.warehouse_utilization
        : [];

    // Tenant department workload matrix
    const tenantDepartmentActivity = data.department_activity && data.department_activity.length > 0
        ? data.department_activity
        : [];

    // Regular user personal queues (from real activity & session records)
    const userTaskQueue = (data.task_distribution && data.task_distribution.length > 0)
        ? data.task_distribution.map((t) => ({ name: t.status, value: t.count, color: t.fill }))
        : [];

    // Regular user personal department workload
    const userDepartmentActivity = data.department_activity && data.department_activity.length > 0
        ? data.department_activity
        : [];

    // Regular user hourly velocity
    const userVelocityData = hourlyActivityData.map((d) => ({
        time: d.hour,
        requests: d.actions,
    }));

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Impersonation Banner */}
            {isImpersonating && (
                <div className="bg-amber-500/10 border-2 border-amber-500/30 text-amber-600 dark:text-amber-400 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md shadow-lg animate-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="h-10 w-10 bg-amber-500/20 rounded-full flex items-center justify-center shrink-0">
                            <VenetianMask className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm uppercase tracking-widest">{t('users.impersonation_active', 'Impersonation Active')}</h3>
                            <p className="text-xs font-medium opacity-80">{t('users.impersonation_warning', 'You are currently viewing the system through another operator\'s clearance level.')}</p>
                        </div>
                    </div>
                    <Button onClick={handleLeaveImpersonation} variant="destructive" className="w-full sm:w-auto shadow-md hover:bg-red-600 transition-all font-bold tracking-wide rounded-xl">
                        <ShieldAlert className="w-4 h-4 mr-2" /> {t('users.return_to_admin', 'Return to Admin')}
                    </Button>
                </div>
            )}

            {/* Breadcrumbs Row */}
            <div className="flex w-full justify-end items-center gap-3 mb-4">
                <TourDropdown
                    id="tour-dashboard-tour-btn"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg border-border/50 bg-background/50 backdrop-blur-md"
                />
                <Breadcrumbs items={[{ label: "Hive.OS", href: "/", icon: <Home className="h-4 w-4" /> }, { label: t('nav.dashboard', 'Dashboard') }]} />
            </div>

            {/* Header Title & System Actions */}
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-4 mt-2">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                        <span id="tour-dashboard-node-badge" className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
                            {isCentralSuperAdmin ? 'CENTRAL CLUSTER' : isTenantAdmin ? `NODE: ${tenantName}` : `OPERATOR CONSOLE: ${tenantName}`}
                            <strong className="text-foreground ml-1.5">[{isCentralSuperAdmin ? 'ROOT CONTROL' : isTenantAdmin ? 'ENTERPRISE NODE' : (data.user?.role || 'STAFF')}]</strong>
                        </span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-space font-extrabold tracking-tighter break-words max-w-full">
                        {isCentralSuperAdmin
                            ? 'HIVE.OS Mission Control'
                            : isTenantAdmin
                            ? data.company
                            : `${data.user?.name || 'Operator'} · Operations Console`}
                    </h1>

                    {/* ACTION CONTROLS - Strictly Permission Gated */}
                    <div className="flex flex-wrap items-center gap-3 mt-6">
                        {/* Central Super Admin only: Node Provisioning */}
                        {isCentralSuperAdmin && canProvisionTenants && (
                            <Button
                                id="tour-dashboard-provision-btn"
                                onClick={() => router.push('/dashboard/tenants')}
                                size="sm"
                                className="rounded-full shadow-md bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
                                disabled={isImpersonating}
                            >
                                <Plus className="w-4 h-4 mr-2" /> {t('dashboard.provision_node', 'Provision Node')}
                            </Button>
                        )}

                        {/* Central Super Admin only: External Cluster Monitor */}
                        {isCentralSuperAdmin && (
                            <a href="https://hive-monitor.gulfingot.com" target="_blank" rel="noopener noreferrer">
                                <Button
                                    id="tour-dashboard-monitor-btn"
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full bg-background/50 backdrop-blur-md text-muted-foreground hover:text-foreground"
                                >
                                    <Activity className="w-4 h-4 mr-2 text-rose-500" /> {t('dashboard.system_monitor', 'System Monitor')}
                                </Button>
                            </a>
                        )}

                        {/* Admins only: Invite Operator */}
                        {(isCentralSuperAdmin || isTenantAdmin) && canInviteUsers && (
                            <Button
                                id="tour-dashboard-invite-btn"
                                onClick={() => router.push('/dashboard/security')}
                                variant="outline"
                                size="sm"
                                className="rounded-full bg-background/50 backdrop-blur-md disabled:opacity-50"
                                disabled={isImpersonating}
                            >
                                <UserPlus className="w-4 h-4 mr-2 text-emerald-500" /> {t('dashboard.invite_operator', 'Invite Operator')}
                            </Button>
                        )}

                        {/* Admins only: Flush Cache & Backup */}
                        {(isCentralSuperAdmin || isTenantAdmin) && canManageSystemSettings && (
                            <Button
                                id="tour-dashboard-cache-btn"
                                variant="outline"
                                size="sm"
                                className="rounded-full bg-background/50 backdrop-blur-md text-muted-foreground hover:text-foreground disabled:opacity-50"
                                onClick={handleFlushCache}
                                disabled={isFlushingCache}
                            >
                                <RefreshCw className={cn("w-4 h-4 mr-2", isFlushingCache && "animate-spin text-primary")} />
                                {isFlushingCache ? t('dashboard.flushing_cache', 'Flushing...') : t('dashboard.flush_cache', 'Flush Cache')}
                            </Button>
                        )}

                        {isCentralSuperAdmin && canManageBackups && (
                            <Button
                                id="tour-dashboard-backup-btn"
                                variant="outline"
                                size="sm"
                                className="rounded-full bg-background/50 backdrop-blur-md text-muted-foreground hover:text-foreground"
                                onClick={() => router.push('/dashboard/settings?tab=backup')}
                            >
                                <Database className="w-4 h-4 mr-2 text-blue-500" /> {t('dashboard.trigger_backup', 'Trigger Backup')}
                            </Button>
                        )}

                        {/* Regular Users: Quick personal navigation */}
                        {isRegularUser && (
                            <>
                                {hasProjectManagement && (
                                    <Link href="/dashboard/project-management/my-tasks">
                                        <Button size="sm" className="rounded-full shadow-md bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                                            <ListTodo className="w-4 h-4 mr-2" /> {t('dashboard.my_tasks', 'My Tasks')}
                                        </Button>
                                    </Link>
                                )}
                                {hasAuditLogs && (
                                    <Link href="/dashboard/audit-logs">
                                        <Button variant="outline" size="sm" className="rounded-full bg-background/50 backdrop-blur-md text-muted-foreground hover:text-foreground">
                                            <FileText className="w-4 h-4 mr-2 text-primary" /> {t('dashboard.my_logs', 'My Audit Trail')}
                                        </Button>
                                    </Link>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <div className="flex flex-row md:flex-col items-center md:items-end gap-3 justify-between md:justify-end">
                    <Badge id="tour-dashboard-plan-badge" variant="outline" className="rounded-full border-primary/20 bg-primary/5 text-primary px-3 sm:px-4 py-1.5 font-mono text-[11px] sm:text-xs uppercase tracking-widest">
                        {isRegularUser ? `ROLE: ${data.user?.role || 'OPERATOR'}` : data.plan}
                    </Badge>
                    <div className="flex items-center gap-2 text-[11px] sm:text-xs font-mono text-muted-foreground">
                        <ShieldCheck className="w-3 h-3 text-emerald-500" />
                        <span className="hidden sm:inline">{t('dashboard.system_encrypted', 'System Encrypted & Secured')}</span>
                    </div>
                </div>
            </div>

            {/* =========================================================================
                STAT CARDS (Role Differentiated & Strictly Permission Gated)
                ========================================================================= */}
            <div id="tour-body-stats" className="grid gap-4 mt-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {/* 1. CENTRAL SUPER ADMIN STATS */}
                {isCentralSuperAdmin && (
                    <>
                        <StatCard
                            title={t('dashboard.active_nodes', 'Active Nodes')}
                            value={data.stats.active_tenants || 0}
                            subtext={`${t('dashboard.provisioned', 'Provisioned')}: ${data.stats.total_tenants || 0}`}
                            icon={<Server className="text-indigo-500" />}
                            bgClass="bg-indigo-500/10"
                            href={canViewTenants ? "/dashboard/tenants" : undefined}
                            trend="up"
                        />
                        <StatCard
                            title={t('dashboard.active_users', 'Active Platform Users')}
                            value={data.stats.active_users || 0}
                            subtext={`${t('dashboard.total', 'Total')}: ${data.stats.total_users || 0}`}
                            icon={<Users className="text-emerald-500" />}
                            bgClass="bg-emerald-500/10"
                            href={canAccessSecurity ? "/dashboard/security?tab=users" : undefined}
                            trend="up"
                        />
                        <StatCard
                            title={t('dashboard.security_roles', 'Security Roles')}
                            value={data.stats.total_roles || 0}
                            subtext={t('dashboard.access_matrices', 'Access Matrices')}
                            icon={<ShieldCheck className="text-amber-500" />}
                            bgClass="bg-amber-500/10"
                            href={canViewRoles ? "/dashboard/security?tab=roles" : undefined}
                            trend="up"
                        />
                        <StatCard
                            title={t('dashboard.permissions', 'Platform Capabilities')}
                            value={data.stats.total_permissions || 0}
                            subtext={t('dashboard.permission_nodes', 'Permission Nodes')}
                            icon={<Key className="text-blue-500" />}
                            bgClass="bg-blue-500/10"
                            href={canViewPermissions ? "/dashboard/security?tab=permissions" : undefined}
                        />
                    </>
                )}

                {/* 2. TENANT SUPER ADMIN STATS */}
                {isTenantAdmin && (
                    <>
                        <StatCard
                            title={t('dashboard.tenant_staff', 'Active Staff')}
                            value={data.stats.active_users || data.stats.total_users || 0}
                            subtext={`${t('dashboard.total', 'Total Registered')}: ${data.stats.total_users || 0}`}
                            icon={<Users className="text-emerald-500" />}
                            bgClass="bg-emerald-500/10"
                            href={canViewUsers ? "/dashboard/security?tab=users" : undefined}
                            trend="up"
                        />
                        {hasInventory ? (
                            <StatCard
                                title={t('dashboard.catalog_items', 'Inventory Catalog')}
                                value={data.stats.catalog_items ?? 0}
                                subtext={t('dashboard.managed_skus', 'Active Stock SKUs')}
                                icon={<Boxes className="text-indigo-500" />}
                                bgClass="bg-indigo-500/10"
                                href="/dashboard/inventory"
                                trend="up"
                            />
                        ) : (
                            <StatCard
                                title={t('dashboard.active_roles', 'Security Roles')}
                                value={data.stats.total_roles ?? 0}
                                subtext="Configured Access Roles"
                                icon={<Key className="text-indigo-500" />}
                                bgClass="bg-indigo-500/10"
                                href={canViewRoles ? "/dashboard/security?tab=roles" : undefined}
                                trend="up"
                            />
                        )}
                        {hasWarehouse ? (
                            <StatCard
                                title={t('dashboard.warehouse_utilization', 'Warehouse Capacity')}
                                value={data.stats.warehouse_capacity ?? "0%"}
                                subtext={t('dashboard.slot_occupancy', 'Active Storage Occupancy')}
                                icon={<WarehouseIcon className="text-sky-500" />}
                                bgClass="bg-sky-500/10"
                                href="/dashboard/warehouse"
                                trend="up"
                            />
                        ) : (
                            <StatCard
                                title="System Clearance"
                                value={data.stats.total_permissions ?? 0}
                                subtext="Authorized Capabilities"
                                icon={<ShieldCheck className="text-sky-500" />}
                                bgClass="bg-sky-500/10"
                                href={canViewPermissions ? "/dashboard/security?tab=permissions" : undefined}
                                trend="up"
                            />
                        )}
                        <StatCard
                            title={t('dashboard.operational_score', 'Operational SLA')}
                            value={`${data.stats.operational_score ?? 0}%`}
                            subtext={t('dashboard.on_time_perf', 'On-Time Fulfillment Rate')}
                            icon={<ShieldCheck className="text-amber-500" />}
                            bgClass="bg-amber-500/10"
                        />
                    </>
                )}

                {/* 3. REGULAR USER / OPERATOR STATS (Non-admin) */}
                {isRegularUser && (
                    <>
                        {hasProjectManagement ? (
                            <StatCard
                                title={t('dashboard.my_tasks', 'My Assigned Work')}
                                value={data.stats.assigned_tasks ?? 0}
                                subtext={t('dashboard.active_queue', 'Active Task Queue')}
                                icon={<Clock className="text-amber-500" />}
                                bgClass="bg-amber-500/10"
                                href="/dashboard/project-management/my-tasks"
                                trend="up"
                            />
                        ) : (
                            <StatCard
                                title="Role Capabilities"
                                value={data.stats.role_capabilities ?? permissions.length ?? 0}
                                subtext="Granted Operational Rights"
                                icon={<Key className="text-amber-500" />}
                                bgClass="bg-amber-500/10"
                                trend="up"
                            />
                        )}
                        <StatCard
                            title={t('dashboard.my_actions_today', 'Executions Today')}
                            value={data.stats.my_actions_today ?? 0}
                            subtext={t('dashboard.audited_ops', 'Audited Operations')}
                            icon={<ActivitySquare className="text-emerald-500" />}
                            bgClass="bg-emerald-500/10"
                            href={hasAuditLogs ? "/dashboard/audit-logs" : undefined}
                            trend="up"
                        />
                        <StatCard
                            title={t('dashboard.op_velocity', 'Operational Velocity')}
                            value={`${data.stats.operational_score ?? 0}%`}
                            subtext={t('dashboard.daily_target_ratio', 'Daily Completion Ratio')}
                            icon={<Zap className="text-primary" />}
                            bgClass="bg-primary/10"
                        />
                        <StatCard
                            title={t('dashboard.my_capabilities', 'Role Capabilities')}
                            value={data.stats.role_capabilities ?? permissions.length ?? 0}
                            subtext={t('dashboard.granted_permissions', 'Assigned Permissions')}
                            icon={<Key className="text-blue-500" />}
                            bgClass="bg-blue-500/10"
                        />
                    </>
                )}
            </div>

            {/* =========================================================================
                CHART ROW 1: PRIMARY TELEMETRY & OPERATIONS FLOW (ECharts Interactive)
                ========================================================================= */}
            <div className="grid gap-4 lg:grid-cols-12">
                {/* Left Primary Chart */}
                <div id="tour-body-telemetry" className="lg:col-span-6 xl:col-span-6 rounded-2xl md:rounded-[2.5rem] border border-border/50 bg-card/40 p-4 sm:p-6 backdrop-blur-md min-h-[380px] flex flex-col transition-all shadow-lg group">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <div className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
                                {isCentralSuperAdmin ? (
                                    <>
                                        <ActivitySquare aria-hidden="true" className="h-4 w-4 text-primary" />
                                        {t('dashboard.platform_telemetry', 'Live Platform Telemetry & Throughput')}
                                    </>
                                ) : isTenantAdmin ? (
                                    hasInventory ? (
                                        <>
                                            <Boxes aria-hidden="true" className="h-4 w-4 text-emerald-500" />
                                            {t('dashboard.stock_flow_title', 'Stock Movement & Inventory Flow')}
                                        </>
                                    ) : (
                                        <>
                                            <ActivitySquare aria-hidden="true" className="h-4 w-4 text-primary" />
                                            {t('dashboard.platform_telemetry', '24H Activity & Throughput Flow')}
                                        </>
                                    )
                                ) : (
                                    <>
                                        <Zap aria-hidden="true" className="h-4 w-4 text-primary" />
                                        {t('dashboard.my_velocity_title', 'My Execution Velocity Rate')}
                                    </>
                                )}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {isCentralSuperAdmin
                                    ? 'Real-time cluster request volume and operational throughput across all tenant nodes (24H)'
                                    : isTenantAdmin
                                    ? 'Inbound stock receipts, outbound fulfillment orders & internal transfers (24H)'
                                    : 'Your personal recorded operational executions and workflow actions today (24H)'}
                            </p>
                        </div>
                        <Badge variant="outline" className="font-mono text-[11px] bg-background">
                            {isCentralSuperAdmin ? 'CLUSTER TELEMETRY' : isTenantAdmin ? 'INVENTORY PIPELINE' : 'MY HOURLY FLOW'}
                        </Badge>
                    </div>

                    <div className="flex-1 w-full min-h-[280px]">
                        {isCentralSuperAdmin && (
                            <EChart
                                option={telemetryAreaChart(telemetry, t('dashboard.requests', 'Requests'))}
                                height={280}
                                ariaLabel="Live platform activity during the last 24 hours"
                                title="Live Platform Telemetry"
                                exportFilename="platform-telemetry"
                                empty={telemetry.length === 0}
                                emptyLabel="No live cluster telemetry recorded"
                            />
                        )}
                        {isTenantAdmin && (
                            hasInventory ? (
                                <EChart
                                    option={stockMovementFlowChart(tenantStockFlow)}
                                    height={280}
                                    ariaLabel="Enterprise stock movement flow during the last 24 hours"
                                    title="Stock Movement Flow"
                                    exportFilename="inventory-stock-flow"
                                    empty={tenantStockFlow.length === 0}
                                    emptyLabel="No stock movements recorded"
                                />
                            ) : (
                                <EChart
                                    option={telemetryAreaChart(telemetry, t('dashboard.requests', 'Requests'))}
                                    height={280}
                                    ariaLabel="Live operational throughput during the last 24 hours"
                                    title="Operational Throughput"
                                    exportFilename="operational-throughput"
                                    empty={telemetry.length === 0}
                                    emptyLabel="No operational activity recorded"
                                />
                            )
                        )}
                        {isRegularUser && (
                            <EChart
                                option={telemetryAreaChart(userVelocityData, t('dashboard.actions', 'Actions'))}
                                height={280}
                                ariaLabel="Your personal execution velocity during the last 24 hours"
                                title="My Execution Velocity"
                                exportFilename="my-execution-velocity"
                                empty={userVelocityData.length === 0}
                                emptyLabel="No execution activity recorded"
                            />
                        )}
                    </div>
                </div>

                {/* Right Secondary Chart */}
                <div id="tour-body-modules" className="lg:col-span-6 xl:col-span-6 rounded-2xl md:rounded-[2.5rem] border border-border/50 bg-card/40 p-4 sm:p-6 backdrop-blur-md min-h-[380px] flex flex-col transition-all shadow-lg group">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <div className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
                                {isCentralSuperAdmin ? (
                                    <>
                                        <Layers aria-hidden="true" className="h-4 w-4 text-emerald-500" />
                                        {t('dashboard.modules_matrix', 'Modules & Subscriptions')}
                                    </>
                                ) : isTenantAdmin ? (
                                    hasWarehouse ? (
                                        <>
                                            <WarehouseIcon aria-hidden="true" className="h-4 w-4 text-sky-500" />
                                            {t('dashboard.warehouse_zones', 'Warehouse Zone Capacity')}
                                        </>
                                    ) : (
                                        <>
                                            <Layers3 aria-hidden="true" className="h-4 w-4 text-emerald-500" />
                                            <span>{t('dashboard.dept_operations', 'Department Workload Matrix')}</span>
                                        </>
                                    )
                                ) : (
                                    <>
                                        <Clock aria-hidden="true" className="h-4 w-4 text-amber-500" />
                                        {t('dashboard.my_task_queues', 'My Assigned Task Queues')}
                                    </>
                                )}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {isCentralSuperAdmin
                                    ? `All ${moduleTraffic.length} registered modules · scroll or drag slider to explore`
                                    : isTenantAdmin
                                    ? 'Real-time bin, shelf and zone storage utilization across facilities'
                                    : 'Current status breakdown of tasks assigned to your clearance'}
                            </p>
                        </div>
                        <Badge variant="outline" className="font-mono text-[11px] bg-background">
                            {isCentralSuperAdmin ? `${moduleTraffic.length} MODULES` : isTenantAdmin ? `CAPACITY ${data.stats.warehouse_capacity ?? '0%'}` : `${data.stats.assigned_tasks || 0} TASKS`}
                        </Badge>
                    </div>

                    <div className="flex-1 w-full min-h-[300px]">
                        {isCentralSuperAdmin && (
                            <EChart
                                option={modulesMatrixBarChart(moduleTraffic)}
                                height={300}
                                ariaLabel="Subscribed tenants and recorded activity for every registered module"
                                title="Modules Matrix"
                                exportFilename="modules-matrix"
                                empty={moduleTraffic.length === 0}
                                emptyLabel="No active modules registered"
                            />
                        )}
                        {isTenantAdmin && (
                            hasWarehouse ? (
                                <EChart
                                    option={donutChartWithTotal(tenantWarehouseCapacity, "Capacity")}
                                    height={280}
                                    ariaLabel="Warehouse zone storage utilization"
                                    title="Warehouse Zone Capacity"
                                    exportFilename="warehouse-capacity"
                                    empty={tenantWarehouseCapacity.length === 0}
                                    emptyLabel="No warehouse zone data found"
                                />
                            ) : (
                                <EChart
                                    option={departmentActivityBarChart(tenantDepartmentActivity)}
                                    height={280}
                                    ariaLabel="Department operations distribution"
                                    title="Department Operations Matrix"
                                    exportFilename="department-activity"
                                    empty={tenantDepartmentActivity.length === 0}
                                    emptyLabel="No department activity recorded"
                                />
                            )
                        )}
                        {isRegularUser && (
                            <EChart
                                option={donutChartWithTotal(userTaskQueue, "Tasks")}
                                height={280}
                                ariaLabel="My assigned task queue distribution"
                                title="My Assigned Tasks"
                                exportFilename="my-task-queue"
                                empty={userTaskQueue.length === 0}
                                emptyLabel="No active tasks in queue"
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* =========================================================================
                CHART ROW 2: ACTIVITY RATE & ALLOCATION / DEPARTMENT MATRIX (ECharts)
                ========================================================================= */}
            <div className="grid gap-4 lg:grid-cols-12">
                {/* Left: 24h Hourly Activity Flow */}
                <div id="tour-body-hourly" className="lg:col-span-7 xl:col-span-8 rounded-2xl md:rounded-[2.5rem] border border-border/50 bg-card/40 p-4 sm:p-6 backdrop-blur-md min-h-[380px] flex flex-col transition-all shadow-lg group">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <div className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
                                <LineChartIcon className="h-4 w-4 text-sky-500" />
                                {isCentralSuperAdmin
                                    ? t('dashboard.hourly_throughput', '24H Activity & Throughput Flow')
                                    : isTenantAdmin
                                    ? t('dashboard.shift_engagement', 'Team Shift Activity & Logins Flow')
                                    : t('dashboard.my_shift_flow', 'My Shift Operations & Session Rate')}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {isCentralSuperAdmin
                                    ? 'Global cluster executions vs authenticated operator login sessions'
                                    : isTenantAdmin
                                    ? 'Staff operations executed vs unique active operator logins across shifts'
                                    : 'Your recorded operations and login check-ins over the 24-hour cycle'}
                            </p>
                        </div>
                        <Badge variant="outline" className="font-mono text-[11px] bg-background">
                            {isCentralSuperAdmin ? 'CLUSTER ACTIONS VS SESSIONS' : isTenantAdmin ? 'TEAM SHIFT RATE' : 'MY SESSIONS'}
                        </Badge>
                    </div>

                    <div className="flex-1 w-full min-h-[280px]">
                        <EChart
                            option={activityFlowLineChart(
                                hourlyActivityData,
                                isCentralSuperAdmin ? "System Actions" : isTenantAdmin ? "Staff Operations" : "My Executions",
                                isCentralSuperAdmin ? "Operator Sessions" : isTenantAdmin ? "Unique Logins" : "My Logins"
                            )}
                            height={280}
                            ariaLabel="Activity and login timeline during the last 24 hours"
                            title="24H Activity Flow"
                            exportFilename="activity-flow"
                            empty={hourlyActivityData.length === 0}
                            emptyLabel="No recorded activity in the last 24 hours"
                        />
                    </div>
                </div>

                {/* Right: Storage Allocation (Superadmin) OR Department Operations Matrix */}
                <div id="tour-body-storage-dist" className="lg:col-span-5 xl:col-span-4 rounded-2xl md:rounded-[2.5rem] border border-border/50 bg-card/40 p-4 sm:p-6 backdrop-blur-md min-h-[380px] flex flex-col transition-all shadow-lg group">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <div className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
                                {isCentralSuperAdmin ? (
                                    <>
                                        <HardDrive className="h-4 w-4 text-amber-500" />
                                        <span>{t('dashboard.resource_distribution', 'Storage & Cache Allocation')}</span>
                                    </>
                                ) : isTenantAdmin ? (
                                    <>
                                        <Layers3 className="h-4 w-4 text-emerald-500" />
                                        <span>{t('dashboard.dept_operations', 'Department Workload Matrix')}</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="h-4 w-4 text-primary" />
                                        <span>{t('dashboard.my_dept_workload', 'My Operations Volume')}</span>
                                    </>
                                )}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {isCentralSuperAdmin
                                    ? 'PostgreSQL user table size & Redis memory distribution'
                                    : isTenantAdmin
                                    ? 'Transactions executed and pending queue across business units'
                                    : 'Work units processed across your permitted functional domains'}
                            </p>
                        </div>
                        <Badge variant="outline" className="font-mono text-[11px] bg-background">
                            {isCentralSuperAdmin ? 'STORAGE ALLOC' : isTenantAdmin ? `${tenantDepartmentActivity.length} DEPARTMENTS` : 'MODULE WORK'}
                        </Badge>
                    </div>

                    <div className="flex-1 w-full min-h-[280px]">
                        {isCentralSuperAdmin && (
                            <EChart
                                option={resourceAllocationBarChart(resourceData)}
                                height={280}
                                ariaLabel="Storage and table allocation in megabytes"
                                title="Storage Allocation"
                                exportFilename="storage-allocation"
                                empty={resourceData.length === 0}
                                emptyLabel="No storage table statistics available"
                            />
                        )}
                        {isTenantAdmin && (
                            <EChart
                                option={departmentActivityBarChart(tenantDepartmentActivity)}
                                height={280}
                                ariaLabel="Department operations and pending work distribution"
                                title="Department Operations Matrix"
                                exportFilename="department-activity"
                                empty={tenantDepartmentActivity.length === 0}
                                emptyLabel="No department activity recorded"
                            />
                        )}
                        {isRegularUser && (
                            <EChart
                                option={departmentActivityBarChart(userDepartmentActivity)}
                                height={280}
                                ariaLabel="Your personal operations distribution across modules"
                                title="My Operations Volume"
                                exportFilename="my-workload-distribution"
                                empty={userDepartmentActivity.length === 0}
                                emptyLabel="No personal module activity recorded"
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* =========================================================================
                ROW 3: REVENUE INTEL, CLUSTER HEALTH & TRAFFIC (Admins Only)
                ========================================================================= */}
            {isCentralSuperAdmin && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
                    {/* Revenue Intel */}
                    <div className="rounded-2xl md:rounded-[2.5rem] border border-border/50 bg-card/40 p-4 sm:p-6 backdrop-blur-md flex flex-col justify-between transition-all shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <div className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
                                <CreditCard className="h-4 w-4 text-amber-500" /> {t('dashboard.revenue_intel', 'Revenue Intel')}
                            </div>
                            <Badge variant="outline" className="font-mono text-[11px]">{data.business?.currency ?? 'ETB'}</Badge>
                        </div>
                        <div>
                            <h3 className="text-3xl sm:text-4xl font-space font-black tracking-tighter">{Number(data.business?.monthly_recurring_revenue ?? 0).toLocaleString()} ETB</h3>
                            <p className="text-xs text-muted-foreground mt-1">Contracted monthly value from each tenant’s latest paid order</p>
                        </div>
                        <dl className="mt-6 grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-xl border border-border/60 bg-background/50 p-3"><dt className="text-muted-foreground">Collected this month</dt><dd className="mt-1 font-mono font-bold">{Number(data.business?.collected_this_month ?? 0).toLocaleString()} ETB</dd></div>
                            <div className="rounded-xl border border-border/60 bg-background/50 p-3"><dt className="text-muted-foreground">Outstanding orders</dt><dd className="mt-1 font-mono font-bold">{Number(data.business?.outstanding ?? 0).toLocaleString()} ETB</dd></div>
                            <div className="rounded-xl border border-border/60 bg-background/50 p-3"><dt className="text-muted-foreground">Lifetime collected</dt><dd className="mt-1 font-mono font-bold">{Number(data.business?.lifetime_collected ?? 0).toLocaleString()} ETB</dd></div>
                            <div className="rounded-xl border border-border/60 bg-background/50 p-3"><dt className="text-muted-foreground">Active / paying</dt><dd className="mt-1 font-mono font-bold">{data.business?.active_subscriptions ?? 0} / {data.business?.paying_subscriptions ?? 0}</dd></div>
                        </dl>
                        <div className="mt-4 space-y-2" aria-label="Active subscription plan mix">
                            {(data.business?.plan_mix ?? []).slice(0, 4).map((plan) => (
                                <div key={plan.plan} className="flex items-center justify-between gap-3 text-[11px]">
                                    <span className="min-w-0 truncate font-bold uppercase">{plan.name}</span>
                                    <span className="shrink-0 font-mono text-muted-foreground">{plan.count} · {plan.percent}%</span>
                                </div>
                            ))}
                            {(data.business?.plan_mix ?? []).length === 0 && <p className="text-xs text-muted-foreground">No active subscription contracts.</p>}
                        </div>
                    </div>

                    {/* Cluster Health */}
                    <div id="tour-body-cluster" className="rounded-2xl md:rounded-[2.5rem] border border-border/50 bg-card/40 p-4 sm:p-6 backdrop-blur-md transition-all shadow-lg flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <div className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
                                    <HardDrive className="h-4 w-4 text-indigo-500" /> {t('dashboard.cluster_health', 'Cluster Health')}
                                </div>
                                <div className="flex items-center gap-3">
                                    <a href="https://hive-monitor.gulfingot.com" target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold font-mono uppercase tracking-wider text-muted-foreground hover:text-rose-500 transition-colors flex items-center gap-1">
                                        Metrics <ChevronRight className="w-3 h-3" />
                                    </a>
                                    <span className="relative flex h-2 w-2"><span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative rounded-full h-2 w-2 bg-emerald-500"></span></span>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                                <div className="flex flex-col items-center justify-center p-2 sm:p-3 bg-background/50 rounded-xl sm:rounded-2xl border border-border/40">
                                    <Database className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 mb-1 sm:mb-2" />
                                    <span className="text-sm sm:text-lg font-bold font-mono">{data.cluster?.db_size ?? 'Unavailable'}</span>
                                    <span className="text-[11px] sm:text-[11px] uppercase text-muted-foreground tracking-widest text-center">PGSQL Data</span>
                                </div>
                                <div className="flex flex-col items-center justify-center p-2 sm:p-3 bg-background/50 rounded-xl sm:rounded-2xl border border-border/40">
                                    <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 mb-1 sm:mb-2" />
                                    <span className="text-sm sm:text-lg font-bold font-mono">{data.cluster?.redis_hits ?? 0}%</span>
                                    <span className="text-[11px] sm:text-[11px] uppercase text-muted-foreground tracking-widest text-center">Redis Hits</span>
                                </div>
                                <div className="flex flex-col items-center justify-center p-2 sm:p-3 bg-background/50 rounded-xl sm:rounded-2xl border border-border/40">
                                    <ActivitySquare className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 mb-1 sm:mb-2" />
                                    <span className="text-sm sm:text-lg font-bold font-mono">{data.cluster?.ws_connections ?? 0}</span>
                                    <span className="text-[11px] sm:text-[11px] uppercase text-muted-foreground tracking-widest text-center">WS Conns</span>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 p-3 bg-background/40 rounded-xl border border-border/30 text-xs text-muted-foreground">
                            <span>High-availability multi-tenant shard cluster active.</span>
                        </div>
                    </div>

                    {/* Traffic Origins */}
                    <div id="tour-body-traffic" className="rounded-2xl md:rounded-[2.5rem] border border-border/50 bg-card/40 p-4 sm:p-6 backdrop-blur-md flex flex-col transition-all shadow-lg">
                        <div className="flex items-center justify-between mb-6">
                            <div className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
                                <Globe className="h-4 w-4 text-blue-400" /> {t('dashboard.traffic_origins', 'Traffic Origins')}
                            </div>
                        </div>
                        <div className="space-y-4 flex-1">
                            {(data.traffic_origins || []).slice(0, 5).map((origin, i) => (
                                <div key={i} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2"><span className="font-mono text-xs">{origin.code ?? origin.flag ?? '—'}</span> <span className="font-bold">{origin.city}</span></div>
                                    <span className="font-mono text-xs text-muted-foreground font-bold">{origin.percent}%</span>
                                </div>
                            ))}
                            {(data.traffic_origins ?? []).length === 0 && (
                                <p className="text-sm text-muted-foreground">No location data has been recorded in the last 30 days.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Tenant Admin Row 3: Traffic Origins */}
            {isTenantAdmin && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
                    <div id="tour-body-traffic" className="rounded-2xl md:rounded-[2.5rem] border border-border/50 bg-card/40 p-4 sm:p-6 backdrop-blur-md flex flex-col transition-all shadow-lg lg:col-span-1">
                        <div className="flex items-center justify-between mb-4">
                            <div className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
                                <Globe className="h-4 w-4 text-blue-400" /> {t('dashboard.traffic_origins', 'Traffic Origins')}
                            </div>
                        </div>
                        <div className="space-y-3 flex-1">
                            {(data.traffic_origins || []).slice(0, 4).map((origin, i) => (
                                <div key={i} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2"><span className="font-mono text-xs">{origin.code ?? origin.flag ?? '—'}</span> <span className="font-bold">{origin.city}</span></div>
                                    <span className="font-mono text-xs text-muted-foreground font-bold">{origin.percent}%</span>
                                </div>
                            ))}
                            {(data.traffic_origins ?? []).length === 0 && (
                                <p className="text-xs text-muted-foreground">No location data has been recorded.</p>
                            )}
                        </div>
                    </div>

                    <div className="rounded-2xl md:rounded-[2.5rem] border border-border/50 bg-card/40 p-4 sm:p-6 backdrop-blur-md flex flex-col justify-between transition-all shadow-lg lg:col-span-2">
                        <div className="flex items-center justify-between mb-4">
                            <div className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
                                <Award className="h-4 w-4 text-amber-500" /> {t('dashboard.fulfillment_index', 'Enterprise Operational Health')}
                            </div>
                            <Badge variant="outline" className="font-mono text-[11px]">SLA {Number(data.stats.operational_score ?? 100).toFixed(1)}%</Badge>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {hasInventory && (
                                <div className="p-3 rounded-xl border border-border/50 bg-background/50">
                                    <p className="text-xs text-muted-foreground">{t('dashboard.stock_on_hand', 'Stock on Hand')}</p>
                                    <p className="text-lg font-space font-bold mt-1 text-emerald-500">
                                        {Number(data.tenant_health?.total_units_on_hand ?? 0).toLocaleString()}
                                    </p>
                                </div>
                            )}
                            {hasWarehouse && (
                                <div className="p-3 rounded-xl border border-border/50 bg-background/50">
                                    <p className="text-xs text-muted-foreground">{t('dashboard.warehouse_capacity', 'Warehouse Load')}</p>
                                    <p className="text-lg font-space font-bold mt-1 text-sky-500">
                                        {data.stats.warehouse_capacity ?? "0%"}
                                    </p>
                                </div>
                            )}
                            {hasInventory && (
                                <div className="p-3 rounded-xl border border-border/50 bg-background/50">
                                    <p className="text-xs text-muted-foreground">{t('dashboard.stock_movements', 'Stock Movements')}</p>
                                    <p className="text-lg font-space font-bold mt-1 text-indigo-500">
                                        {Number(data.tenant_health?.total_stock_movements ?? 0).toLocaleString()}
                                    </p>
                                </div>
                            )}
                            <div className="p-3 rounded-xl border border-border/50 bg-background/50">
                                <p className="text-xs text-muted-foreground">{t('dashboard.active_staff', 'Active Staff')}</p>
                                <p className="text-lg font-space font-bold mt-1 text-amber-500">
                                    {data.tenant_health?.active_staff ?? data.stats.active_users ?? 0}
                                </p>
                            </div>
                            {!hasInventory && (
                                <div className="p-3 rounded-xl border border-border/50 bg-background/50">
                                    <p className="text-xs text-muted-foreground">Active Users</p>
                                    <p className="text-lg font-space font-bold mt-1 text-emerald-500">
                                        {data.stats.active_users ?? 0}
                                    </p>
                                </div>
                            )}
                            {!hasWarehouse && (
                                <div className="p-3 rounded-xl border border-border/50 bg-background/50">
                                    <p className="text-xs text-muted-foreground">Security Roles</p>
                                    <p className="text-lg font-space font-bold mt-1 text-sky-500">
                                        {data.stats.total_roles ?? 0}
                                    </p>
                                </div>
                            )}
                        </div>
                        <p className="mt-4 text-xs text-muted-foreground">{t('dashboard.operational_health_note', 'Live enterprise inventory, capacity utilization, and staff activity reported from PostgreSQL cluster.')}</p>
                    </div>
                </div>
            )}

            {/* =========================================================================
                ROW 4: ALERTS & AUDIT LEDGER
                ========================================================================= */}
            <div className="grid gap-4 lg:grid-cols-12 mt-4 pb-20 sm:pb-10">
                {/* System Alerts: Only for central super admin or users with alerts permissions */}
                {(isCentralSuperAdmin || isTenantAdmin) && canViewAlerts && (
                    <div id="tour-body-alerts" className="lg:col-span-4 rounded-2xl md:rounded-[2.5rem] border border-red-500/20 bg-gradient-to-br from-red-500/5 to-background p-4 sm:p-6 flex flex-col overflow-hidden transition-all shadow-lg">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-red-500">
                                    <BellRing className="h-4 w-4" /> {t('dashboard.alerts', 'Alerts')}
                                </div>
                                <Badge className="bg-red-500 text-white hover:bg-red-600">{data.alerts?.length || 0}</Badge>
                            </div>
                            <Link href="/dashboard/alerts">
                                <Button variant="ghost" size="sm" className="h-6 text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground">
                                    {t('dashboard.show_more', 'Show More')} <ChevronRight className="w-3 h-3 ml-1" />
                                </Button>
                            </Link>
                        </div>

                        <div className="space-y-3 flex-1 overflow-hidden">
                            {(data.alerts || []).slice(0, 5).map((alert, i) => (
                                <div key={i} className={`p-3 bg-background/60 border rounded-xl flex gap-3 items-start overflow-hidden ${alert.level === 'critical' ? 'border-red-500/20' : 'border-amber-500/20'}`}>
                                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${alert.level === 'critical' ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`} />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="text-xs font-bold truncate">{alert.title}</p>
                                            <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">{alert.time_ago}</span>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{alert.description}</p>
                                    </div>
                                </div>
                            ))}
                            {(!data.alerts || data.alerts.length === 0) && (
                                <div className="text-xs text-muted-foreground text-center py-6">
                                    {t('dashboard.no_alerts', 'No active system anomalies.')}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Audit Ledger: Role-tailored stream */}
                {canViewLogs && (
                    <div id="tour-body-audit" className={cn(
                        "rounded-2xl md:rounded-[2.5rem] border border-border/50 bg-card/40 p-4 sm:p-6 backdrop-blur-md transition-all shadow-lg",
                        (isCentralSuperAdmin || isTenantAdmin) && canViewAlerts ? "lg:col-span-8" : "lg:col-span-12"
                    )}>
                        <div className="flex items-center justify-between mb-6">
                            <div className="text-sm font-bold flex items-center gap-3 uppercase tracking-widest text-muted-foreground">
                                <Activity className="h-4 w-4 text-primary" />
                                {isCentralSuperAdmin
                                    ? t('dashboard.live_system_audit', 'Live Platform Audit Stream')
                                    : isTenantAdmin
                                    ? t('dashboard.live_node_audit', 'Live Enterprise Node Audit')
                                    : t('dashboard.my_audit_stream', 'My Operational Audit Stream')}
                            </div>
                            <Link href="/dashboard/audit-logs">
                                <Button variant="ghost" size="sm" className="h-6 text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground">
                                    {t('dashboard.show_more', 'Show More')} <ChevronRight className="w-3 h-3 ml-1" />
                                </Button>
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {(data.recent_activity || []).slice(0, 5).map((log, index) => {
                                let causerName = log.properties?.causer_name || (typeof log.causer === 'object' ? log.causer?.name : log.causer) || 'System';
                                if (causerName === 'HIVE OVERLORD' && log.properties?.causer_name) {
                                    causerName = log.properties.causer_name;
                                }

                                const nodeLabel = log.node === 'Central' ? 'CENTRAL' : (log.node || log.tenant_id);

                                return (
                                    <div key={`log-${log.id}-${index}`} className="flex items-center justify-between p-4 rounded-2xl bg-background/40 border border-border/40 hover:bg-muted/30 transition-all animate-in fade-in slide-in-from-top-2 duration-500">
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary"><UserIcon className="w-4 h-4" /></div>
                                            <div>
                                                <p className="text-sm font-bold">{log.description}</p>
                                                <p className="text-[11px] font-mono text-muted-foreground uppercase flex items-center gap-1.5 mt-0.5">
                                                    {isCentral && (
                                                        <span className="bg-primary/20 text-primary px-1.5 rounded-sm font-bold tracking-widest">
                                                            [{nodeLabel}]
                                                        </span>
                                                    )}
                                                    {log.event} - {log.time || log.time_ago || 'Just now'}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="font-mono text-[11px] uppercase">
                                            {causerName}
                                        </Badge>
                                    </div>
                                );
                            })}

                            {(!data.recent_activity || data.recent_activity.length === 0) && (
                                <div className="text-xs text-muted-foreground text-center py-8 flex flex-col items-center">
                                    <FileText className="h-8 w-8 text-muted/30 mb-2" />
                                    {t('dashboard.no_audit_logs', 'No recent audit logs found for this view.')}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({
    title,
    value,
    subtext,
    icon,
    bgClass,
    href,
    trend,
}: {
    title: string;
    value: React.ReactNode;
    subtext: string;
    icon: React.ReactNode;
    bgClass: string;
    href?: string;
    trend?: string;
}) {
    const { t } = useTranslation();
    const content = (
        <>
            <div className={cn("absolute -right-8 -top-8 w-32 h-32 rounded-full blur-3xl opacity-20", bgClass)} />
            <div className="flex justify-between mb-4 relative z-10">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", bgClass)}>{icon}</div>
                {trend === 'up' && <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[11px] animate-pulse hidden sm:flex">+ {t('dashboard.live', 'LIVE')}</Badge>}
            </div>
            <div className="relative z-10">
                <h3 className="text-2xl sm:text-3xl font-space font-black tracking-tighter tabular-nums">{value}</h3>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
                <p className="text-[11px] text-muted-foreground font-mono mt-1 opacity-80">{subtext}</p>
            </div>
        </>
    );

    if (!href) {
        return (
            <div className="p-4 sm:p-6 rounded-2xl md:rounded-[2rem] border border-border/50 bg-card/40 backdrop-blur-md relative overflow-hidden group block transition-all shadow-lg hover:bg-card/60">
                {content}
            </div>
        );
    }

    return (
        <Link href={href} className="p-4 sm:p-6 rounded-2xl md:rounded-[2rem] border border-border/50 bg-card/40 backdrop-blur-md relative overflow-hidden group hover:border-primary/30 transition-all block shadow-lg hover:bg-card/60 transform active:scale-[0.98]">
            {content}
        </Link>
    );
}

function DashboardLoader() {
    return <DashboardOverviewPlaceholder />;
}

function DashboardError({ message }: { message?: string }) {
    const { t } = useTranslation();
    return (
        <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-12 h-12 bg-destructive/10 text-destructive rounded-full flex items-center justify-center font-bold">!</div>
            <h1 className="text-xl font-space font-black">{t('dashboard.node_connection_failed', 'Node Connection Failed')}</h1>
            <p className="text-muted-foreground text-xs font-mono">{message}</p>
            <RetryButton />
        </div>
    );
}
