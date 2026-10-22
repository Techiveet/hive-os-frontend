"use client";

import React, { useState } from 'react';
import {
    BellRing, Home, CheckCircle2,
    AlertTriangle, AlertCircle, Clock, Info, Filter, Trash2, Loader2, RefreshCcw, X, Search,
    Download, Copy, Check, FileSpreadsheet, FileCode2, Maximize2, ShieldAlert,
    CheckSquare, Square, Server, Activity, Sparkles
} from 'lucide-react';
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/store/use-translation";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertsFeedSkeleton } from "@/components/ui/loading-states";
import { usePermissions } from "@/hooks/use-permissions";
import { getErrorMessage } from "@/lib/errors";
import { getWorkspaceScopeKey } from "@/lib/runtime-context";
import api from "@/modules/shared/api/http";

// --- Types ---
interface SystemAlert {
    id: number | string;
    title: string;
    description: string;
    level: 'critical' | 'warning' | 'info';
    node?: string;
    time_ago: string;
    created_at?: string;
}

export default function SystemAlertsPage() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { hasPermission, isLoaded } = usePermissions();
    const canViewAlerts = hasPermission("view_alerts");
    const canManageAlerts = hasPermission("manage_alerts");
    const workspaceScope = getWorkspaceScopeKey();

    // State for filtering & pagination
    const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
    const [selectedNode, setSelectedNode] = useState<string>('all');
    const [search, setSearch] = useState('');
    const [limit, setLimit] = useState(50);
    const [autoRefreshInterval, setAutoRefreshInterval] = useState<number | false>(15_000);

    // Multi-select state
    const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

    // Detail Modal state
    const [inspectingAlert, setInspectingAlert] = useState<SystemAlert | null>(null);
    const [hasCopied, setHasCopied] = useState(false);

    // Single dismiss in-flight tracking
    const [dismissingId, setDismissingId] = useState<string | number | null>(null);

    // FETCH REAL ALERTS FROM LARAVEL WITH FILTERING AND PAGINATION
    const alertsQuery = useQuery({
        queryKey: ['systemAlertsList', workspaceScope, filter, selectedNode, search, limit],
        queryFn: async () => {
            const params: Record<string, string | number> = { limit };
            if (filter !== 'all') params.level = filter;
            if (selectedNode !== 'all') params.node = selectedNode;
            if (search.trim()) params.search = search.trim();
            return (await api.get('/system/alerts', { params })).data;
        },
        enabled: isLoaded && canViewAlerts,
        staleTime: 5_000,
        refetchInterval: autoRefreshInterval,
    });

    // MUTATION: Dismiss a single alert
    const dismissMut = useMutation({
        mutationFn: async (id: string | number) => {
            setDismissingId(id);
            return (await api.delete(`/system/alerts/${id}`)).data;
        },
        onSuccess: (_data, id) => {
            toast.success(t('alerts.toast_dismissed', 'Alert dismissed.'));
            setSelectedIds(prev => prev.filter(x => x !== id));
            if (inspectingAlert?.id === id) {
                setInspectingAlert(null);
            }
            queryClient.invalidateQueries({ queryKey: ['systemAlertsList'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
        },
        onError: (err: unknown) => {
            toast.error(getErrorMessage(err, t('alerts.dismiss_failed', 'Failed to dismiss alert.')));
        },
        onSettled: () => {
            setDismissingId(null);
        },
    });

    // MUTATION: Bulk dismiss selected alerts
    const bulkDismissMut = useMutation({
        mutationFn: async (ids: (string | number)[]) => {
            return (await api.post('/system/alerts/bulk-dismiss', { ids })).data;
        },
        onSuccess: (res) => {
            const count = res?.dismissed_count ?? selectedIds.length;
            toast.success(t('alerts.toast_bulk_dismissed', `${count} alert(s) dismissed.`));
            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: ['systemAlertsList'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
        },
        onError: (err: unknown) => {
            toast.error(getErrorMessage(err, t('alerts.bulk_dismiss_failed', 'Failed to dismiss selected alerts.')));
        },
    });

    // MUTATION: Prune diagnosed historical exceptions
    const pruneResolvedMut = useMutation({
        mutationFn: async () => (await api.post('/system/alerts/prune-resolved')).data,
        onSuccess: (res) => {
            const count = res?.pruned_count ?? 0;
            toast.success(t('alerts.toast_pruned', `Successfully pruned ${count} resolved exception alert(s).`));
            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: ['systemAlertsList'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
        },
        onError: (err: unknown) => {
            toast.error(getErrorMessage(err, t('alerts.prune_failed', 'Failed to prune resolved alerts.')));
        },
    });

    // MUTATION: Dismiss ALL alerts
    const dismissAllMut = useMutation({
        mutationFn: async () => (await api.post('/system/alerts/clear-all')).data,
        onSuccess: () => {
            toast.success(t('alerts.toast_cleared', 'All alerts have been cleared.'));
            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: ['systemAlertsList'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
        },
        onError: (err: unknown) => {
            toast.error(getErrorMessage(err, t('alerts.clear_failed', 'Failed to clear alerts.')));
        },
    });

    const alerts: SystemAlert[] = alertsQuery.data?.data || [];
    const metaCounts = alertsQuery.data?.meta?.counts;
    const metaNodes: string[] = alertsQuery.data?.meta?.nodes || [];
    const metaTotal = alertsQuery.data?.meta?.total ?? alerts.length;
    const hasMore = alertsQuery.data?.meta?.has_more ?? false;

    // Accurate summary counts from backend meta
    const criticalCount = metaCounts?.critical ?? alerts.filter(a => a.level === 'critical').length;
    const warningCount = metaCounts?.warning ?? alerts.filter(a => a.level === 'warning').length;
    const infoCount = metaCounts?.info ?? alerts.filter(a => a.level === 'info').length;
    const totalCount = metaCounts?.all ?? alerts.length;

    // Filtered list
    const filteredAlerts = alerts.filter(a => {
        const matchesLevel = filter === 'all' || a.level === filter;
        if (!matchesLevel) return false;
        if (selectedNode !== 'all' && (a.node || 'Central') !== selectedNode) return false;
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            a.title.toLowerCase().includes(q) ||
            a.description.toLowerCase().includes(q) ||
            (a.node && a.node.toLowerCase().includes(q))
        );
    });

    // Multi-select handlers
    const isAllSelected = filteredAlerts.length > 0 && filteredAlerts.every(a => selectedIds.includes(a.id));
    const isSomeSelected = selectedIds.length > 0;

    const toggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredAlerts.map(a => a.id));
        }
    };

    const toggleSelectOne = (id: string | number) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // Export helpers
    const exportToCsv = (items: SystemAlert[]) => {
        const headers = ['ID', 'Level', 'Title', 'Origin Node', 'Created At', 'Relative Time', 'Description'];
        const rows = items.map(a => [
            a.id,
            a.level.toUpperCase(),
            `"${(a.title || '').replace(/"/g, '""')}"`,
            `"${(a.node || 'Central').replace(/"/g, '""')}"`,
            `"${a.created_at || ''}"`,
            `"${a.time_ago || ''}"`,
            `"${(a.description || '').replace(/"/g, '""')}"`,
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `system-alerts-${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(t('alerts.toast_exported_csv', `Exported ${items.length} alert(s) to CSV.`));
    };

    const exportToJson = (items: SystemAlert[]) => {
        const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `system-alerts-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success(t('alerts.toast_exported_json', `Exported ${items.length} alert(s) to JSON.`));
    };

    const copyAlertDetails = (alert: SystemAlert) => {
        const text = [
            `SYSTEM ALERT INCIDENT REPORT`,
            `===========================`,
            `ID: ${alert.id}`,
            `Severity: ${alert.level.toUpperCase()}`,
            `Origin Node: ${alert.node || 'Central'}`,
            `Timestamp: ${alert.created_at || alert.time_ago}`,
            `Title: ${alert.title}`,
            `---------------------------`,
            `Diagnostic Description:`,
            alert.description,
        ].join('\n');

        navigator.clipboard.writeText(text);
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 2000);
        toast.success(t('alerts.toast_copied', 'Incident details copied to clipboard.'));
    };

    if (!isLoaded) {
        return <AlertsFeedSkeleton />;
    }

    if (!canViewAlerts) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-[2rem] border border-border/50 bg-card/40 p-8 text-center">
                <BellRing className="h-10 w-10 text-destructive mb-4" />
                <h2 className="text-2xl font-black tracking-tight">{t('global.access_denied', 'Access Denied')}</h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                    {t('alerts.denied', 'Your current role does not have permission to view system alerts.')}
                </p>
            </div>
        );
    }

    const getAlertIcon = (level: string) => {
        switch (level) {
            case 'critical': return <AlertCircle className="h-5 w-5 text-red-500" />;
            case 'warning': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
            case 'info': return <Info className="h-5 w-5 text-blue-500" />;
            default: return <BellRing className="h-5 w-5 text-muted-foreground" />;
        }
    };

    const getAlertStyle = (level: string, isSelected: boolean) => {
        if (isSelected) {
            return 'border-primary/60 bg-primary/5 ring-1 ring-primary/40';
        }
        switch (level) {
            case 'critical': return 'border-red-500/30 bg-red-500/5 hover:bg-red-500/10';
            case 'warning': return 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10';
            case 'info': return 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10';
            default: return 'border-border/50 bg-card/40 hover:bg-card/60';
        }
    };

    return (
        <div className="space-y-6 pb-16 max-w-6xl mx-auto">
            
            {/* Top Navigation & Breadcrumbs */}
            <div className="flex w-full justify-between items-center gap-3 mb-2">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-semibold">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        {autoRefreshInterval ? t('alerts.live_feed', 'LIVE TELEMETRY') : t('alerts.feed_paused', 'PAUSED')}
                    </div>
                </div>
                <Breadcrumbs 
                    items={[
                        { label: "Hive.OS", href: "/", icon: <Home className="h-4 w-4" /> }, 
                        { label: t('nav.dashboard', 'Dashboard'), href: "/dashboard" },
                        { label: t('alerts.system_alerts', 'System Alerts') }
                    ]} 
                />
            </div>

            {/* Hero Header Section */}
            <div className="p-6 sm:p-8 border border-border/50 rounded-[2rem] bg-card/40 backdrop-blur-md shadow-sm">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 shrink-0">
                            <BellRing className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-space font-black tracking-tight text-foreground">
                                    {t('alerts.page_title', 'System Alerts & Incident Operations')}
                                </h1>
                                <Badge variant="outline" className="font-mono text-xs font-bold">
                                    {totalCount} TOTAL
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                                {t('alerts.page_desc', 'Real-time telemetry, active exceptions, operational warnings, and multi-tenant ledger alerts.')}
                            </p>
                        </div>
                    </div>
                    
                    {/* Top Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        
                        {/* Auto-Refresh Toggle */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="rounded-full bg-background/50 backdrop-blur-md text-xs font-mono h-9"
                                    title="Auto-refresh setting"
                                >
                                    <RefreshCcw className={cn("w-3.5 h-3.5 mr-1.5", alertsQuery.isFetching && "animate-spin text-primary")} />
                                    {autoRefreshInterval ? `${autoRefreshInterval / 1000}s` : 'Paused'}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-2xl min-w-[140px]">
                                <DropdownMenuLabel className="text-xs">{t('alerts.refresh_rate', 'Poll Interval')}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setAutoRefreshInterval(10_000)}>10 seconds</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setAutoRefreshInterval(15_000)}>15 seconds (Default)</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setAutoRefreshInterval(30_000)}>30 seconds</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setAutoRefreshInterval(60_000)}>60 seconds</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setAutoRefreshInterval(false)}>Pause Auto-Poll</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Export Menu */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="rounded-full bg-background/50 backdrop-blur-md text-xs font-bold h-9"
                                    disabled={alerts.length === 0}
                                >
                                    <Download className="w-3.5 h-3.5 mr-1.5" />
                                    {t('alerts.export', 'Export')}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-2xl min-w-[180px]">
                                <DropdownMenuLabel className="text-xs">{t('alerts.export_options', 'Export Format')}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => exportToCsv(filteredAlerts)} className="gap-2">
                                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                                    {t('alerts.export_csv', 'Export Filtered (CSV)')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => exportToJson(filteredAlerts)} className="gap-2">
                                    <FileCode2 className="w-4 h-4 text-blue-500" />
                                    {t('alerts.export_json', 'Export Filtered (JSON)')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Prune Resolved Exceptions Dialog */}
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="rounded-full bg-background/50 backdrop-blur-md text-muted-foreground hover:text-amber-500 hover:border-amber-500/50 transition-colors h-9 text-xs font-bold"
                                    disabled={pruneResolvedMut.isPending || !canManageAlerts}
                                    title="Prune all fixed/resolved exceptions from the ledger"
                                >
                                    {pruneResolvedMut.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500" />} 
                                    {t('alerts.prune_resolved', 'Prune Resolved')}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-[2rem] bg-background/95 backdrop-blur-xl border-border/50">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-foreground flex items-center gap-2">
                                        <Sparkles className="h-5 w-5 text-amber-500" /> 
                                        {t('alerts.prune_title', 'Prune Resolved Exceptions?')}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {t('alerts.prune_desc', 'This action will remove all cataloged exception signatures that have already been resolved at code level (such as tenant connection resets, mass assignment updates, and old migration runs). Legitimate system notices and backup logs will remain intact.')}
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="rounded-xl">{t('global.cancel', 'Cancel')}</AlertDialogCancel>
                                    <AlertDialogAction 
                                        className="rounded-xl bg-amber-500 text-white hover:bg-amber-600 font-bold" 
                                        onClick={() => pruneResolvedMut.mutate()}
                                    >
                                        {t('alerts.confirm_prune', 'Prune Resolved Exceptions')}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        {/* Dismiss All Dialog */}
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="rounded-full bg-background/50 backdrop-blur-md text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors h-9 text-xs font-bold"
                                    disabled={alerts.length === 0 || dismissAllMut.isPending || !canManageAlerts}
                                >
                                    {dismissAllMut.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1.5" />} 
                                    {t('alerts.dismiss_all', 'Clear All')}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-[2rem] bg-background/95 backdrop-blur-xl border-border/50">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-destructive flex items-center gap-2">
                                        <AlertTriangle className="h-5 w-5" /> {t('alerts.clear_all_title', 'Clear All Alerts?')}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {t('alerts.clear_all_desc', 'Are you sure you want to permanently clear all active alerts from the database? This action cannot be undone.')}
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="rounded-xl">{t('global.cancel', 'Cancel')}</AlertDialogCancel>
                                    <AlertDialogAction 
                                        className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold" 
                                        onClick={() => dismissAllMut.mutate()}
                                    >
                                        {t('alerts.confirm_purge', 'Confirm Clear All')}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>

                {/* Interactive Severity Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                    
                    {/* Critical Card */}
                    <button
                        type="button"
                        onClick={() => setFilter('critical')}
                        className={cn(
                            "p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden",
                            filter === 'critical'
                                ? "bg-red-500/15 border-red-500 shadow-md ring-2 ring-red-500/20"
                                : "bg-card/30 border-border/60 hover:bg-card/60 hover:border-red-500/40"
                        )}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-red-500 flex items-center gap-1.5">
                                <AlertCircle className="w-4 h-4" />
                                {t('alerts.critical', 'Critical')}
                            </span>
                            {criticalCount > 0 && (
                                <span className="flex h-2.5 w-2.5 relative">
                                    <span className="animate-ping absolute h-full w-full rounded-full bg-red-400 opacity-75" />
                                    <span className="relative rounded-full h-2.5 w-2.5 bg-red-500" />
                                </span>
                            )}
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-3xl font-black font-space text-foreground">{criticalCount}</span>
                            <span className="text-xs text-muted-foreground font-medium">{t('alerts.active_anomalies', 'Active errors')}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                            {criticalCount === 0 ? t('alerts.no_critical', 'Zero active critical faults') : t('alerts.action_needed', 'Requires immediate triage')}
                        </p>
                    </button>

                    {/* Warnings Card */}
                    <button
                        type="button"
                        onClick={() => setFilter('warning')}
                        className={cn(
                            "p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden",
                            filter === 'warning'
                                ? "bg-amber-500/15 border-amber-500 shadow-md ring-2 ring-amber-500/20"
                                : "bg-card/30 border-border/60 hover:bg-card/60 hover:border-amber-500/40"
                        )}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4" />
                                {t('alerts.warnings', 'Warnings')}
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-3xl font-black font-space text-foreground">{warningCount}</span>
                            <span className="text-xs text-muted-foreground font-medium">{t('alerts.degraded', 'Degraded')}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                            {t('alerts.warning_hint', 'Performance & resource limits')}
                        </p>
                    </button>

                    {/* Info Card */}
                    <button
                        type="button"
                        onClick={() => setFilter('info')}
                        className={cn(
                            "p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden",
                            filter === 'info'
                                ? "bg-blue-500/15 border-blue-500 shadow-md ring-2 ring-blue-500/20"
                                : "bg-card/30 border-border/60 hover:bg-card/60 hover:border-blue-500/40"
                        )}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-blue-500 flex items-center gap-1.5">
                                <Info className="w-4 h-4" />
                                {t('alerts.info', 'Notices')}
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-3xl font-black font-space text-foreground">{infoCount}</span>
                            <span className="text-xs text-muted-foreground font-medium">{t('alerts.notices_info', 'Ledger events')}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                            {t('alerts.info_hint', 'Backups & sync completions')}
                        </p>
                    </button>

                    {/* All Events Card */}
                    <button
                        type="button"
                        onClick={() => setFilter('all')}
                        className={cn(
                            "p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden",
                            filter === 'all'
                                ? "bg-primary/10 border-primary shadow-md ring-2 ring-primary/20"
                                : "bg-card/30 border-border/60 hover:bg-card/60 hover:border-primary/40"
                        )}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                                <Activity className="w-4 h-4" />
                                {t('alerts.all_events', 'All Events')}
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-3xl font-black font-space text-foreground">{totalCount}</span>
                            <span className="text-xs text-muted-foreground font-medium">{t('alerts.total_logged', 'Total logged')}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                            {t('alerts.view_all_hint', 'Complete system audit trail')}
                        </p>
                    </button>
                </div>

                {/* Search Bar & Secondary Filters */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 mt-6 pt-6 border-t border-border/50">
                    
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Master Select All Checkbox */}
                        {filteredAlerts.length > 0 && canManageAlerts && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={toggleSelectAll}
                                className="rounded-full text-xs font-mono font-bold px-3 h-8 text-muted-foreground hover:text-foreground"
                            >
                                {isAllSelected ? (
                                    <CheckSquare className="w-4 h-4 mr-1.5 text-primary" />
                                ) : (
                                    <Square className="w-4 h-4 mr-1.5" />
                                )}
                                {isAllSelected ? t('alerts.deselect_all', 'Deselect All') : t('alerts.select_all', 'Select All')}
                            </Button>
                        )}

                        {/* Origin Node Filter Dropdown */}
                        {metaNodes.length > 1 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="rounded-full text-xs font-bold h-8">
                                        <Server className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                                        {selectedNode === 'all' ? t('alerts.all_nodes', 'All Nodes') : selectedNode}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="rounded-2xl min-w-[160px]">
                                    <DropdownMenuLabel className="text-xs">{t('alerts.filter_by_node', 'Origin Node')}</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setSelectedNode('all')}>
                                        {t('alerts.all_nodes', 'All Nodes')}
                                    </DropdownMenuItem>
                                    {metaNodes.map(node => (
                                        <DropdownMenuItem key={node} onClick={() => setSelectedNode(node)}>
                                            {node}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>

                    <div className="relative w-full lg:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t('alerts.search_placeholder', 'Search title, error, or node...')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="rounded-full pl-9 pr-8 h-9 text-xs bg-background/50 border-border/50"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Floating Bulk Actions Bar (when 1 or more items selected) */}
            {isSomeSelected && canManageAlerts && (
                <div className="sticky top-4 z-30 p-3.5 rounded-2xl bg-card/95 backdrop-blur-xl border border-primary/40 shadow-xl flex items-center justify-between gap-4 animate-in slide-in-from-top-3">
                    <div className="flex items-center gap-3">
                        <Badge variant="default" className="rounded-full font-mono text-xs font-bold px-3 py-1">
                            {selectedIds.length} SELECTED
                        </Badge>
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                            {t('alerts.selected_hint', 'Perform bulk operations on selected alerts.')}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                const selectedItems = alerts.filter(a => selectedIds.includes(a.id));
                                exportToCsv(selectedItems);
                            }}
                            className="rounded-full text-xs font-bold h-8"
                        >
                            <Download className="w-3.5 h-3.5 mr-1" />
                            {t('alerts.export_selected', 'Export')}
                        </Button>

                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => bulkDismissMut.mutate(selectedIds)}
                            disabled={bulkDismissMut.isPending}
                            className="rounded-full text-xs font-bold h-8"
                        >
                            {bulkDismissMut.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1" />}
                            {t('alerts.dismiss_selected', `Dismiss (${selectedIds.length})`)}
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedIds([])}
                            className="rounded-full text-xs h-8 text-muted-foreground"
                        >
                            {t('global.cancel', 'Clear')}
                        </Button>
                    </div>
                </div>
            )}

            {/* Alert Feed */}
            {alertsQuery.isLoading ? (
                <AlertsFeedSkeleton />
            ) : alertsQuery.isError ? (
                <div role="alert" className="flex flex-col gap-4 rounded-[2rem] border border-red-400 bg-red-950 p-6 text-red-50 sm:flex-row sm:items-center">
                    <div aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-900 text-red-100">
                        <AlertCircle className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-bold">{t('alerts.load_failed_title', 'Could not load system alerts')}</h2>
                        <p className="mt-1 text-sm leading-6 text-red-100">
                            {getErrorMessage(alertsQuery.error, t('alerts.load_failed', 'Check your connection and try loading the alerts again.'))}
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => alertsQuery.refetch()}
                        disabled={alertsQuery.isFetching}
                        className="min-h-11 shrink-0 border-red-200 bg-white text-red-950 hover:bg-red-50 hover:text-red-950 focus-visible:ring-red-200"
                    >
                        {alertsQuery.isFetching ? (
                            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCcw aria-hidden="true" className="h-4 w-4" />
                        )}
                        {alertsQuery.isFetching
                            ? t('alerts.retrying', 'Retrying...')
                            : t('alerts.try_again', 'Try Again')}
                    </Button>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredAlerts.map((alert) => {
                        const isSelected = selectedIds.includes(alert.id);
                        return (
                            <div 
                                key={alert.id} 
                                className={cn(
                                    "p-4 sm:p-5 rounded-[1.5rem] border backdrop-blur-md flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between transition-all duration-200 animate-in fade-in slide-in-from-bottom-2",
                                    getAlertStyle(alert.level, isSelected)
                                )}
                            >
                                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                                    {/* Multi-select Checkbox */}
                                    {canManageAlerts && (
                                        <div className="mt-2 shrink-0">
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => toggleSelectOne(alert.id)}
                                                aria-label={`Select alert ${alert.id}`}
                                            />
                                        </div>
                                    )}

                                    {/* Icon Badge */}
                                    <div className={cn(
                                        "mt-0.5 shrink-0 p-2 rounded-xl",
                                        alert.level === 'critical' ? 'bg-red-500/10' : 
                                        alert.level === 'warning' ? 'bg-amber-500/10' : 'bg-blue-500/10'
                                    )}>
                                        {getAlertIcon(alert.level)}
                                    </div>

                                    {/* Content (Clickable to inspect) */}
                                    <div 
                                        className="flex-1 min-w-0 cursor-pointer"
                                        onClick={() => setInspectingAlert(alert)}
                                    >
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-sm sm:text-base font-bold text-foreground hover:text-primary transition-colors">
                                                {alert.title}
                                            </h3>
                                            {alert.level === 'critical' && (
                                                <span className="flex h-2 w-2 relative">
                                                    <span className="animate-ping absolute h-full w-full rounded-full bg-red-400 opacity-75" />
                                                    <span className="relative rounded-full h-2 w-2 bg-red-500" />
                                                </span>
                                            )}
                                            {alert.node && alert.node !== 'Central' && alert.node !== 'CENTRAL_NODE' && (
                                                <Badge variant="outline" className="font-mono text-[10px] uppercase bg-background/50 border-border/60">
                                                    [{alert.node}]
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-3xl line-clamp-2 font-mono opacity-90">
                                            {alert.description}
                                        </p>
                                    </div>
                                </div>
                                
                                {/* Right Controls */}
                                <div className="flex items-center gap-2 shrink-0 sm:ml-auto w-full sm:w-auto justify-between sm:justify-end mt-3 sm:mt-0 border-t sm:border-0 border-border/50 pt-3 sm:pt-0">
                                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground bg-background/50 px-2.5 py-1.5 rounded-lg border border-border/50">
                                        <Clock className="h-3 w-3" />
                                        {alert.time_ago}
                                    </div>

                                    {/* Inspect Dialog Trigger */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setInspectingAlert(alert)}
                                        className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 shrink-0"
                                        title="Inspect Details"
                                    >
                                        <Maximize2 className="h-4 w-4" />
                                    </Button>

                                    {/* Dismiss Single */}
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => dismissMut.mutate(alert.id)}
                                        disabled={dismissMut.isPending || !canManageAlerts}
                                        className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0"
                                        title="Dismiss Alert"
                                    >
                                        {dismissingId === alert.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin text-destructive" />
                                        ) : (
                                            <X className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        );
                    })}

                    {/* Load More Button */}
                    {hasMore && (
                        <div className="pt-4 text-center">
                            <Button
                                variant="outline"
                                onClick={() => setLimit((prev) => prev + 50)}
                                disabled={alertsQuery.isFetching}
                                className="rounded-2xl px-6 py-5 font-bold tracking-wide border-dashed hover:border-primary shadow-sm"
                            >
                                {alertsQuery.isFetching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                {t('alerts.load_more', `Load More Alerts (Showing ${alerts.length} of ${metaTotal})`)}
                            </Button>
                        </div>
                    )}

                    {/* Empty State */}
                    {filteredAlerts.length === 0 && (
                        <div className="py-20 text-center flex flex-col items-center justify-center border border-dashed border-border/60 rounded-[2rem] bg-card/20 backdrop-blur-md animate-in fade-in zoom-in-95">
                            <div className="h-20 w-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
                                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground">{t('alerts.operational', 'All Systems Operational')}</h3>
                            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                                {filter === 'all' 
                                    ? t('alerts.no_active', 'There are currently no active alerts or anomalies detected across the infrastructure.') 
                                    : t('alerts.no_active_filter', 'There are no active {level} alerts at this time.').replace('{level}', filter)}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Alert Inspection Modal */}
            <Dialog open={!!inspectingAlert} onOpenChange={(open) => !open && setInspectingAlert(null)}>
                <DialogContent className="max-w-2xl rounded-[2rem] bg-background/95 backdrop-blur-xl border border-border/60 shadow-2xl">
                    {inspectingAlert && (
                        <>
                            <DialogHeader>
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge 
                                        variant={inspectingAlert.level === 'critical' ? 'destructive' : 'secondary'}
                                        className="uppercase font-mono text-[10px] font-bold"
                                    >
                                        {inspectingAlert.level}
                                    </Badge>
                                    <Badge variant="outline" className="font-mono text-[10px] uppercase">
                                        NODE: {inspectingAlert.node || 'Central'}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground ml-auto font-mono">
                                        ID #{inspectingAlert.id}
                                    </span>
                                </div>
                                <DialogTitle className="text-lg font-bold text-foreground">
                                    {inspectingAlert.title}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground font-mono">
                                    Recorded: {inspectingAlert.created_at || inspectingAlert.time_ago} ({inspectingAlert.time_ago})
                                </DialogDescription>
                            </DialogHeader>

                            <div className="mt-4 space-y-3">
                                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                                    <span>{t('alerts.diagnostic_payload', 'Diagnostic Output & Trace:')}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => copyAlertDetails(inspectingAlert)}
                                        className="h-7 text-xs font-mono gap-1"
                                    >
                                        {hasCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                        {hasCopied ? t('global.copied', 'Copied') : t('global.copy', 'Copy')}
                                    </Button>
                                </div>
                                
                                <div className="p-4 rounded-2xl bg-muted/60 dark:bg-black/60 border border-border/50 max-h-80 overflow-y-auto font-mono text-xs leading-relaxed break-words text-foreground selection:bg-primary/20">
                                    <pre className="whitespace-pre-wrap">{inspectingAlert.description}</pre>
                                </div>
                            </div>

                            <DialogFooter className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-border/40 pt-4">
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => exportToJson([inspectingAlert])}
                                        className="rounded-xl text-xs gap-1.5 font-bold"
                                    >
                                        <FileCode2 className="w-3.5 h-3.5 text-blue-500" />
                                        {t('alerts.download_json', 'JSON')}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => copyAlertDetails(inspectingAlert)}
                                        className="rounded-xl text-xs gap-1.5 font-bold"
                                    >
                                        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                                        {t('alerts.copy_report', 'Copy Report')}
                                    </Button>
                                </div>

                                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        disabled={dismissMut.isPending || !canManageAlerts}
                                        onClick={() => dismissMut.mutate(inspectingAlert.id)}
                                        className="rounded-xl text-xs font-bold"
                                    >
                                        {dismissMut.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1.5" />}
                                        {t('alerts.dismiss_this', 'Dismiss This Alert')}
                                    </Button>
                                </div>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
