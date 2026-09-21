"use client";

import Link from "next/link";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, PackageCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePermissions } from "@/hooks/use-permissions";
import { logisticsApi } from "@/modules/logistics/api";
import type { WarehouseHandoff } from "@/modules/logistics/types";
import { useTranslation } from "@/store/use-translation";

export default function LogisticsWarehouseHandoffDetailPage({ handoffId }: { handoffId: string }) {
  const { t } = useTranslation(); const cache = useQueryClient(); const { hasAnyPermission } = usePermissions(); const [message, setMessage] = React.useState("");
  const canComplete = hasAnyPermission(["complete_logistics_warehouse_handoffs", "manage_logistics"]);
  const query = useQuery({ queryKey: ["logistics", "warehouse-handoffs", handoffId], queryFn: () => logisticsApi.warehouseHandoff(handoffId).then((r) => r.data.data as WarehouseHandoff) });
  const complete = useMutation({ mutationFn: (lines: Array<Record<string, unknown>>) => logisticsApi.completeWarehouseHandoff(handoffId, lines), onSuccess: async () => { await cache.invalidateQueries({ queryKey: ["logistics", "warehouse-handoffs"] }); setMessage(t("logistics.messages.handoff_completed")); }, onError: () => setMessage(t("logistics.errors.handoff_save")) });
  if (query.isLoading) return <div role="status" className="flex items-center gap-2"><Spinner />{t("logistics.loading")}</div>;
  if (query.isError || !query.data) return <Alert variant="destructive"><AlertTitle>{t("logistics.errors.handoff_load_title")}</AlertTitle><AlertDescription>{t("logistics.errors.warehouse_handoffs")}</AlertDescription></Alert>;
  const item = query.data;
  return <main className="flex flex-col gap-6"><header className="flex flex-wrap items-start justify-between gap-4"><div><Button variant="ghost" asChild className="-ml-3 min-h-11"><Link href="/dashboard/logistics/warehouse-handoffs"><ArrowLeft aria-hidden="true" />{t("logistics.actions.back_handoffs")}</Link></Button><p className="mt-2 font-mono text-sm text-muted-foreground">{item.handoff_number}</p><h1 className="text-3xl font-black tracking-tight">{t("logistics.warehouse_handoffs.overview")}</h1></div><Badge className="mt-3" variant={item.status === "blocked" ? "destructive" : item.status === "completed" ? "default" : "secondary"}>{t(`logistics.status.${item.status}`)}</Badge></header>
    <div aria-live="polite">{message ? <Alert><AlertTitle>{message}</AlertTitle></Alert> : null}</div>
    <Card><CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4"><Datum label={t("logistics.fields.job")} value={item.job?.job_number} /><Datum label={t("logistics.fields.direction")} value={t(`logistics.direction.${item.direction}`)} /><Datum label={t("logistics.fields.purpose")} value={t(`logistics.handoff_purpose.${item.purpose}`)} /><Datum label={t("logistics.fields.inventory_treatment")} value={t(`logistics.inventory_treatment.${item.inventory_treatment}`)} /></CardContent></Card>
    <Card><CardHeader><CardTitle>{t("logistics.warehouse_handoffs.lines")}</CardTitle><CardDescription>{t("logistics.warehouse_handoffs.lines_description")}</CardDescription></CardHeader><CardContent>{item.lines?.length ? <form onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); complete.mutate(item.lines!.map((line) => ({ id: line.id, actual_quantity: data.get(`quantity-${line.id}`), condition: data.get(`condition-${line.id}`) || null }))); }}><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead scope="col">{t("logistics.fields.expected_quantity")}</TableHead><TableHead scope="col">{t("logistics.fields.actual_quantity")}</TableHead><TableHead scope="col">{t("logistics.fields.uom")}</TableHead><TableHead scope="col">{t("logistics.fields.condition")}</TableHead></TableRow></TableHeader><TableBody>{item.lines.map((line) => <TableRow key={line.id}><TableCell>{line.expected_quantity}</TableCell><TableCell><Field><FieldLabel className="sr-only" htmlFor={`quantity-${line.id}`}>{t("logistics.fields.actual_quantity")}</FieldLabel><Input id={`quantity-${line.id}`} name={`quantity-${line.id}`} type="number" min="0" step="0.0001" defaultValue={line.actual_quantity ?? line.expected_quantity} required disabled={item.status === "completed"} /></Field></TableCell><TableCell>{line.uom}</TableCell><TableCell><Field><FieldLabel className="sr-only" htmlFor={`condition-${line.id}`}>{t("logistics.fields.condition")}</FieldLabel><Input id={`condition-${line.id}`} name={`condition-${line.id}`} defaultValue={line.condition ?? "good"} disabled={item.status === "completed"} /></Field></TableCell></TableRow>)}</TableBody></Table></div>{canComplete && item.status !== "completed" ? <Button className="mt-4 min-h-11" disabled={complete.isPending}>{complete.isPending ? <Spinner /> : <PackageCheck aria-hidden="true" />}{t("logistics.actions.complete_handoff")}</Button> : null}</form> : <Empty><EmptyHeader><EmptyTitle>{t("logistics.empty.handoff_lines")}</EmptyTitle></EmptyHeader></Empty>}</CardContent></Card>
    <Card><CardHeader><CardTitle>{t("logistics.warehouse_handoffs.discrepancies")}</CardTitle></CardHeader><CardContent>{item.discrepancies?.length ? <div className="space-y-3">{item.discrepancies.map((entry) => <div key={entry.id} className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4"><div className="flex items-center justify-between gap-3"><strong>{entry.discrepancy_type}</strong><Badge variant="outline">{entry.status}</Badge></div><p className="mt-2 text-sm text-muted-foreground">{entry.description}</p></div>)}</div> : <Empty><EmptyHeader><EmptyTitle>{t("logistics.empty.discrepancies")}</EmptyTitle></EmptyHeader></Empty>}</CardContent></Card>
  </main>;
}

function Datum({ label, value }: { label: string; value?: string | null }) { return <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value || "—"}</dd></div>; }
