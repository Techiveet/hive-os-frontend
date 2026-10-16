"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowUpRight, Building2, LogIn, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchTenantActivity, fetchTenantOverview } from "@/modules/tenancy/api";
import type { TenantActivityEvent } from "@/modules/tenancy/activity-types";

function dateTime(value: string | null) {
  return value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "No login recorded";
}

export function tenantSignInUrl(domain?: string) {
  if (!domain || typeof window === "undefined") return null;
  // Keep the local frontend port; the backend/API port is never a login URL.
  const url = new URL(window.location.origin);
  url.hostname = domain;
  if (!domain.endsWith(".localhost") && domain !== "localhost") url.port = "";
  url.pathname = "/sign-in";
  return url.toString();
}

function EventList({ events, onTenant }: { events: TenantActivityEvent[]; onTenant?: (id: string, trigger: HTMLButtonElement) => void }) {
  if (!events.length) return <p className="py-6 text-sm text-muted-foreground">No activity recorded yet. Tenant actions will appear here as people use their workspace.</p>;
  return <ol className="flex flex-col divide-y divide-border">
    {events.map(event => <li key={event.id} className="flex gap-3 py-3">
      <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary"><Activity aria-hidden="true" className="size-4" /></div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {onTenant ? <Button variant="link" className="h-auto whitespace-normal p-0 text-left" onClick={e => onTenant(event.tenant_id, e.currentTarget)}>{event.tenant_id}<ArrowUpRight aria-hidden="true" data-icon="inline-end" /></Button> : <span className="text-sm font-semibold">{event.module}</span>}
          <time className="text-xs text-muted-foreground" dateTime={event.created_at}>{dateTime(event.created_at)}</time>
        </div>
        <p className="mt-1 break-words text-sm">{event.description.replaceAll("_", " ")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{event.actor}{onTenant ? ` · ${event.module}` : ""}</p>
      </div>
    </li>)}
  </ol>;
}

export function TenantPlatformOverview({ onTenant }: { onTenant: (id: string, trigger: HTMLButtonElement) => void }) {
  const query = useQuery({ queryKey: ["tenants", "overview"], queryFn: fetchTenantOverview, refetchInterval: 60_000 });
  const data = query.data;
  if (query.isError) return <Alert variant="destructive"><AlertTitle>Tenant monitoring could not load</AlertTitle><AlertDescription><p>Refresh to try again.</p><Button variant="outline" onClick={() => void query.refetch()}>Retry monitoring</Button></AlertDescription></Alert>;
  if (!data) return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true" aria-label="Loading tenant monitoring">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div>;
  const metrics = [
    { label: "Tenant workspaces", value: data.total, detail: `${data.active} enabled · ${data.total - data.active} suspended`, icon: Building2 },
    { label: "Active in the last 24h", value: data.active_workspaces_24h, detail: "Workspaces with recorded activity", icon: Activity },
    { label: "Successful sign-ins", value: data.logins_24h, detail: "Across tenant workspaces · last 24h", icon: LogIn },
    { label: "Failed sign-ins", value: data.failed_logins_24h, detail: "Review access issues · last 24h", icon: ShieldCheck },
  ];
  return <section aria-labelledby="tenant-pulse-heading" className="flex flex-col gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Platform pulse / tenant operations</p><h2 id="tenant-pulse-heading" className="mt-1 font-space text-2xl font-bold">Every workspace. One clear view.</h2></div>
      <Button variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw aria-hidden="true" data-icon="inline-start" />Refresh activity</Button>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ label, value, detail, icon: Icon }) => <Card key={label} className="gap-3 rounded-2xl">
      <CardHeader><CardDescription className="flex items-center justify-between gap-2">{label}<Icon className="size-4" aria-hidden="true" /></CardDescription><CardTitle><span className="font-space text-4xl tabular-nums">{value.toLocaleString()}</span></CardTitle></CardHeader>
      <CardFooter><p className="text-xs text-muted-foreground">{detail}</p></CardFooter>
    </Card>)}</div>
    <Card className="gap-2 rounded-2xl">
      <CardHeader><CardTitle><h3 className="font-space text-lg">Across your tenants</h3></CardTitle><CardDescription>{data.events_24h.toLocaleString()} recorded events in the last 24 hours. Select a workspace to inspect its users and activity.</CardDescription></CardHeader>
      <CardContent className="max-h-72 overflow-y-auto"><EventList events={data.recent_activity} onTenant={onTenant} /></CardContent>
      <CardFooter><p className="text-xs text-muted-foreground">Updated {dateTime(data.checked_at)} · refreshes every minute</p></CardFooter>
    </Card>
  </section>;
}

