"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

/** Rows from a plain array, a Laravel paginator or a `{ data: [...] }` body. */
export function rowsOf<T = any>(body: unknown): T[] {
  if (Array.isArray(body)) return body as T[];
  if (body && typeof body === "object" && Array.isArray((body as any).data)) return (body as any).data as T[];
  return [];
}

export function totalOf(body: unknown): number {
  if (body && typeof body === "object") {
    const b = body as any;
    if (typeof b.total === "number") return b.total;
    if (typeof b.meta?.total === "number") return b.meta.total;
  }
  return rowsOf(body).length;
}

/** The most useful message from an API error: first validation error, then message. */
export function errorText(error: any, fallback: string): string {
  const data = error?.response?.data;
  const errors = data?.errors;
  if (errors && typeof errors === "object") {
    const first = Object.values(errors).flat().find((item) => typeof item === "string");
    if (typeof first === "string") return first;
  }
  return data?.message || fallback;
}

export function formatCurrency(amount: number | string | undefined | null): string {
  const num = Number(amount ?? 0);
  return `${Number.isFinite(num) ? num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"} ETB`;
}

export function formatDuration(minutes: number | undefined | null): string {
  if (!minutes || minutes <= 0) return "0m";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function formatDateTime(dateStr: string | undefined | null): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, subtitle, badge, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-border/40">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {badge && (
            <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 border-primary/30 text-primary bg-primary/5">
              {badge}
            </Badge>
          )}
        </div>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  trend?: string;
}

export function StatCard({ title, value, subtitle, icon: Icon, variant = "default", trend }: StatCardProps) {
  const variantStyles = {
    default: "bg-primary/10 text-primary border-primary/20",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    danger: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    info: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  };

  return (
    <Card className="overflow-hidden border border-border/60 hover:border-border transition-colors">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
          </div>
          <div className={`p-3 rounded-xl border ${variantStyles[variant]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {(subtitle || trend) && (
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>{subtitle}</span>
            {trend && <span className="font-semibold text-foreground">{trend}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function BayStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "available":
      return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">Available</Badge>;
    case "occupied":
      return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30">Occupied</Badge>;
    case "reserved":
      return <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30">Reserved</Badge>;
    case "maintenance":
      return <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30">Maintenance</Badge>;
    case "disabled":
      return <Badge variant="outline" className="text-muted-foreground">Disabled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function SessionStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "active":
      return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 animate-pulse">Parked</Badge>;
    case "completed":
      return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30">Completed</Badge>;
    case "lost_ticket":
      return <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30">Lost Ticket</Badge>;
    case "overstay":
      return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30">Overstay</Badge>;
    case "cancelled":
      return <Badge variant="outline" className="text-muted-foreground">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function PassStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "active":
      return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">Active</Badge>;
    case "expired":
      return <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30">Expired</Badge>;
    case "suspended":
      return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30">Suspended</Badge>;
    case "cancelled":
      return <Badge variant="outline" className="text-muted-foreground">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function ReservationStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "confirmed":
      return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30">Confirmed</Badge>;
    case "checked_in":
      return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">Checked In</Badge>;
    case "cancelled":
      return <Badge variant="outline" className="text-muted-foreground">Cancelled</Badge>;
    case "expired":
      return <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30">Expired</Badge>;
    case "no_show":
      return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30">No Show</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function ViolationStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "pending":
      return <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30">Pending Fine</Badge>;
    case "paid":
      return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">Paid & Settled</Badge>;
    case "appealed":
      return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30">Under Appeal</Badge>;
    case "waived":
      return <Badge variant="outline" className="text-muted-foreground">Waived</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
