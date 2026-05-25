"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  CheckCircle2,
  Clock3,
  FileSignature,
  GitBranch,
  LayoutDashboard,
  ShieldCheck,
  Workflow,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchWorkflowDashboard, type WorkflowDashboardData } from "../api";

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  approved: "#10b981",
  rejected: "#ef4444",
};

const EMPTY_DASHBOARD: WorkflowDashboardData = {
  totals: {
    approvals: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    signed: 0,
    active_definitions: 0,
    active_roles: 0,
    my_pending: 0,
  },
  status_distribution: {
    pending: 0,
    approved: 0,
    rejected: 0,
  },
  daily_trend: [],
  model_breakdown: [],
  step_backlog: [],
  definition_triggers: [],
  role_backlog: [],
};

export default function WorkflowDashboardPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["workflow-dashboard"],
    queryFn: fetchWorkflowDashboard,
  });

  if (isLoading) {
    return <WorkflowDashboardSkeleton />;
  }

  if (isError) {
    return (
      <div className="p-6">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Workflow dashboard could not load
            </CardTitle>
            <CardDescription>
              The dashboard API returned an error. Retry after confirming this user has workflow permissions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const dashboard = data ?? EMPTY_DASHBOARD;
  const statusChartData = Object.entries(dashboard.status_distribution).map(([status, total]) => ({
    status,
    label: status.charAt(0).toUpperCase() + status.slice(1),
    total,
  }));
  const signedRate = dashboard.totals.approvals > 0
    ? Math.round((dashboard.totals.signed / dashboard.totals.approvals) * 100)
    : 0;
  const approvalRate = dashboard.totals.approvals > 0
    ? Math.round((dashboard.totals.approved / dashboard.totals.approvals) * 100)
    : 0;
  const hasActivity = dashboard.totals.approvals > 0;

  return (
    <div className="space-y-6 p-6">
      <section className="overflow-hidden rounded-3xl border bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_34%),linear-gradient(135deg,_hsl(var(--card)),_hsl(var(--muted)))] p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <Badge className="w-fit border-none bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              Workflow Automation
            </Badge>
            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Approval command center</h1>
              <p className="mt-2 text-muted-foreground">
                Track every approval request, signature, rule, and approver backlog from live workflow data.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/dashboard/workflow/approvals">Open approvals</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/workflow/rules">Manage rules</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total approvals" value={dashboard.totals.approvals} icon={Workflow} helper={`${approvalRate}% approved`} />
        <MetricCard title="Pending now" value={dashboard.totals.pending} icon={Clock3} helper={`${dashboard.totals.my_pending} assigned to you`} tone="amber" />
        <MetricCard title="Signed decisions" value={dashboard.totals.signed} icon={FileSignature} helper={`${signedRate}% signature coverage`} tone="emerald" />
        <MetricCard title="Active rules" value={dashboard.totals.active_definitions} icon={GitBranch} helper={`${dashboard.totals.active_roles} active approval roles`} tone="sky" />
      </div>

      {!hasActivity && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <LayoutDashboard className="h-10 w-10 text-muted-foreground/50" />
            <div>
              <h2 className="text-lg font-semibold">No workflow activity yet</h2>
              <p className="text-sm text-muted-foreground">
                Create a workflow rule or assign an approval, then this dashboard will fill from the database automatically.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <ChartCard
          title="14-day approval activity"
          description="Daily request volume split by pending, approved, and rejected outcomes."
        >
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={dashboard.daily_trend}>
              <defs>
                <linearGradient id="approvedFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor={STATUS_COLORS.approved} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={STATUS_COLORS.approved} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="pendingFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor={STATUS_COLORS.pending} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={STATUS_COLORS.pending} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="approved" stackId="1" stroke={STATUS_COLORS.approved} fill="url(#approvedFill)" />
              <Area type="monotone" dataKey="pending" stackId="1" stroke={STATUS_COLORS.pending} fill="url(#pendingFill)" />
              <Area type="monotone" dataKey="rejected" stackId="1" stroke={STATUS_COLORS.rejected} fill={STATUS_COLORS.rejected} fillOpacity={0.12} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Decision mix"
          description="Current approval status distribution."
        >
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie data={statusChartData} dataKey="total" nameKey="label" innerRadius={64} outerRadius={104} paddingAngle={3}>
                {statusChartData.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard
          title="Requests by module model"
          description="Which records are using workflow approvals most."
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dashboard.model_breakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip />
              <Bar dataKey="total" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Pending by approval step"
          description="Shows where requests are waiting in sequential flows."
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dashboard.step_backlog}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip />
              <Bar dataKey="total" fill="#f59e0b" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Rules by trigger"
          description="Active workflow definitions grouped by trigger event."
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dashboard.definition_triggers}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" fill="#6366f1" radius={[8, 8, 0, 0]} />
              <Bar dataKey="active" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              Role backlog
            </CardTitle>
            <CardDescription>Pending approvals grouped by approval role.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.role_backlog.length === 0 ? (
              <EmptyList label="No role backlog right now." />
            ) : (
              dashboard.role_backlog.slice(0, 8).map((item) => (
                <div key={item.role} className="flex items-center justify-between rounded-xl border bg-card/60 p-3">
                  <span className="font-medium">{item.role}</span>
                  <Badge variant="secondary">{item.total} pending</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Operational health
            </CardTitle>
            <CardDescription>Fast read on whether approval flow is moving.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <HealthTile label="Approval rate" value={`${approvalRate}%`} icon={CheckCircle2} />
            <HealthTile label="Signature rate" value={`${signedRate}%`} icon={FileSignature} />
            <HealthTile label="Rejected" value={dashboard.totals.rejected} icon={XCircle} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function WorkflowDashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-40 rounded-3xl" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  helper,
  icon: Icon,
  tone = "primary",
}: {
  title: string;
  value: number | string;
  helper: string;
  icon: React.ElementType;
  tone?: "primary" | "amber" | "emerald" | "sky";
}) {
  const toneClass = {
    primary: "bg-primary/10 text-primary",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    sky: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
  }[tone];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`rounded-xl p-2 ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function HealthTile({ label, value, icon: Icon }: { label: string; value: number | string; icon: React.ElementType }) {
  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <Icon className="mb-3 h-5 w-5 text-primary" />
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function EmptyList({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}