export function TenantActivityPanel({ tenantId, domain, onEdit }: { tenantId: string; domain?: string; onEdit?: () => void }) {
  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ["tenants", tenantId, "activity", page], queryFn: () => fetchTenantActivity(tenantId, page), refetchInterval: 30_000 });
  const data = query.data;
  const signInUrl = tenantSignInUrl(domain);
  if (query.isError) return <Alert variant="destructive"><AlertTitle>Workspace monitoring could not load</AlertTitle><AlertDescription><Button variant="outline" onClick={() => void query.refetch()}>Retry workspace monitoring</Button></AlertDescription></Alert>;
  if (!data) return <Skeleton className="h-60 rounded-2xl" aria-label="Loading workspace activity" />;
  if (['queued', 'provisioning', 'failed'].includes(data.provisioning_status)) return <Alert variant={data.provisioning_status === 'failed' ? 'destructive' : 'default'}><AlertTitle>{data.provisioning_status === 'failed' ? 'Workspace setup failed' : 'Preparing your workspace'}</AlertTitle><AlertDescription><p>{data.provisioning_status === 'failed' ? 'This workspace was not activated. Review the failed setup before removing it and creating it again.' : 'The workspace database and access settings are being prepared. This view updates automatically; sign-in will be available when setup completes.'}</p><Button variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}>Check setup progress</Button></AlertDescription></Alert>;
  return <section aria-labelledby="workspace-activity-heading" className="flex flex-col gap-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 id="workspace-activity-heading" className="font-space text-xl font-bold">Workspace activity</h3><Button variant="outline" size="sm" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw aria-hidden="true" data-icon="inline-start" />Refresh workspace</Button></div>
    <div className="flex flex-wrap items-center gap-2"><Badge variant={data.workspace.available ? "secondary" : "destructive"}>{data.workspace.available ? "Database reachable" : "Database unavailable"}</Badge><Badge variant={data.administrator.admin_exists ? "outline" : "destructive"}>{data.administrator.admin_exists ? data.administrator.admin_active ? "Administrator enabled" : "Administrator disabled" : "Administrator missing"}</Badge></div>
    {(!data.administrator.admin_exists || data.administrator.admin_registry_mismatch) && <Alert><AlertTitle>{data.administrator.admin_exists ? "Administrator contact needs syncing" : "Set up administrator access"}</AlertTitle><AlertDescription><p>{data.administrator.admin_exists ? `The administrator account is ${data.administrator.admin_email}. Saving the administrator settings will sync the tenant record.` : "Enter an administrator name, email and password in Edit tenant to restore workspace access."}</p>{onEdit && <Button variant="outline" onClick={onEdit}>Edit administrator settings</Button>}</AlertDescription></Alert>}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[
      ["Workspace users", data.workspace.users_total ?? "Unavailable"], ["Enabled users", data.workspace.users_active ?? "Unavailable"], ["Events / 24h", data.events_24h], ["Sign-ins / 24h", data.logins_24h],
    ].map(([label, value]) => <div key={label} className="rounded-xl border bg-muted p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold tabular-nums">{value}</p></div>)}</div>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"><div className="min-w-0"><p className="font-semibold">Tenant sign-in</p><p className="break-all text-sm text-muted-foreground">{data.administrator.admin_email || "No administrator configured"}</p><p className="mt-1 text-xs text-muted-foreground">Last login: {dateTime(data.workspace.last_login_at)}</p></div>{signInUrl && <Button asChild variant="outline"><a href={signInUrl} target="_blank" rel="noopener noreferrer">Open tenant sign-in<ArrowUpRight aria-hidden="true" data-icon="inline-end" /><span className="sr-only"> (new tab)</span></a></Button>}</div>
    <div><h4 className="mb-3 text-sm font-semibold">Activity over the last 7 days</h4><ol className="grid grid-cols-7 gap-2">{data.daily_activity.map(day => <li key={day.date} className="flex flex-col items-center gap-2 text-xs"><span className="tabular-nums">{day.total}</span><div className="flex h-16 w-full items-end rounded bg-muted" aria-hidden="true"><div className="w-full rounded bg-primary" style={{ height: `${day.total ? Math.max(5, day.total / Math.max(1, ...data.daily_activity.map(d => d.total)) * 100) : 0}%` }} /></div><time className="text-muted-foreground" dateTime={day.date}>{new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" })}</time></li>)}</ol></div>
    <div><h4 className="text-sm font-semibold">Recent activity <span className="font-normal text-muted-foreground">({data.meta.total.toLocaleString()} events)</span></h4><EventList events={data.activity} /><div className="flex items-center justify-between gap-2"><Button variant="outline" size="sm" disabled={page <= 1 || query.isFetching} onClick={() => setPage(p => p - 1)}>Previous activity</Button><p className="text-xs text-muted-foreground">Page {data.meta.current_page} of {data.meta.last_page}</p><Button variant="outline" size="sm" disabled={page >= data.meta.last_page || query.isFetching} onClick={() => setPage(p => p + 1)}>Next activity</Button></div></div>
    <div><h4 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Users className="size-4" aria-hidden="true" />Workspace users</h4><p className="mb-2 text-xs text-muted-foreground">Up to 50 users, ordered by latest sign-in. Credentials are managed in the tenant’s Identity & Access workspace.</p><div className="overflow-x-auto rounded-xl border"><table className="w-full text-left text-sm"><caption className="sr-only">Users and their access state in {tenantId}</caption><thead className="bg-muted"><tr>{["User", "Role", "Access", "Last sign-in"].map(label => <th scope="col" className="p-3 font-semibold" key={label}>{label}</th>)}</tr></thead><tbody>{data.workspace.users.map(user => <tr key={user.id} className="border-t"><th scope="row" className="p-3 font-normal"><p className="font-medium">{user.name}</p><p className="text-xs text-muted-foreground">{user.email}</p></th><td className="p-3">{user.roles.join(", ") || "No role"}</td><td className="p-3">{user.is_active ? user.must_change_password ? "Password change required" : "Enabled" : "Disabled"}</td><td className="p-3 text-xs text-muted-foreground">{dateTime(user.last_login_at)}</td></tr>)}{data.workspace.available && !data.workspace.users.length && <tr><td colSpan={4} className="p-4 text-muted-foreground">No users exist in this workspace yet.</td></tr>}</tbody></table></div></div>
    <p className="text-xs text-muted-foreground">Checked {dateTime(data.checked_at)} · {data.failed_logins_24h} failed sign-ins in the last 24 hours</p>
  </section>;
}
